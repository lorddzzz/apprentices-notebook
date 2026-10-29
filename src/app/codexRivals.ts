import { RUNES, type RuneId } from '$data';
import { RIVAL_TRICK_TEXT } from '$data/codex';
import { RIVAL_PAGES, RIVALS, type RivalPageId } from '$data/rivals';
import { type Profile, parseLattice } from '$engine';
import { pagesHeld } from '$engine/rivals/pages';

/** One part of a recovered page: a rune the spell is wired from, and whether the household has it. */
export interface PagePart {
  rune: RuneId;
  name: string;
  owned: boolean;
}

/** One recovered page for the Codex (rivals P12). */
export interface RivalPageRow {
  id: RivalPageId;
  title: string;
  rivalName: string;
  annotation: string;
  story: string;
  lattice: string;
  parts: PagePart[];
  ownedCount: number;
  /** The rival's personal trick, marked as excluded; null when he has none. */
  trick: { name: string; text: string } | null;
}

/** The distinct runes of a lattice, in reading order, each marked owned or missing. */
export function partsOf(lattice: string, known: readonly RuneId[]): PagePart[] {
  const seen = new Set<RuneId>();
  const parts: PagePart[] = [];
  for (const placed of parseLattice(lattice).runes) {
    if (!('rune' in placed)) continue;
    const rune = placed.rune as RuneId;
    if (seen.has(rune) || !(rune in RUNES)) continue;
    seen.add(rune);
    parts.push({ rune, name: RUNES[rune].name, owned: known.includes(rune) });
  }
  return parts;
}

/** The pages the household holds, in recovered order. Empty until a rival has been beaten at home. */
export function rivalPageRows(p: Profile): RivalPageRow[] {
  const rows: RivalPageRow[] = [];
  for (const id of pagesHeld(p)) {
    const page = RIVAL_PAGES[id];
    const rival = page ? RIVALS[page.rival] : undefined;
    if (!page || !rival) continue;
    const parts = partsOf(page.lattice, p.known);
    const trick = rival.trick
      ? (RIVAL_TRICK_TEXT[rival.trick] ?? {
          name: rival.trick,
          text: 'His alone, not in the trial.',
        })
      : null;
    rows.push({
      id,
      title: page.title,
      rivalName: rival.name,
      annotation: page.annotation,
      story: page.story,
      lattice: page.lattice,
      parts,
      ownedCount: parts.filter((x) => x.owned).length,
      trick,
    });
  }
  return rows;
}
