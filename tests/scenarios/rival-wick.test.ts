import { describe, expect, test } from 'vitest';
import { RIVALS } from '$data/rivals';
import {
  type BattleState,
  type Coord,
  type EnemyUnit,
  type GameEvent,
  type Jar,
  parseLabel,
  type RivalIntent,
  tileAt,
} from '$engine';
import { enemyPhase } from '$engine/ai';
import { runDraft } from '$engine/ctx';
import { sealJar } from '$engine/jars';
import { resolveRivalIntent } from '$engine/rivals/resolve';
import { driftWaiting } from '$engine/solvents';
import { act, board, cast, draft, withLattices } from './harness';

/** The long wick (rivals §2, RV-3): an object lock on one named jar. */

type WickIntent = Extract<RivalIntent, { kind: 'trick' }>;

const at = (lbl: string): Coord => parseLabel(lbl);
const endTurn = { type: 'endTurn' } as const;

const wick = (id: number, fallback: string | null = null): WickIntent => ({
  kind: 'trick',
  trick: 'canals:longWick',
  lock: { kind: 'jar', id },
  data: {},
  fallback: fallback ? at(fallback) : null,
  order: 1,
});

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

const jarFor = (owner: string, id: number): Jar => ({
  owner,
  event: 'step',
  rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
  heading: null,
  origin: { caster: owner, spell: 'lantern', cast: 0 },
  id,
  seq: id,
});

/** Puts the rival's jar `id` on a tile (the next jar id follows). */
function lay(s: BattleState, lbl: string, id = 1): BattleState {
  const c = structuredClone(s);
  tileAt(c, at(lbl)).jar = jarFor(rivalOf(c).id, id);
  c.nextJar = id + 1;
  return c;
}

const types = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type);
const jarAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).jar;
const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;

/** The rival far away at D2, the apprentice at A3. */
const BOARD = '. . . .\n. . . L\nD . . .';

describe('the wick opens the named jar', () => {
  test('from afar, under whoever stands on it, with the jar’s own contents', () => {
    const s = lay(board(BOARD, { pins: { D2: wick(1) } }), 'A3');
    const r = act(s, endTurn);
    expect(types(r.events, 'jarOpened')).toHaveLength(1);
    expect(hp(r.state, 'draughtsman')).toBeLessThan(hp(s, 'draughtsman'));
    expect(jarAt(r.state, 'A3')).toBeNull();
    expect(types(r.events, 'orderFails')).toEqual([]);
    expect(rivalOf(r.state).rival?.charges.lantern).toBe(5); // no charge spent
  });

  test('self-harm: a jar under the rival himself hurts him (ordinary openJar rules)', () => {
    const s = lay(board(BOARD, { pins: { D2: wick(1) } }), 'D2');
    const r = act(s, endTurn);
    expect(hp(r.state, rivalOf(s).id)).toBeLessThan(rivalOf(s).hp);
  });
});

