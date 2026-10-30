import { describe, expect, it, vi } from 'vitest';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  closeBattle,
  describe as describeEvent,
  type GameEvent,
  NO_WAY_HOME,
  newProfile,
  type Profile,
  pickLoot,
  placeOf,
  recordAction,
  returnHome,
  startTrip,
  type Trip,
} from '$engine';
import { emit } from '$engine/ctx';
import { chooseAt, crossroadsChoices, removeFromRoom, returnPolicy } from '$engine/districts/api';
import { KIT } from '$engine/districts/kit';
import type { Coord, Dir } from '$engine/grid';
import { conditionHolds, type ModuleHearCondition } from '$engine/hearing';
import { hitPiece } from '$engine/pieces';
import { boardRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import type { MemberUnit } from '$engine/types';
import {
  type Plank,
  type Sway,
  type Toll,
  useKitOps,
  type Wind,
} from '../fixtures/district-kit/fixture-district';

/**
 * DK-18: the fixture district (tests/fixtures/district-kit/fixture-district/) walked through a
 * full trip, one hook at a time. It is registered only here: the kit, the city's data and the
 * heart's foe are mocked with the fixture added, the way a district build lists its module in
 * `DISTRICT_MODULES` and its data in `DISTRICTS`.
 */

// The kit is the Seam's module and the fixture's. Nothing that loads the engine is imported here
// (no `importOriginal`, no canals module): what loads inside a mock factory binds to the unmocked
// kit. The canals are not visited on this trip.
vi.mock('$engine/districts/kit', async () => {
  const { buildKit } = await import('$engine/districts/registry');
  // The Seam stands in bare: its real module loads damage and mix, which load this mocked kit
  // and would deadlock the factory (SM-1). This trip never enters the Seam.
  const { FIXTURE_MODULE } = await import('../fixtures/district-kit/fixture-district');
  const modules = [{ id: 'seam' as const }, FIXTURE_MODULE];
  return { DISTRICT_MODULES: modules, KIT: buildKit(modules) };
});

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const { FIXTURE_DATA } = await import('../fixtures/district-kit/fixture-district/data');
  const DISTRICTS = { ...m.DISTRICTS, bridges: FIXTURE_DATA };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

// The stand-in heart: the dummy gets the fixture's script (a district adds its own foe).
vi.mock('$data/enemies', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/enemies')>();
  const { STAND_IN } = await import('../fixtures/district-kit/fixture-district/data');
  return { ...m, ENEMIES: { ...m.ENEMIES, dummy: { ...m.ENEMIES.dummy, script: STAND_IN } } };
});

// The module's kit operations, bound to the mocked kit (see `useKitOps`).
useKitOps({ removeFromRoom, hitPiece, emit });

// ── Helpers ─────────────────────────────────────────────
const profile = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: [...p.city.heard, 'bridges'], open: [...p.city.open, 'bridges'] },
  };
};

const members = (s: BattleState): MemberUnit[] =>
  s.units.filter((u): u is MemberUnit => u.kind === 'member').sort((a, b) => a.pos.y - b.pos.y);
const below = (at: Coord): Coord => ({ x: at.x, y: at.y + 1 });
const right = (at: Coord): Coord => ({ x: at.x + 1, y: at.y });
const pieceAt = (s: BattleState, at: Coord) => s.tiles[at.y * s.width + at.x]?.piece ?? null;
const plankAt = (s: BattleState, at: Coord): Plank => pieceAt(s, at)?.data as unknown as Plank;
const rule = <T>(s: BattleState, id: string): T => s.rules?.[id as 'bridges:x'] as unknown as T;

interface Fight {
  trip: Trip;
  state: BattleState;
  log: GameEvent[];
}

/** Plays `actions` (built from the opening board) in the trip's current room, recording each. */
function fight(p: Profile, t: Trip, plan: (s: BattleState) => Action[] = () => []): Fight {
  const start = beginEncounter(p, t);
  let state = start.state;
  const log = [...start.events];
  let trip = t;
  for (const a of plan(state)) {
    const r = applyAction(state, a);
    state = r.state;
    log.push(...r.events);
    trip = recordAction(trip, a);
  }
  return { trip, state, log };
}

