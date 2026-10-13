import type { Aspect, InteractionId, RuneId, SolventId } from '$data';

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
  // bench runes (Quill points right, like Bolt)
  quill: 'M2 12h10M9 8l4 4-4 4M18 7c-2 3-3 4.5-3 6.5a3 3 0 0 0 6 0c0-2-1-3.5-3-6.5z',
  smear: 'M8 3c-3 4-5 6-5 9a5 5 0 0 0 10 0c0-3-2-5-5-9zM13 15c3-1 5-1 9-3M13 19c2 0 4 0 7-1',
  torch: 'M12 3c2.5 3 4 5 4 8a4 4 0 0 1-8 0c0-3 1.5-5 4-8zM12 15v7M9 22h6',
  fog: 'M5 6h11M9 10h10M3 20c3-2 6 2 9 0s6-2 9 0',
  mist: 'M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11.5-1.5A4.5 4.5 0 0 0 6 18zM12 14m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  brand: 'M4 12h10v8H4zM18 3c2.5 2.5 3.5 4 3.5 6a3.5 3.5 0 0 1-7 0c0-2 1-3.5 3.5-6z',
};

/** Glyphs drawn filled as well as stroked. */
export const FILLED_GLYPHS: ReadonlySet<RuneId> = new Set<RuneId>(['ink', 'spark', 'smear']);

/** The eight aspect marks (design §2 symbols), same 24-unit box and stroke. */
export const ASPECT_GLYPH: Record<Aspect, string> = {
  reach: 'M3 12h13M12 8l4 4-4 4M19 6v12',
  mark: 'M12 3l9 9-9 9-9-9zM12 10.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  slick: 'M3 8c3-2 6 2 9 0s6 2 9 0M3 13c3-2 6 2 9 0s6 2 9 0M3 18c3-2 6 2 9 0s6 2 9 0',
  heat: 'M5 21h14M8 17c-2-2 2-4 0-7M12 17c-2-2 2-4 0-7M16 17c-2-2 2-4 0-7',
  charge: 'M13 2L5 13h6l-2 9 8-12h-6z',
  vapor: 'M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5-1.5A4.5 4.5 0 0 0 7 18z',
  hold: 'M4 4h16v16H4zM8 8h8v8H8z',
  return: 'M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4',
};

/** Solvent icons (same box). Pitch and Cinder are drawn filled, see FILLED_SOLVENTS. */
export const SOLVENT_GLYPH: Partial<Record<SolventId, string>> = {
  gallnut: 'M6 10h12c0-3-2.7-5-6-5s-6 2-6 5zM7 10.5v3.5a5 5 0 0 0 10 0v-3.5',
  pitch:
    'M3 9h18M5 9c0 5 1.5 9 7 9s7-4 7-9zM20 11.5c0 1.2-.7 2-1.5 2s-1.5-.8-1.5-2c0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5z',
  cinder: 'M6 16l2-7 4-3 4 3 2 7-3 4H9zM12 3v2M5 6l1 1M19 6l-1 1',
};

export const FILLED_SOLVENTS: ReadonlySet<SolventId> = new Set<SolventId>(['pitch', 'cinder']);

/** Glyphs whose drawing points right at dir 'right' and must turn with the rune's arrow. */
export const DIRECTIONAL_GLYPHS: ReadonlySet<RuneId> = new Set<RuneId>(['bolt', 'bend', 'quill']);

/** Codex marks for the seven interactions (same 24-unit box and stroke as the rune glyphs). */
export const INTERACTION_GLYPH: Record<InteractionId, string> = {
  ignite: 'M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  conduct: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM8 13l3-3 2 4 3-3',
  arc: 'M7 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8M10 6l4 5-4 2 4 5',
  detonate: 'M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z',
  extinguish:
    'M7 9c-2-3 2-4 0-7M12 9c-2-3 2-4 0-7M17 9c-2-3 2-4 0-7M12 12c2 3 4 4 4 6a4 4 0 0 1-8 0c0-2 2-3 4-6z',
  slide: 'M3 9h15M14 5l4 4-4 4M3 17c4 3 8-3 12 0s4 1 6 0',
  diffuse:
    'M12 5c-2.5 3.5-3.5 5-3.5 6.5a3.5 3.5 0 0 0 7 0c0-1.5-1-3-3.5-6.5zM4 14a8 8 0 0 0 16 0M7 19a8 8 0 0 0 10 0',
};

export const FILLED_INTERACTIONS: ReadonlySet<InteractionId> = new Set<InteractionId>(['detonate']);
