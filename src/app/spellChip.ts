import type { Spell, SpellKey } from '$engine';
import { activeAction, type InputMode } from './battleInput';

/** One known spell as `castableSpells` reports it. */
export interface ChipSpell {
  spell: Spell;
  charges: number;
  usable: boolean;
}

/** What a tap on the chip does (FT-13): arm one spell, open the sheet, or nothing with a reason. */
export type ChipTap =
  | { kind: 'arm'; key: SpellKey }
  | { kind: 'sheet' }
  | { kind: 'none'; reason: string };

export interface SpellChipModel {
  /** The spell the chip draws: the lit one, else the first usable, else the first known. */
  shown: ChipSpell | null;
  /** The lit spell (aim or confirm), if any. */
  active: SpellKey | null;
  /** Keys that may be armed now. */
  usable: readonly SpellKey[];
  /** How many known spells the chip does not draw ("+2"); 0 for a single spell. */
  more: number;
  tap: ChipTap;
}

/**
 * The spell chip's model. One usable spell arms on tap (however many are known: a spent spell
 * is not a choice); two or more usable spells open the sheet; none is inert with the reason.
 * The input state stays in the session: this only decides which handler a tap calls.
 */
export function spellChipModel(spells: readonly ChipSpell[], mode: InputMode): SpellChipModel {
  const active = activeAction(mode).spell;
  const usable = spells.filter((s) => s.usable).map((s) => s.spell.key);
  const lit = spells.find((s) => s.spell.key === active) ?? null;
  const shown = lit ?? spells.find((s) => s.usable) ?? spells[0] ?? null;
  const more = Math.max(0, spells.length - 1);
  const only = usable.length === 1 ? usable[0] : undefined;
  let tap: ChipTap;
  if (spells.length === 0) tap = { kind: 'none', reason: 'No spells inscribed' };
  else if (only !== undefined) tap = { kind: 'arm', key: only };
  else if (usable.length > 1) tap = { kind: 'sheet' };
  else {
    tap = {
      kind: 'none',
      reason: spells.some((s) => s.charges > 0) ? 'Already acted.' : 'No charges left.',
    };
  }
  return { shown, active, usable, more, tap };
}

/** The chip was tapped: calls exactly one of the two handlers, or none when it is inert. */
export function tapChip(
  model: SpellChipModel,
  handlers: { choose: (key: SpellKey) => void; openSheet: () => void },
): void {
  if (model.tap.kind === 'arm') handlers.choose(model.tap.key);
  else if (model.tap.kind === 'sheet') handlers.openSheet();
}

/** A row in the sheet was tapped: only a usable spell reaches `choose`. */
export function armFromSheet(
  model: SpellChipModel,
  key: SpellKey,
  choose: (key: SpellKey) => void,
): boolean {
  if (!model.usable.includes(key)) return false;
  choose(key);
  return true;
}
