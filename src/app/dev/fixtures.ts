import { DISTRICTS, type DistrictId } from '$data';
import {
  type Action,
  memberById,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  pushOn,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import type { WipeSummary } from '../flow';
import type { GameStore } from '../game.svelte';
import type { Route } from '../routes';
import type { ThresholdStore } from '../threshold.svelte';
import { wipeFixture } from '../tripUx';
import {
  benchProfile,
  creditsProfile,
  deskProfile,
  doorwaySave,
  emptyPartyProfile,
  FIXTURE_PAGES,
  fairCopyReadyProfile,
  fightSave,
  fullHouseProfile,
  glyphProfile,
  heldPageProfile,
  inkedPagesProfile,
  lateProfile,
  lowerProfile,
  lowerSeamProfile,
  mapFreshProfile,
  mapFrontierProfile,
  midProfile,
  mooredCrate,
  openProfile,
  paperRoom,
  RECIPE_SEED,
  rememberedCheckpoint,
  THREE_OFFERS,
  takeAll,
  threeSeats,
  tripAfter,
  tripCleared,
  unlockedSave,
  winRoom,
  wipeCrossedCheckpoint,
} from './recipes';

/**
 * UF-4 / C8: dev-only state fixtures, opened at `#/fixture?name=<id>[&step=n][&grey=1]`. Each
 * builds its save from engine calls (never from recorded JSON or `tests/`), so a save-version bump
 * cannot rot it. The loader (`loader.ts`) puts the save in a memory backend, runs `setup` for
 * state a save cannot hold, enters `route` and waits for `expect` before tapping `taps`.
 */

export type FixtureId =
  | 'threshold-canals-burnt'
  | 'study-fresh'
  | 'fight-seam'
  | 'fight-lampwater'
  | 'fight-wide-7x9'
  // UF-15a, UF-15b, UF-15f (Pack D2)
  | HomeFixtureId
  | MapFixtureId
  | GlyphFixtureId
  // UF-14 (Pack D1)
  | D1FixtureId;

/** What a setup recipe may reach besides the game: the app's transient stores and the URL's step. */
export interface FixtureContext {
  threshold: ThresholdStore;
  /** `&step=n`, or null. Recipes that freeze a replay at a step read it (FT-3's `freezeAt`). */
  step: number | null;
}

export interface Fixture {
  id: FixtureId;
  route: Route;
  params?: Record<string, string>;
  /** The save the memory backend starts from. */
  save: () => SaveData;
  /** Transient state a save cannot hold (`game.found`, `threshold.solved`, a replay). Throws when it cannot be reached. */
  setup?: (game: GameStore, ctx: FixtureContext) => void;
  /** A pending wipe for the Wiped screen (`game.wipe`). */
  wipe?: () => WipeSummary;
  /** The testid that proves the requested state mounted; taps wait for it. */
  expect: string;
  /** Testids clicked in order once `expect` has mounted. */
  taps?: string[];
  note: string;
}

// ── The canal lock (the repo's lock-solve recording, tests/fixtures/district-kit) ──

const SPARK_S = ['x Boltv x', '. Spark .', '. .     .', '. .     .', '. .     .', 'x .     x'].join(
  '\n',
);
const SHOVE_D = ['.     .   .     . .', 'Bolt> Oil Shove . .', 'x     .   .     . x'].join('\n');

/** The notebook the lock is solved with: the canals heard but barred; Pell carries Bolt, Oil, Shove. */
export function lockProfile(): Profile {
  const p = newProfile();
  const heard: DistrictId[] = ['seam', 'canals'];
  return {
    ...p,
    lattices: {
      ...p.lattices,
      draughtsman: [...parseLattice(SHOVE_D).runes],
      stoker: [...parseLattice(SPARK_S).runes],
    },
    city: { ...p.city, heard, open: ['seam'], fresh: [] },
  };
}

/** The recorded solve: one cast of Pell's first spell, aimed right (the rat is shoved into the water). */
export function lockSolveAction(state: Parameters<typeof memberById>[0]): Action {
  const spell = memberById(state, 'draughtsman').spells[0];
  if (!spell) throw new Error('Pell has no spell for the lock');
  return {
    type: 'cast',
    unit: 'draughtsman',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'right' },
  };
}

