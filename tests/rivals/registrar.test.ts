import { describe, expect, it } from 'vitest';
import { ENEMIES } from '$data';
import { RIVAL_PAGES, RIVAL_TOKENS, RIVALS } from '$data/rivals';
import {
  PULL_IN,
  REGISTRAR_PAGE,
  REGISTRAR_RIVAL,
  REGISTRAR_TRICK_ID,
  REGISTRAR_TUNING,
  RUB_OUT,
} from '$data/rivals/registrar';
import {
  type BattleState,
  type EnemyUnit,
  finishEncounter,
  type GameEvent,
  hearAfterTrip,
  newProfile,
  type Profile,
  startTrip,
  type Trip,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { CARTOGRAPHERS_MODULE } from '$engine/districts/cartographers';
import {
  type Circle,
  REGISTRAR_GOALS,
  STRIKE_FROM_THE_REGISTER,
} from '$engine/districts/cartographers/registrar';
import { parseLattice } from '$engine/notation';
import { bankPages } from '$engine/rivals/pages';
import { rivalAct } from '$engine/rivals/resolve';
import { trickOf } from '$engine/rivals/tricks';
import { awardsPage } from '$engine/standIn';
import { act, board, cast, draft, parseLabel, withLattices } from '../scenarios/harness';
import { rivalOf } from './fixtures/harness';

/**
 * CG-7 (cartographers-plan P10-P12): the Registrar as a real rival. His def, page and shell are the
 * data in `data/rivals/registrar.ts`; his trick, strike from the register, is the module's
 * (`engine/districts/cartographers/registrar.ts`). Tokens: `Y` the Registrar, `I` the tracer (a
 * hand that never acts on its own, so it only holds circles), `D` and `S` the apprentices. A hall
 * has his spell charges spent, so only the circles move; `start` leaves his kit whole.
 */

const PAGE = 'registrar:pullIn' as const;
const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const enemyOf = (s: BattleState, def: string): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (u?.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};

/** The circles his shown mark carries now. */
function circlesOf(s: BattleState): Circle[] {
  const data = rivalOf(s).rival?.mark?.data;
  const raw = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  const circles = raw && 'circles' in raw ? raw.circles : null;
  return (Array.isArray(circles) ? circles : []) as Circle[];
}

/** Plans his round again on a board a test just changed. */
const replan = (s: BattleState): BattleState =>
  runDraft(structuredClone(s), (ctx) => {
    const e = rivalOf(ctx.s);
    e.intent = null;
    rivalAct(ctx, e, 1, false);
  }).state;

/** His kit whole, as the board was made. */
const start = (ascii: string, lattices = {}): BattleState =>
  structuredClone(withLattices(ascii, lattices));

/** His spells spent: no cast, only the circles. */
function hall(ascii: string, lattices = {}): BattleState {
  const s = start(ascii, lattices);
  const r = rivalOf(s).rival;
  if (r) r.charges = { erase: 0, swap: 0 };
  return replan(s);
}

describe('his def, page, shell and trick', () => {
  it('CG-7: the def, the page, the shell, the trick and the goals agree', () => {
    expect(RIVALS.registrar).toBe(REGISTRAR_RIVAL);
    expect(REGISTRAR_RIVAL).toMatchObject({
      token: 'Y',
      district: 'cartographers',
      hp: 10,
      move: 1,
      elite: true,
      page: PAGE,
      trick: REGISTRAR_TRICK_ID,
    });
    expect(REGISTRAR_RIVAL.spells.map((s) => [s.lattice, s.charges])).toEqual([
      ['Bolt> Erase', 4],
      ['Bolt> Swap', 4],
    ]);
    for (const sp of REGISTRAR_RIVAL.spells) expect(parseLattice(sp.lattice)).toBeDefined();
    expect(REGISTRAR_RIVAL.routine.map((r) => r.goal)).toEqual([RUB_OUT, PULL_IN, 'approach']);
    expect(RIVAL_TOKENS).toContainEqual({
      token: 'Y',
      kind: 'foe',
      id: 'registrar',
      district: 'cartographers',
    });
    expect(ENEMIES.registrar).toMatchObject({
      token: 'Y',
      hp: REGISTRAR_RIVAL.hp,
      move: REGISTRAR_RIVAL.move,
      elite: true,
    });
    expect(board('Y').units.find((u) => u.kind === 'enemy')).toMatchObject({
      def: 'registrar',
      hp: 10,
    });
    expect(CARTOGRAPHERS_MODULE.tricks?.map((t) => t.id)).toEqual([REGISTRAR_TRICK_ID]);
    expect(trickOf(REGISTRAR_TRICK_ID)).toBe(STRIKE_FROM_THE_REGISTER);
    expect(CARTOGRAPHERS_MODULE.goals).toBe(REGISTRAR_GOALS);
    expect(REGISTRAR_GOALS.map((g) => g.id)).toEqual([RUB_OUT, PULL_IN]);
    expect(CARTOGRAPHERS_MODULE.eraseAt).toBeTypeOf('function');
  });

  it('CG-7: his page recovers Bolt > Swap and is read like the other rivals', () => {
    expect(RIVAL_PAGES[PAGE]).toBe(REGISTRAR_PAGE);
    expect(REGISTRAR_PAGE).toMatchObject({ rival: 'registrar', spell: 'swap', title: 'Pull in' });
    expect(REGISTRAR_PAGE.lattice).toBe('Bolt> Swap');
    expect(REGISTRAR_PAGE.lattice).toBe(
      REGISTRAR_RIVAL.spells.find((s) => s.id === REGISTRAR_PAGE.spell)?.lattice,
    );
    expect(REGISTRAR_PAGE.annotation).toContain('Swap');
    expect(REGISTRAR_PAGE.story.length).toBeGreaterThan(40);
    expect(REGISTRAR_PAGE.trial.board.length).toBeGreaterThan(0);
    expect(REGISTRAR_PAGE.note).toBeNull(); // CG-F4
  });
});

describe('strike from the register', () => {
  it('CG-7: aims are locked at the telegraph', () => {
    // Y at F1 sees D (C1) and S (C3) three tiles away; the tie goes to reading order: D's tile.
    const s = hall('. . D . . Y\n. . . . . .\n. . S . . .');
    expect(circlesOf(s)).toEqual([{ at: at('C1'), holder: rivalOf(s).id }]);
    expect(rivalOf(s).rival?.mark?.tiles).toEqual([at('C1')]);
    // D steps off and S steps on: the circle stays on the tile, and the tile is what is struck.
    const moved = act(act(s, { type: 'move', unit: 'draughtsman', to: at('B1') }).state, {
      type: 'move',
      unit: 'stoker',
      to: at('C1'),
    }).state;
    expect(rivalOf(moved).rival?.mark?.tiles).toEqual([at('C1')]);
    const r = endTurn(moved);
    expect(ofType(r.events, 'cartographers:struck')).toMatchObject([
      { data: { units: ['stoker'], tiles: [at('C1')] } },
    ]);
    expect(unit(r.state, 'stoker').out).toBe('erased');
    expect(unit(r.state, 'draughtsman').out).toBeUndefined();
  });

  it('CG-7: starved Erase falls back to the swap', () => {
    // Nothing on D's tile to take: the Erase is starved, so the planner shows the Swap.
    const bare = start('Y . . D .');
    expect(rivalOf(bare).intent).toMatchObject({ kind: 'cast', spell: 'swap' });
    // A state on the tile gives the Erase something to take, and it goes first.
    const stateful = start('Y . . D~ .');
    expect(rivalOf(stateful).intent).toMatchObject({ kind: 'cast', spell: 'erase' });
    // The Swap pulls the apprentice into his place.
    const r = endTurn(bare);
    expect(ofType(r.events, 'swapped')).toHaveLength(1);
    expect(unit(r.state, 'draughtsman').pos).toEqual(at('A1'));
  });

  it('CG-7: Erase on the tile lifts a circle', () => {
    // Y at F3: S (C1) is the nearest apprentice, so the circle is on S; D (A1) Erases that tile.
    const s = hall('D . S . . .\n. . . . . .\n. . . . . Y', { draughtsman: 'Bolt> Erase' });
    expect(circlesOf(s).map((c) => c.at)).toEqual([at('C1')]);
    const control = endTurn(s);
    expect(ofType(control.events, 'cartographers:struck')).toHaveLength(1);
    const erased = cast(s, 'draughtsman', 'right');
    expect(circlesOf(erased.state)).toEqual([]);
    expect(erased.lines.join('\n')).toContain('object is erased');
    const r = endTurn(erased.state);
    expect(ofType(r.events, 'cartographers:struck')).toHaveLength(0);
    expect(unit(r.state, 'stoker').out).toBeUndefined();
  });

  it('CG-7: moving off lifts a circle', () => {
    const s = hall('. . S . . Y\n. . . . . .\n. . . . . .');
    expect(circlesOf(s).map((c) => c.at)).toEqual([at('C1')]);
    const moved = act(s, { type: 'move', unit: 'stoker', to: at('C2') }).state;
    const r = endTurn(moved);
    expect(ofType(r.events, 'cartographers:struck')).toHaveLength(0);
    expect(unit(r.state, 'stoker').out).toBeUndefined();
    expect(unit(r.state, 'stoker').hp).toBeGreaterThan(0);
  });

  it('CG-7: killing the holder lifts a circle', () => {
    // The tracer, the only hand, holds the circle on S.
    const s = hall('. . S . I Y');
    const tracer = enemyOf(s, 'tracer');
    expect(circlesOf(s)).toEqual([{ at: at('C1'), holder: tracer.id }]);
    const control = endTurn(s);
    expect(ofType(control.events, 'cartographers:struck')).toHaveLength(1);
    const killed = draft(structuredClone(s), (ctx) =>
      dealDamage(ctx, unit(ctx.s, tracer.id), 99, 'test'),
    ).state;
    const r = endTurn(killed);
    expect(ofType(r.events, 'cartographers:circled')).toHaveLength(0);
    expect(ofType(r.events, 'cartographers:struck')).toHaveLength(0);
    expect(unit(r.state, 'stoker').out).toBeUndefined();
  });

  it('CG-7: with no hand left the Registrar holds the circle', () => {
    const s = hall('. . S . I Y');
    const tracer = enemyOf(s, 'tracer');
    const killed = draft(structuredClone(s), (ctx) => {
      dealDamage(ctx, unit(ctx.s, tracer.id), 99, 'test');
      rivalAct(ctx, rivalOf(ctx.s), 1, false);
    }).state;
    const registrar = rivalOf(killed);
    expect(circlesOf(killed)).toEqual([{ at: at('C1'), holder: registrar.id }]);
    // He holds it, so it stands: the apprentice is struck.
    const r = endTurn(killed);
    expect(ofType(r.events, 'cartographers:circled')).toMatchObject([
      { data: { holder: registrar.id } },
    ]);
    expect(unit(r.state, 'stoker').out).toBe('erased');
  });

  it('CG-7: a unit still circled at round end is erased', () => {
    const s = hall('. . S . . Y\n. . . . . .\n. . . . . .');
    const r = endTurn(s);
    const kinds = r.events.map((e) => e.type).filter((t) => t.startsWith('cartographers:'));
    expect(kinds.indexOf('cartographers:circled')).toBeLessThan(
      kinds.indexOf('cartographers:struck'),
    );
    expect(ofType(r.events, 'cartographers:struck')).toMatchObject([
      { data: { units: ['stoker'], tiles: [at('C1')] } },
    ]);
    expect(ofType(r.events, 'outOfRoom')).toMatchObject([{ cause: 'erased' }]);
    expect(unit(r.state, 'stoker').out).toBe('erased');
    // The circles clear with the round.
    expect(rivalOf(r.state).rival?.trick).toEqual({ circles: [] });
  });

  it('CG-7: two circles below half his HP, each held by its nearest hand', () => {
    const s = hall('S . D . I\n. . . . .\n. . . . Y');
    expect(circlesOf(s)).toHaveLength(REGISTRAR_TUNING.circles);
    const e = rivalOf(s);
    const wounded = structuredClone(s);
    const w = rivalOf(wounded);
    w.hp = Math.floor(e.maxHp / 2) - 1;
    const two = circlesOf(replan(wounded));
    expect(two).toHaveLength(REGISTRAR_TUNING.circlesBelowHalf);
    expect(new Set(two.map((c) => c.holder))).toEqual(new Set([enemyOf(s, 'tracer').id]));
    expect(two.map((c) => c.at)).toEqual([at('C1'), at('A1')]);
  });
});

/** A real cartographers trip standing in the heart room (CG-F's rooms). */
const heartTrip = (p: Profile): Trip => {
  const city = { ...p.city, open: [...p.city.open, 'cartographers' as const] };
  const t = startTrip({ ...p, city }, 1, 'cartographers');
  return { ...t, encounter: t.kit ? 5 : 0 };
};

describe('his heart', () => {
  it('CG-7: the page banks on a win and is kept on a wipe', () => {
    const won = structuredClone(hall('. . S . . Y'));
    for (const u of won.units) if (u.kind === 'enemy') u.hp = 0;
    expect(bankPages(newProfile(), won, 'cartographers', awardsPage).pages).toEqual([PAGE]);
    expect(bankPages(newProfile(), won, 'seam', awardsPage).pages).toEqual([]);
    const held = { ...newProfile(), pages: [PAGE] };
    const trip = heartTrip(newProfile());
    const lost = structuredClone(hall('. . S . . Y'));
    lost.phase = 'lost';
    const done = finishEncounter(held, trip, lost);
    expect(done.outcome).toBe('wiped');
    expect(done.profile.pages).toEqual([PAGE]);
  });

  it('CG-7: clearing the heart adds cartographers to city.hearts', () => {
    // The cleared trip is the generic one: a rival heart needs nothing of its own (P12, P18).
    expect(awardsPage({ def: 'registrar' })).toBe(true);
    const p = newProfile();
    const cleared: Trip = { ...heartTrip(p), status: 'cleared' };
    expect(hearAfterTrip(p, cleared, 'wiped').profile.city.hearts).toEqual([]);
    expect(hearAfterTrip(p, cleared, 'returned').profile.city.hearts).toContain('cartographers');
  });
});
