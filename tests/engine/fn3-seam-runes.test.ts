import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BATCHES, footnoteKeyOf, VARIANTS } from '$data';

const LEVEL_ONE = [
  ['bolt-empty-far', 'bolt:empty@1'],
  ['bolt-empty-near', 'bolt:empty@1'],
  ['bolt-empty-seek', 'bolt:empty@2'],
  ['bolt-empty-settle', 'bolt:empty@2'],
  ['bolt-cloud-through', 'bolt:cloud@1'],
  ['bolt-cloud-find', 'bolt:cloud@1'],
  ['bolt-cloud-cover', 'bolt:cloud@2'],
  ['bolt-cloud-clear', 'bolt:cloud@2'],
  ['shove-wall-soft', 'shove:wall@1'],
  ['shove-wall-heavy', 'shove:wall@1'],
  ['shove-wall-ring', 'shove:wall@2'],
  ['shove-wall-through', 'shove:wall@2'],
  ['shove-slick-far', 'shove:slick@1'],
  ['shove-slick-again', 'shove:slick@1'],
  ['shove-slick-carry', 'shove:slick@2'],
  ['shove-slick-smear', 'shove:slick@2'],
  ['spark-slick-hot', 'spark:slick@1'],
  ['spark-slick-long', 'spark:slick@1'],
  ['spark-slick-smoke', 'spark:slick@2'],
  ['spark-slick-soot', 'spark:slick@2'],
  ['spark-mark-wide', 'spark:mark@1'],
  ['spark-mark-keep', 'spark:mark@1'],
  ['spark-mark-chain', 'spark:mark@2'],
  ['spark-mark-blast', 'spark:mark@2'],
  ['spark-plate-focus', 'spark:plate@1'],
  ['spark-plate-spare', 'spark:plate@1'],
  ['spark-plate-jolt', 'spark:plate@2'],
  ['spark-plate-charge', 'spark:plate@2'],
  ['ink-mark-overflow', 'ink:mark@1'],
  ['ink-mark-heavy', 'ink:mark@1'],
  ['ink-mark-pass', 'ink:mark@2'],
  ['ink-mark-flare', 'ink:mark@2'],
  ['ink-stain-pushed', 'ink:stain@1'],
  ['ink-stain-wet', 'ink:stain@1'],
  ['ink-stain-deepen', 'ink:stain@2'],
  ['ink-stain-wick', 'ink:stain@2'],
  ['ink-spread-kin', 'ink:spread@1'],
  ['ink-spread-seep', 'ink:spread@1'],
  ['ink-spread-brand', 'ink:spread@2'],
  ['ink-spread-deep', 'ink:spread@2'],
  ['oil-slick-lane', 'oil:slick@2'],
  ['oil-slick-seep', 'oil:slick@2'],
  ['oil-cloud-wide', 'oil:cloud@1'],
  ['oil-cloud-long', 'oil:cloud@1'],
  ['oil-cloud-drip', 'oil:cloud@2'],
  ['oil-cloud-slip', 'oil:cloud@2'],
  ['splash-unit-gather', 'splash:unit@1'],
  ['splash-unit-sweep', 'splash:unit@1'],
  ['splash-unit-ripple', 'splash:unit@2'],
  ['splash-unit-press', 'splash:unit@2'],
  ['splash-member-spared', 'splash:member@1'],
  ['splash-member-ride', 'splash:member@1'],
  ['splash-member-friendly', 'splash:member@2'],
  ['splash-member-step', 'splash:member@2'],
  ['touch-member-memory', 'touch:member@1'],
  ['touch-member-runup', 'touch:member@1'],
  ['touch-member-ram', 'touch:member@2'],
  ['touch-member-tow', 'touch:member@2'],
  ['touch-unit-reach', 'touch:unit@1'],
  ['touch-unit-steer', 'touch:unit@1'],
  ['touch-unit-follow', 'touch:unit@2'],
  ['touch-unit-recoil', 'touch:unit@2'],
  ['strike-shielded-break', 'strike:shielded@1'],
  ['strike-shielded-pierce', 'strike:shielded@1'],
  ['strike-shielded-glance', 'strike:shielded@2'],
  ['strike-shielded-knock', 'strike:shielded@2'],
  ['guard-shielded-long', 'guard:shielded@1'],
  ['guard-shielded-thick', 'guard:shielded@1'],
  ['guard-shielded-spill', 'guard:shielded@2'],
  ['guard-shielded-thorns', 'guard:shielded@2'],
  ['fork-unit-splay', 'fork:unit@1'],
  ['fork-unit-wide', 'fork:unit@1'],
  ['fork-unit-bounce', 'fork:unit@2'],
  ['fork-unit-both', 'fork:unit@2'],
  ['steam-kettle-corners', 'steam:kettle@1'],
  ['steam-kettle-long', 'steam:kettle@1'],
  ['steam-kettle-press', 'steam:kettle@2'],
  ['steam-kettle-breath', 'steam:kettle@2'],
  ['steam-cloud-wide', 'steam:cloud@1'],
  ['steam-cloud-long', 'steam:cloud@1'],
  ['steam-cloud-thunder', 'steam:cloud@2'],
  ['steam-cloud-damp', 'steam:cloud@2'],
  ['brass-plate-stand', 'brass:plate@1'],
  ['brass-plate-twin', 'brass:plate@1'],
  ['brass-plate-hum', 'brass:plate@2'],
  ['brass-plate-ground', 'brass:plate@2'],
  ['brass-mark-long', 'brass:mark@1'],
  ['brass-mark-keep', 'brass:mark@1'],
  ['brass-mark-anchor', 'brass:mark@2'],
  ['brass-mark-throw', 'brass:mark@2'],
  ['oil-slick-corners', 'oil:slick@1'],
  ['oil-slick-short', 'oil:slick@1'],
] as const;

describe('FN-3: level-I variants live in the seam-runes batch under stable ids', () => {
  it('the ids and their slots', () => {
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
