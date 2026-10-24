import { describe, expect, test } from 'vitest';
import {
  type ApprenticeId,
  type Beat,
  type DistrictId,
  type InventionDef,
  RECRUITS,
  type RuneId,
  TUNING,
} from '$data';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  type GameEvent,
  joinHousehold,
  newProfile,
  type Profile,
  startTrip,
  type Trip,
} from '$engine';
import { isReady, preconditionsOf, provenInvention, waitingFor } from '$engine/recruits';

/** RC-2 (recruitment plan P1, P2, P4): the hidden-until-ready check. */

const SEED = 4242;
const IDS = Object.keys(RECRUITS) as (keyof typeof RECRUITS)[];

const INV: InventionDef = {
  id: 'inv:lantern',
  name: 'Lantern',
  method: 'repeat',
  parts: ['spark'],
  solvent: null,
};

/** `n` proof masks for the draughtsman, each firing the invention's cell. */
const proven = (p: Profile, n: number): Profile => ({
  ...p,
  inventions: [INV],
  proof: {
    ...p.proof,
    draughtsman: Array.from({ length: n }, () => [{ at: { x: 1, y: 1 }, rune: INV.id }]),
  },
});

const learn = (p: Profile, runes: readonly RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});

const districtOf = (id: ApprenticeId): DistrictId | null => {
  const found = RECRUITS[id as keyof typeof RECRUITS].found;
  return 'district' in found ? found.district : null;
};

/** A trip in `district` (the shape is borrowed from a Seam start; only district and loot matter). */
const tripIn = (
  p: Profile,
  district: DistrictId,
  loot: Trip['loot'] = [],
  encounter = 0,
): Trip => ({
  ...startTrip(p, SEED),
  district,
  loot,
  encounter,
});

function holdBeat(p: Profile, b: Beat): Profile {
  switch (b.kind) {
    case 'landmark':
      return p; // the ctx's job
    case 'joined':
      return joinHousehold(p, b.who);
    case 'idiomNamed':
      return { ...p, named: [...p.named, 'idiom:bonfire'] };
    case 'provenInvention':
      return proven(p, TUNING.provenCasts);
  }
}

/** Every precondition of `id` met, at her landmark on a trip in her district when she has one. */
function allMet(id: ApprenticeId): { p: Profile; ctx: Parameters<typeof isReady>[2] } {
  const pre = preconditionsOf(id);
  let p = learn(newProfile(), [...pre.runes.all, ...(pre.runes.any ?? []).slice(0, 1)]);
  for (const b of pre.beat) p = holdBeat(p, b);
  const district = districtOf(id);
  return { p, ctx: district ? { trip: tripIn(p, district), atLandmark: true } : {} };
}

describe('preconditionsOf (P1)', () => {
  test('adds the starter-page runes outside the starting seven to the typed ones', () => {
    expect(preconditionsOf('runaway').runes).toEqual({ all: ['fuse', 'touch'] });
    expect(preconditionsOf('notary').runes).toEqual({ all: ['tally', 'splash', 'steam'] });
    expect(preconditionsOf('towelBearer').runes).toEqual({
      all: ['splash', 'steam'],
      any: ['vat', 'seep', 'steep'],
    });
    expect(preconditionsOf('warden').runes).toEqual({ all: ['hold'] });
    expect(preconditionsOf('tuner').runes).toEqual({ all: ['unison', 'brass'] });
    expect(preconditionsOf('copyist').runes).toEqual({ all: ['touch'] }); // not counted twice
    expect(preconditionsOf('exile').runes).toEqual({ all: ['swap', 'draw', 'erase'] });
  });

  test('passes the beats through and refuses the founders', () => {
    for (const id of IDS) expect(preconditionsOf(id).beat).toBe(RECRUITS[id].beat);
    expect(() => preconditionsOf('draughtsman')).toThrow(/not a recruit/);
  });
});

