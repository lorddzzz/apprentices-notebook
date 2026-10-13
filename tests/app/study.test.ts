import { expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, RUNE_IDS, START_COLLECTION } from '$data';
import {
  canPlace,
  type GlyphDef,
  glyphCost,
  glyphLibrary,
  inkUsed,
  isSocket,
  type Lattice,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  serializeLattice,
  setMemberLattice,
  socketAt,
} from '$engine';
import {
  decideSocketTap,
  type EditContext,
  editProfile,
  editSocket,
  freeCounter,
  glyphSlots,
  inkLeft,
  NO_TOOL,
  noteIdioms,
  profileShelf,
  type ShelfTool,
  shelfSlots,
} from '../../src/app/study';

const rune = (r: Extract<ShelfTool, { kind: 'rune' }>['rune']): ShelfTool => ({
  kind: 'rune',
  rune: r,
});
const ERASE: ShelfTool = { kind: 'erase' };

function ctx(
  ascii: string,
  opts: { capacity?: number | null; owned?: Record<string, number> | null } = {},
): EditContext {
  const lattice = parseLattice(ascii);
  const capacity = opts.capacity === undefined ? 8 : opts.capacity;
  const owned = opts.owned === undefined ? { ...START_COLLECTION, steam: 3, ink: 5 } : opts.owned;
  return {
    lattice,
    capacity,
    free: freeCounter(owned as typeof START_COLLECTION | null, [lattice]),
  };
}

const text = (l: Lattice): string => serializeLattice(l).replace(/\s+/g, ' ').trim();

test('place on empty socket', () => {
  const c = ctx('Bolt> . .');
  const r = editSocket(c, { x: 1, y: 0 }, rune('ink'), false);
  expect(r.decision).toEqual({ kind: 'place', rune: 'ink' });
  expect(socketAt(r.lattice, { x: 1, y: 0 })).toMatchObject({ rune: 'ink' });
  expect(r.message).toBeNull();
});

test('reject when ink is short, with the reason', () => {
  const c = ctx('Bolt> Ink Ink Ink Ink', { capacity: 6 });
  expect(inkLeft(c.lattice, 6)).toBe(0);
  const d = decideSocketTap(
    { ...c, lattice: parseLattice('Bolt> Ink Ink Ink Ink .') },
    { x: 5, y: 0 },
    rune('spark'),
  );
  expect(d).toEqual({ kind: 'reject', reason: 'Spark needs 1 ink, 0 left' });
});

test('reject when none left', () => {
  const c = ctx('Bolt> Boltv .'); // owns 2 bolts, both placed
  const r = editSocket(c, { x: 2, y: 0 }, rune('bolt'), false);
  expect(r.decision).toEqual({ kind: 'reject', reason: 'No Bolt left' });
  expect(r.message).toBe('No Bolt left');
  expect(r.lattice).toBe(c.lattice);
});

test('replace refunds the old rune ink', () => {
  // 8 capacity: Bolt(2) + Splash... use Echo(3)+Echo? Use a tight lattice: Bolt 2 + Ink x6 = 8 used.
  const c = ctx('Bolt> Ink Ink Ink Ink Ink Ink', { capacity: 8 });
  expect(inkUsed(c.lattice)).toBe(8);
  // Spark costs 1, Ink refunds 1: fits even though the pot is full.
  const r = editSocket(c, { x: 1, y: 0 }, rune('spark'), false);
  expect(r.decision).toEqual({ kind: 'replace', rune: 'spark' });
  expect(inkUsed(r.lattice)).toBe(8);
  // Ward costs 2 for a 1-ink refund: rejected.
  const w = decideSocketTap(c, { x: 1, y: 0 }, rune('ward'));
  expect(w.kind).toBe('reject');
});

test('tap arrow rune rotates; non-arrow inspects', () => {
  const c = ctx('Bolt> Ink');
  const rot = editSocket(c, { x: 0, y: 0 }, NO_TOOL, false);
  expect(rot.decision.kind).toBe('rotate');
  expect(text(rot.lattice)).toBe('Boltv Ink');
  const insp = editSocket(c, { x: 1, y: 0 }, NO_TOOL, false);
  expect(insp.decision.kind).toBe('inspect');
  expect(insp.lattice).toBe(c.lattice);
});

