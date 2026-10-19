import { expect, test } from 'vitest';
import { CODEX, IDIOMS, MEMBERS, METHOD_IDS, RUNE_IDS, START_KNOWN, TUNING } from '$data';
import {
  canPlace,
  codexView,
  compiledFor,
  describeSpell,
  inkUsed,
  knows,
  latticeOf,
  newProfile,
  setMemberLattice,
  setSocket,
  validateLoadout,
} from '$engine';

test('new profile (v7) knows the first evening and its lattices are valid (P35)', () => {
  const p = newProfile();
  expect(p.known).toEqual([...START_KNOWN]);
  expect(p.methods).toEqual([]);
  expect(p.inventions).toEqual([]);
  expect(p.inkCapacity).toEqual({ draughtsman: TUNING.startInk, stoker: TUNING.startInk });
  expect([p.witnessed, p.named, p.met, p.foesMet]).toEqual([[], [], [], []]);
  expect(p.vellum).toBe(0);
  expect(validateLoadout(p)).toEqual({});
  const d = compiledFor(p, 'draughtsman').spells[0];
  const s = compiledFor(p, 'stoker').spells[0];
  expect(d && describeSpell(d)).toBe('Bolt → Ink → Strike');
  expect(s && describeSpell(s)).toBe('Bolt → Oil → Spark');
});

test('new profiles are independent copies', () => {
  const a = newProfile();
  a.known.push('vat');
  expect(newProfile().known).not.toContain('vat');
});

test('knowledge, not copies (P34): a known rune can go anywhere, as often as ink allows', () => {
  const p = newProfile();
  expect(knows(p, 'bolt')).toBe(true);
  expect(knows(p, 'vat')).toBe(false);
  expect(knows(p, 'inv:recoil')).toBe(false);
  // Both start pages hold a Bolt; a third is still fine.
  expect(canPlace(p, 'draughtsman', { x: 4, y: 0 }, 'bolt')).toBeNull();
});

test('canPlace reasons', () => {
  const p = newProfile();
  expect(canPlace(p, 'draughtsman', { x: 4, y: 0 }, 'shove')).toBeNull();
  expect(canPlace(p, 'draughtsman', { x: 0, y: 2 }, 'shove')).toBe('No socket here'); // hole
  expect(canPlace(p, 'draughtsman', { x: 9, y: 9 }, 'shove')).toBe('No socket here');
  expect(canPlace(p, 'draughtsman', { x: 4, y: 0 }, 'bend')).toBe('Not known');
  // 8 ink: Bolt 2 + Ink 1 + Strike 2 = 5; a Guard (2) fits, then nothing more than 1.
  expect(inkUsed(latticeOf(p, 'draughtsman'))).toBe(5);
  const q = setMemberLattice(
    p,
    'draughtsman',
    setSocket(latticeOf(p, 'draughtsman'), { x: 3, y: 1 }, 'guard'),
  );
  expect(canPlace(q, 'draughtsman', { x: 4, y: 1 }, 'ink')).toBeNull(); // 7 + 1
  expect(canPlace(q, 'draughtsman', { x: 4, y: 1 }, 'strike')).toBe('Not enough ink');
});

test('the Stoker is trained in the Seam: its runes cost him 1 less (P33, P36)', () => {
  const p = newProfile();
  expect(inkUsed(latticeOf(p, 'stoker'))).toBe(4); // priced without a lean
  const s = compiledFor(p, 'stoker').spells[0];
  expect(s?.ink).toBe(3);
});

test('placing over an occupied socket replaces it', () => {
  const p = newProfile();
  expect(canPlace(p, 'draughtsman', { x: 0, y: 1 }, 'bolt')).toBeNull();
  expect(canPlace(p, 'draughtsman', { x: 1, y: 1 }, 'spark')).toBeNull(); // the Ink there is replaced
});

test('validateLoadout reports unknown runes and over-spent ink without mutating', () => {
  const p = newProfile();
  const l = setSocket(latticeOf(p, 'stoker'), { x: 1, y: 3 }, 'coil');
  const bad = setMemberLattice(p, 'stoker', l);
  const issues = validateLoadout(bad);
  expect(issues.draughtsman).toBeUndefined();
  expect(issues.stoker?.find((i) => i.kind === 'owned')?.message).toBe('Coil is not known');
  expect(latticeOf(p, 'stoker').runes).toHaveLength(3);

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

test('codexView: runes known by knowledge, methods once learnt, idioms once named', () => {
  const p = newProfile();
  const view = codexView(p);
  expect(view).toHaveLength(CODEX.length);
  const known = (v: ReturnType<typeof codexView>, id: string) =>
    v.find((x) => x.entry.id === id)?.known;
  expect(known(view, 'rune:bolt')).toBe(true);
  expect(known(view, 'rune:vat')).toBe(false);
  expect(known(view, 'method:conduct')).toBe(false);
  const idiom = IDIOMS[0]?.id ?? '';
  expect(known(view, `idiom:${idiom}`)).toBe(false);
  const q = {
    ...p,
    known: [...p.known, 'vat' as const],
    methods: ['conduct' as const],
    named: [`idiom:${idiom}`],
  };
  const v2 = codexView(q);
  expect(known(v2, 'rune:vat')).toBe(true);
  expect(known(v2, 'method:conduct')).toBe(true);
  expect(known(v2, `idiom:${idiom}`)).toBe(true);
  expect(v2.filter((v) => v.entry.kind === 'rune')).toHaveLength(RUNE_IDS.length);
  expect(v2.filter((v) => v.entry.kind === 'method')).toHaveLength(METHOD_IDS.length);
});

test('leans and habits are data (P36)', () => {
  expect(MEMBERS.stoker.lean).toEqual({ trained: 'seam', gifted: 'seam', habit: 'forkAhead' });
  expect(MEMBERS.draughtsman.lean).toEqual({
    trained: 'timing',
    gifted: 'contracts',
    habit: 'twoJars',
  });
});

test('the start pages are the ones P35 names, and they fit each ink pot', () => {
  const p = newProfile();
  expect(MEMBERS.draughtsman.startLattice).toContain('Bolt> Ink Strike');
  expect(MEMBERS.stoker.startLattice).toContain('Oil');
  for (const m of ['draughtsman', 'stoker'] as const) {
    const used = inkUsed(latticeOf(p, m), {}, {}, MEMBERS[m].lean);
    expect(used).toBeLessThanOrEqual(p.inkCapacity[m]);
  }
});
