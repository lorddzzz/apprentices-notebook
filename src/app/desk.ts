import {
  FOOTNOTES,
  LINES,
  type LineId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  type SlotKey,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
  slotKey,
  VARIANTS,
  type VariantDef,
} from '$data';
import {
  type FootnoteError,
  footnoteCost,
  footnoteLevel,
  footnoteOffers,
  footnotePoints,
  type Profile,
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

const slotOf = (v: { slot: VariantDef['slot'] }): SlotKey[] =>
  'line' in v.slot ? [slotKey(v.slot.line, v.slot.level)] : [];

/** Known runes that have points, most points first. */
export function deskRows(p: Profile): RuneRow[] {
  return RUNE_IDS.filter((r) => p.known.includes(r) && footnotePoints(p, r) > 0)
    .map((rune) => {
      const points = footnotePoints(p, rune);
      const next = FOOTNOTES.levels.rune.find((t) => points < t);
      const slots = new Set(footnoteOffers(p, rune).flatMap(slotOf));
      const written = p.footnotes[rune]?.slots ?? {};
      return {
        rune,
        name: RUNES[rune].name,
        points,
        level: footnoteLevel(p, rune),
        toNext: next === undefined ? null : next - points,
        open: [...slots].filter((k) => written[k] === undefined).length,
      };
    })
    .sort((a, b) => b.points - a.points);
}

export interface VariantView {
  id: string;
  text: string;
  chosen: boolean;
}

/** One solvent a first write spends: `n` of it, with `count` held now. */
export interface SpendView {
  solvent: SolventId;
  name: string;
  n: number;
  count: number;
}

export interface OfferView {
  line: LineId;
  /** 1 or 2: level I costs one solvent, level II two (P3). */
  level: 1 | 2;
  /** What the line reads as now (the unwritten text). */
  current: string;
  variants: VariantView[];
  /** What the first write spends; empty once written (re-picking is free) or when it can't be paid. */
  spends: SpendView[];
  /** The first of `spends` (level I's one solvent), or null: the built card reads it. */
  spend: SpendView | null;
  written: boolean;
  /** Why a first write is not possible right now, in plain words. */
  blocked: string | null;
}

/** "Needs Gallnut or Cinder" (level II: "Needs 2 of Gallnut or Cinder"): the line's district solvents. */
export function needsText(line: LineId, level: 1 | 2 = 1): string {
  const district = LINES.find((l) => l.id === line)?.district;
  const names = SOLVENT_IDS.filter((s) => SOLVENTS[s].district === district).map(
    (s) => SOLVENTS[s].name,
  );
  if (names.length === 0) return 'Needs a solvent';
  return `Needs ${level === 2 ? '2 of ' : ''}${names.join(' or ')}`;
}

/** The lines of one rune with their variants, in the order the offers list them. */
export function offerViews(p: Profile, rune: RuneId): OfferView[] {
  const chosen = p.footnotes[rune]?.slots ?? {};
  const bySlot = new Map<SlotKey, { line: LineId; level: 1 | 2; variants: VariantView[] }>();
  for (const v of footnoteOffers(p, rune)) {
    if (!('line' in v.slot)) continue;
    const key = slotKey(v.slot.line, v.slot.level);
    const entry = bySlot.get(key) ?? { line: v.slot.line, level: v.slot.level, variants: [] };
    entry.variants.push({ id: v.id, text: v.text, chosen: chosen[key] === v.id });
    bySlot.set(key, entry);
  }
  return [...bySlot].map(([key, { line, level, variants }]) => {
    const written = chosen[key] !== undefined;
    const cost = footnoteCost(p, rune, key);
    const spends = (cost ?? []).map(({ solvent, n }) => ({
      solvent,
      name: SOLVENTS[solvent].name,
      n,
      count: p.solvents[solvent],
    }));
    return {
      line,
      level,
      current: lineText(line),
      variants,
      spends,
      spend: spends[0] ?? null,
      written,
      blocked: written || cost ? null : needsText(line, level),
    };
  });
}

export function footnoteErrorText(e: FootnoteError, line: LineId, level: 1 | 2 = 1): string {
  if (e === 'noSolvent') return needsText(line, level);
  if (e === 'notReached') return 'That line is not yet within your reach.';
  if (e === 'notHeld') return "That note is in a rival's hand you do not hold.";
  return 'There is no such footnote.';
}

/** Writes or re-picks a variant; the error is already a friendly line. */
export function writeAt(
  p: Profile,
  rune: RuneId,
  line: LineId,
  variantId: string,
): { profile: Profile } | { error: string } {
  const v = VARIANTS.find((x) => x.id === variantId);
  if (!v || !('line' in v.slot) || v.slot.line !== line)
    return { error: footnoteErrorText('unknownVariant', line) };
  const r = writeFootnote(p, rune, slotKey(line, v.slot.level), variantId);
  return 'error' in r ? { error: footnoteErrorText(r.error, line, v.slot.level) } : r;
}
