import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS } from '$data';
import {
  checkpointRoom,
  choicesAt,
  createRng,
  type DistrictShape,
  heartOf,
  markCheckpoint,
  newProfile,
  newTripKit,
  type Profile,
  parseTripKit,
  policyAllows,
  poolFor,
  reachedCheckpoint,
  rememberCheckpoint,
  returnCheck,
  shapeOf,
  startTrip,
  type Trip,
  takeChoice,
  variantFor,
} from '$engine';
import type { TripShapeDef } from '$engine/districts/types';

/**
 * Fuzz over trip shapes (DK-5a, plan §6): random walks through every `ret` kind on fixture
 * districts (the canals' five rooms carry them, so variant draws are real), plus the Seam and
 * the canals as built. Fights are a coin: win or wipe. Invariants: the heart is a return point,
 * the party is never stranded, no return past the point of no return, the kit survives a save,
 * the checkpoint is remembered exactly when reached, and a chosen pool decides the room.
 */

const spans: TripShapeDef = {
  id: 'canals:spans',
  initState: () => null,
  parseState: () => null,
  choices: ({ room }) =>
    room % 2 === 0
      ? [
          { id: 'sound', label: 'The sound span', kind: 'push', variantPool: [0, 1] },
          { id: 'crumbling', label: 'The crumbling span', kind: 'push', variantPool: [2] },
        ]
      : [],
};
const terms: TripShapeDef = {
  id: 'canals:terms',
  initState: () => null,
  parseState: () => null,
  returnBlocks: ({ room }) => (room === 1 || room === 3 ? [{ why: 'A signed term.' }] : []),
};

const base = shapeOf('canals');
const FIXTURES: Record<string, DistrictShape> = {
  seam: shapeOf('seam'),
  canals: base,
  any: { ...base, ret: { kind: 'any' } },
  'landings, heart listed': { ...base, ret: { kind: 'landings', after: [1, 4] } },
  'landings, heart not listed': { ...base, ret: { kind: 'landings', after: [0] } },
  'landings, none': { ...base, ret: { kind: 'landings', after: [] } },
  'until 0': { ...base, ret: { kind: 'until', after: 0 } },
  'until 2, checkpoint 2 (the doorway)': {
    ...base,
    ret: { kind: 'until', after: 2 },
    checkpoint: { after: 2, name: 'The doorway' },
  },
  'until 3, checkpoint 1': {
    ...base,
    ret: { kind: 'until', after: 3 },
    checkpoint: { after: 1, name: 'A stair' },
  },
  'any with blocks': { ...base, ret: { kind: 'any' }, trip: terms },
  'landings with span choices': {
    ...base,
    ret: { kind: 'landings', after: [0, 2] },
    trip: spans,
  },
};

const open: Profile = (() => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] } };
})();

const json = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function checkTrip(t: Trip, shape: DistrictShape): void {
  // The kit survives a save and its checkpoint flag matches the room.
  expect(parseTripKit(json(t.kit), t, shape)).toEqual(t.kit);
  if (t.kit) expect(t.kit.checkpoint).toBe(reachedCheckpoint(shape, t));
  const v = variantFor(t, t.encounter);
  const pool = poolFor(t, t.encounter);
  if (pool) expect(pool).toContain(v);
}