test('the same rune as the tool counts as a tap on the socket', () => {
  const c = ctx('Bolt> Ink');
  expect(decideSocketTap(c, { x: 0, y: 0 }, rune('bolt')).kind).toBe('rotate');
  expect(decideSocketTap(c, { x: 1, y: 0 }, rune('ink')).kind).toBe('inspect');
});

test('erase removes; on an empty socket it does nothing', () => {
  const c = ctx('Bolt> Ink .');
  const r = editSocket(c, { x: 1, y: 0 }, ERASE, false);
  expect(r.decision.kind).toBe('remove');
  expect(text(r.lattice)).toBe('Bolt> . .');
  expect(decideSocketTap(c, { x: 2, y: 0 }, ERASE).kind).toBe('ignore');
});

test('long-press removes whatever the tool is, and keeps the tool', () => {
  const c = ctx('Bolt> Ink .');
  const r = editSocket(c, { x: 1, y: 0 }, rune('spark'), true);
  expect(r.decision.kind).toBe('remove');
  expect(text(r.lattice)).toBe('Bolt> . .');
  expect(r.tool).toEqual(rune('spark'));
  expect(editSocket(c, { x: 2, y: 0 }, NO_TOOL, true).decision.kind).toBe('ignore');
});

test('holes and out-of-lattice taps are ignored', () => {
  const c = ctx('Bolt> x .');
  expect(decideSocketTap(c, { x: 1, y: 0 }, rune('ink')).kind).toBe('ignore');
  expect(decideSocketTap(c, { x: 1, y: 0 }, ERASE).kind).toBe('ignore');
  expect(decideSocketTap(c, { x: 9, y: 9 }, NO_TOOL).kind).toBe('ignore');
});

test('tool clears when the last copy is placed, stays while copies remain', () => {
  const c = ctx('Bolt> . . .'); // spark owned 2
  const first = editSocket(c, { x: 1, y: 0 }, rune('spark'), false);
  expect(first.tool).toEqual(rune('spark'));
  const next: EditContext = {
    ...c,
    lattice: first.lattice,
    free: freeCounter({ ...START_COLLECTION }, [first.lattice]),
  };
  const second = editSocket(next, { x: 2, y: 0 }, first.tool, false);
  expect(second.tool).toEqual(NO_TOOL);
});

test('lab context: unlimited ink and runes', () => {
  const c = ctx('Bolt> .', { capacity: null, owned: null });
  const r = editSocket(c, { x: 1, y: 0 }, rune('echo'), false);
  expect(r.decision.kind).toBe('place');
  expect(r.tool).toEqual(rune('echo'));
});

test('shelfSlots: starting collection for the Draughtsman', () => {
  const d = parseLattice(MEMBERS.draughtsman.startLattice);
  const s = parseLattice(MEMBERS.stoker.startLattice);
  const slots = shelfSlots(START_COLLECTION, [d, s], d, 8);
  expect(slots).toHaveLength(26);
  const by = (id: string) => slots.find((x) => x.rune === id);
  expect(by('bolt')).toMatchObject({ owned: 2, free: 0, usable: false, reason: 'No Bolt left' });
  expect(by('spark')).toMatchObject({ owned: 2, free: 1, usable: true, reason: null });
  expect(by('echo')).toMatchObject({ known: false, usable: false, reason: 'Not found yet' });
  expect(by('ink')?.cost).toBe(1);
});

test('shelfSlots: lab shows everything, unlimited', () => {
  const d = parseLattice(MEMBERS.draughtsman.startLattice);
  const slots = shelfSlots(null, [d], d, null);
  expect(slots.every((x) => x.known && x.usable && x.free === null && x.affordable)).toBe(true);
});

test('shelfSlots: a full ink pot makes slots unaffordable but still selectable (swaps)', () => {
  const l = parseLattice('Bolt> Ink Ink Ink Ink Ink Ink');
  const slots = shelfSlots(null, [l], l, 8);
  const oil = slots.find((x) => x.rune === 'oil');
  expect(oil).toMatchObject({ usable: true, affordable: false });
});

