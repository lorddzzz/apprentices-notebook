import { expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, RUNE_IDS, START_KNOWN } from '$data';
import {
  type CellKey,
  canPlace,
  type GlyphArg,
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
  socketAt,
} from '$engine';
import {
  argOptions,
  benchUnlocked,
  decideSocketTap,
  type EditContext,
  editProfile,
  editSocket,
  glyphSlots,
  inkLeft,
  NO_TOOL,
  profileShelf,
  revisionPalette,
  type ShelfTool,
  setGlyphArgs,
  setGlyphOpenCells,
  shelfSlots,
} from '../../src/app/study';

const rune = (r: Extract<ShelfTool, { kind: 'rune' }>['rune']): ShelfTool => ({
  kind: 'rune',
  rune: r,
});
const ERASE: ShelfTool = { kind: 'erase' };

function ctx(ascii: string, opts: { capacity?: number | null } = {}): EditContext {
  return {
    lattice: parseLattice(ascii),
    capacity: opts.capacity === undefined ? 8 : opts.capacity,
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

test('a known rune has no copies to run out of: the same rune goes on again', () => {
  const c = ctx('Bolt> Boltv .'); // two Bolts already placed
  const r = editSocket(c, { x: 2, y: 0 }, rune('bolt'), false);
  expect(r.decision).toEqual({ kind: 'place', rune: 'bolt' });
  expect(r.message).toBeNull();
});

test('the lean prices a rune: a trained school pays one less', () => {
  const lattice = parseLattice('Bolt> . .');
  const stoker: EditContext = { lattice, capacity: 8, member: 'stoker' }; // trained in the Seam
  const draughtsman: EditContext = { lattice, capacity: 8, member: 'draughtsman' };
  expect(inkLeft(lattice, 8, {}, {}, 'stoker')).toBe(7); // Bolt costs 1 for the Stoker
  expect(inkLeft(lattice, 8, {}, {}, 'draughtsman')).toBe(6);
  expect(editSocket(stoker, { x: 1, y: 0 }, rune('bolt'), false).decision.kind).toBe('place');
  expect(editSocket(draughtsman, { x: 1, y: 0 }, rune('bolt'), false).decision.kind).toBe('place');
});

test('replace refunds the old rune ink', () => {
  // Bolt 2 + six Ink = 8 used: the pot is full.
  const c = ctx('Bolt> Ink Ink Ink Ink Ink Ink', { capacity: 8 });
  expect(inkUsed(c.lattice)).toBe(8);
  // Spark costs 1, Ink refunds 1: fits even though the pot is full.
  const r = editSocket(c, { x: 1, y: 0 }, rune('spark'), false);
  expect(r.decision).toEqual({ kind: 'replace', rune: 'spark' });
  expect(inkUsed(r.lattice)).toBe(8);
  // Splash costs 2 for a 1-ink refund: rejected.
  const w = decideSocketTap(c, { x: 1, y: 0 }, rune('splash'));
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

test('the rune tool stays in hand after a placement', () => {
  const c = ctx('Bolt> . . .');
  const first = editSocket(c, { x: 1, y: 0 }, rune('spark'), false);
  expect(first.tool).toEqual(rune('spark'));
  const second = editSocket({ ...c, lattice: first.lattice }, { x: 2, y: 0 }, first.tool, false);
  expect(second.tool).toEqual(rune('spark'));
});

test('lab context: unlimited ink', () => {
  const c = ctx('Bolt> .', { capacity: null });
  const r = editSocket(c, { x: 1, y: 0 }, rune('coil'), false);
  expect(r.decision.kind).toBe('place');
  expect(r.tool).toEqual(rune('coil'));
});

test('shelfSlots: the first evening for the Draughtsman', () => {
  const d = parseLattice(MEMBERS.draughtsman.startLattice);
  const slots = shelfSlots(START_KNOWN, d, 8, {}, {}, 'draughtsman');
  expect(slots).toHaveLength(RUNE_IDS.length);
  const by = (id: string) => slots.find((x) => x.rune === id);
  expect(by('bolt')).toMatchObject({ known: true, usable: true, reason: null, cost: 2 });
  expect(by('coil')).toMatchObject({ known: false, usable: false, reason: 'Not found yet' });
  expect(by('ink')?.cost).toBe(1);
  expect(slots.filter((s) => s.known)).toHaveLength(START_KNOWN.length);
  // trained in the Seam, the Stoker pays one less for a Seam source
  const s = shelfSlots(START_KNOWN, d, 8, {}, {}, 'stoker');
  expect(s.find((x) => x.rune === 'bolt')?.cost).toBe(1);
});

test('shelfSlots: lab shows everything', () => {
  const d = parseLattice(MEMBERS.draughtsman.startLattice);
  const slots = shelfSlots(null, d, null);
  expect(slots.every((x) => x.known && x.usable && x.affordable)).toBe(true);
});

test('shelfSlots: a full ink pot makes slots unaffordable but still selectable (swaps)', () => {
  const l = parseLattice('Bolt> Ink Ink Ink Ink Ink Ink');
  const slots = shelfSlots(null, l, 8);
  const strike = slots.find((x) => x.rune === 'strike');
  expect(strike).toMatchObject({ usable: true, affordable: false });
});

// ── Profile wrappers ──

test('profileShelf: unknown runes are ??? and unusable', () => {
  const p = newProfile();
  const slots = profileShelf(p, 'draughtsman');
  expect(slots).toHaveLength(RUNE_IDS.length);
  for (const s of slots) {
    expect(s.known).toBe(p.known.some((id) => id === s.rune));
    if (!s.known) expect(s).toMatchObject({ usable: false, reason: 'Not found yet' });
  }
  expect(slots.filter((s) => s.known)).toHaveLength(7);
});

test('profileShelf: learning a rune opens its slot', () => {
  const p = { ...newProfile(), known: [...newProfile().known, 'splash' as const] };
  const slot = profileShelf(p, 'draughtsman').find((s) => s.rune === 'splash');
  expect(slot).toMatchObject({ known: true, usable: true });
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
  // Spark replaces Strike on the Draughtsman's page
  expect(socketAt(latticeOf(r.profile, 'draughtsman'), { x: 2, y: 1 })).toMatchObject({
    rune: 'spark',
  });
});

test('the revision palette offers every known rune, without a limit', () => {
  const palette = revisionPalette(newProfile());
  expect(palette.map((s) => s.rune)).toEqual(RUNE_IDS.filter((r) => START_KNOWN.includes(r)));
  expect(palette.every((s) => s.count === null)).toBe(true);
});

test('the Bench shows once the household holds a method, an invention or a solvent', () => {
  const p = newProfile();
  expect(benchUnlocked(p)).toBe(false);
  expect(benchUnlocked({ ...p, methods: ['conduct'] })).toBe(true);
  expect(benchUnlocked({ ...p, solvents: { ...p.solvents, gallnut: 1 } })).toBe(true);
});

// ── Fair copies (Glyphs) on the page ──

const GLYPH_DEF: GlyphDef = {
  id: 'g1',
  name: 'Cashing In',
  kind: 'spell',
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'ink' },
    { at: { x: 2, y: 0 }, rune: 'tally' },
    { at: { x: 3, y: 0 }, rune: 'spark' },
  ],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
};
const LEAN = MEMBERS.draughtsman.lean;

/** A fresh profile that knows Tally (and Steam), holds the Glyph, with an empty page. */
function withGlyph(ink = 8): Profile {
  const p = newProfile();
  return {
    ...p,
    known: [...p.known, 'tally', 'steam', 'coil'],
    glyphs: [GLYPH_DEF],
    inkCapacity: { ...p.inkCapacity, draughtsman: ink },
    lattices: { ...p.lattices, draughtsman: [] },
  };
}
const GLYPH_TOOL: ShelfTool = { kind: 'glyph', glyph: 'g1' };
const SPOT = { x: 1, y: 1 };

test('glyphSlots: cost, and usable only while every inner rune is known', () => {
  const p = withGlyph();
  const [slot] = glyphSlots(p, 'draughtsman');
  expect(slot?.cost).toBe(glyphCost(GLYPH_DEF, {}, LEAN));
  expect(slot?.usable).toBe(true);
  const unlearned = { ...p, known: p.known.filter((r) => r !== 'tally') };
  const poor = glyphSlots(unlearned, 'draughtsman')[0];
  expect(poor?.usable).toBe(false);
  expect(poor?.reason).toMatch(/not known/);
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

test('placing a Glyph is refused without ink, and when a rune inside is not known', () => {
  const tight = withGlyph(glyphCost(GLYPH_DEF, {}, LEAN) - 1);
  const r = editProfile(tight, 'draughtsman', SPOT, GLYPH_TOOL, false);
  expect(r.changed).toBe(false);
  expect(r.message).toMatch(/ink/i);
  const spent = withGlyph();
  const unlearned = { ...spent, known: spent.known.filter((x) => x !== 'tally') };
  expect(editProfile(unlearned, 'draughtsman', SPOT, GLYPH_TOOL, false).message).toBe('Not known');
});

test('ink counts the Glyph and its outer aura (+1)', () => {
  const cost = glyphCost(GLYPH_DEF, {}, LEAN);
  const p = editProfile(withGlyph(cost + 1), 'draughtsman', SPOT, GLYPH_TOOL, false).profile;
  const lib = glyphLibrary(p);
  expect(inkUsed(latticeOf(p, 'draughtsman'), lib, {}, LEAN)).toBe(cost);
  expect(
    inkLeft(latticeOf(p, 'draughtsman'), p.inkCapacity.draughtsman, lib, {}, 'draughtsman'),
  ).toBe(1);
  // A Coil next to the Glyph costs its own 3 ink plus the Glyph's +1: it does not fit in 1.
  const aura = editProfile(p, 'draughtsman', { x: 2, y: 1 }, { kind: 'rune', rune: 'coil' }, false);
  expect(aura.changed).toBe(false);
  expect(aura.message).toMatch(/ink/i);
});

// ── Parameters (M21, M23, M25) ──

const PARAM_DEF: GlyphDef = { ...GLYPH_DEF, params: ['1,0'] };
const STEAM_ARG: Record<CellKey, GlyphArg> = { '1,0': { rune: 'steam' } };
const D = 'draughtsman';

/** withGlyph() with the Ink cell left open. */
function withParamGlyph(): Profile {
  return { ...withGlyph(), glyphs: [PARAM_DEF] };
}

const glyphAt = (p: Profile) => {
  const g = socketAt(latticeOf(p, D), SPOT);
  return g && 'glyph' in g ? g : null;
};

test('placement keeps the defaults: no args are stored (M21)', () => {
  const r = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false);
  expect(r.changed).toBe(true);
  expect(glyphAt(r.profile)?.args).toBeUndefined();
});

test('setGlyphArgs stores a role-matching rune; an empty set clears them', () => {
  const placed = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false).profile;
  const set = setGlyphArgs(placed, D, SPOT, STEAM_ARG);
  expect(glyphAt(set)?.args).toEqual(STEAM_ARG);
  expect(glyphAt(setGlyphArgs(set, D, SPOT, {}))?.args).toBeUndefined();
});

test("setGlyphArgs keeps the engine's word: role, open cell, knowledge", () => {
  const placed = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false).profile;
  expect(() => setGlyphArgs(placed, D, SPOT, { '1,0': { rune: 'bolt' } })).toThrow(/kind rune/i);
  expect(() => setGlyphArgs(placed, D, SPOT, { '2,0': { rune: 'spark' } })).toThrow(/not open/i);
  expect(() => setGlyphArgs(placed, D, SPOT, { '9,9': { rune: 'steam' } })).toThrow(/no cell/i);
  expect(() => setGlyphArgs(placed, D, { x: 0, y: 0 }, STEAM_ARG)).toThrow(/no fair copy/i);
  const unlearned = { ...placed, known: placed.known.filter((r) => r !== 'steam') };
  expect(() => setGlyphArgs(unlearned, D, SPOT, STEAM_ARG)).toThrow('Not known');
});

test('argOptions lists the known runes of the default’s role', () => {
  const placed = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false).profile;
  const runes = argOptions(placed, D, SPOT, '1,0').map((o) => o.rune);
  expect(runes).toEqual(expect.arrayContaining(['ink', 'oil', 'steam', 'spark']));
  expect(runes).not.toContain('bolt');
  expect(runes).not.toContain('brass'); // not known yet
  // a cell that cannot be open takes nothing
  expect(argOptions(placed, D, SPOT, '0,0')).toEqual([]);
});

test('turning a placed Glyph keeps its arguments', () => {
  const placed = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false).profile;
  const withArg = setGlyphArgs(placed, D, SPOT, STEAM_ARG);
  const turned = editProfile(withArg, D, SPOT, NO_TOOL, false);
  expect(turned.decision.kind).toBe('rotate');
  expect(glyphAt(turned.profile)?.args).toEqual(STEAM_ARG);
});

test('closing an open cell drops the arguments placed copies hold for it', () => {
  const placed = editProfile(withParamGlyph(), D, SPOT, GLYPH_TOOL, false).profile;
  const withArg = setGlyphArgs(placed, D, SPOT, STEAM_ARG);
  const closed = setGlyphOpenCells(withArg, 'g1', []);
  expect(closed.glyphs[0]?.params).toEqual([]);
  expect(glyphAt(closed)?.args).toBeUndefined();
  expect(glyphAt(setGlyphOpenCells(withArg, 'g1', ['1,0']))?.args).toEqual(STEAM_ARG);
  // The engine's refusals pass through: a Source can't be open.
  expect(() => setGlyphOpenCells(withArg, 'g1', ['0,0'])).toThrow();
});
