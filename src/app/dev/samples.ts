import { APPRENTICE_IDS, type ApprenticeId, type Drawing, type EnemyId } from '$data';
import {
  createRng,
  FOUNDERS,
  joinHousehold,
  newProfile,
  type Profile,
  startTrip,
  type Trip,
} from '$engine';
import { type GenInput, roomInput } from '$engine/drawing';

/**
 * EN-S1: the sample drawings the fuzz and the dev page (`generator.html`) feed the generator. A
 * seed picks a drawing (the current or none; one to three of the built foes whose needs it meets),
 * a length, a room and a party of two or three. Built content only: the Seam's foes and the
 * canals' eel and moth.
 */

const SEAM_FOES: readonly EnemyId[] = ['rat', 'familiar', 'sentry'];
const CANAL_FOES: readonly EnemyId[] = ['eel', 'moth'];

const recruitId = (): ApprenticeId | undefined =>
  APPRENTICE_IDS.find((id) => !FOUNDERS.includes(id));

/** The household with the founders and the first recruit in the registry, joined and ready. */
export function sampleHousehold() {
  const recruit = recruitId();
  return recruit ? joinHousehold(newProfile(), recruit) : newProfile();
}

export function sampleParty(size: 2 | 3): ApprenticeId[] {
  const recruit = recruitId();
  return size === 3 && recruit ? [...FOUNDERS, recruit] : [...FOUNDERS];
}

export function sampleInput(seed: number): GenInput {
  const rng = createRng(seed);
  const current = rng.int(0, 1) === 1;
  const pool = current ? [...SEAM_FOES, ...CANAL_FOES] : [...SEAM_FOES];
  const foes: EnemyId[] = [];
  for (let n = rng.int(1, 3); n > 0 && pool.length > 0; n--) {
    const [pick] = pool.splice(rng.int(0, pool.length - 1), 1);
    if (pick) foes.push(pick);
  }
  const length = rng.int(3, 6) as Drawing['length'];
  const drawing: Drawing = {
    name: `Sample ${seed}`,
    rule: current ? 'canals:current' : null,
    foes,
    pieces: [],
    shape: 'plain',
    length,
    heart: 'marginalia',
  };
  return {
    profile: sampleHousehold(),
    drawing,
    party: sampleParty(rng.int(0, 2) === 0 ? 2 : 3),
    seed: rng.int(1, 0x7fffffff),
    room: rng.int(0, length - 2),
  };
}

/** CAL-P: the frozen CAL-5 corpus, read-only from the test fixtures; the spike corpus above stays the default. */
export interface CalibrationCase {
  profile: Profile;
  trip: Trip;
  room: number;
  input: GenInput;
}

/** Seed `seed` takes drawing `(seed - 1) mod n` of the corpus, one room of it, on the pair household. */
export async function calibrationCase(seed: number): Promise<CalibrationCase> {
  const { CAL_DRAWINGS, CAL_PARTIES, calibrationProfile } = await import(
    '../../../tests/fixtures/calibration/drawings'
  );
  const base = calibrationProfile(CAL_PARTIES.pair);
  const drawing = CAL_DRAWINGS[(seed - 1) % CAL_DRAWINGS.length];
  if (!drawing) throw new Error('The calibration corpus is empty');
  const profile: Profile = { ...base, drawings: [drawing, null, null] };
  const trip = startTrip(profile, seed, 'inkedPage', { page: 0 });
  const room = createRng(seed).int(0, drawing.length - 1);
  return { profile, trip, room, input: roomInput(profile, trip, room) };
}
