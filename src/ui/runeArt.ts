import type { MethodId, Role, RuneId, SolventId } from '$data/next/types';

/**
 * Path data for the rune redesign (docs/plans/rune-redesign-plan.md, U4a). Same style as
 * `glyphs.ts`: a 24-unit box, drawn with a 2-wide round currentColor stroke. Keep every point
 * inside 0..24 and each glyph to about six segments so it still reads at 20 px.
 */

export const RUNE_ART: Record<RuneId, string> = {
  // Sources
  bolt: 'M3 12h15M14 7l5 5-5 5M3 9l3 3-3 3',
  splash: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v4M12 18v4M2 12h4M18 12h4',
  touch: 'M3 12h9M9 9l3 3-3 3M17 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  vat: 'M3 6h18M5 6v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6M5 11h14',
  // Actions
  strike: 'M4 4h11v6H4zM9.5 10v10',
  shove: 'M6 6l6 6-6 6M12 6l6 6-6 6',
  guard: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z',
  sentence: 'M3 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M13 12h8M18 9l3 3-3 3',
  levy: 'M5 7a7 3 0 1 0 14 0a7 3 0 1 0-14 0M5 7v10a7 3 0 0 0 14 0V7M5 12a7 3 0 0 0 14 0',
  hold: 'M12 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 8v13M5 15a7 7 0 0 0 14 0M9 11h6',
  swap: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  draw: 'M16 4l4 4L10 18l-4-4zM6 14l-3 7 7-3',
  erase: 'M14 4l6 6-9 9-6-6zM9.5 8.5l6 6M4 21h16',
  // Kinds
  ink: 'M12 3c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z',
  oil: 'M12 4c-3 5-5 7-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10zM4 21h16',
  steam: 'M7 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8',
  brass: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  spark: 'M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z',
  // Shapes
  fork: 'M12 21v-8M12 13 5 5M12 13l7-8',
  bend: 'M6 4v10h12M14 10l4 4-4 4',
  seep: 'M12 6c-3 3.5-4.5 5.5-4.5 7.5a4.5 4.5 0 0 0 9 0c0-2-1.5-4-4.5-7.5zM5 7l1.5 1.5M19 7l-1.5 1.5M3 12h2M19 12h2',
  lay: 'M3 6h18v12H3zM3 12h18M9 6v6M15 12v6',
  toll: 'M6 15v-4a6 6 0 0 1 12 0v4l2 2H4zM10 20a2 2 0 0 0 4 0M12 3v2',
  // Triggers
  tally: 'M4 5v14M9 5v14M14 5v14M19 5v14M2 16L22 8',
  brink: 'M2 7h12v13h8',
  unison: 'M3 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0M9 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
  // Seals
  jar: 'M5 4h14v4H5zM7 8v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8M7 13h10',
  fuse: 'M3 20q7 0 9-8M17 3v8M13 7h8M14.5 4.5l5 5M19.5 4.5l-5 5',
  // Auras
  afterglow: 'M6 17a6 6 0 0 1 12 0M3 17h18M12 7v2M6.3 11.3L4.9 9.9M17.7 11.3l1.4-1.4',
  steep:
    'M3 10h14v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM17 12.5h2a2.25 2.25 0 0 1 0 4.5h-2M7 7c-1-1.5 1-2.5 0-4M12 7c-1-1.5 1-2.5 0-4',
  coil: 'M3 12h3l3-6 3 12 3-12 3 12 3-6h3',
};

/** Runes drawn filled as well as stroked. */
export const FILLED_ART: ReadonlySet<RuneId> = new Set<RuneId>(['ink', 'spark']);

/** Method marks (design §6.2), same box and stroke. */
export const METHOD_ART: Record<MethodId, string> = {
  conduct: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0M13 6L8 13h4l-2 5 5-7h-4z',
  repeat: 'M4 12V8a3 3 0 0 1 3-3h10M14 2l3 3-3 3M20 12v4a3 3 0 0 1-3 3H7M10 16l-3 3 3 3',
  margin: 'M4 3v18M4 7h9a4 4 0 0 1 0 8H4',
  bind: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10.5 10.5L4 4M13.5 10.5L20 4M10.5 13.5L4 20M13.5 13.5L20 20',
  lift: 'M12 20m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M12 17V4M7 9l5-5 5 5',
};

/** Solvent icons (same box). Pitch and Cinder are drawn filled, see FILLED_SOLVENT_ART. */
export const SOLVENT_ART: Record<SolventId, string> = {
  gallnut: 'M6 10h12c0-3-2.7-5-6-5s-6 2-6 5zM7 10.5v3.5a5 5 0 0 0 10 0v-3.5',
  cinder: 'M6 16l2-7 4-3 4 3 2 7-3 4H9zM12 3v2M5 6l1 1M19 6l-1 1',
  pitch:
    'M3 9h18M5 9c0 5 1.5 9 7 9s7-4 7-9zM20 11.5c0 1.2-.7 2-1.5 2s-1.5-.8-1.5-2c0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5z',
  wick: 'M6 3h12M6 21h12M7 3c0 4 5 5 5 9 0-4 5-5 5-9M7 21c0-4 5-5 5-9 0 4 5 5 5 9',
  wax: 'M8 9h8v11H8zM12 9V6M5 21h14',
  sand: 'M2 20h20M4 20a8 8 0 0 1 16 0M12 4h0M8 7h0M16 7h0',
  bathSalt: 'M4 18h16M6 18l2-4h8l2 4M12 3l3 5-3 6-3-6z',
  fogJar: 'M9 3h6M10 3v4l-4 5v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-4-5V3M7 15c2-1 3 1 5 0s3-1 5 0',
  mortar: 'M4 11h16c0 5-3.5 9-8 9s-8-4-8-9zM15 3l-4 7',
  chalk: 'M11 13l6-6 3 3-6 6zM5 20h6M3 16h4',
  rivet: 'M6 9a6 4 0 0 1 12 0M6 9h12M12 9v10M9 19h6',
  filings: 'M5 17l3-3M10 13l3-3M15 17l3-3M4 21h16',
  quicksilver: 'M3 16c0-2 4-4 9-4s9 2 9 4-4 4-9 4-9-2-9-4zM7 14.5c1-.8 2.5-1 4-1',
  graphite: 'M6 9l4-3h12l-4 3zM6 14l4-3h12l-4 3zM6 19l4-3h12l-4 3z',
};

/** Solvents drawn filled as well as stroked. */
export const FILLED_SOLVENT_ART: ReadonlySet<SolventId> = new Set<SolventId>(['pitch', 'cinder']);

/** One CSS custom property per role; the orchestrator wires the colours in the stylesheet. */
export const ROLE_COLOR: Record<Role, string> = {
  source: '--role-source', // ink-blue
  action: '--role-action', // rust
  kind: '--role-kind', // ochre
  shape: '--role-shape', // slate
  trigger: '--role-trigger', // moss
  seal: '--role-seal', // lamp-amber
  aura: '--role-aura', // violet
};