const FIXTURE_SEED = 1;

// ══ UF-15a (Pack D2): study and home ══
// Recipes live in `recipes.ts` (home section). Pending, not stubbed: `pocket-readonly`,
// `homecoming-first`, `homecoming-quiet` (their screens come with FT-25 and UH-14).

export type HomeFixtureId =
  | 'study-mid'
  | 'study-three-seats'
  | 'study-unlocked'
  | 'study-doorway'
  | 'study-trip-out'
  | 'study-first-evening'
  | 'household-full'
  | 'codex-early'
  | 'bench-mid'
  | 'bench-trial'
  | 'desk-empty'
  | 'desk-open-row'
  | 'desk-expanded';

const plain =
  (profile: () => ReturnType<typeof midProfile>): (() => SaveData) =>
  () => ({
    ...newSave(RECIPE_SEED),
    profile: profile(),
  });

const HOME_FIXTURES: Record<HomeFixtureId, Fixture> = {
  'study-mid': {
    id: 'study-mid',
    route: 'study',
    save: plain(midProfile),
    expect: 'door',
    note: 'A notebook some trips old: three seats, the Seam and the canals open, no first evening.',
  },
  'study-three-seats': {
    id: 'study-three-seats',
    route: 'study',
    save: plain(threeSeats),
    expect: 'household-open',
    note: 'The founders and a recruit seated: three seat tabs, the household button.',
  },
  'study-unlocked': {
    id: 'study-unlocked',
    route: 'study',
    save: unlockedSave,
    expect: 'desk-button',
    taps: ['rumour-line'],
    note: 'Bench, Desk and Codex all unlocked, a rumour showing, three seats. (The room objects are buttons that leave the Study, so only the rumour note is tapped.)',
  },
  'study-doorway': {
    id: 'study-doorway',
    route: 'trip',
    save: doorwaySave,
    expect: 'field-header',
    taps: ['field-done'],
    note: 'A quiet doorway (the trip route shows the Study): the Study in field mode ("A quiet doorway", Done in place of the door).',
  },
  'study-trip-out': {
    id: 'study-trip-out',
    route: 'trip',
    save: () => {
      const save = doorwaySave();
      return { ...save, profile: fullHouseProfile(), trip: save.trip };
    },
    expect: 'field-header',
    taps: ['household-open', 'shelf-lock'],
    note: 'Out on a trip the Study is only reachable in a doorway: the household sheet is open and the seats are locked ("shelf-lock").',
  },
  'study-first-evening': {
    id: 'study-first-evening',
    route: 'study',
    save: () => newSave(RECIPE_SEED),
    expect: 'first-evening',
    taps: ['first-evening', 'first-evening-page'],
    note: 'A brand-new notebook with the first-evening page open.',
  },
  'household-full': {
    id: 'household-full',
    route: 'study',
    save: plain(fullHouseProfile),
    expect: 'household-open',
    taps: ['household-open', 'bench-open'],
    note: 'Every apprentice but the owner at home (the owner joins at the handover, R14), three seated; the household sheet open.',
  },
  'codex-early': {
    id: 'codex-early',
    route: 'codex',
    save: () => newSave(RECIPE_SEED),
    expect: 'codex-entry',
    taps: ['codex-count'],
    note: 'The Codex of a new notebook: mostly unseen entries.',
  },
  'bench-mid': {
    id: 'bench-mid',
    route: 'bench',
    save: plain(benchProfile),
    expect: 'methods',
    note: 'The Bench with two method pages and a solvent in hand.',
  },
  'bench-trial': {
    id: 'bench-trial',
    route: 'bench',
    params: { page: 'lamplighter:lantern' },
    save: plain(heldPageProfile),
    expect: 'page-trial',
    note: 'A held rival page tried on its authored board (the Bench opened with `?page=`).',
  },
  'desk-empty': {
    id: 'desk-empty',
    route: 'desk',
    save: plain(() => deskProfile(false)),
    expect: 'desk-empty',
    note: 'The footnote desk with no rune that has earned a point: the voice line.',
  },
  'desk-open-row': {
    id: 'desk-open-row',
    route: 'desk',
    save: plain(() => deskProfile(true)),
    expect: 'desk-open-shove',
    note: 'One rune row (Shove) with a margin line open to write.',
  },
  'desk-expanded': {
    id: 'desk-expanded',
    route: 'desk',
    save: plain(() => deskProfile(true)),
    expect: 'desk-subject-shove',
    taps: ['desk-subject-shove', 'desk-margin'],
    note: 'The Shove row opened: its margin column shows.',
  },
};

