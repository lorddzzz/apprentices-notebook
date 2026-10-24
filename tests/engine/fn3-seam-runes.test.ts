import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BATCHES, footnoteKeyOf, VARIANTS } from '$data';

const LEVEL_ONE = [
  ['bolt-empty-far', 'bolt:empty@1'],
  ['bolt-empty-near', 'bolt:empty@1'],
  ['shove-wall-soft', 'shove:wall@1'],
  ['shove-wall-heavy', 'shove:wall@1'],
  ['shove-slick-far', 'shove:slick@1'],
  ['shove-slick-again', 'shove:slick@1'],
  ['spark-slick-hot', 'spark:slick@1'],
  ['spark-slick-long', 'spark:slick@1'],
  ['oil-slick-corners', 'oil:slick@1'],
  ['oil-slick-short', 'oil:slick@1'],
] as const;

describe('FN-3: level-I variants live in the seam-runes batch under stable ids', () => {
  it('the ten ids and their slots', () => {
    const batch = BATCHES['seam-runes'] ?? [];
    expect(batch.map((v) => [v.id, footnoteKeyOf(v)])).toEqual(LEVEL_ONE.map((p) => [...p]));
    expect(new Set(VARIANTS.map((v) => v.id)).size).toBe(VARIANTS.length);
  });

  it('every hook site reads a registered id', () => {
    const ids = new Set(VARIANTS.map((v) => v.id));
    for (const f of ['push', 'mix', 'bursts', 'targets']) {
      const src = readFileSync(`src/engine/${f}.ts`, 'utf8');
      for (const m of src.matchAll(/hasFootnote\([^,]+,\s*'([^']+)'\)/g)) {
        expect(ids.has(m[1] as string), `${f}: ${m[1]}`).toBe(true);
      }
    }
  });
});