describe('isReady (P2): all met is ready, any single miss hides her', () => {
  test.each(IDS)('%s', (id) => {
    const { p, ctx } = allMet(id);
    expect(isReady(p, id, ctx)).toBe(true);
    const pre = preconditionsOf(id);

    for (const rune of pre.runes.all) {
      const missing = { ...p, known: p.known.filter((r) => r !== rune) };
      expect(isReady(missing, id, ctx), `without ${rune}`).toBe(false);
    }
    if (pre.runes.any) {
      const any = pre.runes.any;
      const missing = { ...p, known: p.known.filter((r) => !any.includes(r)) };
      expect(isReady(missing, id, ctx), 'without any school rune').toBe(false);
    }
    for (const b of pre.beat) {
      switch (b.kind) {
        case 'landmark':
          expect(isReady(p, id, { ...ctx, atLandmark: false }), 'off the landmark').toBe(false);
          expect(isReady(p, id, {}), 'at home').toBe(false);
          break;
        case 'joined': {
          const members = p.household.members.filter((m) => m !== b.who);
          const missing = { ...p, household: { ...p.household, members } };
          expect(isReady(missing, id, ctx), `before ${b.who} joins`).toBe(false);
          break;
        }
        case 'idiomNamed': {
          const missing = { ...p, named: p.named.filter((n) => !n.startsWith('idiom:')) };
          expect(isReady(missing, id, ctx), 'no idiom yet').toBe(false);
          break;
        }
        case 'provenInvention':
          expect(isReady(proven(p, TUNING.provenCasts - 1), id, ctx), 'one cast short').toBe(false);
          break;
      }
    }
  });

  test('a landmark only counts on a trip in her own district', () => {
    const { p } = allMet('runaway');
    expect(isReady(p, 'runaway', { trip: tripIn(p, 'canals'), atLandmark: true })).toBe(true);
    expect(isReady(p, 'runaway', { trip: tripIn(p, 'seam'), atLandmark: true })).toBe(false);
  });

  test('a page in room 2 loot makes the room 4 landmark ready; a wipe hides her again', () => {
    const p = learn(newProfile(), ['fuse']); // Touch is still missing
    expect(isReady(p, 'runaway', { trip: tripIn(p, 'canals', [], 4), atLandmark: true })).toBe(
      false,
    );
    const trip = tripIn(p, 'canals', [{ kind: 'rune', rune: 'touch' }], 4);
    expect(isReady(p, 'runaway', { trip, atLandmark: true })).toBe(true);
    // A real wipe: the trip and its pending page are gone, the profile never learned Touch.
    const start = beginEncounter(p, startTrip(p, SEED));
    const lost: BattleState = {
      ...start.state,
      phase: 'lost',
      units: start.state.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
    };
    const r = finishEncounter(p, { ...startTrip(p, SEED), loot: trip.loot }, lost, start.events);
    expect(r.trip).toBeNull();
    const next = tripIn(r.profile, 'canals', [], 4);
    expect(isReady(r.profile, 'runaway', { trip: next, atLandmark: true })).toBe(false);
  });

  test('an idiom named in a fight that wipes still counts for the Copyist (P4)', () => {
    const p = learn(joinHousehold(newProfile(), 'runaway'), ['touch']);
    expect(isReady(p, 'copyist')).toBe(false);
    const start = beginEncounter(p, startTrip(p, SEED));
    const lost: BattleState = {
      ...start.state,
      phase: 'lost',
      units: start.state.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
    };
    const named: GameEvent = { type: 'named', what: 'idiom', id: 'bonfire' };
    const r = finishEncounter(p, startTrip(p, SEED), lost, [...start.events, named]);
    expect(r.outcome).toBe('wiped');
    expect(isReady(r.profile, 'copyist')).toBe(true);
  });

  test('pure: the profile and trip are untouched', () => {
    const { p, ctx } = allMet('tuner');
    const before = structuredClone({ p, ctx });
    isReady(p, 'tuner', ctx);
    waitingFor(p, ctx?.trip);
    expect({ p, ctx }).toEqual(before);
  });
});

describe('provenInvention (P4)', () => {
  test('the first invention fired in provenCasts masks of one apprentice', () => {
    expect(provenInvention(newProfile())).toBeNull();
    expect(provenInvention(proven(newProfile(), TUNING.provenCasts - 1))).toBeNull();
    expect(provenInvention(proven(newProfile(), TUNING.provenCasts))).toEqual(INV);
  });

  test('masks are not pooled across apprentices', () => {
    const p = proven(newProfile(), 3);
    const split: Profile = { ...p, proof: { ...p.proof, stoker: p.proof.draughtsman ?? [] } };
    expect(provenInvention(split)).toBeNull();
  });
});

describe('waitingFor', () => {
  test('a fresh notebook waits for nobody until a district is heard', () => {
    const p = newProfile();
    expect(p.city.heard).toEqual(['seam']);
    expect(waitingFor(p)).toEqual([]);
    const heard: Profile = { ...p, city: { ...p.city, heard: ['seam', 'canals', 'bridges'] } };
    expect(waitingFor(heard)).toEqual(['runaway', 'warden']);
  });

  test('not once she joined or sits in the trip loot', () => {
    const p: Profile = { ...newProfile(), city: { ...newProfile().city, heard: ['canals'] } };
    expect(waitingFor(joinHousehold(p, 'runaway'))).toEqual([]);
    const trip = { ...tripIn(p, 'canals'), loot: [{ kind: 'recruit', apprentice: 'runaway' }] };
    expect(waitingFor(p, trip as unknown as Trip)).toEqual([]);
  });

  test('a door arrival waits once her beats hold (P6), runes or not', () => {
    const p = newProfile();
    expect(waitingFor(p)).not.toContain('copyist');
    const copyist = holdBeat(joinHousehold(p, 'runaway'), { kind: 'idiomNamed' });
    expect(waitingFor(copyist)).toContain('copyist');
    expect(waitingFor(proven(p, TUNING.provenCasts))).toContain('exile');
  });
});
