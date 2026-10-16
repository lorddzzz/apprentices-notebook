import { TUNING } from '$data';
import type { EventLog } from './events';
import type { Coord } from './grid';
import type {
  CastSample,
  CellKey,
  GlyphDef,
  GlyphId,
  GlyphRecord,
  Profile,
  TierLevel,
  TierUp,
} from './types';

/**
 * The profiler (design research-and-mastery §4.9, plan M1–M16): harm attribution per Glyph from the
 * trace spans, per-version records, Economy and Reliability tiers and their rewards.
 *
 * W0 stubs with final signatures; task E1 fills them. Never import `run.ts` here: run.ts imports
 * this module (the effective Glyph library reads `rewardsOf`).
 */

/** Both tiers of a record or a window. */
export interface Tiers {
  economy: TierLevel;
  reliability: TierLevel;
}

/** What a version's best tiers earn (M12): ink off, the extra exit, how many open cells. */
export interface GlyphRewards {
  discount: number; // 0–3: one ink per Economy tier
  extraExit: boolean; // Reliability silver or better
  params: number; // TUNING.paramSlots, or paramSlotsGold at Reliability gold
}

/** One Glyph socket's part in one non-echo cast (M3, M4): the sample and the local cells that fired. */
export interface GlyphCast {
  glyph: GlyphId;
  version: number;
  sample: CastSample;
  fired: readonly CellKey[]; // local cell keys
}

/** The key of a version's record in `Profile.glyphRecords`: "g1@2". */
export function versionKey(id: GlyphId, version: number): string {
  return `${id}@${version}`;
}

export function emptyRecord(): GlyphRecord {
  return {
    casts: 0,
    harm: 0,
    meaningful: 0,
    recent: [],
    best: { economy: 0, reliability: 0 },
    fired: {},
  };
}

/** A version's record; a missing one reads as empty (M37). */
export function recordOf(
  p: Pick<Profile, 'glyphRecords'>,
  id: GlyphId,
  version: number,
): GlyphRecord {
  return p.glyphRecords[versionKey(id, version)] ?? emptyRecord();
}

/** Every Glyph cast in a trip battle's log, in log order (M3–M6). `p` is the profile at battle start. W0 stub. */
export function glyphSamples(_events: EventLog, _p: Profile): GlyphCast[] {
  return [];
}

/** The record after one more sample (M8): lifetime sums, the window, best tiers, fired counts. W0 stub. */
export function foldRecord(
  r: GlyphRecord,
  _sample: CastSample,
  _fired: readonly CellKey[],
): GlyphRecord {
  return r;
}

/** The tiers a full window earns; none below `TUNING.tierWindow` casts (M10, M11). W0 stub. */
export function windowTiers(_recent: readonly CastSample[]): Tiers {
  return { economy: 0, reliability: 0 };
}

/** Σ harm ÷ Σ cost over the samples (M9); 0 for none. W0 stub. */
export function economyOf(_recent: readonly CastSample[]): number {
  return 0;
}

/** The share of meaningful samples, 0–1 (M6); 0 for none. W0 stub. */
export function reliabilityOf(_recent: readonly CastSample[]): number {
  return 0;
}

/** What a record's best tiers earn (M12). W0 stub: nothing yet. */
export function rewardsOf(_record: GlyphRecord): GlyphRewards {
  return { discount: 0, extraExit: false, params: TUNING.paramSlots };
}

/** Folds a trip battle's Glyph casts into the profile's records (M7). W0 stub. */
export function recordGlyphCasts(p: Profile, _events: EventLog): Profile {
  return p;
}

/** Tiers that rose between two profiles' records, current versions only, in Glyph order (M16). W0 stub. */
export function tierUps(
  _before: Pick<Profile, 'glyphs' | 'glyphRecords'>,
  _after: Pick<Profile, 'glyphs' | 'glyphRecords'>,
): TierUp[] {
  return [];
}

/** Local cells with no fire after `TUNING.deadAfterCasts` casts of this version (M13). W0 stub. */
export function deadCells(_def: GlyphDef, _record: GlyphRecord): Coord[] {
  return [];
}

/** Local cell keys of `glyph` that fired anywhere in `events` (the desk's playback, U5). W0 stub. */
export function innerFired(_events: EventLog, _glyph: GlyphId): CellKey[] {
  return [];
}
