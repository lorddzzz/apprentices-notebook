import { expect, test } from 'vitest';
import {
  type InventionDef,
  LINES,
  type LineId,
  MEMBER_IDS,
  MEMBERS,
  RUNE_IDS,
  RUNES,
  type RuneRef,
  START_KNOWN,
} from '$data';
import {
  type CellKey,
  canPlace,
  compileLattice,
  type GlyphArg,
  type GlyphDef,
  glyphCost,
  glyphLibrary,
  growingLattice,
  headlineOf,
  inkUsed,
  isSocket,
  type Lattice,
  latticeOf,
  libraryOf,
  newProfile,
  type Profile,
  parseLattice,
  type Step,
  serializeLattice,
  socketAt,
} from '$engine';
import {
  argOptions,
  benchUnlocked,
  decideSocketTap,
  detailOf,
  type EditContext,
  editProfile,
  editSocket,
  finePrint,
  flowZones,
  glyphSlots,
  inkLeft,
  inventionSlots,
  NO_TOOL,
  profileShelf,
  revisionPalette,
  type ShelfTool,
  setGlyphArgs,
  setGlyphOpenCells,
  shelfGroups,
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
    ink: ink,
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
  expect(inkLeft(latticeOf(p, 'draughtsman'), p.ink, lib, {}, 'draughtsman')).toBe(1);
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

// ── U3: shelf tabs, invention placement, fine print, flow zones ──

const IMPULSE: InventionDef = {
  id: 'inv:impulse',
  name: 'Impulse',
  method: 'conduct',
  parts: ['shove'],
  solvent: null,
};
const LIB = libraryOf([IMPULSE]);
const withImpulse = (): Profile => ({ ...newProfile(), inventions: [IMPULSE] });
const useRune = (rune: RuneRef): ShelfTool => ({ kind: 'rune', rune });

test('shelfGroups: known runes by role, in the design order, unknown ones left out', () => {
  const groups = shelfGroups(profileShelf(newProfile(), 'draughtsman'));
  expect(groups[0]).toMatchObject({ role: 'source' });
  expect(groups[0]?.slots.map((s) => s.rune)).toEqual(['bolt']);
  expect(groups.flatMap((g) => g.slots)).toHaveLength(START_KNOWN.length);
  for (const g of groups) for (const s of g.slots) expect(s.role).toBe(g.role);
  // learning a Shape opens its own group, after the Kinds
  const learned = { ...newProfile(), known: [...newProfile().known, 'fork' as const] };
  const roles = shelfGroups(profileShelf(learned, 'draughtsman')).map((g) => g.role);
  expect(roles.indexOf('shape')).toBe(roles.indexOf('kind') + 1);
});

test('inventionSlots: the household inventions, with their role and cost', () => {
  const slots = profileShelf(withImpulse(), 'draughtsman');
  const made = inventionSlots(slots);
  expect(made.map((s) => s.rune)).toEqual(['inv:impulse']);
  expect(made[0]).toMatchObject({ known: true, usable: true, role: 'action', invention: true });
  // Σ parts + method (P33): Shove 2 + Conduct 2
  expect(made[0]?.cost).toBe(4);
  const grouped = shelfGroups(slots).flatMap((g) => g.slots.map((s) => s.rune));
  expect(grouped).not.toContain('inv:impulse');
});

test('trained discount: the school pays one less and the shelf keeps the full price to strike through', () => {
  const p = withImpulse();
  const stoker = profileShelf(p, 'stoker'); // trained in the Seam
  const drawer = profileShelf(p, 'draughtsman'); // trained in Timing
  const by = (slots: typeof stoker, r: string) => slots.find((s) => s.rune === r);
  expect(by(stoker, 'bolt')).toMatchObject({ base: 2, cost: 1 });
  expect(by(drawer, 'bolt')).toMatchObject({ base: 2, cost: 2 });
  // an invention made of Seam runes is cheaper for the Seam's apprentice
  expect(by(stoker, 'inv:impulse')).toMatchObject({ base: 4, cost: 3 });
  expect(by(drawer, 'inv:impulse')).toMatchObject({ base: 4, cost: 4 });
  // a rune cannot go below 1
  expect(by(stoker, 'ink')).toMatchObject({ base: 1, cost: 1 });
});

test('the ink pot counts the discounted price as runes are placed', () => {
  let p = withImpulse();
  const lean = MEMBERS.stoker.lean;
  const before = inkUsed(latticeOf(p, 'stoker'), {}, LIB, lean);
  const at = { x: 1, y: 5 };
  expect(socketAt(latticeOf(p, 'stoker'), at)).toBeNull();
  p = editProfile(p, 'stoker', at, useRune('inv:impulse'), false).profile;
  expect(inkUsed(latticeOf(p, 'stoker'), {}, LIB, lean)).toBe(before + 3);
  expect(inkLeft(latticeOf(p, 'stoker'), p.ink, {}, LIB, 'stoker')).toBe(p.ink - before - 3);
});

test('an invention goes on a socket like a rune, and again (knowledge, not copies)', () => {
  let p = { ...withImpulse(), ink: 99 };
  for (const at of [
    { x: 1, y: 5 },
    { x: 2, y: 4 },
  ]) {
    const r = editProfile(p, 'stoker', at, useRune('inv:impulse'), false);
    expect(r.decision).toEqual({ kind: 'place', rune: 'inv:impulse' });
    p = r.profile;
    expect(socketAt(latticeOf(p, 'stoker'), at)).toMatchObject({ rune: 'inv:impulse' });
  }
});

test('refused only for ink or "not known"', () => {
  const at = { x: 1, y: 5 };
  // ink: an invention that does not fit the pot
  const p = { ...withImpulse(), ink: 0 };
  const poor = editProfile(p, 'stoker', at, useRune('inv:impulse'), false);
  expect(poor.changed).toBe(false);
  expect(poor.message).toMatch(/ink/i);
  // not known: a rune the household has not found, and an invention it never made
  const none = editProfile(newProfile(), 'stoker', at, useRune('coil'), false);
  expect(none.decision).toMatchObject({ kind: 'reject' });
  expect(none.message).toMatch(/not known/i);
  const ghost = editProfile(newProfile(), 'stoker', at, useRune('inv:ghost'), false);
  expect(ghost.message).toMatch(/not known/i);
  // and nothing else stops a known rune on an empty socket
  const ok = editProfile(newProfile(), 'stoker', at, useRune('ink'), false);
  expect(ok.changed).toBe(true);
});

test('fine print n / m: witnessed rows over the rune’s rows; an invention reads its method', () => {
  const rows = LINES.filter((l) => l.subject === 'ink');
  expect(rows.length).toBeGreaterThan(3);
  const seen = [rows[0]?.id, rows[1]?.id, 'oil:slick'].filter((x): x is LineId => x !== undefined);
  expect(finePrint(seen, 'ink')).toEqual({ witnessed: 2, total: rows.length });
  expect(finePrint([], 'ink')).toEqual({ witnessed: 0, total: rows.length });
  const conduct = LINES.filter((l) => l.subject === 'conduct');
  expect(conduct.length).toBeGreaterThan(0);
  const first = conduct[0]?.id;
  expect(finePrint(first ? [first] : [], 'inv:impulse', LIB)).toEqual({
    witnessed: first ? 1 : 0,
    total: conduct.length,
  });
  // an invention nobody knows has no rows
  expect(finePrint([], 'inv:ghost', LIB).total).toBe(0);
});

test('detailOf: the headline of a rune and of an invention, with its fine print', () => {
  const rune = detailOf('shove', [], LIB);
  expect(rune).toMatchObject({ name: 'Shove', role: 'action', headline: RUNES.shove.headline });
  const made = detailOf('inv:impulse', [], LIB);
  expect(made).toMatchObject({
    name: 'Impulse',
    role: 'action',
    headline: headlineOf(IMPULSE, LIB),
  });
  expect(made.headline).toContain('Shove');
});

test('flowZones: Fork sides, and everything after a Seal is in the jar', () => {
  const fork = compileLattice(parseLattice('. Ink .\nBolt> Fork .\n. Spark .'));
  const zones = flowZones(fork).get('0,1');
  expect(zones?.get('1,0')).toEqual({ side: 'left', sealed: false });
  expect(zones?.get('1,2')).toEqual({ side: 'right', sealed: false });
  expect(zones?.get('1,1')).toEqual({ side: null, sealed: false });

  const jar = compileLattice(parseLattice('Bolt> Ink Jar Spark Oil'));
  const z = flowZones(jar).get('0,0');
  expect(z?.get('1,0')?.sealed).toBe(false);
  expect(z?.get('2,0')?.sealed).toBe(false); // the Jar itself is the split
  expect(z?.get('3,0')?.sealed).toBe(true);
  expect(z?.get('4,0')?.sealed).toBe(true);
});

test('flowZones: a Seal inside a branch seals only that branch', () => {
  const l = compileLattice(
    parseLattice('. . . . . .\nSpark Jar Ink Fork Oil Ink\n. . . Bolt^ . .'),
  );
  const z = flowZones(l).get('3,2');
  expect(z?.get('2,1')).toEqual({ side: 'left', sealed: false });
  expect(z?.get('1,1')).toEqual({ side: 'left', sealed: false });
  expect(z?.get('0,1')).toEqual({ side: 'left', sealed: true });
  expect(z?.get('4,1')).toEqual({ side: 'right', sealed: false });
  expect(z?.get('5,1')).toEqual({ side: 'right', sealed: false });
});

test('flowZones traverses a long growing chain without recursive stack growth', () => {
  const runes = Array.from({ length: 20000 }, (_, x) => ({
    at: { x: x - 10000, y: -1 },
    rune: 'ink' as const,
  }));
  const lattice = growingLattice([
    { at: { x: -10001, y: -1 }, rune: 'bolt', dir: 'right' },
    ...runes,
  ]);
  const zones = flowZones(compileLattice(lattice)).get('-10001,-1');
  expect(zones?.size).toBe(20000);
  expect(zones?.get('9999,-1')).toEqual({ side: null, sealed: false });
});

test('flowZones preserves first split branch and sealed reading for repeated Glyph sockets', () => {
  const leaf: Step = {
    at: { x: -2, y: 0 },
    via: [{ x: -3, y: 0 }],
    role: 'kind',
    rune: 'ink',
    auras: [],
    next: null,
  };
  const first: Step = {
    at: { x: 0, y: 0 },
    role: 'split',
    branches: [{ at: { x: -1, y: 0 }, role: 'seal', rune: 'jar', rest: leaf }, leaf],
  };
  const compiled = compileLattice(parseLattice('Bolt> Ink'));
  const spell = compiled.spells[0];
  if (!spell) throw new Error('missing spell');
  const zones = flowZones({ ...compiled, spells: [{ ...spell, first }] }).get('0,0');
  expect(zones?.get('-2,0')).toEqual({ side: null, sealed: true });
  expect(zones?.get('-3,0')).toEqual({ side: null, sealed: true });
});