// ══ UF-15b (Pack D2): the map and the Set-out sheet ══
// Set out is a Sheet the map opens by a tap on a district node; the last tap waits for a testid
// the sheet itself shows, so a fixture whose sheet did not open fails.

export type MapFixtureId =
  | 'map-fresh'
  | 'map-frontier'
  | 'map-lower-seam'
  | 'map-inked-pages'
  | 'setout-seam'
  | 'setout-startpoint'
  | 'setout-empty-party'
  | 'setout-drawn-page';

const MAP_FIXTURES: Record<MapFixtureId, Fixture> = {
  'map-fresh': {
    id: 'map-fresh',
    route: 'map',
    save: plain(mapFreshProfile),
    expect: 'open-seam',
    note: 'A new notebook: only the Seam is on the map.',
  },
  'map-frontier': {
    id: 'map-frontier',
    route: 'map',
    save: plain(mapFrontierProfile),
    expect: 'node-canals',
    taps: ['node-inkQuarter'],
    note: 'The Seam open, the canals and the Ink Quarter heard of but barred (the frontier).',
  },
  'map-lower-seam': {
    id: 'map-lower-seam',
    route: 'map',
    save: plain(lowerSeamProfile),
    expect: 'under-seam',
    taps: ['stair-floors', 'floor-canals'],
    note: 'The Seam heart cleared: the stair, its floors and "Go down" hang under the Seam node.',
  },
  'map-inked-pages': {
    id: 'map-inked-pages',
    route: 'map',
    save: plain(inkedPagesProfile),
    expect: 'under-pages',
    note: 'After the handover with one drawn page: its node hangs under the Seam (setout-drawn-page taps it).',
  },
  'setout-seam': {
    id: 'setout-seam',
    route: 'map',
    save: plain(mapFreshProfile),
    expect: 'open-seam',
    taps: ['open-seam', 'carry'],
    note: 'The Seam node tapped: the Set out sheet with the party and what it carries (the Seam has no checkpoint, so no start radios).',
  },
  'setout-startpoint': {
    id: 'setout-startpoint',
    route: 'map',
    save: plain(() => rememberedCheckpoint(mapFreshProfile())),
    expect: 'open-cartographers',
    taps: ['open-cartographers', 'starts', 'start-checkpoint'],
    note: "Recipe `rememberedCheckpoint`: the city remembers the Cartographers' quiet doorway, so Set out offers the start-point radios.",
  },
  'setout-empty-party': {
    id: 'setout-empty-party',
    route: 'map',
    save: plain(emptyPartyProfile),
    expect: 'open-seam',
    taps: ['open-seam', 'no-party'],
    note: 'Nobody in a trip slot: Set out is disabled and the sheet says why.',
  },
  'setout-drawn-page': {
    id: 'setout-drawn-page',
    route: 'map',
    save: plain(inkedPagesProfile),
    expect: 'page-0',
    taps: ['page-0', 'drawn-page'],
    note: "A drawn page tapped: Set out opens with the page's name, depth and facts.",
  },
};

// ══ UF-15f (Pack D2): Glyph and Fair copy recipes ══
// The sheets are Study-local state, so each recipe opens its sheet through `taps`, every tap waiting
// for a testid the previous one made appear. Glyph fixtures share `glyphProfile` (a folded Glyph with
// a played record); `faircopy-ready` shares `fairCopyReadyProfile` (a proven chain, nothing folded).

export type GlyphFixtureId =
  | 'faircopy-ready'
  | 'glyph-ranking'
  | 'glyph-profiler'
  | 'glyph-settings'
  | 'glyph-revision';

/** Study → pull the rune drawer up ("Ranked ›" hides while it rests) → Glyphs tab → "Ranked ›": the ranked list sheet. */
const TO_RANKING = ['drawer-pull', 'tab-glyphs', 'ranked'];
/** ...→ the first row: the Glyph's sheet (profiler, settings, rename). */
const TO_GLYPH = [...TO_RANKING, 'rank-row'];

