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
    case 'burst':
    case 'crush':
    case 'dropped':
    case 'fizzles':
      return STEP_MS.big;
    case 'moved':
    case 'push':
    case 'lands':
    case 'stopped':
    case 'aimed':
    case 'damage':
    case 'died':
    case 'landed':
    case 'mixed':
    case 'washed':
    case 'spreadState':
    case 'swapped':
    case 'drawn':
    case 'marked':
    case 'collared':
    case 'markSpread':
    case 'released':
    case 'conducted':
    case 'jarSealed':
    case 'jarOpened':
    case 'vent':
    case 'attack':
      return STEP_MS.normal;
    // No position or no picture of their own: the events around them carry the beat.
    case 'trace':
    case 'named':
    case 'markSpent':
    case 'repeated':
    case 'triggered':
      return STEP_MS.quiet;
    case 'round':
    case 'moveUndone':
    case 'shove':
    case 'pull':
    case 'hop':
    case 'swapWith':
    case 'unharmed':
    case 'cast':
    case 'shieldAbsorbs':
    case 'shieldGained':
    case 'telegraph':
    case 'idle':
    case 'miss':
    case 'drift':
    case 'gateBurns':
    case 'snuff':
    case 'foeBursts':
    case 'summon':
    case 'flare':
    case 'stateFades':
    case 'stunned':
    case 'held':
    case 'erased':
    case 'markLifted':
    case 'jarCrumbles':
    case 'scheduled':
      return STEP_MS.short;
    default: {
      const unhandled: never = e;
      void unhandled;
      return STEP_MS.short;
    }
  }
}