describe('the order fails and never retargets', () => {
  test('early opening: a step onto the jar opens it; the wick then fails and opens nothing', () => {
    const s = lay(board(BOARD, { pins: { D2: wick(1) } }), 'B3');
    const stepped = act(s, { type: 'move', unit: 'draughtsman', to: at('B3') });
    expect(types(stepped.events, 'jarOpened')).toHaveLength(1);
    const r = act(stepped.state, endTurn);
    expect(types(r.events, 'jarOpened')).toEqual([]);
    expect(types(r.events, 'orderFails')).toMatchObject([{ why: 'opened' }]);
  });

  test('erase: the wick fails and opens nothing', () => {
    const s0 = withLattices(BOARD, { draughtsman: 'Bolt> Erase' }, { pins: { D2: wick(1) } });
    const s = lay(s0, 'D3');
    const erased = cast(s, 'draughtsman', 'right');
    expect(jarAt(erased.state, 'D3')).toBeNull();
    const r = act(erased.state, endTurn);
    expect(types(r.events, 'orderFails')).toMatchObject([{ why: 'erased' }]);
    expect(types(r.events, 'jarOpened')).toEqual([]);
  });

  test('crumble: a newer jar replaces it; the wick fails and the replacement stays closed', () => {
    const s = lay(board(BOARD, { pins: { D2: wick(1) } }), 'A3');
    const owner = rivalOf(s).id;
    const sealed = draft(s, (ctx) => sealJar(ctx, at('B3'), jarFor(owner, 0)));
    expect(types(sealed.events, 'jarCrumbles')).toHaveLength(1);
    const r = act(sealed.state, endTurn);
    expect(types(r.events, 'orderFails')).toMatchObject([{ why: 'crumbled' }]);
    expect(types(r.events, 'jarOpened')).toEqual([]);
    expect(jarAt(r.state, 'B3')?.id).toBe(2);
  });

  test('owner change: the wick fails and the jar is left alone', () => {
    const s = lay(board(BOARD, { pins: { D2: wick(1) } }), 'A3');
    const jar = tileAt(s, at('A3')).jar;
    if (jar) jar.owner = 'draughtsman';
    const r = act(s, endTurn);
    expect(types(r.events, 'orderFails')).toMatchObject([{ why: 'ownerChanged' }]);
    expect(jarAt(r.state, 'A3')).not.toBeNull();
  });

  test('a failed order is starved: it earns the pre-shown fallback strike', () => {
    const s = board('D L\n. .', { pins: { B1: wick(9, 'A1') } });
    const r = act(s, endTurn);
    expect(types(r.events, 'orderFails')).toHaveLength(1);
    expect(types(r.events, 'fallbackStrike')).toHaveLength(1);
  });

  test('placed and opened in one turn is illegal; the next turn it is fine', () => {
    const s = board(BOARD);
    const owner = rivalOf(s).id;
    const same = draft(s, (ctx) => {
      sealJar(ctx, at('A3'), jarFor(owner, 0));
      resolveRivalIntent(ctx, rivalOf(ctx.s), wick(1));
    });
    expect(types(same.events, 'orderFails')).toHaveLength(1);
    expect(types(same.events, 'jarOpened')).toEqual([]);
    expect(jarAt(same.state, 'A3')?.id).toBe(1);
    const next = runDraft(same.state, (ctx) => resolveRivalIntent(ctx, rivalOf(ctx.s), wick(1)));
    expect(types(next.events, 'jarOpened')).toHaveLength(1);
  });
});

describe('the lock follows the jar', () => {
  test('Draw: the wick opens the jar at its new tile', () => {
    const s0 = withLattices(
      'D . . .\n. . . L',
      { draughtsman: 'Bolt> Draw' },
      { pins: { D2: wick(1) } },
    );
    const s = lay(s0, 'D1');
    const drawn = cast(s, 'draughtsman', 'right'); // the Bolt lands on D1; Draw pulls toward its heading
    const where = ['A1', 'B1', 'C1', 'D1'].find((l) => jarAt(drawn.state, l));
    const r = act(drawn.state, endTurn);
    expect(types(r.events, 'jarOpened')).toMatchObject([{ at: at(where ?? 'A1') }]);
    expect(types(r.events, 'orderFails')).toEqual([]);
  });

  test('drift: the same jar is opened on the tile it floated to', () => {
    const s0 = board('D w> w> .\n. . . L', { pins: { D2: wick(1) } });
    const s = lay(s0, 'B1');
    const floated = draft(s, (ctx) => driftWaiting(ctx));
    expect(jarAt(floated.state, 'B1')).toBeNull();
    expect(jarAt(floated.state, 'C1')?.id).toBe(1);
    const r = act(floated.state, endTurn);
    expect(types(r.events, 'jarOpened')).toMatchObject([{ at: at('C1') }]);
    expect(types(r.events, 'orderFails')).toEqual([]);
  });
});

describe('the planner', () => {
  test('plans the wick when his jar would hurt an apprentice, not when it would hurt him', () => {
    const def = RIVALS.lamplighter;
    if (!def) throw new Error('no def');
    const saved = { trick: def.trick, routine: def.routine };
    Object.assign(def, {
      trick: 'canals:longWick',
      routine: [{ goal: 'openOwnObject', action: { kind: 'trick' } }],
    });
    try {
      const plan = (lbl: string) => {
        const r = draft(lay(board(BOARD), lbl), (ctx) => enemyPhase(ctx, { move: true }));
        return rivalOf(r.state).intent;
      };
      expect(plan('A3')).toMatchObject({ kind: 'trick', lock: { kind: 'jar', id: 1 } });
      expect(plan('D2')).toBeNull();
    } finally {
      Object.assign(def, saved);
    }
  });
});