// ── Profile wrappers ──

test('profileShelf: unknown runes are ??? and unusable', () => {
  const p = newProfile();
  const slots = profileShelf(p, 'draughtsman');
  expect(slots).toHaveLength(26);
  for (const s of slots) {
    expect(s.known).toBe(p.collection[s.rune] > 0);
    if (!s.known) expect(s).toMatchObject({ usable: false, reason: 'Not found yet' });
  }
  expect(slots.filter((s) => s.known)).toHaveLength(7);
});

test('profileShelf: free counts across both lattices', () => {
  const p = newProfile();
  const bySlot = (m: 'draughtsman' | 'stoker', r: string) =>
    profileShelf(p, m).find((s) => s.rune === r);
  // Bolt: one on each page, 2 owned: none free from either page's shelf.
  expect(bySlot('draughtsman', 'bolt')).toMatchObject({ owned: 2, free: 0, usable: false });
  expect(bySlot('stoker', 'bolt')).toMatchObject({ owned: 2, free: 0, usable: false });
  // Placing the spare Ink on the Draughtsman is visible from the Stoker's shelf too.
  const after = editProfile(p, 'draughtsman', { x: 2, y: 1 }, { kind: 'rune', rune: 'ink' }, false);
  expect(after.changed).toBe(true);
  const before = bySlot('stoker', 'ink')?.free ?? 0;
  const next = profileShelf(after.profile, 'stoker').find((s) => s.rune === 'ink')?.free ?? 0;
  expect(next).toBe(before - 1);
});

test('profile placement honours canPlace, with its reasons', () => {
  const p = newProfile();
  let checked = 0;
  for (const m of MEMBER_IDS) {
    const shape = latticeOf(p, m).shape;
    for (let y = 0; y < shape.height; y++) {
      for (let x = 0; x < shape.width; x++) {
        for (const r of RUNE_IDS) {
          const at = { x, y };
          const edit = editProfile(p, m, at, { kind: 'rune', rune: r }, false);
          const verdict = canPlace(p, m, at, r);
          const placing = edit.decision.kind === 'place' || edit.decision.kind === 'replace';
          const here = socketAt(latticeOf(p, m), at);
          const same = here !== null && 'rune' in here && here.rune === r;
          if (!isSocket(shape, at) || same) continue; // holes and same-rune taps aren't placements
          checked += 1;
          if (placing) expect(verdict, `${m} ${x},${y} ${r}`).toBeNull();
          else {
            expect(verdict, `${m} ${x},${y} ${r}`).not.toBeNull();
            expect(edit.decision.kind).toBe('reject');
          }
        }
      }
    }
  }
  expect(checked).toBeGreaterThan(100);
});

test('editProfile leaves the input profile untouched and only the edited member changes', () => {
  const p = newProfile();
  const snapshot = structuredClone(p);
  const r = editProfile(p, 'draughtsman', { x: 2, y: 1 }, { kind: 'rune', rune: 'spark' }, false);
  expect(p).toEqual(snapshot);
  expect(r.profile.lattices.stoker).toBe(p.lattices.stoker);
  expect(r.profile.lattices.draughtsman).toHaveLength(p.lattices.draughtsman.length + 1);
});

// ── Fair copies (Glyphs) on the page ──

const GLYPH_DEF: GlyphDef = {
  id: 'g1',
  name: 'Cashing In',
  kind: 'spell',
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'ink' },
    { at: { x: 2, y: 0 }, rune: 'onInked' },
    { at: { x: 3, y: 0 }, rune: 'spark' },
  ],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: 'cashingIn',
};

/** A fresh profile owning one spare of each inner rune, holding the Glyph, with an empty page. */
function withGlyph(ink = 8): Profile {
  const p = newProfile();
  const collection = { ...p.collection };
  for (const c of GLYPH_DEF.cells) collection[c.rune] += 1;
  return {
    ...p,
    collection,
    glyphs: [GLYPH_DEF],
    inkCapacity: { ...p.inkCapacity, draughtsman: ink },
    lattices: { ...p.lattices, draughtsman: [] },
  };
}
const GLYPH_TOOL: ShelfTool = { kind: 'glyph', glyph: 'g1' };
const SPOT = { x: 1, y: 1 };