const GLYPH_FIXTURES: Record<GlyphFixtureId, Fixture> = {
  'faircopy-ready': {
    id: 'faircopy-ready',
    route: 'study',
    save: plain(fairCopyReadyProfile),
    expect: 'fair-mode',
    taps: ['fair-mode', 'fair-info'],
    note: 'The Study in Fair copy mode: the proven chain glows and the info panel offers to fold it.',
  },
  'glyph-ranking': {
    id: 'glyph-ranking',
    route: 'study',
    save: plain(glyphProfile),
    expect: 'tab-glyphs',
    taps: [...TO_RANKING, 'glyph-ranking'],
    note: 'The ranked list of Glyphs (sheet) over the Study.',
  },
  'glyph-profiler': {
    id: 'glyph-profiler',
    route: 'study',
    save: plain(glyphProfile),
    expect: 'tab-glyphs',
    taps: [...TO_GLYPH, 'glyph-profiler'],
    note: 'The Glyph sheet: the profiler (header, inside, ink, versions).',
  },
  'glyph-settings': {
    id: 'glyph-settings',
    route: 'study',
    save: plain(glyphProfile),
    expect: 'tab-glyphs',
    taps: [...TO_GLYPH, 'glyph-settings-toggle', 'glyph-open-count'],
    note: 'The Glyph sheet with its settings unfolded (open cells, extra exit).',
  },
  'glyph-revision': {
    id: 'glyph-revision',
    route: 'study',
    save: plain(glyphProfile),
    expect: 'tab-glyphs',
    taps: [...TO_GLYPH, 'glyph-revise', 'revision-editor'],
    note: 'The revision editor open on the Glyph ("Revise…").',
  },
};

// ── Pack D1 (UF-14a/b/c): trip, wipe and ending late states ──
// A separate block so the parallel packs' fixtures merge without touching it.

export type D1FixtureId =
  | 'threshold-canals'
  | 'threshold-nothing'
  | 'crossroads-seam'
  | 'crossroads-span'
  | 'crossroads-no-way-home'
  | 'cleared-seam'
  | 'cleared-lower-seam'
  | 'loot-three'
  | 'loot-bonus'
  | 'loot-paper-found'
  | 'wiped-seam'
  | 'wiped-first-room'
  | 'wiped-crossed-checkpoint'
  | 'wiped-nothing-lost'
  | 'drawing-blank'
  | 'drawing-two-inked'
  | 'handover-ready'
  | 'credits-full';

/** A fresh save on `profile`, at home or out on `trip`. */
function saveOn(profile: Profile, trip: Trip | null = null): SaveData {
  return { ...newSave(FIXTURE_SEED), profile, trip };
}

/** The seam trip's first room, won and still looting. */
function seamLooting(profile: Profile): Trip {
  return winRoom(profile, startTrip(profile, 7, 'seam'));
}

