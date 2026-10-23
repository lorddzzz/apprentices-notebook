import {
  capstoneKey,
  FOOTNOTES,
  type FootnoteKey,
  type FootnoteSubject,
  footnoteKeyOf,
  LINES,
  type LineId,
  RUNE_IDS,
  type RuneId,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
  slotKey,
  subjectKind,
  VARIANTS,
  type VariantDef,
  variantLevel,
  variantLine,
} from '$data';
import type { Ctx, FootnoteIds, FootnoteVariantId } from './ctx';
import type { FootnoteEntry, Profile } from './types';

/** True when the household wrote this variant in its slot or capstone. Handlers name ids, never text. */
export function hasFootnote(ctx: Pick<Ctx, 'footnotes'>, id: FootnoteVariantId): boolean {
  const variant = VARIANTS.find((v) => v.id === id);
  return variant !== undefined && ctx.footnotes[footnoteKeyOf(variant)] === id;
}

/**
 * Footnotes (design §8, P39): pure functions on the profile. `variants` defaults to the content.
 * FN-0 keeps the built behaviour (rune points, level I line slots) on the per-subject shape;
 * FN-1 extends it to methods, solvents, level II and capstones.
 */

const subjectOf = (line: LineId): string => line.split(':')[0] ?? '';
const EMPTY: FootnoteEntry = { points: 0, slots: {} };

export function footnotePoints(p: Profile, subject: FootnoteSubject): number {
  return p.footnotes[subject]?.points ?? 0;
}

/** 0–3: how many of the subject's kind's thresholds its points have reached. */
export function footnoteLevel(p: Profile, subject: FootnoteSubject): number {
  const pts = footnotePoints(p, subject);
  return FOOTNOTES.levels[subjectKind(subject)].filter((t) => pts >= t).length;
}

/** One point per firing of a line whose subject is a known rune (trip battles only: the caller decides). */
export function awardFootnotePoints(p: Profile, firedLines: readonly LineId[]): Profile {
  const footnotes = { ...p.footnotes };
  for (const line of firedLines) {
    const rune = RUNE_IDS.find((r) => r === subjectOf(line));
    if (!rune || !p.known.includes(rune)) continue;
    const cur = footnotes[rune] ?? EMPTY;
    footnotes[rune] = { ...cur, points: cur.points + 1 };
  }
  return { ...p, footnotes };
}

/** Variants on offer: every reached level's line variants on a witnessed line of this rune. */
export function footnoteOffers(
  p: Profile,
  rune: RuneId,
  variants: readonly VariantDef[] = VARIANTS,
): VariantDef[] {
  const level = footnoteLevel(p, rune);
  return variants.filter((v) => {
    const line = variantLine(v);
    return (
      line !== null && v.subject === rune && variantLevel(v) <= level && p.witnessed.includes(line)
    );
  });
}

export type FootnoteError = 'notReached' | 'unknownVariant' | 'noSolvent';

/** The district solvent the player holds most of (ties: first listed), or null when none. */
export function solventFor(p: Profile, line: LineId): SolventId | null {
  const district = LINES.find((l) => l.id === line)?.district;
  const own = SOLVENT_IDS.filter((s) => SOLVENTS[s].district === district && p.solvents[s] > 0);
  return own.reduce<SolventId | null>(
    (best, s) => (best === null || p.solvents[s] > p.solvents[best] ? s : best),
    null,
  );
}

/** Writes (or re-picks) a line variant. The first write of a slot spends 1 solvent of its district. */
export function writeFootnote(
  p: Profile,
  rune: RuneId,
  line: LineId,
  variantId: string,
  variants: readonly VariantDef[] = VARIANTS,
): { profile: Profile } | { error: FootnoteError } {
  const v = variants.find((x) => x.id === variantId && variantLine(x) === line);
  if (!v || !('line' in v.slot) || v.subject !== rune) return { error: 'unknownVariant' };
  if (v.slot.level > footnoteLevel(p, rune) || !p.witnessed.includes(line)) {
    return { error: 'notReached' };
  }
  const key = slotKey(line, v.slot.level);
  const cur = p.footnotes[rune] ?? EMPTY;
  const solvents = { ...p.solvents };
  if (cur.slots[key] === undefined) {
    const spend = solventFor(p, line);
    if (!spend) return { error: 'noSolvent' };
    solvents[spend] -= 1;
  }
  const entry = { ...cur, slots: { ...cur.slots, [key]: variantId } };
  return { profile: { ...p, solvents, footnotes: { ...p.footnotes, [rune]: entry } } };
}

/** What `ctx.footnotes` holds: each written slot's and capstone's variant id (known variants only). */
export function footnoteIds(p: Profile, variants: readonly VariantDef[] = VARIANTS): FootnoteIds {
  const out: Partial<Record<FootnoteKey, FootnoteVariantId>> = {};
  for (const [subject, entry] of Object.entries(p.footnotes) as [
    FootnoteSubject,
    FootnoteEntry,
  ][]) {
    const written: [FootnoteKey, string | undefined][] = [
      ...(Object.entries(entry.slots) as [FootnoteKey, string][]),
      [capstoneKey(subject), entry.capstone],
    ];
    for (const [key, id] of written) {
      const v = variants.find((x) => x.id === id);
      if (v && v.subject === subject && footnoteKeyOf(v) === key) out[key] = v.id;
    }
  }
  return out;
}
