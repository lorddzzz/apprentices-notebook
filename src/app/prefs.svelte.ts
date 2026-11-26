/**
 * Device preferences (C7, UF-P9). `prefs.motion` persists in its own device key (never the save);
 * `motionScale()` is the one multiplier for `--dur-*` (set on `:root`) and the TS timings.
 */
import {
  localPrefsBackend,
  type Motion,
  motionScaleOf,
  type PrefsBackend,
  parseMotion,
  serializePrefs,
} from './prefs';

export type { Motion } from './prefs';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** The slice of `MediaQueryList` the prefs use. */
export interface MediaQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: (e: { matches: boolean }) => void): void;
}

export interface Prefs {
  motion: Motion;
  /** The OS asks for reduced motion (live: follows changes while the app runs). Cross-fade mode only. */
  readonly reduced: boolean;
}

export interface PrefsOptions {
  backend: PrefsBackend;
  media?: MediaQuery | null;
  /** Called with the scale at start and on every Motion change (the DOM side sets `--dur-*`). */
  apply?: (scale: number) => void;
}

export function createPrefs(opts: PrefsOptions): { prefs: Prefs; motionScale: () => number } {
  let motion = $state<Motion>('normal');
  let reduced = $state(false);

  try {
    motion = parseMotion(opts.backend.read());
  } catch {
    // storage blocked: the default
  }
  if (opts.media) {
    reduced = opts.media.matches;
    opts.media.addEventListener('change', (e) => {
      reduced = e.matches;
    });
  }

  const motionScale = (): number => motionScaleOf(motion);
  opts.apply?.(motionScale());

  const prefs: Prefs = {
    get motion(): Motion {
      return motion;
    },
    set motion(value: Motion) {
      motion = value;
      try {
        opts.backend.write(serializePrefs(value));
      } catch {
        // storage blocked: the choice holds for this session
      }
      opts.apply?.(motionScale());
    },
    get reduced(): boolean {
      return reduced;
    },
  };
  return { prefs, motionScale };
}

/** `--dur-quick|base|held` at scale 1 (ms), the same numbers as theme.css. */
const BASE_DURATIONS = { quick: 250, base: 400, held: 800 } as const;

function applyDurations(scale: number): void {
  if (typeof document === 'undefined') return;
  const style = document.documentElement?.style;
  if (typeof style?.setProperty !== 'function') return;
  for (const [name, ms] of Object.entries(BASE_DURATIONS)) {
    style.setProperty(`--dur-${name}`, `${ms * scale}ms`);
  }
}

function safeBackend(): PrefsBackend {
  if (typeof localStorage === 'undefined') return { read: () => null, write: () => {} };
  return localPrefsBackend();
}

const device = createPrefs({
  backend: safeBackend(),
  media: typeof matchMedia === 'function' ? matchMedia(REDUCED_QUERY) : null,
  apply: applyDurations,
});

export const prefs = device.prefs;

/** The one multiplier for every duration: 1 for normal, 0.5 for quick. */
export const motionScale = device.motionScale;
