/** Seeded PRNG (mulberry32). All randomness in the engine goes through here. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Serializable state; pass to `createRng` to resume exactly. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    state: () => s,
  };
}

/** Derives an independent seed from a base seed and a salt (stable across runs). */
export function deriveSeed(seed: number, salt: number): number {
  return Math.floor(createRng(seed ^ Math.imul(salt, 0x9e3779b1)).next() * 4294967296) >>> 0;
}

/** Index of a weighted pick; zero-weight entries are never chosen. Throws if all weights are 0. */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) throw new Error('pickWeighted: no positive weight');
  let roll = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i] ?? 0);
    if (w === 0) continue;
    if (roll < w) return i;
    roll -= w;
  }
  return weights.findLastIndex((w) => w > 0);
}
