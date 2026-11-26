import {
  APPRENTICE_IDS,
  type DistrictId,
  FOOTNOTES,
  METHOD_IDS,
  RUNE_IDS,
  type RuneId,
  SOLVENT_IDS,
} from '$data';
import {
  joinHousehold,
  newSave,
  type Profile,
  type SaveData,
  setSlot,
  startTrip,
  type TripRecap,
} from '$engine';
import { setOut } from '../flow';
import { sampleHousehold, sampleParty } from './samples';

/**
 * UF-15 / R21: the setup recipes the fixtures share. Each builds a profile or save from engine
 * calls (never recorded JSON, never `tests/`), so a save-version bump cannot rot them. Sections:
 * home (UF-15a), map (UF-15b), glyph and Fair copy (UF-15f). The fight fixtures (UF-15c/d) keep
 * their recipes in their own section of this file.
 */

export const RECIPE_SEED = 1;

/**
 * A notebook out on a trip into `district`, standing at the first room's fight (status `fight`,
 * encounter 0, no actions yet). The district is opened in the city so `setOut` accepts it; the
 * party is `profile`'s (the fixtures pass the lock notebook: Pell and the stoker, each with a spell). `startBattle(save)` then
 * gives the real board, and the Combat screen shows it with the intro playing and then idle.
 */
export function fightSave(district: DistrictId, p: Profile): SaveData {
  // A save keeps heard ⊇ open (K-19), so the district is heard as well as open.
  const heard = [...new Set([...p.city.heard, district])];
  const open = [...new Set([...p.city.open, district])];
  const save = { ...newSave(RECIPE_SEED), profile: { ...p, city: { ...p.city, heard, open } } };
  return setOut(save, district);
}

// ══ Home (UF-15a): the study, the household, the codex, the bench and the desk ══

/** The founders plus the first recruit, all three seated (the Study's three seat tabs). */
export function threeSeats(): Profile {
  const p = sampleHousehold();
  const third = sampleParty(3)[2];
  if (third === undefined) throw new Error('No recruit to seat');
  return learnPages(setSlot(p, 2, third));
}

/** The notebook knows every rune its household's pages already carry (a recruit arrives with their own page). */
export function learnPages(p: Profile): Profile {
  const isRune = (r: string): r is RuneId => (RUNE_IDS as readonly string[]).includes(r);
  const runes = p.household.members.flatMap((id) =>
    (p.lattices[id] ?? []).flatMap((r) => ('rune' in r && isRune(r.rune) ? [r.rune] : [])),
  );
  return { ...p, known: [...new Set([...p.known, ...runes])] };
}

/** A notebook some trips old: the Seam and the canals open, one cast made (no first evening). */
export function midProfile(): Profile {
  const p = threeSeats();
  return {
    ...p,
    city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'], fresh: [] },
    ledger: { casts: 12, biggest: null, districts: ['seam', 'canals'] },
  };
}

/** The rumour the Study window shows: a district heard by rumour (only the Seam, lower Seam and drawn page are, `heardVoice`). */
export function rumourRecap(heard: DistrictId = 'lowerSeam'): TripRecap {
  return {
    district: 'seam',
    outcome: 'returned',
    encounter: 1,
    place: 'The Seam',
    stats: {
      fights: 2,
      spells: [],
      biggestChain: null,
      discoveries: [],
      proofCasts: 0,
      elegance: [],
      heard: [heard],
    },
  };
}

/** A footnote point count that reaches rune level I, so the Desk opens. */
const POINTS = FOOTNOTES.levels.rune[0];

/** Mid notebook with the Bench (a method page), the Desk (a rune with points) and a rumour all unlocked. */
export function unlockedSave(): SaveData {
  const p = midProfile();
  const method = METHOD_IDS[0];
  return {
    ...newSave(RECIPE_SEED),
    profile: {
      ...p,
      methods: [method],
      witnessed: ['shove:wall'],
      footnotes: { shove: { points: POINTS, slots: {} } },
      known: [...new Set([...p.known, 'shove' as const])],
    },
    lastTrip: rumourRecap(),
  };
}

/** Every apprentice the household can hold at home: all but the owner, who joins only at the handover (R14). */
export function fullHouseProfile(): Profile {
  let p = threeSeats();
  for (const id of APPRENTICE_IDS) if (id !== 'owner') p = joinHousehold(p, id);
  return learnPages(p);
}

/**
 * A trip stopped in a quiet doorway (the Study in field mode): the Seam trip with its status
 * moved to `doorway`, as the engine's own doorway test does.
 */
export function doorwaySave(): SaveData {
  const profile = threeSeats();
  return {
    ...newSave(RECIPE_SEED),
    profile,
    trip: { ...startTrip(profile, RECIPE_SEED), status: 'doorway' },
  };
}

/** A desk with one rune row open to write: the rune is known, has points and its line was witnessed. */
export function deskProfile(open: boolean): Profile {
  const p = midProfile();
  if (!open) return p;
  return {
    ...p,
    known: [...new Set([...p.known, 'shove' as const])],
    witnessed: ['shove:wall'],
    footnotes: { shove: { points: POINTS, slots: {} } },
  };
}

/** The Bench with a method page, a solvent and a Seam trip behind it. */
export function benchProfile(): Profile {
  const p = midProfile();
  const solvent = SOLVENT_IDS[0];
  return {
    ...p,
    methods: METHOD_IDS.slice(0, 2),
    solvents: { ...p.solvents, [solvent]: 2 },
    solventsFound: [...new Set([...p.solventsFound, solvent])],
  };
}

/** A held rival page (the Lamplighter's lantern) for the Bench's page trial on its authored board. */
export function heldPageProfile(): Profile {
  return { ...midProfile(), pages: ['lamplighter:lantern'] };
}
