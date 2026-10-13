import { expect, test } from 'vitest';
import { CODEX, INTERACTION_IDS, RUNE_IDS, START_COLLECTION, TUNING } from '$data';
import {
  available,
  canPlace,
  codexView,
  compiledFor,
  describeSpell,
  latticeOf,
  newProfile,
  setMemberLattice,
  setSocket,
  validateLoadout,
} from '$engine';

test('new profile has the start collection and valid lattices', () => {
  const p = newProfile();
  expect(p.collection).toEqual(START_COLLECTION);
  expect(p.inkCapacity).toEqual({ draughtsman: TUNING.startInk, stoker: TUNING.startInk });
  expect(p.interactions).toEqual([]);
  expect(p.vellum).toBe(0);
  expect(validateLoadout(p)).toEqual({});
  const d = compiledFor(p, 'draughtsman').spells[0];
  const s = compiledFor(p, 'stoker').spells[0];
  expect(d && describeSpell(d)).toBe('Bolt (2 damage) → Ink 3×3');
  expect(s && describeSpell(s)).toBe('Bolt (2 damage) → Spark (2 damage)');
});

test('new profiles are independent copies', () => {
  const a = newProfile();
  a.collection.bolt = 99;
  expect(newProfile().collection.bolt).toBe(START_COLLECTION.bolt);
  expect(START_COLLECTION.bolt).toBe(2);
});

test('available counts across both lattices', () => {
  const p = newProfile();
  // bolt: owns 2, one in each start lattice
  expect(available(p, 'bolt')).toBe(0);
  expect(available(p, 'ink')).toBe(1);
  expect(available(p, 'spark')).toBe(1);
  expect(available(p, 'bend')).toBe(2);
  expect(available(p, 'echo')).toBe(0);
});

test('canPlace reasons', () => {
  const p = newProfile();
  expect(canPlace(p, 'draughtsman', { x: 4, y: 0 }, 'bend')).toBeNull();
  expect(canPlace(p, 'draughtsman', { x: 0, y: 2 }, 'bend')).toBe('No socket here'); // hole
  expect(canPlace(p, 'draughtsman', { x: 9, y: 9 }, 'bend')).toBe('No socket here');
  expect(canPlace(p, 'draughtsman', { x: 4, y: 0 }, 'bolt')).toBe('None left');
  // 8 ink: bolt 2 + ink 1 used = 3; two bends make 5, then 6 capacity can't take another 2
  let q = p;
  for (const x of [2, 3]) {
    q = setMemberLattice(
      q,
      'draughtsman',
      setSocket(latticeOf(q, 'draughtsman'), { x, y: 0 }, 'bend'),
    );
  }
  expect(canPlace(q, 'draughtsman', { x: 2, y: 1 }, 'ink')).toBeNull(); // 5 used + 1
  q = { ...q, inkCapacity: { ...q.inkCapacity, draughtsman: 5 } };
  expect(canPlace(q, 'draughtsman', { x: 2, y: 1 }, 'ink')).toBe('Not enough ink');
});

test('placing over an occupied socket replaces it', () => {
  const p = newProfile();
  // Draughtsman's Bolt sits at 0,1; re-placing a Bolt there is fine even with none spare
  expect(canPlace(p, 'draughtsman', { x: 0, y: 1 }, 'bolt')).toBeNull();
  expect(canPlace(p, 'draughtsman', { x: 1, y: 1 }, 'spark')).toBeNull(); // the Ink there is replaced
});

test('validateLoadout reports unowned runes and over-spent ink without mutating', () => {
  const p = newProfile();
  const l = setSocket(latticeOf(p, 'stoker'), { x: 1, y: 3 }, 'echo');
  const bad = setMemberLattice(p, 'stoker', l);
  const issues = validateLoadout(bad);
  expect(issues.draughtsman).toBeUndefined();
  expect(issues.stoker?.map((i) => i.kind)).toContain('owned');
  expect(latticeOf(p, 'stoker').runes).toHaveLength(2);

  const poor = { ...p, inkCapacity: { ...p.inkCapacity, stoker: 1 } };
  expect(validateLoadout(poor).stoker?.some((i) => i.kind === 'ink')).toBe(true);
});

test('setMemberLattice does not alias the given lattice', () => {
  const p = newProfile();
  const l = latticeOf(p, 'stoker');
  const q = setMemberLattice(p, 'stoker', l);
  expect(q.lattices.stoker).toEqual(p.lattices.stoker);
  expect(q.lattices.stoker).not.toBe(l.runes);
});

test('codexView: runes known by ownership, interactions ??? until discovered', () => {
  const p = newProfile();
  const view = codexView(p);
  expect(view).toHaveLength(CODEX.length);
  const known = (id: string) => view.find((v) => v.entry.id === id)?.known;
  expect(known('rune:bolt')).toBe(true);
  expect(known('rune:echo')).toBe(false);
  expect(known('interaction:ignite')).toBe(false);
  const q = { ...p, collection: { ...p.collection, echo: 1 }, interactions: ['ignite' as const] };
  const v2 = codexView(q);
  expect(v2.find((v) => v.entry.id === 'rune:echo')?.known).toBe(true);
  expect(v2.find((v) => v.entry.id === 'interaction:ignite')?.known).toBe(true);
  expect(v2.find((v) => v.entry.id === 'interaction:arc')?.known).toBe(false);
  expect(v2.filter((v) => v.entry.kind === 'rune')).toHaveLength(RUNE_IDS.length);
  expect(v2.filter((v) => v.entry.kind === 'interaction')).toHaveLength(INTERACTION_IDS.length);
});
