/**
 * Device preferences (C7, UF-P9). Stub from Pack 0a with the final signatures: UF-11 persists
 * `motion` in its own device key and makes motionScale() return 0.5 for 'quick'.
 */

export type Motion = 'normal' | 'quick';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

let motion = $state<Motion>('normal');
let reduced = $state(false);

if (typeof matchMedia === 'function') {
  const mql = matchMedia(REDUCED_QUERY);
  reduced = mql.matches;
  mql.addEventListener('change', (e) => {
    reduced = e.matches;
  });
}

export const prefs = {
  get motion(): Motion {
    return motion;
  },
  set motion(value: Motion) {
    motion = value;
  },
  /** The OS asks for reduced motion (live: follows changes while the app runs). Cross-fade mode. */
  get reduced(): boolean {
    return reduced;
  },
};

/** The one multiplier for every duration (`--dur-*` and the TS timings). Stub: always 1. */
export function motionScale(): number {
  return 1;
}
