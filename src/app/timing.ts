import type { GameEvent } from '$engine';

export const STEP_MS = { quiet: 0, short: 160, normal: 260, big: 420, banner: 500 } as const;

/** Base playback duration per event (before the reduced-motion scale). */
export function durationOf(e: GameEvent): number {
  switch (e.type) {
    case 'battleStart':
      return STEP_MS.banner;
    case 'phase':
      return e.phase === 'player' ? STEP_MS.banner : STEP_MS.quiet;
    case 'won':
    case 'lost':
    case 'splash':
    case 'detonate':
    case 'ignite':
    case 'arc':
    case 'conduct':
      return STEP_MS.big;
    case 'moved':
    case 'pushed':
    case 'slide':
    case 'lands':
    case 'stopped':
    case 'damage':
    case 'died':
    case 'inked':
    case 'puddle':
    case 'diffuse':
    case 'oiled':
    case 'steam':
    case 'vent':
    case 'plates':
    case 'coated':
    case 'extinguish':
    case 'attack':
      return STEP_MS.normal;
    default:
      return STEP_MS.short;
  }
}