test('glyphSlots: cost, and usable only while every inner rune is free', () => {
  const p = withGlyph();
  const [slot] = glyphSlots(p, 'draughtsman');
  expect(slot?.cost).toBe(glyphCost(GLYPH_DEF));
  expect(slot?.usable).toBe(true);
  const poor = { ...p, collection: { ...p.collection, spark: 0 } };
  expect(glyphSlots(poor, 'draughtsman')[0]?.usable).toBe(false);
});

test('a Glyph tool places the Glyph pointing right, then lets go of the tool', () => {
  const p = withGlyph();
  const r = editProfile(p, 'draughtsman', SPOT, GLYPH_TOOL, false);
  expect(r.decision).toEqual({ kind: 'placeGlyph', glyph: 'g1' });
  expect(r.tool).toEqual(NO_TOOL);
  expect(socketAt(latticeOf(r.profile, 'draughtsman'), SPOT)).toEqual({
    at: SPOT,
    glyph: 'g1',
    dir: 'right',
  });
});

test('tapping a placed Glyph turns it like a Source: down, left, up, right', () => {
  let p = editProfile(withGlyph(), 'draughtsman', SPOT, GLYPH_TOOL, false).profile;
  const dirs: string[] = [];
  for (let i = 0; i < 4; i++) {
    const r = editProfile(p, 'draughtsman', SPOT, NO_TOOL, false);
    expect(r.decision.kind).toBe('rotate');
    p = r.profile;
    const g = socketAt(latticeOf(p, 'draughtsman'), SPOT);
    dirs.push(g && 'glyph' in g ? g.dir : '?');
  }
  expect(dirs).toEqual(['down', 'left', 'up', 'right']);
});

test('placing a Glyph is refused without ink, and when its runes are in use', () => {
  const tight = withGlyph(glyphCost(GLYPH_DEF) - 1);
  const r = editProfile(tight, 'draughtsman', SPOT, GLYPH_TOOL, false);
  expect(r.changed).toBe(false);
  expect(r.message).toMatch(/ink/i);
  const spent = withGlyph();
  const used = { ...spent, collection: { ...spent.collection, spark: 0 } };
  expect(editProfile(used, 'draughtsman', SPOT, GLYPH_TOOL, false).message).toBe('None left');
});

test('ink counts the Glyph and its outer aura (+1), and the shelf counts the inner runes', () => {
  const cost = glyphCost(GLYPH_DEF);
  const base = withGlyph(cost + 1);
  const owned = { ...base, collection: { ...base.collection, amplify: 1 } };
  const p = editProfile(owned, 'draughtsman', SPOT, GLYPH_TOOL, false).profile;
  const lib = glyphLibrary(p);
  expect(inkUsed(latticeOf(p, 'draughtsman'), lib)).toBe(cost);
  expect(inkLeft(latticeOf(p, 'draughtsman'), p.inkCapacity.draughtsman, lib)).toBe(1);
  // An Amplify next to the Glyph costs its own ink plus the Glyph's +1: it does not fit in 1.
  const aura = editProfile(
    p,
    'draughtsman',
    { x: 2, y: 1 },
    { kind: 'rune', rune: 'amplify' },
    false,
  );
  expect(aura.changed).toBe(false);
  expect(aura.message).toMatch(/ink/i);
  // Inner runes are not free on the shelf any more.
  const spark = profileShelf(p, 'draughtsman').find((s) => s.rune === 'spark');
  const before = profileShelf(owned, 'draughtsman').find((s) => s.rune === 'spark');
  expect(spark?.free).toBe((before?.free ?? 0) - 1);
});

test('noteIdioms toasts a fresh idiom once', () => {
  let p = newProfile();
  p = setMemberLattice(p, 'draughtsman', parseLattice('. . . . .\nBolt> Ink OnInked Spark .'));
  const first = noteIdioms(p);
  expect(first.toasts).toEqual(['Idiom recognised: Cashing In']);
  expect(noteIdioms(first.profile).toasts).toEqual([]);
});