function checkCrossroads(t: Trip, shape: DistrictShape): void {
  const heart = heartOf(shape);
  const check = returnCheck(t, shape);
  const choices = choicesAt(t, shape);
  if (t.status === 'cleared') {
    // The heart is a return point, whatever the policy or a block says.
    expect(check).toEqual({ ok: true });
    expect(choices).toEqual([expect.objectContaining({ kind: 'return' })]);
    expect(choices[0]?.disabled).toBeUndefined();
    return;
  }
  // Never stranded: a way on is always open, and the policy names a later return point.
  expect(choices.some((c) => c.kind !== 'return' && !c.disabled)).toBe(true);
  if (!check.ok && check.next !== undefined) {
    expect(check.next).toBeGreaterThan(t.encounter);
    expect(check.next).toBeLessThanOrEqual(heart);
    expect(policyAllows(shape.ret, check.next, heart)).toBe(true);
  }
  // The policy decides, blocks only narrow it.
  if (check.ok) expect(policyAllows(shape.ret, t.encounter, heart)).toBe(true);
  if (!shape.trip?.returnBlocks) expect(check.ok).toBe(policyAllows(shape.ret, t.encounter, heart));
  // No return past the point of no return.
  if (shape.ret.kind === 'until' && t.encounter > shape.ret.after) expect(check.ok).toBe(false);
  if (shape.ret.kind === 'landings') expect(check.ok).toBe(shape.ret.after.includes(t.encounter));
}

/** One trip: returns how it ended and the profile after it. */
function walk(shape: DistrictShape, seed: number): { end: string; profile: Profile; trip: Trip } {
  const rng = createRng(seed);
  const district = shape === FIXTURES.seam ? 'seam' : 'canals';
  let t: Trip = startTrip(open, seed, district);
  const kit = newTripKit(shape);
  if (kit) t = { ...t, kit };
  else delete t.kit;
  if (shape.checkpoint && rng.int(0, 2) === 0) {
    t = { ...t, encounter: checkpointRoom(shape.checkpoint) };
    if (t.kit) t = { ...t, kit: { ...t.kit, checkpoint: true } };
  }
  for (let step = 0; step < 20; step++) {
    checkTrip(t, shape);
    // The fight: a wipe ends the trip; the checkpoint is kept anyway (P5).
    if (rng.int(0, 5) === 0)
      return { end: 'wiped', profile: rememberCheckpoint(open, t, shape), trip: t };
    const heart = t.encounter >= heartOf(shape);
    t = markCheckpoint({ ...t, status: heart ? 'cleared' : 'crossroads' }, shape);
    checkTrip(t, shape);
    checkCrossroads(t, shape);
    // Go home one time in four when the way is open (always from the heart).
    const choices = choicesAt(t, shape).filter((c) => !c.disabled);
    const ways = choices.filter((c) => c.kind !== 'return');
    const home = choices.find((c) => c.kind === 'return');
    const pick =
      home && (ways.length === 0 || rng.int(0, 3) === 0) ? home : ways[rng.int(0, ways.length - 1)];
    if (!pick) throw new Error('stranded');
    if (pick.kind === 'return') {
      return {
        end: heart ? 'cleared' : 'returned',
        profile: rememberCheckpoint(open, t, shape),
        trip: t,
      };
    }
    t = takeChoice(t, pick.id, shape);
  }
  throw new Error('the trip never ended');
}

describe('trip shape fuzz (DK-5a)', () => {
  for (const [name, shape] of Object.entries(FIXTURES)) {
    test(`${name}: 200 random trips keep the shape's invariants`, () => {
      const ends = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const { end, profile, trip } = walk(shape, seed);
        ends.add(end);
        const remembered = profile.city.checkpoints?.canals;
        if (trip.kit?.checkpoint) expect(remembered).toBe(shape.checkpoint?.after);
        else expect(remembered).toBeUndefined();
      }
      // Every heart is reachable and ends the trip at home.
      expect(ends).toContain('cleared');
      expect(ends).toContain('wiped');
    });
  }

  test('every district as built: the heart is a return point and ret indices name real rooms', () => {
    for (const district of DISTRICT_IDS) {
      const shape = shapeOf(district);
      if (shape.length === 0) continue;
      const heart = heartOf(shape);
      expect(policyAllows(shape.ret, heart, heart)).toBe(true);
      if (shape.ret.kind === 'landings')
        for (const i of shape.ret.after) expect(i).toBeLessThanOrEqual(heart);
      if (shape.ret.kind === 'until') expect(shape.ret.after).toBeLessThan(heart);
      if (shape.checkpoint) expect(checkpointRoom(shape.checkpoint)).toBeLessThanOrEqual(heart);
    }
  });
});
