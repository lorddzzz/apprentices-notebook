import { draftById, type GlyphDef } from '$engine';

/** Draft Glyphs carry the owner's mark (F11). */
export function isOwnersHand(glyph: Pick<GlyphDef, 'draft'>): boolean {
  return glyph.draft !== undefined;
}

/** The aria label of a shelf tile: the base label, plus the owner's hand for a draft Glyph. */
export function copyLabel(base: string, glyph: Pick<GlyphDef, 'draft'>): string {
  return isOwnersHand(glyph) ? `${base}, in the owner's hand` : base;
}

/** The sheet header line, or null for a Glyph that is not from a draft. */
export function ownerHeader(glyph: Pick<GlyphDef, 'draft'>): string | null {
  if (glyph.draft === undefined) return null;
  const name = draftById(glyph.draft)?.name;
  return name ? `in the owner's hand · ${name}` : "in the owner's hand";
}

/** The owner's page (F12): the draft's lore, or null when the Glyph has no draft (or an unknown one). */
export function ownerLore(glyph: Pick<GlyphDef, 'draft'>): string | null {
  if (glyph.draft === undefined) return null;
  const lore = draftById(glyph.draft)?.lore;
  return lore && lore.trim() !== '' ? lore : null;
}