const D1_FIXTURES: Record<D1FixtureId, Fixture> = {
  'threshold-canals': {
    id: 'threshold-canals',
    route: 'threshold',
    params: { d: 'canals' },
    save: () => saveOn(lockProfile()),
    expect: 'threshold-goal',
    note: 'The canal lock as the party first finds it: heard, barred, the live room with its goal line. UT-6 puts an intro stage in front (tap `enter`): see the todo in the test.',
  },
  'threshold-nothing': {
    id: 'threshold-nothing',
    route: 'threshold',
    params: { d: 'canals' },
    save: () => saveOn(openProfile(['canals'])),
    expect: 'threshold-note',
    note: 'A threshold link to a district that is already open: no plan, "Nothing to try here" with its one line of voice.',
  },
  'crossroads-seam': {
    id: 'crossroads-seam',
    route: 'trip',
    save: () => {
      const p = newProfile();
      return saveOn(p, tripAfter(p, 'seam', 1));
    },
    expect: 'push',
    note: 'The Seam after room 1: the one way on, and the way home with the finds kept.',
  },
  'crossroads-span': {
    id: 'crossroads-span',
    route: 'trip',
    save: () => {
      const p = openProfile(['bridges']);
      return saveOn(p, tripAfter(p, 'bridges', 1));
    },
    expect: 'way-sound',
    note: 'The bridges after room 1: two span cards (the sound span, the crumbling span) instead of Push on.',
  },
  'crossroads-no-way-home': {
    id: 'crossroads-no-way-home',
    route: 'trip',
    save: () => {
      const p = openProfile(['cartographers']);
      return saveOn(p, tripAfter(p, 'cartographers', 3));
    },
    expect: 'no-way-home',
    note: 'The Cartographers after room 3, the last crossroads with a way home: the push warns "no way home" for the rooms after it.',
  },
  'cleared-seam': {
    id: 'cleared-seam',
    route: 'trip',
    save: () => {
      const p = newProfile();
      return saveOn(p, tripCleared(p, 'seam'));
    },
    expect: 'cleared',
    note: 'The Seam cleared to its heart: the way home is all that is left, with the whole trip carried.',
  },
  'cleared-lower-seam': {
    id: 'cleared-lower-seam',
    route: 'trip',
    save: () => {
      const p = lowerProfile();
      return saveOn(p, tripCleared(p, 'lowerSeam'));
    },
    expect: 'cleared',
    note: 'The lowest floor of the lower Seam cleared: "The stair ends here", with the owner-door line when it applies.',
  },
  'loot-three': {
    id: 'loot-three',
    route: 'trip',
    save: () => {
      const p = newProfile();
      const t = seamLooting(p);
      return saveOn(p, { ...t, offers: [...THREE_OFFERS], picksLeft: 1 });
    },
    expect: 'offers',
    note: 'Room 1 won, three cards to choose from: a rune the notebook lacks, ink, a district card; one pick.',
  },
  'loot-bonus': {
    id: 'loot-bonus',
    route: 'trip',
    save: () => {
      const p = openProfile(['canals']);
      // The canals' second room carries the mooring bonus: met by the moored-crate event in its log.
      const t = takeAll(winRoom(p, startTrip(p, 7, 'canals')));
      return saveOn(p, winRoom(p, pushOn(t), [mooredCrate()]));
    },
    expect: 'bonus-pick',
    note: 'The canals room 2 won with the crate moored: the "bonus pick earned" line and one more pick to take.',
  },
  'loot-paper-found': {
    id: 'loot-paper-found',
    route: 'trip',
    save: () => {
      const p = openProfile(['bathhouses']);
      return saveOn(p, paperRoom(p, 'bathhouses').trip);
    },
    setup: (game) => {
      const trip = game.save.trip;
      if (!trip) throw new Error('No trip to file a paper in');
      const { paper, room } = paperRoom(game.profile, 'bathhouses');
      game.found = { seed: trip.seed, room, paper };
    },
    expect: 'paper-found',
    note: "A bathhouses room won that filed its paper (a bather's ledger) for the first time: the transient `game.found` notice above the offers.",
  },
  'wiped-seam': {
    id: 'wiped-seam',
    route: 'trip',
    save: () => saveOn(newProfile()),
    wipe: () => wipeFixture('seam'),
    expect: 'wiped',
    note: 'A two-room Seam run from zero (one cleared, one fell) with a provable cause, a lost find and the final battle kept.',
  },
  'wiped-first-room': {
    id: 'wiped-first-room',
    route: 'trip',
    save: () => saveOn(newProfile()),
    wipe: () => wipeFixture('first-room'),
    expect: 'wiped',
    note: 'A checkpoint-start run (Cartographers, from the quiet doorway) that fell in its first room: one `fell` line, the neutral cause, the final kept.',
  },
  'wiped-crossed-checkpoint': {
    id: 'wiped-crossed-checkpoint',
    route: 'trip',
    save: () => saveOn(newProfile()),
    wipe: () => wipeCrossedCheckpoint(),
    expect: 'wiped',
    note: 'A start-from-zero Cartographers run that cleared three rooms, crossing the checkpoint, and fell in the fourth.',
  },
  'wiped-nothing-lost': {
    id: 'wiped-nothing-lost',
    route: 'trip',
    save: () => saveOn(newProfile()),
    wipe: () => wipeFixture('nothing-lost'),
    expect: 'wiped',
    note: 'The older minimal summary: an encounter, nothing lost, nothing learned; no rooms, cause or final (See it is hidden).',
  },
  'drawing-blank': {
    id: 'drawing-blank',
    route: 'drawing',
    save: () => saveOn({ ...lateProfile(), ending: { handover: true, creditsSeen: false } }),
    expect: 'drawing-table',
    note: 'The drawing table after the handover, no page drawn yet: three blank slots.',
  },
  'drawing-two-inked': {
    id: 'drawing-two-inked',
    route: 'drawing',
    save: () =>
      saveOn({
        ...lateProfile(),
        ending: { handover: true, creditsSeen: false },
        drawings: [...FIXTURE_PAGES, null],
      }),
    expect: 'drawing-table',
    note: 'The drawing table with two pages inked (the plain Seam, the wet room) and one slot free.',
  },
  'handover-ready': {
    id: 'handover-ready',
    route: 'handover',
    save: () => saveOn(lateProfile()),
    expect: 'handover-page',
    note: "The owner's door open (hearts cleared, full household), the handover not yet performed: the first leaf of the scene.",
  },
  'credits-full': {
    id: 'credits-full',
    route: 'credits',
    save: () => saveOn(creditsProfile()),
    expect: 'credits-reel',
    note: 'The credits for a finished household: every district open, every heart cleared, all nine apprentices joined.',
  },
};

