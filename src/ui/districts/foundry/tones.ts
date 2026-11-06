import type { Tone } from '$data/districts/foundry';

/**
 * P14 / BF-1: a tone reads by four cues at once, so no single one has to carry it (greyscale and
 * colour-blind safe at 47px cells). Colour also steps in lightness (dark, mid, light).
 * low = deep blue, big bell, horizontal stripes, 1 pip; mid = orange, middle bell, diagonal
 * stripes, 2 pips; high = pale gold, small bell, dots, 3 pips.
 */
export interface ToneLook {
  fill: string;
  mark: string;
  /** Silhouette scale about the bell's centre. */
  scale: number;
  pips: 1 | 2 | 3;
}

export const TONE_LOOK: Readonly<Record<Tone, ToneLook>> = {
  low: { fill: '#24407f', mark: '#d3def9', scale: 1.35, pips: 1 },
  mid: { fill: '#e08a2c', mark: '#4a2400', scale: 1.0, pips: 2 },
  high: { fill: '#f4e27a', mark: '#4a3b00', scale: 0.7, pips: 3 },
};
