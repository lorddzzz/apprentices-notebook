import type { Fx, Tone } from '../../../app/fx';
import type { ArtId } from '../../art/registry';

/** The one time scale: Motion preference (1 normal, 0.5 quick) over the playback speed (1, 2, 4). */
export function fxRate(scale: number, speed: number): number {
  return scale / speed;
}

/** FX hero frames (FT-D12): one 128 px frame each, scaled, rotated and faded by code. */
const TONE_SPRITE: Partial<Record<Tone, ArtId>> = {
  fire: 'props/shared/fx-fire',
  steam: 'props/shared/fx-steam',
  spark: 'props/shared/fx-spark',
  brass: 'props/shared/fx-brass-ring',
  ink: 'props/shared/fx-ink-splash',
  oil: 'props/shared/fx-oil-catch',
  shield: 'props/shared/fx-shield-pulse',
};

/** The sprite id an effect would use, or null when it has none (the vector is drawn). */
export function spriteIdOf(f: Fx): ArtId | null {
  if (f.kind === 'crush') return 'props/shared/fx-impact';
  if (f.kind === 'pulse' || f.kind === 'splat' || f.kind === 'burst') {
    return TONE_SPRITE[f.tone] ?? null;
  }
  return null;
}
