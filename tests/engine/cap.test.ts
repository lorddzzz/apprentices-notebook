import { describe, expect, it } from 'vitest';
import type { InventionDef } from '$data';
import {
  type BattleState,
  cloneData,
  type GameEvent,
  isSilent,
  libraryOf,
  parseLabel,
  tileAt,
} from '$engine';
import { castAction } from '$engine/cast';
import type { Ctx } from '$engine/ctx';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';
import { withLattices } from '../scenarios/harness';

/**
 * BL-107 (foundations FD-2, fixed by FD-6 / P11): a cast cut by the event cap must stop changing
 * the board where its log stops. Each chain is cut at every event index; the board the log
 * projects to is compared with the board the engine ended on.
 *
 * `battle.ts` does not thread `eventCap` into `runDraft` yet, so the cast runs on a hand-built
 * `Ctx` (no `runDraft`: the projection guard in tests/app/projection.test.ts records those).
 */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null });
const lib = libraryOf([inv('impulse', 'conduct', ['shove']), inv('zap', 'conduct', ['strike'])]);

/** What the board draws, minus silent counters (as in the projection guard). */
function drawn(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive
        ? { id: u.id, pos: u.pos, hp: u.hp, mark: u.mark, shield: u.shield, held: u.held > 0 }
        : { id: u.id, alive: false },
    ),
    tiles: v.tiles.map((t) => ({ state: t.state, jar: t.jar })),
  };
}

/** The Draughtsman casts his first spell right with `cap` events allowed. */
function castWithCap(s: BattleState, cap: number): { state: BattleState; events: GameEvent[] } {
  const ctx: Ctx = { s: cloneData(s), log: [], cast: null, meta: {}, footnotes: {}, eventCap: cap };
  const m = ctx.s.units.find((u) => u.id === 'draughtsman');
  const spell = m?.kind === 'member' ? m.spells[0]?.key : undefined;
  if (spell === undefined) throw new Error('the Draughtsman has no spell');
  castAction(ctx, { type: 'cast', unit: 'draughtsman', spell, aim: { kind: 'dir', dir: 'right' } });
  return { state: ctx.s, events: ctx.log };
}

const UNCAPPED = 10_000;

/** Every cap from 0 to the chain's length: the ones whose projection disagrees with the engine. */
function drifting(s: BattleState): number[] {
  const length = castWithCap(s, UNCAPPED).events.length;
  const out: number[] = [];
  for (let cap = 0; cap <= length; cap++) {
    const r = castWithCap(s, cap);
    const want = viewOf(r.state);
    const got = r.events.reduce((v, e) => (isSilent(e) ? v : projectWith(v, e, want)), viewOf(s));
    if (JSON.stringify(drawn(got)) !== JSON.stringify(drawn(want))) out.push(cap);
  }
  return out;
}

const CHAINS: Record<string, () => BattleState> = {
  // Ink lands on the tile before its `landed` is emitted.
  ink: () => withLattices('D r . .\n. . . .', { draughtsman: 'Bolt> Ink Strike' }),
  // A burst over an oil network: fire, damage and spread in helper loops.
  'oil-spark': () =>
    withLattices('D r o r o r .\n. o o o o o .', { draughtsman: 'Bolt> Oil Spark' }),
  // Conduct pushes everyone on the brass, one into the next.
  impulse: () =>
    withLattices(
      'D r r r r .\n. = = = = .',
      { draughtsman: 'Bolt> inv:impulse' },
      { inventions: lib },
    ),
  // Conduct strikes everyone on the brass.
  zap: () =>
    withLattices('D r r r r .\n. = = = = .', { draughtsman: 'Bolt> inv:zap' }, { inventions: lib }),
};

/** A Shove pushes the rat onto the Stoker's step-jar, which strikes whoever opens it. */
function pushOntoJar(): BattleState {
  const s = cloneData(
    withLattices('D r . .\nS . . .', { draughtsman: 'Bolt> Shove' }, { hp: { B1: 20 } }),
  );
  tileAt(s, parseLabel('C1')).jar = {
    owner: 'stoker',
    event: 'step',
    rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
    heading: null,
    origin: { caster: 'stoker', spell: 'x', cast: 0 },
  };
  return s;
}

describe('the event cap (BL-107)', () => {
  it.each(Object.keys(CHAINS))('%s: every cut terminates and fizzles once', (name) => {
    const s = CHAINS[name]?.();
    if (!s) throw new Error(name);
    const length = castWithCap(s, UNCAPPED).events.length;
    expect(length).toBeGreaterThan(3);
    for (let cap = 0; cap <= length; cap++) {
      const fizzles = castWithCap(s, cap).events.filter((e) => e.type === 'fizzles');
      expect(fizzles.length).toBeLessThanOrEqual(1);
    }
    expect(castWithCap(s, UNCAPPED).events.some((e) => e.type === 'fizzles')).toBe(false);
  });

  it.each(Object.keys(CHAINS))('%s: uncapped, the log projects to the final board', (name) => {
    const s = CHAINS[name]?.();
    if (!s) throw new Error(name);
    const r = castWithCap(s, UNCAPPED);
    const want = viewOf(r.state);
    const got = r.events.reduce((v, e) => (isSilent(e) ? v : projectWith(v, e, want)), viewOf(s));
    expect(drawn(got)).toEqual(drawn(want));
  });

  // FD-6 (P11): the cap unwinds the cast, and helpers emit before they mutate. Today the board
  // keeps changing after the last logged event (e.g. `ink`: the blot lands, its event is cut).
  it.fails.each(Object.keys(CHAINS))(
    'FD-6: %s cut at every event index projects to the final board',
    (name) => {
      const s = CHAINS[name]?.();
      if (!s) throw new Error(name);
      expect(drifting(s)).toEqual([]);
    },
  );

  // FD-6 (P11): a detached run (a jar opening) started inside a capped cast does not start.
  // Today the push's event is cut but the rat still moves, opens the jar, and the jar's run gets
  // a fresh cap of its own, so events are logged after `fizzles`. Passes since FD-3: an arrival
  // stops at the cap (P4's `cap` reason), so this jar never opens; FD-6 makes it hold in general.
  it('FD-6: nothing but the trace is logged after the cast fizzles', () => {
    const s = pushOntoJar();
    const full = castWithCap(s, UNCAPPED).events;
    expect(full.some((e) => e.type === 'jarOpened')).toBe(true);
    const cut = full.findIndex((e) => e.type === 'push');
    const events = castWithCap(s, cut).events;
    const at = events.findIndex((e) => e.type === 'fizzles');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(events.slice(at + 1).filter((e) => e.type !== 'trace')).toEqual([]);
  });
});
