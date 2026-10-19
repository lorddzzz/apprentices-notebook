import {
  FOOTNOTES,
  LINES,
  type LineId,
  RUNE_IDS,
  type RuneId,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
  VARIANTS,
  type VariantDef,
} from '$data';
import type { Ctx } from './ctx';
import type { Profile } from './types';

/** Resolve authored variant ids while preserving the text-valued context contract. */
export function hasFootnote(ctx: Pick<Ctx, 'footnotes'>, id: string): boolean {
  const variant = VARIANTS.find((v) => v.id === id);
  return variant !== undefined && ctx.footnotes[variant.line] === variant.text;
}

/** Footnotes (design §8, P39): pure functions on the profile. `variants` defaults to the content. */

const subjectOf = (line: LineId): string => line.split(':')[0] ?? '';

export function footnotePoints(p: Profile, rune: RuneId): number {
  return p.footnotes[rune]?.points ?? 0;
}

/** 0–3: how many of the thresholds the rune's points have reached. */
export function footnoteLevel(p: Profile, rune: RuneId): number {
  const pts = footnotePoints(p, rune);
  return FOOTNOTES.levels.filter((t) => pts >= t).length;
}

/** One point per firing of a line whose subject is a known rune (trip battles only: the caller decides). */
export function awardFootnotePoints(p: Profile, firedLines: readonly LineId[]): Profile {
  const footnotes = { ...p.footnotes };
  for (const line of firedLines) {
    const rune = RUNE_IDS.find((r) => r === subjectOf(line));
    if (!rune || !p.known.includes(rune)) continue;
    const cur = footnotes[rune] ?? { points: 0, chosen: {} };
    footnotes[rune] = { ...cur, points: cur.points + 1 };
  }
  return { ...p, footnotes };
}

/** Variants on offer: every reached level's variants of a witnessed line of this rune. */
export function footnoteOffers(
  p: Profile,
  rune: RuneId,
  variants: readonly VariantDef[] = VARIANTS,
): VariantDef[] {
  const level = footnoteLevel(p, rune);
  return variants.filter(
    (v) => v.level <= level && subjectOf(v.line) === rune && p.witnessed.includes(v.line),
  );
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

/** Writes (or re-picks) a variant. The first write of a line spends 1 solvent of its district. */
export function writeFootnote(
  p: Profile,
  rune: RuneId,
  line: LineId,
  variantId: string,
  variants: readonly VariantDef[] = VARIANTS,
): { profile: Profile } | { error: FootnoteError } {
  const v = variants.find((x) => x.id === variantId && x.line === line);
  if (!v || subjectOf(line) !== rune) return { error: 'unknownVariant' };
  if (v.level > footnoteLevel(p, rune) || !p.witnessed.includes(line)) {
    return { error: 'notReached' };
  }
  const cur = p.footnotes[rune] ?? { points: 0, chosen: {} };
  const solvents = { ...p.solvents };
  if (cur.chosen[line] === undefined) {
    const spend = solventFor(p, line);
    if (!spend) return { error: 'noSolvent' };
    solvents[spend] -= 1;
  }
  const entry = { ...cur, chosen: { ...cur.chosen, [line]: variantId } };
  return { profile: { ...p, solvents, footnotes: { ...p.footnotes, [rune]: entry } } };
}

/** What `ctx.footnotes` holds: each written line's variant text. */
export function footnoteTexts(
  p: Profile,
  variants: readonly VariantDef[] = VARIANTS,
): Partial<Record<LineId, string>> {
  const out: Partial<Record<LineId, string>> = {};
  for (const entry of Object.values(p.footnotes)) {
    for (const [line, id] of Object.entries(entry?.chosen ?? {}) as [LineId, string][]) {
      const v = variants.find((x) => x.id === id && x.line === line);
      if (v) out[line] = v.text;
    }
  }
  return out;
}
