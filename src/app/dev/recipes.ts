import {
  APPRENTICE_IDS,
  type DistrictId,
  type Drawing,
  FOOTNOTES,
  METHOD_IDS,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SOLVENT_IDS,
  TUNING,
} from '$data';
import type { PaperId } from '$data/districts/index';
import {
  type BattleState,
  beginEncounter,
  type CastSample,
  type Cluster,
  clustersOf,
  compileGlyph,
  type FiredCell,
  finishEncounter,
  type GameEvent,
  type GlyphDef,
  type GlyphRecord,
  joinHousehold,
  type LootItem,
  latticeOf,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  pickLoot,
  pushOn,
  type SaveData,
  setMemberLattice,
  setSlot,
  startTrip,
  type Trip,
  type TripRecap,
  takeChoice,
  versionKey,
} from '$engine';
import { shapeOf } from '$engine/trip/shape';
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

// ══ Map (UF-15b): the city map and the Set-out sheet ══

const cityOf = (p: Profile, open: readonly DistrictId[], heard: readonly DistrictId[] = []) => ({
  ...p.city,
  heard: [...new Set([...open, ...heard])],
  open: [...open],
  fresh: [],
});

/** A new notebook: only the Seam is on the map. */
export const mapFreshProfile = (): Profile => threeSeats();

/** The Seam open, two districts heard of but barred (their nodes are smudged, the frontier). */
export function mapFrontierProfile(): Profile {
  const p = threeSeats();
  return { ...p, city: cityOf(p, ['seam'], ['canals', 'inkQuarter']) };
}

/** The Marginalia fallen (the Seam's heart cleared) with floors open below: the stair and its floors. */
export function lowerSeamProfile(): Profile {
  const p = threeSeats();
  return {
    ...p,
    city: {
      ...cityOf(p, ['seam', 'canals', 'inkQuarter']),
      hearts: ['seam'],
    },
  };
}

/**
 * The checkpoint recipe (copied from the Cartographers' own rule, `rememberCheckpoint`): the city
 * remembers the quiet doorway, so Set out offers "start past it". The Seam has no checkpoint, so
 * the start-point radios are only ever offered for a district that has one.
 */
export function rememberedCheckpoint(p: Profile): Profile {
  const after = shapeOf('cartographers').checkpoint?.after;
  if (after === undefined) throw new Error('The Cartographers have no checkpoint to remember');
  return {
    ...p,
    city: {
      ...cityOf(p, [...new Set([...p.city.open, 'cartographers' as const])]),
      checkpoints: { ...p.city.checkpoints, cartographers: after },
    },
  };
}

/** The drawing the plain Seam page uses (tests/drawing/fixtures.ts, copied): drawable with a pen of 3. */
export const PLAIN_SEAM_PAGE: Drawing = {
  name: 'Plain Seam',
  rule: null,
  foes: ['rat', 'familiar', 'sentry'],
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: 'marginalia',
};

/** A household past the handover (copied from `handoverProfile`) with one drawn page in slot 0. */
export function inkedPagesProfile(): Profile {
  const p = sampleHousehold();
  return {
    ...p,
    ending: { handover: true, creditsSeen: false },
    foesMet: ['rat', 'familiar', 'sentry'],
    // heard ⊇ open ⊇ hearts: the save boundary refuses a ladder that skips a rung.
    city: { ...cityOf(p, ['seam', 'canals']), hearts: ['seam'] },
    known: [...new Set([...p.known, ...(Object.keys(RUNES) as Profile['known'])])],
    drawings: [PLAIN_SEAM_PAGE, null, null],
  };
}

/** Nobody in a trip slot: Set out is disabled and says why. */
export function emptyPartyProfile(): Profile {
  let p = threeSeats();
  for (const slot of [0, 1, 2] as const) p = setSlot(p, slot, null);
  return p;
}

// ══ Glyph and Fair copy (UF-15f): a proven chain, a folded Glyph with a record ══