export const FIXTURES: Record<FixtureId, Fixture> = {
  ...HOME_FIXTURES,
  ...MAP_FIXTURES,
  ...GLYPH_FIXTURES,
  ...D1_FIXTURES,
  'threshold-canals-burnt': {
    id: 'threshold-canals-burnt',
    route: 'threshold',
    params: { d: 'canals' },
    save: () => ({ ...newSave(FIXTURE_SEED), profile: lockProfile() }),
    setup: (_game, { threshold }) => {
      const gate = DISTRICTS.canals.gate;
      if (gate.kind !== 'threshold') throw new Error('The canals have no threshold');
      const plan = threshold.load('canals');
      const session = threshold.session;
      if (!plan.ok || session === null) throw new Error(plan.ok ? 'No lock session' : plan.why);
      void session.dispatch(lockSolveAction(session.state));
      session.skip();
      if (!threshold.won) throw new Error('The lock-solve replay did not win the lock');
      threshold.finish();
    },
    expect: 'threshold-solved',
    note: 'The canal lock just solved by replaying the recorded Bolt, Oil, Shove cast: the gate burns (transient threshold.solved).',
  },
  'study-fresh': {
    id: 'study-fresh',
    route: 'study',
    save: () => newSave(FIXTURE_SEED),
    expect: 'study',
    note: 'A brand-new notebook in the Study.',
  },
  // UF-15c: static fight boards, the first room of a fresh trip (`setOut`, then the Combat
  // screen's own `startBattle`). `end-turn` only mounts once the intro has played and the party
  // may act, so the idle state is what the loader waits for.
  'fight-seam': {
    id: 'fight-seam',
    route: 'trip',
    save: () => fightSave('seam', lockProfile()),
    expect: 'end-turn',
    note: 'The Seam, first fight, at its real 6×6 board: idle, the party to move.',
  },
  'fight-lampwater': {
    id: 'fight-lampwater',
    route: 'trip',
    save: () => fightSave('canals', lockProfile()),
    expect: 'end-turn',
    note: 'Lampwater (the canals), first fight, at its real 5×9 board (no Lampwater room is 7×9: rooms run 5×9, 6×9, 7×7, 6×9, 7×8): idle, the party to move.',
  },
  'fight-wide-7x9': {
    id: 'fight-wide-7x9',
    route: 'trip',
    save: () => fightSave('bridges', lockProfile()),
    expect: 'end-turn',
    note: 'The Fog Arches (bridges), first fight, 7 columns × 9 rows: the widest and tallest board a trip opens on. Idle, the party to move.',
  },
};

export function fixtureIds(): FixtureId[] {
  return Object.keys(FIXTURES) as FixtureId[];
}

export function isFixtureId(name: string | null): name is FixtureId {
  return name !== null && Object.hasOwn(FIXTURES, name);
}