/** Ends the fight won (every foe down), as the trip tests do, and closes it. */
function win(p: Profile, f: Fight) {
  const s = structuredClone(f.state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  const r = closeBattle(p, f.trip, s, f.log);
  if (!r.trip) throw new Error('expected the trip to go on');
  return { profile: r.profile, trip: r.trip };
}

/** Takes the normal offers until the picks run out. */
function loot(t: Trip): Trip {
  let trip = t;
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}

const endTurn: Action = { type: 'endTurn' };
const shove = (m: MemberUnit, dir: Dir): Action => ({ type: 'shove', unit: m.id, dir });
const move = (m: MemberUnit, to: Coord): Action => ({ type: 'move', unit: m.id, to });

// ── The walk ────────────────────────────────────────────
describe('a full trip through the fixture district', () => {
  const p0 = profile();
  const t0 = startTrip(p0, 18, 'bridges');

  // Room 0: one apprentice shoves the plank (onStruck), the other walks onto hers (onArrive),
  // then the turn ends (all three rule slots, onTurnEnd).
  const room0 = fight(p0, t0, (s) => {
    const [a, b] = members(s);
    if (!a || !b) throw new Error('two apprentices');
    return [shove(a, 'right'), move(b, right(b.pos)), endTurn];
  });
  const [a0, b0] = members(beginEncounter(p0, t0).state);
  const won0 = win(p0, room0);

  it('carries trip state from the first room (P7)', () => {
    expect(t0.kit).toEqual({
      state: { span: null, won: 0, signedAt: null },
      choices: [],
      checkpoint: false,
      bonuses: [],
    });
    expect(won0.trip.kit?.state).toEqual({ span: null, won: 1, signedAt: null });
  });

  it('reads the module’s rules from the kit (DK-19: `boardRules` is lazy)', () => {
    expect(boardRules().map((r) => r.id)).toEqual(
      expect.arrayContaining(['bridges:wind', 'bridges:sway', 'bridges:toll']),
    );
  });

  it('runs a rule in each round-end slot, in slot order (P8)', () => {
    expect(rule<Wind>(room0.state, 'bridges:wind')).toEqual({ runs: 1 });
    // The afterChemistry rule saw the carry rule's run of the same round end.
    expect(rule<Sway>(room0.state, 'bridges:sway')).toEqual({ runs: 1, windRuns: 1 });
    expect(rule<Toll>(room0.state, 'bridges:toll')).toEqual({ runs: 1, won: 0, span: null });
    expect(KIT.rules['bridges:wind']?.preview?.(room0.state, { runs: 1 })).toEqual([
      { kind: 'meter', label: 'Wind', value: 1, max: 9 },
    ]);
  });

  it('logs the module’s own event with its own line (P2; DK-19)', () => {
    const gusts = room0.log.filter((e) => e.type === 'bridges:gust');
    expect(gusts).toEqual([expect.objectContaining({ type: 'bridges:gust', data: { runs: 1 } })]);
    expect(gusts.map(describeEvent)).toEqual(['the wind gusts (1)']);
    expect(describeEvent({ type: 'bridges:unknown' })).toBeNull();
  });

  it('fires the plank on arrive, turn end and struck (P10)', () => {
    if (!a0 || !b0) throw new Error('two apprentices');
    expect(plankAt(room0.state, right(a0.pos))).toEqual({
      arrived: 0,
      turns: 1,
      struck: ['shove'],
      hits: 0,
    });
    expect(plankAt(room0.state, right(b0.pos))).toMatchObject({ arrived: 1, turns: 1 });
  });

  it('offers the kind’s own card and signing it blocks the way home (P3, P6)', () => {
    const offers = won0.trip.offers;
    expect(offers.at(-1)).toEqual({ kind: 'bridges:term', data: { room: 0 } });
    const signed = pickLoot(won0.trip, offers.length - 1);
    expect(signed.status).toBe('crossroads');
    expect(signed.kit?.state).toMatchObject({ signedAt: 0 });
    expect(returnPolicy(signed)).toEqual({ ok: false, why: 'A signed term holds you here.' });
    expect(() => returnHome(won0.profile, signed)).toThrow('A signed term holds you here.');
  });

  // The Crossroads after room 0: the module's span choices, then Return home (greyed).
  const signed = pickLoot(won0.trip, won0.trip.offers.length - 1);
  const t1 = chooseAt(signed, 'low');

  it('offers a span choice that fixes the next room (P4)', () => {
    expect(crossroadsChoices(signed).map((c) => [c.id, c.disabled ?? null])).toEqual([
      ['high', null],
      ['low', null],
      ['return', 'A signed term holds you here.'],
    ]);
    expect(t1.kit?.choices).toEqual([{ after: 0, id: 'low', pool: [1] }]);
    expect(placeOf(t1)).toBe('The low span');
  });

  // Room 1: an apprentice walks onto the gap and falls out of the room (P11).
  const room1 = fight(won0.profile, t1, (s) => {
    const [a] = members(s);
    if (!a) throw new Error('an apprentice');
    return [move(a, below(a.pos))];
  });
  const faller = members(beginEncounter(won0.profile, t1).state)[0];
  const won1 = win(won0.profile, room1);

  it('takes a fallen apprentice out of the room, back at 1 HP on a win (P11)', () => {
    if (!faller) throw new Error('an apprentice');
    expect(room1.log).toContainEqual(
      expect.objectContaining({
        type: 'outOfRoom',
        cause: 'fell',
        unit: expect.objectContaining({ id: faller.id }),
      }),
    );
    expect(room1.state.units.find((u) => u.id === faller.id)?.out).toBe('fell');
    expect(won1.trip.hp[faller.id as keyof Trip['hp']]).toBe(1);
  });

  it('reaches the checkpoint; past it the way on warns of no return (P3, P5)', () => {
    const at = loot(won1.trip);
    expect(at.kit?.checkpoint).toBe(true);
    expect(returnPolicy(at)).toEqual({ ok: true });
    expect(crossroadsChoices(at).map((c) => [c.id, c.warn ?? null])).toEqual([
      ['push', NO_WAY_HOME],
      ['return', null],
    ]);
  });

  const t2 = chooseAt(loot(won1.trip), 'push');
  const won2 = win(
    won1.profile,
    fight(won1.profile, t2, () => [endTurn]),
  );
  const beyond = loot(won2.trip);

  it('shuts the way home past the point of no return (P3)', () => {
    expect(returnPolicy(beyond)).toEqual({
      ok: false,
      why: 'No way home until the heart.',
      next: 3,
    });
    expect(crossroadsChoices(beyond).at(-1)).toMatchObject({
      id: 'return',
      disabled: 'No way home until the heart.',
    });
  });

  // The heart: set up from trip state, a stand-in foe whose step hits the plank.
  const t3 = chooseAt(beyond, 'push');
  const heart = fight(won2.profile, t3, () => [endTurn]);

  it('sets the heart up from trip state: rule config and a board edit (P7)', () => {
    const opening = beginEncounter(won2.profile, t3).state;
    expect(rule<Toll>(opening, 'bridges:toll')).toEqual({ runs: 0, won: 3, span: 'low' });
    expect(pieceAt(opening, { x: 5, y: 2 })?.id).toBe('bridges:gap');
  });

  it('a stand-in heart telegraphs its step and acts on it (P14)', () => {
    expect(heart.log).toContainEqual(
      expect.objectContaining({ type: 'telegraph', verb: 'drop a stone' }),
    );
    expect(plankAt(heart.state, { x: 2, y: 1 })).toMatchObject({ hits: 1, turns: 1 });
    expect(awardsPage({ def: 'dummy' })).toBe(false);
  });

  it('banks the kind and remembers the checkpoint at home (P5, P6)', () => {
    const cleared = loot(win(won2.profile, heart).trip);
    expect(cleared.status).toBe('cleared');
    const home = returnHome(won2.profile, cleared);
    expect(home.vellum).toBe(won2.profile.vellum + 1);
    expect(home.city.checkpoints?.bridges).toBe(1);

    // A later trip starts past the doorway, where there is no way back until the heart.
    const again = startTrip(home, 19, 'bridges', { at: 'checkpoint' });
    expect(again.encounter).toBe(2);
    const next = loot(
      win(
        home,
        fight(home, again, () => [endTurn]),
      ).trip,
    );
    expect(returnPolicy(next)).toMatchObject({ ok: false, why: 'No way home until the heart.' });
  });
});

// ── Module hearing kinds (P12; DK-19) ───────────────────
describe('module hearing kinds (P12)', () => {
  const cond: ModuleHearCondition = { kind: 'bridges:fell', voice: 'owner', district: 'bridges' };
  const fell: GameEvent[] = [
    {
      type: 'outOfRoom',
      unit: { id: 'stoker', name: 'stoker', at: { x: 0, y: 0 }, member: true },
      cause: 'fell',
    },
  ];
  const scene = (log: GameEvent[], district: 'bridges' | 'seam' = 'bridges') => ({
    profile: profile(),
    district,
    party: ['stoker'],
    log,
  });

  it('registers the kind', () => {
    expect(KIT.hearKinds['bridges:fell']?.when).toBe('battle');
  });

  it('a district hearing condition of a module kind is heard', () => {
    expect(conditionHolds(cond, scene(fell))).toBe(true);
    expect(conditionHolds(cond, scene([]))).toBe(false);
  });

  it('keeps the district filter for a module kind', () => {
    expect(conditionHolds(cond, scene(fell, 'seam'))).toBe(false);
  });

  it('throws on an unregistered module kind', () => {
    expect(() => conditionHolds({ ...cond, kind: 'bridges:nope' }, scene(fell))).toThrow(
      "Unknown hearing kind 'bridges:nope'",
    );
  });
});