/** Pell's page. The glyph fixtures open his seat (the Study's first). */
export const GLYPH_MEMBER = 'draughtsman' as const;
/** One chain of four runes the proof recipe fires as a whole spell (tests/app/faircopy.test.ts, copied). */
const PROVEN_CHAIN = 'Bolt> Ink Tally Spark .';

/**
 * Pell's page holds `ascii` and `casts` copies of its whole spell are on record as proof, so the
 * cells glow (Fair copy shows up) and `compileGlyph` accepts the cluster.
 */
export function provenPage(p: Profile, ascii = PROVEN_CHAIN, casts = TUNING.provenCasts): Profile {
  let next = setMemberLattice(p, GLYPH_MEMBER, parseLattice(ascii));
  const lattice = latticeOf(next, GLYPH_MEMBER);
  const whole = largestSpell(next);
  const mask: FiredCell[] = whole.cells.map((at) => {
    const r = lattice.runes.find((x) => x.at.x === at.x && x.at.y === at.y);
    if (!r || 'glyph' in r) throw new Error('No rune under a proven cell');
    return r.dir ? { at, rune: r.rune, dir: r.dir } : { at, rune: r.rune };
  });
  // Written as the field itself: proof is the engine's to record (`recordProof`, pinned to src/engine).
  const masks = Array.from({ length: Math.min(casts, TUNING.proofMasksPerMember) }, () =>
    mask.map((f) => ({ ...f })),
  );
  next = { ...next, proof: { ...next.proof, [GLYPH_MEMBER]: masks } };
  // The household knows the runes it wrote (a loadout with an unknown rune blocks the door).
  return learnPages(next);
}

function largestSpell(p: Profile): Cluster {
  const whole = clustersOf(latticeOf(p, GLYPH_MEMBER))
    .filter((c) => c.kind === 'spell')
    .sort((a, b) => b.cells.length - a.cells.length)[0];
  if (!whole) throw new Error('The page holds no spell cluster');
  return whole;
}

/** The Study in Fair copy's reach: a proven chain on Pell's page, three seats. */
export function fairCopyReadyProfile(): Profile {
  return provenPage(threeSeats());
}

/** A Glyph record with `casts` meaningful casts at tier silver on both measures (extra exit, one open cell). */
function glyphRecord(def: GlyphDef, casts = 12): GlyphRecord {
  const recent: CastSample[] = Array.from({ length: Math.min(casts, TUNING.tierWindow) }, () => ({
    harm: 4,
    cost: 3,
    meaningful: true,
  }));
  const fired = Object.fromEntries(def.cells.map((c) => [`${c.at.x},${c.at.y}`, casts]));
  return {
    casts,
    harm: casts * 4,
    meaningful: casts,
    recent,
    best: { economy: 2, reliability: 2 },
    fired,
  };
}

/**
 * Pell's proven chain folded into the Glyph "Cashing In" (v1) with a played record: the Glyph shelf,
 * the ranked list, the profiler, the settings and the revision editor all have something to show.
 */
export function glyphProfile(): Profile {
  const p = provenPage({ ...threeSeats(), vellum: 5 });
  const folded = compileGlyph(p, GLYPH_MEMBER, largestSpell(p), 'Cashing In');
  const def = folded.glyphs[0];
  if (!def) throw new Error('The Fair copy made no Glyph');
  return {
    ...folded,
    glyphRecords: { ...folded.glyphRecords, [versionKey(def.id, def.version)]: glyphRecord(def) },
  };
}

/**
 * UF-14 / R21: setup recipes for the fixtures. Dev code only: every one is built from engine
 * calls (never from `tests/`, never from recorded JSON), so a save-version bump cannot rot them.
 * The patterns are copied from `tests/drawing/fixtures.ts` and the crossroads tests.
 */

// ── Pack D1 · UF-14a: trip late states ──────────────────────────────────────

