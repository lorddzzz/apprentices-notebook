import { describe, expect, test } from 'vitest';
import { RECIPES, RUNE_IDS } from '$data';
import { type Attempt, describeLog, newProfile, type Profile } from '$engine';
import {
  alreadyTried,
  attemptOf,
  type BenchState,
  benchShelf,
  benchUnlocked,
  canCommit,
  clearSlot,
  commit,
  EMPTY_BENCH,
  marginLine,
  openSlot,
  pickRune,
  pickSolvent,
  playTrial,
  runTrial,
  solventChoices,
} from '../../src/app/bench';

const smear: Attempt = { left: 'ink', right: 'oil', solvent: 'pitch' };

function stocked(solvents: Partial<Profile['solvents']> = { pitch: 2 }): Profile {
  const p = newProfile();
  return { ...p, solvents: { ...p.solvents, ...solvents } };
}

function filled(p: Profile, a: Attempt): BenchState {
  let s = pickRune(EMPTY_BENCH, p, 'left', a.left);
  s = pickRune(s, p, 'right', a.right);
  return pickSolvent(s, p, a.solvent);
}

describe('slots', () => {
  test('tapping a slot opens its picker; tapping it again closes it', () => {
    const open = openSlot(EMPTY_BENCH, 'left');
    expect(open.picking).toBe('left');
    expect(openSlot(open, 'left').picking).toBeNull();
    expect(openSlot(open, 'solvent').picking).toBe('solvent');
  });

  test('picking fills the slot, closes the picker and clears the result', () => {
    const p = stocked();
    const s = filled(p, smear);
    expect(attemptOf(s)).toEqual(smear);
    const tried = runTrial(s, p).state;
    expect(tried.result).not.toBeNull();
    expect(pickRune(tried, p, 'left', 'bolt').result).toBeNull();
    expect(clearSlot(tried, 'solvent').result).toBeNull();
    expect(attemptOf(clearSlot(s, 'right'))).toBeNull();
  });

  test('a parent needs a copy in the collection', () => {
    const p = stocked();
    expect(pickRune(EMPTY_BENCH, p, 'left', 'smear')).toBe(EMPTY_BENCH);
    expect(pickRune(EMPTY_BENCH, p, 'left', 'ink').left).toBe('ink');
  });

  test('a solvent never owned or tried cannot be picked; a spent kind that was tried can', () => {
    const none = stocked({ pitch: 0 });
    expect(pickSolvent(EMPTY_BENCH, none, 'pitch')).toBe(EMPTY_BENCH);
    const rich = stocked();
    const tried = runTrial(filled(rich, smear), rich).profile;
    const spent = { ...tried, solvents: { ...tried.solvents, pitch: 0 } };
    expect(pickSolvent(EMPTY_BENCH, spent, 'pitch').solvent).toBe('pitch');
    expect(solventChoices(spent).map((c) => c.id)).toEqual(['pitch']);
    expect(solventChoices(spent)[0]?.count).toBe(0);
  });

  test('the shelf lists all runes and marks the owned ones usable', () => {
    const shelf = benchShelf(stocked());
    expect(shelf.map((s) => s.rune)).toEqual(RUNE_IDS);
    expect(shelf.find((s) => s.rune === 'ink')?.usable).toBe(true);
    expect(shelf.find((s) => s.rune === 'smear')?.usable).toBe(false);
  });
});

describe('trial', () => {
  test('does nothing with an empty slot', () => {
    const p = stocked();
    const r = runTrial(pickRune(EMPTY_BENCH, p, 'left', 'ink'), p);
    expect(r.state.result).toBeNull();
    expect(r.profile).toBe(p);
  });

  test('an exact attempt scores 6 with the written margin line', () => {
    const p = stocked();
    const result = runTrial(filled(p, smear), p).state.result;
    expect(result).toMatchObject({ score: 6, margin: 'exact' });
    expect(marginLine(result as NonNullable<typeof result>)).toBe('it is written');
  });

  test('a near attempt scores under 6 and names a gap in the margin', () => {
    const p = stocked({ pitch: 1, cinder: 1 });
    const near: Attempt = { left: 'ink', right: 'oil', solvent: 'cinder' };
    const r = runTrial(filled(p, near), p).state.result;
    expect(r?.score).toBeLessThan(6);
    expect(r?.score).toBeGreaterThan(0);
    expect(marginLine(r as NonNullable<typeof r>)).not.toBe('it is written');
  });

  test('is free and remembered once: the repeat is flagged', () => {
    const p = stocked();
    const first = runTrial(filled(p, smear), p);
    expect(first.repeat).toBe(false);
    expect(first.profile.solvents.pitch).toBe(2);
    expect(alreadyTried(first.profile, smear)).toBe(true);
    const swapped = { ...smear, left: 'oil', right: 'ink' } as const;
    const again = runTrial(filled(first.profile, swapped), first.profile);
    expect(again.repeat).toBe(true);
    expect(again.profile.bench.trials).toHaveLength(1);
  });

  test('the none-left line once every recipe is in the notebook', () => {
    const p = { ...stocked(), bench: { trials: [], known: RECIPES.map((r) => r.id) } };
    const odd: Attempt = { left: 'bolt', right: 'bend', solvent: 'pitch' };
    const r = runTrial(filled(p, odd), p).state.result;
    expect(r?.margin).toBe('none-left');
    expect(marginLine(r as NonNullable<typeof r>)).toBe('nothing left to find here');
  });
});

