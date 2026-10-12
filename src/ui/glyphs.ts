import type { RuneId } from '$data';

/** SVG path data on a 24-unit box, drawn with a 2-wide currentColor stroke (see FILLED_GLYPHS). */
export const RUNE_GLYPH: Record<RuneId, string> = {
  bolt: 'M3 12h15M14 7l5 5-5 5M3 9l3 3-3 3',
  splash: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v4M12 18v4M2 12h4M18 12h4',
  ward: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z',
  ink: 'M12 3c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z',
  oil: 'M12 4c-3 5-5 7-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10zM4 21h16',
  spark: 'M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z',
  steam: 'M7 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8',
  brass: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  bend: 'M6 4v10h12M14 10l4 4-4 4',
  fork: 'M12 21v-8M12 13 5 5M12 13l7-8',
  onInked: 'M12 8c-2 3-3 4.5-3 6a3 3 0 0 0 6 0c0-1.5-1-3-3-6z',
  onKill: 'M8 8l8 8M16 8l-8 8',
  amplify: 'M12 5v14M5 12h14',
  echo: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 7a7 7 0 0 1 0 10M18 4a11 11 0 0 1 0 16',
};

/** Glyphs drawn filled as well as stroked. */
export const FILLED_GLYPHS: ReadonlySet<RuneId> = new Set<RuneId>(['ink', 'spark']);

/** Glyphs whose drawing points right at dir 'right' and must turn with the rune's arrow. */
export const DIRECTIONAL_GLYPHS: ReadonlySet<RuneId> = new Set<RuneId>(['bolt', 'bend']);
