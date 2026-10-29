import { describe, expect, test, vi } from 'vitest';
import type { TermDef } from '$data/districts/inkQuarter/types';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  closeBattle,
  type GameEvent,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  returnHome,
  startTrip,
  type Trip,
} from '$engine';
import { crossroadsChoices, returnPolicy } from '$engine/districts/api';
import { releaseHeld, TERMED, termFor } from '$engine/districts/inkQuarter/offers';
import { checkTermDefs, termEvents } from '$engine/districts/inkQuarter/terms';
import { type InkTripState, parseInkState } from '$engine/districts/inkQuarter/types';

/**
 * IQ-3: terms through a whole trip. The quarter ships with no rooms and no terms, so its data is
 * mocked here: four plain rooms and a heart, and three test terms (IQ-8 writes the real list).
 */

const TERMS = vi.hoisted((): TermDef[] => [
  {
    id: 'inkQuarter:sampler',
    reward: { kind: 'both', spec: { kind: 'solvent', solvent: 'wax' } },
    stake: { kind: 'reward' },
    condition: { kind: 'withinRounds', rounds: 2 },
    rooms: [0],
    text: {
      reward: 'Wax and a second pick',
      condition: 'clear it within 2 rounds',
      penalty: 'the Wax is taken back',
    },
  },
  {
    id: 'inkQuarter:bind',
    reward: { kind: 'page', spec: { kind: 'method', method: 'bind' } },
    stake: { kind: 'reward' },
    condition: { kind: 'noneDowned' },
    rooms: [1],
    guaranteedWhileLacking: 'bind',
    text: { reward: 'Bind', condition: 'nobody goes down', penalty: 'Bind is taken back' },
  },
  {
    id: 'inkQuarter:sand',
    reward: { kind: 'page', spec: { kind: 'solvent', solvent: 'sand' } },
    stake: { kind: 'resources', loss: { kind: 'hp', amount: 1 } },
    condition: { kind: 'winRoom' },
    rooms: [1, 2, 3],
    text: { reward: 'Sand', condition: 'win the next room', penalty: '1 HP each' },
  },
]);