/** A notebook with `open` districts heard and open after the Seam. */
export function openProfile(open: readonly DistrictId[] = []): Profile {
  const p = newProfile();
  const all: DistrictId[] = ['seam', ...open];
  return { ...p, city: { ...p.city, heard: all, open: all } };
}

/** The battle as if the party had won it (the crossroads tests' `won`). */
function won(b: BattleState): BattleState {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
}

/** Wins the current room through the engine's own close: the trip is looting (or the way on). */
export function winRoom(p: Profile, t: Trip, log: readonly GameEvent[] = []): Trip {
  const end = finishEncounter(p, t, won(beginEncounter(p, t).state), [...log]);
  if (!end.trip) throw new Error('The room did not close into a trip');
  return end.trip;
}

/** Takes every pick of the looting trip (the first offer each time). */
export function takeAll(t: Trip): Trip {
  let trip = t;
  for (let guard = 0; guard < 12 && trip.status === 'looting'; guard++) trip = pickLoot(trip, 0);
  return trip;
}

/** Goes on from a crossroads: the module's way on if it has one named, else push on. */
function goOn(t: Trip, way: string | undefined): Trip {
  return way === undefined ? pushOn(t) : takeChoice(t, way);
}

/**
 * A trip that has won `rooms` rooms and taken all its picks: standing at the next crossroads (or
 * cleared, past the heart). `ways[i]` names the crossroads choice taken after room `i`.
 */
export function tripAfter(
  p: Profile,
  district: DistrictId,
  rooms: number,
  ways: readonly (string | undefined)[] = [],
): Trip {
  let t = startTrip(p, 7, district);
  for (let i = 0; i < rooms; i++) {
    if (t.status === 'crossroads') t = goOn(t, ways[i - 1]);
    t = takeAll(winRoom(p, t));
  }
  return t;
}

/** Wins rooms until the trip is cleared (the heart won and its picks taken). */
export function tripCleared(p: Profile, district: DistrictId): Trip {
  let t = startTrip(p, 7, district);
  for (let guard = 0; guard < 20 && t.status !== 'cleared'; guard++) {
    if (t.status === 'crossroads') t = pushOn(t);
    t = takeAll(winRoom(p, t));
  }
  if (t.status !== 'cleared') throw new Error(`${district} did not clear`);
  return t;
}

/** The canals' crate, moored: a room's mooring bonus (one more pick) is met by this event. */
export function mooredCrate(): GameEvent {
  return {
    type: 'moored',
    unit: { id: 'barge-1', name: 'Crate', at: { x: 0, y: 0 }, member: false },
    at: { x: 0, y: 0 },
  };
}

/** The first paper a won room files for the first time, with the room it was filed in. */
export function filedPaper(
  p: Profile,
  t: Trip,
): { trip: Trip; paper: PaperId; room: number } | null {
  const end = finishEncounter(p, t, won(beginEncounter(p, t).state), []);
  return end.trip && end.paper ? { trip: end.trip, paper: end.paper, room: t.encounter } : null;
}

/** Three cards: a rune the notebook lacks, ink, and a district card (a key). */
export const THREE_OFFERS: readonly LootItem[] = [
  { kind: 'rune', rune: 'fork' },
  { kind: 'ink', amount: 2 },
  { kind: 'key', district: 'canals' },
];

/** A notebook the lower Seam is open on: the Seam's heart fallen, the canals open as its one floor. */
export function lowerProfile(): Profile {
  const p = openProfile(['canals']);
  return { ...p, city: { ...p.city, hearts: ['seam'] } };
}

/** The first room of `district` whose win files a paper for the first time: that room, won and looting. */
export function paperRoom(
  p: Profile,
  district: DistrictId,
): { trip: Trip; paper: PaperId; room: number } {
  let t = startTrip(p, 7, district);
  for (let guard = 0; guard < 8; guard++) {
    const found = filedPaper(p, t);
    if (found) return found;
    t = takeAll(winRoom(p, t));
    if (t.status === 'crossroads') t = pushOn(t);
  }
  throw new Error(`No ${district} room files a paper`);
}
