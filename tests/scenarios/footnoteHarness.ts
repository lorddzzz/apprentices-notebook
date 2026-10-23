import { type FootnoteKey, footnoteKeyOf, type LineId, VARIANTS, type VariantDef } from '$data';
import type { FootnoteIds } from '$engine/ctx';

/**
 * Footnote scenario helpers (plan FN §4, §6). Content tasks prove a margin line with `fourCombos`
 * (level I × level II, all four) and a capstone with `withFootnotes(capstoneId)`, feeding the ids
 * to `runDraft(..., { footnotes })` or the battle helpers. `variants` defaults to the content;
 * pass fixtures to test the helpers themselves.
 */

/** The footnote context with exactly these variants written. Throws on an unknown id or a clash. */
export function withFootnotes(
  ids: readonly string[],
  variants: readonly VariantDef[] = VARIANTS,
): FootnoteIds {
  const out: Partial<Record<FootnoteKey, string>> = {};
  for (const id of ids) {
    const v = variants.find((x) => x.id === id);
    if (!v) throw new Error(`No footnote variant ${id}`);
    const key = footnoteKeyOf(v);
    if (out[key] !== undefined) throw new Error(`${id} and ${out[key]} share the slot ${key}`);
    out[key] = id;
  }
  return out;
}

export interface Combo {
  l1: string;
  l2: string;
  footnotes: FootnoteIds;
}

/**
 * Runs `scenario` once per combination of a line's level I pair and level II pair (P11: the levels
 * are independent, so all four must read sensibly). Checks that each pair sits on `line` at its
 * level, then returns the four results in order (a1, a2, b1, b2 → [a1+a2, a1+b2, b1+a2, b1+b2]).
 */
export function fourCombos<R>(
  line: LineId,
  l1Pair: readonly [string, string],
  l2Pair: readonly [string, string],
  scenario: (combo: Combo) => R,
  variants: readonly VariantDef[] = VARIANTS,
): { combo: Combo; result: R }[] {
  const check = (id: string, level: 1 | 2) => {
    const v = variants.find((x) => x.id === id);
    if (!v || !('line' in v.slot) || v.slot.line !== line || v.slot.level !== level) {
      throw new Error(`${id} is not a level ${level} variant of ${line}`);
    }
  };
  for (const id of l1Pair) check(id, 1);
  for (const id of l2Pair) check(id, 2);
  return l1Pair.flatMap((l1) =>
    l2Pair.map((l2) => {
      const combo = { l1, l2, footnotes: withFootnotes([l1, l2], variants) };
      return { combo, result: scenario(combo) };
    }),
  );
}
