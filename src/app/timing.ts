import { type GameEvent, isDistrictEvent } from '$engine';

export const STEP_MS = { quiet: 0, short: 160, normal: 260, big: 420, banner: 500 } as const;

export type PlaybackSpeed = 1 | 2 | 4;

/** Held beat timings at Motion Normal. The 1× entry mirrors `--dur-held`. */
export const HOLD_MS = { 1: 800, 2: 250, 4: 100, reduced: 300 } as const;

/** FT-3b replaces this stand-in with the UF-11 device preference. */
export function motionScale(): number {
  return 1;
}

/** Base playback duration per event before the Motion preference and playback speed. */
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
    case 'outOfRoom':
    case 'fizzles':
    case 'moored':
    case 'cargoLost':
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
    case 'fallbackStrike':
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
    case 'afterglowSpent':
    case 'afterglowDrifts':
    case 'stateFades':
    case 'stunned':
    case 'held':
    case 'erased':
    case 'markLifted':
    case 'jarCrumbles':
    case 'scheduled':
    case 'rivalPlans':
    case 'castFails':
    case 'trickUsed':
    case 'orderFails':
    case 'pageRecovered':
      return STEP_MS.short;
    default: {
      if (isDistrictEvent(e))
        return e.type === 'bathhouses:boilOver' ||
          e.type === 'bridges:collapse' ||
          e.type === 'foundry:ring' ||
          e.type === 'foundry:greatPeal'
          ? STEP_MS.big
          : STEP_MS.short;
      const unhandled: never = e;
      void unhandled;
      return STEP_MS.short;
    }
  }
}
