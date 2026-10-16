import type { Coord, Dir } from './grid';
import type { CellKey, GlyphDef, GlyphId, GlyphInside, GlyphRecord, Profile } from './types';

/**
 * Versions and revisions (design research-and-mastery §4.8, plan M17–M20): editing a Glyph's
 * inside at home makes a new version with a fresh record; revert is free; open cells and the extra
 * exit are settings of the current version.
 *
 * W0 stubs with final signatures; task E2 fills them. Profile changes return a new profile and throw
 * an Error with a readable reason when refused.
 */

/** Why an inside can't be saved (M18). Not `blocking` = a draft's test may still run (M34). */
export interface InsideIssue {
  kind: 'entry' | 'kind' | 'source' | 'size' | 'stranded' | 'aura' | 'arrow' | 'canvas' | 'overlap';
  at?: Coord; // local cell
  message: string;
  blocking: boolean;
}

/** The editor's canvas in local coordinates: the inside's bounding box plus a ring of 1, ≤ 7 × 7 (M18). */
export interface RevisionCanvas {
  origin: Coord; // top-left local cell
  width: number;
  height: number;
}

/** One version of a Glyph, with its record (the Versions list). */
export interface GlyphVersion {
  def: GlyphDef;
  record: GlyphRecord;
  current: boolean;
}

/** What a revision edits. */
export function insideOf(def: GlyphDef): GlyphInside {
  return { kind: def.kind, cells: def.cells, entry: def.entry };
}

/** W0 stub. */
export function revisionCanvas(_inside: GlyphInside): RevisionCanvas {
  return { origin: { x: 0, y: 0 }, width: 1, height: 1 };
}

/** Every rule of M18 the inside breaks. W0 stub: none. */
export function insideIssues(_inside: GlyphInside): InsideIssue[] {
  return [];
}

/** The exits and idiom an inside has (recomputed on every revision, M18). W0 stub. */
export function innerMeta(_inside: GlyphInside): {
  exits: GlyphDef['exits'];
  idiom: string | null;
} {
  return { exits: [], idiom: null };
}

/** Saves `inside` as version max + 1 with a fresh record; the old one goes to the archive (M17, M20). W0 stub. */
export function reviseGlyph(p: Profile, _id: GlyphId, _inside: GlyphInside): Profile {
  return p;
}

/** Swaps the current version with archived `version`; both keep their records (M17). W0 stub. */
export function revertGlyph(p: Profile, _id: GlyphId, _version: number): Profile {
  return p;
}

/** Every version of a Glyph, newest first. W0 stub. */
export function glyphVersions(_p: Profile, _id: GlyphId): GlyphVersion[] {
  return [];
}

/** Sets the current version's open cells (local keys), within the allowance (M20, M22). W0 stub. */
export function setOpenCells(p: Profile, _id: GlyphId, _cells: readonly CellKey[]): Profile {
  return p;
}

/** Sets (or clears) the extra exit's local side; refused below silver or on a taken side (M26). W0 stub. */
export function setExtraExit(p: Profile, _id: GlyphId, _dir: Dir | null): Profile {
  return p;
}

/** The local sides the extra exit may take: up, right or down, minus sides an exit uses (M26). W0 stub. */
export function extraExitSides(_def: GlyphDef): Dir[] {
  return [];
}

/**
 * The warning the revision editor shows before saving (M19), e.g. "Pushes the Stoker's page 1 ink
 * over", or null. W0 stub (an addition to the plan's list, for task E2).
 */
export function revisionWarning(_p: Profile, _id: GlyphId, _inside: GlyphInside): string | null {
  return null;
}