vi.mock('$data/districts/inkQuarter/terms', () => ({ INK_TERMS: TERMS }));

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const board = (rows: readonly string[]): string => rows.join('\n');
  const ROOM = board(['P . . . . .', '. . . . . .', '. . . . . r', 'P . . . . .']);
  const HEART = board(['P . . . . .', '. . . . d .', 'P . . . . .']);
  const room = (i: number, heart = false) => ({
    id: `iq-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: heart ? HEART : ROOM,
    variants: [{ name: `Room ${i}`, layout: heart ? HEART : ROOM }],
    loot: heart ? ('heart' as const) : ('shallow' as const),
    picks: heart ? 2 : 1,
    heart,
  });
  const rooms = [room(0), room(1), room(2), room(3), room(4, true)];
  const DISTRICTS = { ...m.DISTRICTS, inkQuarter: { ...m.DISTRICTS.inkQuarter, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

// ── Helpers ─────────────────────────────────────────────
const profile = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: {
      ...p.city,
      heard: [...p.city.heard, 'inkQuarter'],
      open: [...p.city.open, 'inkQuarter'],
    },
  };
};

interface Fight {
  trip: Trip;
  state: BattleState;
  log: GameEvent[];
}

const endTurn: Action = { type: 'endTurn' };

/** Ends `turns` turns in the trip's current room, recording each action. */
function fight(p: Profile, t: Trip, turns: number): Fight {
  const start = beginEncounter(p, t);
  let state = start.state;
  const log = [...start.events];
  let trip = t;
  for (let i = 0; i < turns; i++) {
    const r = applyAction(state, endTurn);
    state = r.state;
    log.push(...r.events);
    trip = { ...trip, actions: [...trip.actions, endTurn] };
  }
  return { trip, state, log };
}

/** Ends the fight won (every foe down) or wiped (every apprentice down), then closes it. */
function close(p: Profile, f: Fight, won = true) {
  const s = structuredClone(f.state);
  s.phase = won ? 'won' : 'lost';
  for (const u of s.units) if ((u.kind === 'enemy') === won) u.hp = 0;
  return closeBattle(p, f.trip, s, f.log);
}
function win(p: Profile, f: Fight) {
  const r = close(p, f);
  if (!r.trip) throw new Error('expected the trip to go on');
  return { profile: r.profile, trip: r.trip };
}

const inkState = (t: Trip): InkTripState => parseInkState(t.kit?.state);
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ── Signing in room 0 ───────────────────────────────────
const p0 = profile();
const t0 = startTrip(p0, 31, 'inkQuarter');
const won0 = win(p0, fight(p0, t0, 1));
const termAt = won0.trip.offers.length - 1;
const signed = pickLoot(won0.trip, termAt);
/** The signed term's extra pick, spent on the first normal offer. */
const atCrossroads = pickLoot(signed, 0);

describe('signing a term (P5, P7)', () => {
  test('the term data passes the check', () => {
    expect(checkTermDefs(TERMS, 5)).toEqual([]);
  });

  test('the termed card is an extra card after the normal three', () => {
    expect(won0.trip.offers).toHaveLength(4);
    expect(won0.trip.offers.at(-1)).toEqual({
      kind: TERMED,
      data: { def: 'inkQuarter:sampler' },
    });
    expect(won0.trip.offers.slice(0, 3).some((o) => o.kind === TERMED)).toBe(false);
  });

  test('signing opens the term, holds its page and grants an extra pick', () => {
    expect(inkState(signed).terms).toEqual([
      { id: 't0', def: 'inkQuarter:sampler', signedAt: 0, status: 'open' },
    ]);
    expect(signed.loot).toEqual([
      { kind: TERMED, data: { def: 'inkQuarter:sampler', term: 't0' }, held: true },
    ]);
    expect(signed.status).toBe('looting');
    expect(signed.picksLeft).toBe(1);
    expect(termEvents(inkState(won0.trip), inkState(signed), 0)).toEqual([
      {
        type: 'inkQuarter:termSigned',
        data: { term: 't0', def: 'inkQuarter:sampler', room: 0 },
      },
    ]);
    expect(atCrossroads.status).toBe('crossroads');
  });

  test('refusing the term leaves the way home open', () => {
    const refused = pickLoot(won0.trip, 0);
    expect(inkState(refused).terms).toEqual([]);
    expect(returnPolicy(refused)).toEqual({ ok: true });
  });

  test('an open term refuses the way home, with its reason', () => {
    const why = 'A signed term holds you here: clear it within 2 rounds.';
    expect(returnPolicy(atCrossroads)).toEqual({ ok: false, why });
    expect(crossroadsChoices(atCrossroads).at(-1)).toMatchObject({ id: 'return', disabled: why });
    expect(() => returnHome(won0.profile, atCrossroads)).toThrow(why);
  });
});

// ── Settling in room 1 ──────────────────────────────────
const t1 = pushOn(atCrossroads);

describe('settling when the next room is won (P5)', () => {
  test('a reload mid-room keeps the open term, its held page and the fight', () => {
    const mid = fight(won0.profile, t1, 1);
    const save = { ...newSave(1), profile: won0.profile, trip: mid.trip };
    const loaded = parseSaveData(json(save));
    expect(loaded.trip).toEqual(mid.trip);
    expect(inkState(loaded.trip as Trip).terms[0]?.status).toBe('open');
    expect(beginEncounter(loaded.profile, loaded.trip as Trip).state).toEqual(mid.state);
    // Mid-loot too: the open termed card and the held page parse back.
    const looting = parseSaveData(json({ ...save, trip: won0.trip }));
    expect(looting.trip?.offers.at(-1)).toEqual(won0.trip.offers.at(-1));
  });

  const paid = win(won0.profile, fight(won0.profile, t1, 1));

  test('paid: the condition held, the way home opens and the page banks', () => {
    expect(inkState(paid.trip).terms[0]?.status).toBe('paid');
    expect(termEvents(inkState(t1), inkState(paid.trip), 1)).toEqual([
      { type: 'inkQuarter:termPaid', data: { term: 't0', def: 'inkQuarter:sampler', room: 1 } },
    ]);
    const home = pickLoot(paid.trip, 0);
    expect(returnPolicy(home)).toEqual({ ok: true });
    expect(releaseHeld(home).loot[0]).toEqual({
      kind: TERMED,
      data: { def: 'inkQuarter:sampler', term: 't0' },
    });
    const banked = returnHome(paid.profile, home);
    expect(banked.solventsFound).toContain('wax');
    expect(banked.solvents.wax).toBe(paid.profile.solvents.wax + 1);
  });

  test('the guaranteed term comes while the household lacks its page', () => {
    expect(paid.trip.offers.at(-1)).toEqual({ kind: TERMED, data: { def: 'inkQuarter:bind' } });
    const knowsBind = { ...paid.profile, methods: [...paid.profile.methods, 'bind' as const] };
    const ctx = {
      profile: knowsBind,
      trip: paid.trip,
      room: 1,
      table: 'shallow',
      seed: 5,
    } as const;
    expect(termFor(ctx, TERMS)?.id).toBe('inkQuarter:sand');
  });

  const broken = win(won0.profile, fight(won0.profile, t1, 3));

  test('broken: the condition failed; the way home still opens, the held page goes', () => {
    expect(inkState(broken.trip).terms[0]?.status).toBe('broken');
    expect(termEvents(inkState(t1), inkState(broken.trip), 1)).toEqual([
      { type: 'inkQuarter:termBroken', data: { term: 't0', def: 'inkQuarter:sampler', room: 1 } },
    ]);
    const home = pickLoot(broken.trip, 0);
    expect(returnPolicy(home)).toEqual({ ok: true });
    expect(releaseHeld(home).loot.some((i) => i.kind === TERMED)).toBe(false);
  });

  test('a wipe loses the term and its page with the rest of the trip', () => {
    const r = close(won0.profile, fight(won0.profile, t1, 1), false);
    expect(r.outcome).toBe('wiped');
    expect(r.trip).toBeNull();
    expect(r.profile.solventsFound).not.toContain('wax');
    expect(r.profile.solvents.wax).toBe(won0.profile.solvents.wax);
  });
});

describe('one term at a time, none at the heart (P5)', () => {
  const ctx = (trip: Trip, room: number) =>
    ({ profile: p0, trip, room, table: 'shallow', seed: 9 }) as const;

  test('no termed card while a term is open', () => {
    expect(termFor(ctx(atCrossroads, 1), TERMS)).toBeNull();
  });

  test('a term signed once is not offered again on the trip', () => {
    const late = TERMS.map((d) => ({ ...d, rooms: [0, 1, 2] }));
    const settled = {
      ...won0.trip,
      kit: {
        ...signed.kit,
        state: { terms: [{ id: 't0', def: 'inkQuarter:sampler', signedAt: 0, status: 'paid' }] },
      },
    } as Trip;
    expect(termFor(ctx(settled, 2), late)?.id).toBe('inkQuarter:bind');
  });

  test('the heart offers no term even if the data listed one', () => {
    const atHeart = TERMS.map((d) => ({ ...d, rooms: [4] }));
    expect(termFor(ctx(won0.trip, 4), atHeart)).toBeNull();
    expect(checkTermDefs(atHeart, 5)).toContain('inkQuarter:sampler: a term at the heart');
  });

  test('outside the quarter the kind offers nothing', () => {
    const seam = startTrip(p0, 31);
    expect(termFor(ctx(seam, 0), TERMS)).toBeNull();
  });
});