describe('commit', () => {
  test('writes only when exact, with the solvent in hand', () => {
    const p = stocked();
    const s = filled(p, smear);
    expect(canCommit(s, p)).toBe(false); // not tried yet
    const t = runTrial(s, p);
    expect(canCommit(t.state, t.profile)).toBe(true);
    const out = commit(t.state, t.profile);
    expect(out.rune).toBe('smear');
    expect(out.first).toBe(true);
    expect(out.profile.collection.smear).toBe(1);
    expect(out.profile.solvents.pitch).toBe(1);
    expect(out.profile.bench.known).toEqual(['smear']);
    expect(out.state.result).toBeNull();
  });

  test('a non-exact trial cannot be written', () => {
    const p = stocked({ pitch: 1, cinder: 1 });
    const t = runTrial(filled(p, { left: 'ink', right: 'oil', solvent: 'cinder' }), p);
    expect(canCommit(t.state, t.profile)).toBe(false);
    expect(commit(t.state, t.profile).rune).toBeNull();
  });

  test('an exact trial with no solvent left cannot be written', () => {
    const p = stocked({ pitch: 1 });
    const t = runTrial(filled(p, smear), p);
    const dry = { ...t.profile, solvents: { ...t.profile.solvents, pitch: 0 } };
    expect(canCommit(t.state, dry)).toBe(false);
    expect(commit(t.state, dry).profile).toBe(dry);
  });

  test('a known recipe can be written again for one more solvent (P9)', () => {
    const p = stocked({ pitch: 2 });
    const t1 = runTrial(filled(p, smear), p);
    const w1 = commit(t1.state, t1.profile);
    const t2 = runTrial(w1.state, w1.profile);
    expect(t2.state.result?.margin).toBe('exact');
    const w2 = commit(t2.state, t2.profile);
    expect(w2.first).toBe(false);
    expect(w2.profile.collection.smear).toBe(2);
    expect(w2.profile.solvents.pitch).toBe(0);
  });
});

describe('the P11 gate', () => {
  test('closed on a new profile', () => {
    expect(benchUnlocked(newProfile())).toBe(false);
  });

  test('opens with any solvent', () => {
    expect(benchUnlocked(stocked({ cinder: 1 }))).toBe(true);
  });

  test('opens with bench progress and stays open when the solvents are gone', () => {
    const p = newProfile();
    expect(benchUnlocked({ ...p, bench: { trials: ['a+b+pitch'], known: [] } })).toBe(true);
    expect(benchUnlocked({ ...p, bench: { trials: [], known: ['smear'] } })).toBe(true);
    const q = stocked({ pitch: 1 });
    const t = runTrial(filled(q, smear), q);
    const spent = commit(t.state, t.profile);
    expect(spent.profile.solvents.pitch).toBe(0);
    expect(benchUnlocked(spent.profile)).toBe(true);
  });
});

describe('the trial stage', () => {
  test('every recipe plays its trial cast without throwing and produces events', () => {
    for (const r of RECIPES) {
      const { events } = playTrial({ left: r.left, right: r.right, solvent: r.solvent });
      expect(events.length, r.id).toBeGreaterThan(0);
    }
  });

  test('a pair without a Source gets a leading Bolt that hits the dummy', () => {
    const { events } = playTrial({ left: 'oil', right: 'spark', solvent: 'cinder' });
    expect(describeLog(events).join(' ')).toContain('Bolt hits dummy');
  });
});
