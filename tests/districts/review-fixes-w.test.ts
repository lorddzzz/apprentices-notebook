import { describe, expect, it, vi } from 'vitest';
import type { InventionDef } from '$data';
import { type BattleState, libraryOf, type Origin, parseLabel, tileAt, type Unit } from '$engine';
import { basicDirs } from '$engine/basicActions';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { COLLAPSE_RULE_ID, parseBridges } from '$engine/districts/bridges/types';
import { applyMark } from '$engine/marks';
import { landKind } from '$engine/mix';
import { boardRules } from '$engine/rules';
import { holdUnit } from '$engine/runes/actions';
import { roundEnd } from '$engine/turn';
import { flowFor, tile } from '../scenarios/chemHarness';
import { withFootnotes } from '../scenarios/footnoteHarness';
import { castWith, step, tileAim } from '../scenarios/footnotes/castHelper';
import { board, withLattices } from '../scenarios/harness';

/** Pack W review fixes (FX-1 .. FX-4). */

let replayHook: ((ctx: Ctx) => void) | null = null;
vi.mock('$engine/schedule', async (orig) => {
  const mod = await orig<typeof import('$engine/schedule')>();
  return {
    ...mod,
    replayFallen: (...args: Parameters<typeof mod.replayFallen>) => {
      replayHook?.(args[0]);
      return mod.replayFallen(...args);
    },
  };
});

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const touch = (s: BattleState, lbl: string, fns: FootnoteIds) => castWith(s, tileAim(lbl), fns);
const erase = (ascii: string, fns: string[]) =>
  touch(withLattices(ascii, { draughtsman: 'Touch> Erase' }), 'B1', withFootnotes(fns));
const stateOf = (s: BattleState, lbl: string): string | null =>
  tileAt(s, parseLabel(lbl)).state?.id ?? null;

describe('FX-1 piece strike kinds on strikePiece', () => {
  it('FX-1: erase on a bell lifts its cloud and rings nothing', () => {
    const r = erase('D {bell:low}~ . .', []);
    expect(stateOf(r.state, 'B1')).toBeNull();
    expect(r.events.some((e) => e.type === 'foundry:bellStruck')).toBe(false);
    expect(r.events.some((e) => e.type.startsWith('foundry:'))).toBe(false);
  });

  it('FX-1: erase-cap-salvage clears a state on a bell tile', () => {
    const r = erase('D {bell:low}o . . r', ['erase-cap-salvage']);
    expect(stateOf(r.state, 'B1')).toBeNull();
    expect(r.state.tiles.some((t) => t.state?.id === 'slick')).toBe(false);
  });

  it('FX-1: spark-cap-arc arcs from bare pencil', () => {
    const hp = (ids: string[]) => {
      const s = board('D {pencil} . d .');
      const r = runDraft(s, (ctx) => landKind(ctx, 'spark', tile('B1'), flowFor(s)), {
        footnotes: withFootnotes(ids),
      });
      return unit(r.state, 'dummy-1').hp;
    };
    expect(hp(['spark-cap-arc'])).toBe(hp([]) - 1);
  });

  it('FX-1: a basic Shove at a span is still legal', () => {
    const s = board('D {span} . .', { kits: { draughtsman: { action: 'shove' as const } } });
    expect(basicDirs(s, 'draughtsman')).toContain('right');
  });
});

describe('FX-2 erase-mark-clean neighbours', () => {
  it("FX-2: erase-mark-clean's neighbour marks come back on a restore", () => {
    const fns = withFootnotes(['erase-mark-clean']);
    const s = withLattices(
      'D r r .',
      { draughtsman: 'Touch> Erase' },
      { kits: { draughtsman: { habit: 'restoreErase' } } },
    );
    const marked = runDraft(s, (ctx) => {
      for (const id of ['rat-1', 'rat-2'])
        applyMark(ctx, unit(ctx.s, id), { deep: false, bound: null, origin: ORIGIN });
    }).state;
    const first = touch(marked, 'B1', fns);
    expect(unit(first.state, 'rat-2').mark).toBeNull();
    const again = structuredClone(first.state);
    const caster = unit(again, 'draughtsman');
    if (caster.kind === 'member') caster.acted = false;
    const back = touch(again, 'B1', fns);
    expect(unit(back.state, 'rat-1').mark).not.toBeNull();
    expect(unit(back.state, 'rat-2').mark).not.toBeNull();
  });
});

describe('FX-3 collapse keeps what a replay wrote', () => {
  it('FX-3: a replayed Brink rest keeps the span wear it caused', () => {
    const start = board('{pier} {span} . . .\nD . . . d{span}\n. . . . .');
    const stone = (s: BattleState) => parseBridges(s.rules?.[COLLAPSE_RULE_ID]).stone;
    const key = '1,0';
    replayHook = (ctx) => {
      const own = parseBridges(ctx.s.rules?.[COLLAPSE_RULE_ID]);
      ctx.s.rules = {
        ...ctx.s.rules,
        [COLLAPSE_RULE_ID]: { ...own, stone: { ...own.stone, [key]: 1 } },
      };
    };
    try {
      const dusk = runDraft(start, (ctx) => roundEnd(ctx, boardRules()));
      expect(dusk.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
      expect(stone(dusk.state)[key]).toBe(1);
    } finally {
      replayHook = null;
    }
  });
});

describe('FX-4 rivet-unit-anvil reads who held the unit', () => {
  const fns = withFootnotes(['rivet-unit-anvil']);
  const opts = {
    inventions: libraryOf([
      {
        id: 'inv:after-rivet',
        name: 'after-rivet',
        method: 'repeat',
        parts: ['strike'],
        solvent: 'rivet',
      } satisfies InventionDef,
    ]),
  };
  const ROOM = 'D . d . . .\n. . . . . r';
  const bite = (s: BattleState) => {
    const r = runDraft(s, (ctx) => dealDamage(ctx, unit(ctx.s, 'dummy-1'), 1, 'Bite'), {
      footnotes: fns,
    });
    const e = r.events.find((x) => x.type === 'damage');
    return e?.type === 'damage' ? e.amount : 0;
  };

  it('FX-4: a foe held by Hold or graphite-cap-pin takes no rivet:unit step', () => {
    const s = withLattices(ROOM, {}, opts);
    const held = runDraft(s, (ctx) => holdUnit(ctx, unit(ctx.s, 'dummy-1'), 2), { footnotes: fns });
    expect(bite(held.state)).toBe(1);
    // graphite-cap-pin sets `held` straight, with no rivet at all.
    const pinned = structuredClone(s);
    unit(pinned, 'dummy-1').held = 2;
    expect(bite(pinned)).toBe(1);
  });

  it('FX-4: a riveted foe takes the step until its hold runs out', () => {
    const cast = castWith(
      withLattices(ROOM, { draughtsman: 'Bolt> inv:after-rivet' }, opts),
      { kind: 'dir', dir: 'right' },
      fns,
    );
    let state = cast.state;
    expect(unit(state, 'dummy-1').riveted).toBe(true);
    expect(bite(state)).toBe(2);
    for (let i = 0; i < 5 && unit(state, 'dummy-1').held > 0; i++) {
      state = step(state, { type: 'endTurn' }, fns).state;
    }
    expect(unit(state, 'dummy-1').held).toBe(0);
    expect(unit(state, 'dummy-1').riveted).toBeUndefined();
    expect(bite(state)).toBe(1);
  });
});
