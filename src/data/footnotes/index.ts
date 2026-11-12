import { METHOD_IDS } from '../methods';
import { CARILLONNEUR_NOTE } from '../rivals/carillonneur';
import { LAMPLIGHTER_WICK } from '../rivals/lamplighter';
import { RUNE_IDS } from '../runes';
import { SOLVENT_IDS } from '../solvents';
import type {
  CapstoneKey,
  FootnoteKey,
  FootnoteKind,
  FootnoteSubject,
  LineId,
  SlotKey,
  SlotLevel,
  VariantDef,
} from '../types';
import { AURAS } from './auras';
import { BATHHOUSES } from './bathhouses';
import { CANALS } from './canals';
import { INK_QUARTER } from './inkQuarter';
import { SEAM_METHODS } from './seam-methods';
import { SEAM_RUNES } from './seam-runes';
import { SEAM_SOLVENTS } from './seam-solvents';

/**
 * Footnote content registry (plan FN P8, §6). Each batch owns one file (`seam-runes`,
 * `seam-methods`, `canals`, …) and is joined here, so parallel district builds touch disjoint
 * files and add one line to `BATCHES`. Variant ids are `<subject>-<slug>` and never change; a rival's note (`rival` set) keeps its page's id, e.g. `lamplighter:wick`.
 */
export { AURA_DIAGONAL } from './auras';
export { SHOVE_WALL_SOFT } from './seam-runes';

export const BATCHES: Readonly<Record<string, readonly VariantDef[]>> = {
  'seam-runes': SEAM_RUNES,
  'seam-methods': SEAM_METHODS,
  'seam-solvents': SEAM_SOLVENTS,
  auras: AURAS,
  canals: CANALS,
  bathhouses: BATHHOUSES,
  'ink-quarter': INK_QUARTER,
  rivals: [LAMPLIGHTER_WICK, CARILLONNEUR_NOTE],
};

/** Every authored variant, batches in registry order. */
export const VARIANTS: readonly VariantDef[] = Object.values(BATCHES).flat();

/** The thresholds a subject uses. */
export function subjectKind(subject: FootnoteSubject): FootnoteKind {
  if ((RUNE_IDS as readonly string[]).includes(subject)) return 'rune';
  if ((METHOD_IDS as readonly string[]).includes(subject)) return 'method';
  return 'solvent';
}

/** True for a rune, method or solvent: the subjects with a margin (never a habit or action). */
export function isFootnoteSubject(subject: string): subject is FootnoteSubject {
  return (
    (RUNE_IDS as readonly string[]).includes(subject) ||
    (METHOD_IDS as readonly string[]).includes(subject) ||
    (SOLVENT_IDS as readonly string[]).includes(subject)
  );
}

export const slotKey = (line: LineId, level: SlotLevel): SlotKey => `${line}@${level}`;
export const capstoneKey = (subject: FootnoteSubject): CapstoneKey => `${subject}@cap`;

/** The line a variant's slot sits on; null for a capstone. */
export function variantLine(v: VariantDef): LineId | null {
  return 'line' in v.slot ? v.slot.line : null;
}

/** 1 or 2 for a line slot, 3 for a capstone: the level the subject needs. */
export function variantLevel(v: VariantDef): 1 | 2 | 3 {
  return 'line' in v.slot ? v.slot.level : 3;
}

/** Where the variant sits in `ctx.footnotes` and the profile: its slot or capstone key. */
export function footnoteKeyOf(v: VariantDef): FootnoteKey {
  return 'line' in v.slot ? slotKey(v.slot.line, v.slot.level) : capstoneKey(v.subject);
}
