import { describe, expect, test } from 'vitest';
import { RECIPES } from '$data';
import { type Attempt, distil, newProfile, type Profile, recordTrial, trialKey } from '$engine';

const smear: Attempt = { left: 'ink', right: 'oil', solvent: 'pitch' };

function stocked(): Profile {
  const p = newProfile();
  return { ...p, solvents: { ...p.solvents, pitch: 2 } };
}

describe('distil', () => {
  test('spends one solvent, adds the rune, marks it known and records the trial', () => {
    const p = stocked();
    const q = distil(p, smear);
    expect(q.solvents.pitch).toBe(1);
    expect(q.collection.smear).toBe(p.collection.smear + 1);
    expect(q.collection.ink).toBe(p.collection.ink); // parents are not consumed
    expect(q.collection.oil).toBe(p.collection.oil);
    expect(q.bench.known).toEqual(['smear']);
    expect(q.bench.trials).toEqual([trialKey(smear)]);
    expect(p.solvents.pitch).toBe(2); // pure
    expect(p.bench.known).toEqual([]);
  });

  test('parents in either order; writing again makes another copy without duplicating records', () => {
    const once = distil(stocked(), smear);
    const twice = distil(once, { left: 'oil', right: 'ink', solvent: 'pitch' });
    expect(twice.collection.smear).toBe(once.collection.smear + 1);
    expect(twice.solvents.pitch).toBe(0);
    expect(twice.bench.known).toEqual(['smear']);
    expect(twice.bench.trials).toEqual([trialKey(smear)]);
  });

  test('throws on a non-exact attempt, no solvent, or a missing parent', () => {
    expect(() => distil(stocked(), { ...smear, solvent: 'gallnut' })).toThrow();
    expect(() => distil(stocked(), { left: 'ink', right: 'spark', solvent: 'pitch' })).toThrow();
    expect(() => distil(newProfile(), smear)).toThrow(/solvent/);
    const p = stocked();
    const noOil = { ...p, collection: { ...p.collection, oil: 0 } };
    expect(() => distil(noOil, smear)).toThrow(/parent/);
  });

  test('every recipe can be written by a profile that owns its parts', () => {
    for (const r of RECIPES) {
      const p = newProfile();
      const own: Profile = {
        ...p,
        collection: { ...p.collection, [r.left]: 1, [r.right]: 1 },
        solvents: { ...p.solvents, [r.solvent]: 1 },
      };
      const q = distil(own, { left: r.left, right: r.right, solvent: r.solvent });
      expect(q.bench.known).toEqual([r.id]);
    }
  });
});

describe('recordTrial', () => {
  test('adds the key once, ignoring parent order', () => {
    const p = newProfile();
    const a = recordTrial(p, smear);
    const b = recordTrial(a, { left: 'oil', right: 'ink', solvent: 'pitch' });
    expect(b.bench.trials).toEqual([trialKey(smear)]);
    expect(b).toBe(a);
    expect(p.bench.trials).toEqual([]);
  });
});
