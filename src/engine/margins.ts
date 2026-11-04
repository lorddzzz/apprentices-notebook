import {
  CODEX,
  type CodexEntryDef,
  type InventionId,
  isFootnoteSubject,
  isInvention,
  type MethodId,
  type SolventId,
  TUNING,
} from '$data';
import { clustersOf } from './cluster';
import { footnoteLevel } from './footnotes';
import { key } from './grid';
import { provenCount } from './proof';
import { glyphLibrary, inventionLibrary, latticeOf, proofOf } from './run';
import type { FiredCell, InventionLibrary, Profile } from './types';
import { isGlyph } from './types';

/**
 * The margins answer (Seam §0, SM P12). The owner's first note on a page stays; once the Marginalia
 * has fallen, a page with an authored `answer` shows it when its `when` holds:
 * - `mastery`: this page's subject (rune, method or solvent) has reached footnote level II;
 * - `proof`: a proven cluster in any household lattice holds this rune; a method or solvent is
 *   proven when an invention using it has fired in enough recorded casts (clusters cannot hold
 *   inventions); an idiom page answers once the idiom has been performed (named).
 * Compound and burst pages keep one note. Everything here reads the profile only; proof and footnote
 * points are written by finished trip fights, so the Lab and the Bench never reach an answer.
 */

/** The note a codex page shows: the first, or the owner's answer once it has come. */
export interface NoteView {
  text: string;
  answered: boolean;
}

/** The footnote level at which a page's mastery answer comes. */
export const ANSWER_LEVEL = 2;

/** True once the Marginalia has fallen: the Seam's heart cleared (banked on the trip home). */
export function marginsOpen(p: Pick<Profile, 'city'>): boolean {
  return p.city.hearts.includes('seam');
}

/** What the household has proven: plain runes in proven clusters, methods and solvents by invention casts. */
interface Held {
  runes: Set<string>;
  methods: Set<string>;
  solvents: Set<string>;
}

/** Methods and solvents an invention uses, looking inside nested inventions. */
function usedBy(ref: string, lib: InventionLibrary, into: Held, depth = 0): void {
  const def = lib[ref as InventionId];
  if (!def || depth > 4) return;
  into.methods.add(def.method);
  if (def.solvent) into.solvents.add(def.solvent);
  for (const part of def.parts) usedBy(part, lib, into, depth + 1);
}

const cache = new WeakMap<Profile, Held>();

/**
 * Plain runes: those placed in a proven cluster of any household lattice (the Fair Copy's proof).
 * Clusters cannot hold inventions, so a method or solvent is proven by its invention's casts: it
 * fired in `TUNING.provenCasts` recorded meaningful casts.
 */
function provenHeld(p: Profile): Held {
  const cached = cache.get(p);
  if (cached) return cached;
  const held: Held = { runes: new Set(), methods: new Set(), solvents: new Set() };
  const masks: FiredCell[][] = p.household.members.flatMap((m) => proofOf(p, m));
  if (masks.length >= TUNING.provenCasts) {
    const glyphs = glyphLibrary(p);
    const inventions = inventionLibrary(p);
    for (const m of p.household.members) {
      const lattice = latticeOf(p, m);
      const glow = new Set<string>();
      const clusters = clustersOf(lattice, glyphs).sort((a, b) => b.cells.length - a.cells.length);
      for (const c of clusters) {
        if (c.cells.every((x) => glow.has(key(x)))) continue;
        if (provenCount(lattice, c, masks) < TUNING.provenCasts) continue;
        for (const x of c.cells) {
          glow.add(key(x));
          const placed = lattice.runes.find((r) => r.at.x === x.x && r.at.y === x.y);
          if (placed && !isGlyph(placed)) held.runes.add(placed.rune);
        }
      }
    }
    const casts = new Map<string, number>();
    for (const mask of masks) {
      for (const ref of new Set(mask.map((c) => c.rune))) {
        if (ref && isInvention(ref)) casts.set(ref, (casts.get(ref) ?? 0) + 1);
      }
    }
    for (const [ref, n] of casts) if (n >= TUNING.provenCasts) usedBy(ref, inventions, held);
  }
  cache.set(p, held);
  return held;
}

/** Whether `entry`'s answer condition holds now (the Marginalia's gate is checked apart). */
export function answerHolds(p: Profile, entry: CodexEntryDef): boolean {
  const answer = entry.answer;
  if (!answer) return false;
  if (answer.when === 'mastery') {
    return isFootnoteSubject(entry.ref) && footnoteLevel(p, entry.ref) >= ANSWER_LEVEL;
  }
  switch (entry.kind) {
    case 'rune':
      return provenHeld(p).runes.has(entry.ref);
    case 'method':
      return provenHeld(p).methods.has(entry.ref as MethodId);
    case 'solvent':
      return provenHeld(p).solvents.has(entry.ref as SolventId);
    case 'idiom':
      return p.named.includes(`idiom:${entry.ref}`);
    default:
      return false; // compound and burst pages keep one note
  }
}

/**
 * The note to show on a codex page. Nothing answers before the Marginalia falls; then a page's
 * `answer` shows once its `when` holds. `codex` defaults to the content (tests pass fixtures).
 */
export function noteFor(
  p: Profile,
  entryId: string,
  codex: readonly CodexEntryDef[] = CODEX,
): NoteView {
  const entry = codex.find((e) => e.id === entryId);
  if (!entry) throw new Error(`noteFor: unknown codex entry '${entryId}'`);
  if (entry.answer && marginsOpen(p) && answerHolds(p, entry)) {
    return { text: entry.answer.text, answered: true };
  }
  return { text: entry.ownerNote, answered: false };
}

/** The ids of every page whose margin is answering now, in codex order. */
export function answeredIds(p: Profile, codex: readonly CodexEntryDef[] = CODEX): string[] {
  if (!marginsOpen(p)) return [];
  return codex.filter((e) => answerHolds(p, e)).map((e) => e.id);
}

/** Pages whose margin answers in `after` and did not in `before`. */
export function newlyAnswered(
  before: Profile,
  after: Profile,
  codex: readonly CodexEntryDef[] = CODEX,
): string[] {
  const was = new Set(answeredIds(before, codex));
  return answeredIds(after, codex).filter((id) => !was.has(id));
}
