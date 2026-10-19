import {
  FOOTNOTES,
  LINES,
  type LineId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
} from '$data';
import {
  type FootnoteError,
  footnoteLevel,
  footnoteOffers,
  footnotePoints,
  type Profile,
  solventFor,
  writeFootnote,
} from '$engine';
import { lineText } from './bench';

/** The footnote desk (design §8, P39): pure views and the write reducer the Desk screen shows. */

/** Footnotes show in the Study once any rune has earned points. */
export function deskUnlocked(p: Profile): boolean {
  return RUNE_IDS.some((r) => footnotePoints(p, r) > 0);
}

export interface RuneRow {
  rune: RuneId;
  name: string;
  points: number;
  /** 0–3. */
  level: number;
  /** Points to the next level, or null at the top. */
  toNext: number | null;
  /** Lines on offer with no footnote written yet. */
  open: number;
}

/** Known runes that have points, most points first. */
export function deskRows(p: Profile): RuneRow[] {
  return RUNE_IDS.filter((r) => p.known.includes(r) && footnotePoints(p, r) > 0)
    .map((rune) => {
      const points = footnotePoints(p, rune);
      const next = FOOTNOTES.levels.find((t) => points < t);
      const lines = new Set(footnoteOffers(p, rune).map((v) => v.line));
      const written = p.footnotes[rune]?.chosen ?? {};
      return {
        rune,
        name: RUNES[rune].name,
        points,
        level: footnoteLevel(p, rune),
        toNext: next === undefined ? null : next - points,
        open: [...lines].filter((l) => written[l] === undefined).length,
      };
    })
    .sort((a, b) => b.points - a.points);
}

export interface VariantView {
  id: string;
  text: string;
  chosen: boolean;
}

export interface OfferView {
  line: LineId;
  /** What the line reads as now (the unwritten text). */
  current: string;
  variants: VariantView[];
  /** The first write spends this; null once written (re-picking is free) or when none is held. */
  spend: { solvent: SolventId; name: string; count: number } | null;
  written: boolean;
  /** Why a first write is not possible right now, in plain words. */
  blocked: string | null;
}

/** "Needs Gallnut or Cinder": the solvents of the district the line was found in. */
export function needsText(line: LineId): string {
  const district = LINES.find((l) => l.id === line)?.district;
  const names = SOLVENT_IDS.filter((s) => SOLVENTS[s].district === district).map(
    (s) => SOLVENTS[s].name,
  );
  return names.length > 0 ? `Needs ${names.join(' or ')}` : 'Needs a solvent';
}

/** The lines of one rune with their variants, in the order the offers list them. */
export function offerViews(p: Profile, rune: RuneId): OfferView[] {
  const chosen = p.footnotes[rune]?.chosen ?? {};
  const byLine = new Map<LineId, VariantView[]>();
  for (const v of footnoteOffers(p, rune)) {
    const list = byLine.get(v.line) ?? [];
    list.push({ id: v.id, text: v.text, chosen: chosen[v.line] === v.id });
    byLine.set(v.line, list);
  }
  return [...byLine].map(([line, variants]) => {
    const written = chosen[line] !== undefined;
    const s = written ? null : solventFor(p, line);
    return {
      line,
      current: lineText(line),
      variants,
      spend: s ? { solvent: s, name: SOLVENTS[s].name, count: p.solvents[s] } : null,
      written,
      blocked: written || s ? null : needsText(line),
    };
  });
}

export function footnoteErrorText(e: FootnoteError, line: LineId): string {
  if (e === 'noSolvent') return needsText(line);
  if (e === 'notReached') return 'That line is not yet within your reach.';
  return 'There is no such footnote.';
}

/** Writes or re-picks a variant; the error is already a friendly line. */
export function writeAt(
  p: Profile,
  rune: RuneId,
  line: LineId,
  variantId: string,
): { profile: Profile } | { error: string } {
  const r = writeFootnote(p, rune, line, variantId);
  return 'error' in r ? { error: footnoteErrorText(r.error, line) } : r;
}
