import { TUNING } from '$data';
import type { GlyphId, Profile } from '$engine';
import { profilerView, type TierView } from './profiler';

/** One row of "Your Glyphs, ranked" (plan M14, U2): a current version and its record, as plain data. */
export interface RankRow {
  id: GlyphId;
  name: string;
  version: number;
  economy: TierView;
  reliability: TierView;
  /** Average harm a cast to one decimal, or null before the first cast. */
  harm: string | null;
  casts: number;
  /** Under a full window: "3 / 10 casts to a tier". Null once the Glyph has a window. */
  toTier: string | null;
}

interface Entry {
  learning: boolean;
  economyTier: number;
  reliabilityTier: number;
  current: number;
  row: RankRow;
}

/**
 * The ranked list (M14): current versions by best Economy tier, then best Reliability tier, then
 * the current window's Economy value. Glyphs under a full window come last, in the same order.
 */
export function rankGlyphs(p: Profile): RankRow[] {
  const entries: Entry[] = p.glyphs.map((def) => {
    const v = profilerView(p, def);
    const learning = v.casts < TUNING.tierWindow;
    return {
      learning,
      economyTier: v.economy.tier,
      reliabilityTier: v.reliability.tier,
      current: v.form.economy,
      row: {
        id: def.id,
        name: def.name,
        version: def.version,
        economy: v.economy,
        reliability: v.reliability,
        harm: v.avgHarm,
        casts: v.casts,
        toTier: learning ? `${v.form.progress} casts to a tier` : null,
      },
    };
  });
  const byRank = (a: Entry, b: Entry): number =>
    b.economyTier - a.economyTier || b.reliabilityTier - a.reliabilityTier || b.current - a.current;
  const group = (learning: boolean): RankRow[] =>
    entries
      .filter((e) => e.learning === learning)
      .sort(byRank)
      .map((e) => e.row);
  return [...group(false), ...group(true)];
}
