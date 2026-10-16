import { describe, expect, test } from 'vitest';
import { DRAFT_IDS, DRAFTS, ENCOUNTERS, LOOT_TABLES, type LootTableId, RUNES } from '$data';
import {
  type BattleState,
  bankDrafts,
  beginEncounter,
  checkGoal,
  compileLattice,
  createBattle,
  type Dir,
  draftInside,
  draftTest,
  editDraft,
  finishEncounter,
  freeIdiomCompile,
  type GameEvent,
  type GlyphDef,
  type GlyphInside,
  glyphLibrary,
  insideIssues,
  type LootItem,
  newProfile,
  nextDraft,
  type Profile,
  parseLattice,
  pickLoot,
  repairDraft,
  resetDraft,
  returnHome,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';

/**
 * Task E4 (plan M29–M36): the owner's drafts. The fixes live here, never in the data: every page
 * fails its test as written and passes with its fix; the heart page needs both of its fixes.
 */

type Tweak = (i: GlyphInside) => GlyphInside;
const at = (x: number, y: number) => ({ x, y });
const moveCell =
  (from: [number, number], to: [number, number]): Tweak =>
  (i) => ({
    ...i,
    cells: i.cells.map((c) =>
      c.at.x === from[0] && c.at.y === from[1] ? { ...c, at: at(...to) } : c,
    ),
  });
const patchCell =
  (
    where: [number, number],
    patch: { rune?: GlyphInside['cells'][number]['rune']; dir?: Dir },
  ): Tweak =>
  (i) => ({
    ...i,
    cells: i.cells.map((c) =>
      c.at.x === where[0] && c.at.y === where[1] ? { ...c, ...patch } : c,
    ),
  });
const both =
  (...tweaks: Tweak[]): Tweak =>
  (i) =>
    tweaks.reduce((acc, t) => t(acc), i);

/** Local cells (the entry is (0,0)) and what mends each page. */
const FIXES: Record<string, Tweak> = {
  lamplighter: patchCell([1, 0], { dir: 'down' }),
  collection: both(patchCell([1, 0], { rune: 'ink' }), patchCell([2, 0], { rune: 'onInked' })),
  'wet-work': moveCell([2, 1], [1, 1]),
  'left-hand-first': both(
    patchCell([1, -1], { rune: 'oil' }),
    patchCell([1, 1], { rune: 'spark' }),
  ),
  'foundry-bell': both(moveCell([1, -1], [0, -1]), patchCell([3, 0], { dir: 'down' })),
};
const AMP_FIX = moveCell([1, -1], [0, -1]);
const BEND_FIX = patchCell([3, 0], { dir: 'down' });

const draft = (id: string) => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};
const fixed = (id: string) => (FIXES[id] as Tweak)(draftInside(draft(id)));

const SEED = 4242;
const STUB_GLYPH: GlyphDef = {
  id: 'g1',
  name: 'Stub',
  kind: 'spell',
  cells: [
    { at: at(0, 0), rune: 'bolt', dir: 'right' },
    { at: at(1, 0), rune: 'ink' },
    { at: at(2, 0), rune: 'spark' },
  ],
  entry: at(0, 0),
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
};
/** A profile that owns one Glyph (the gate for drafts). */
const owner = (): Profile => ({ ...newProfile(), glyphs: [STUB_GLYPH] });
const owning = (...ids: string[]): Profile => ({
  ...owner(),
  drafts: ids.map((id) => ({ id, inside: draftInside(draft(id)), repaired: false })),
});
const trip = (p: Profile, loot: LootItem[] = []): Trip => ({ ...startTrip(p, SEED), loot });

describe('the five pages', () => {
  test('story order, ids and depths', () => {
    expect(DRAFTS.map((d) => d.id)).toEqual([
      'lamplighter',
      'collection',
      'wet-work',
      'left-hand-first',
      'foundry-bell',
    ]);
    expect(DRAFTS.map((d) => d.order)).toEqual([1, 2, 3, 4, 5]);
    expect(DRAFTS.map((d) => d.depth)).toEqual(['shallow', 'shallow', 'deep', 'deep', 'heart']);
    expect(DRAFT_IDS).toHaveLength(5);
  });

  test.each(DRAFTS.map((d) => d.id))('%s: a valid-to-run page of 3 to 8 flow cells', (id) => {
    const d = draft(id);
    const inside = draftInside(d);
    expect(inside.entry).toEqual(at(0, 0));
    expect(inside.kind).toBe(d.kind);
    const flow = inside.cells.filter((c) => RUNES[c.rune].family !== 'aura');
    expect(flow.length).toBeGreaterThanOrEqual(3);
    expect(flow.length).toBeLessThanOrEqual(8);
    // Only "never reached" marks are allowed on the owner's page (M34): it must run to fail.
    expect(insideIssues(inside).filter((i) => i.blocking)).toEqual([]);
    // The fix is a clean page.
    expect(insideIssues(fixed(id))).toEqual([]);
  });

  test.each(DRAFTS.map((d) => d.id))("%s: the owner's page fails, the fix passes", (id) => {
    const d = draft(id);
    const broken = draftTest(d, draftInside(d));
    expect(broken.passed).toBe(false);
    expect(broken.goals.some((g) => !g.met)).toBe(true);
    const mended = draftTest(d, fixed(id));
    expect(mended.passed).toBe(true);
    expect(mended.goals.every((g) => g.met)).toBe(true);
  });

  test('the test stage is deterministic', () => {
    const d = draft('foundry-bell');
    expect(draftTest(d, fixed(d.id)).events).toEqual(draftTest(d, fixed(d.id)).events);
  });

  test('stranded pages are the intended first clue (1, 3, 5), the rest run clean', () => {
    const strands = (id: string) =>
      insideIssues(draftInside(draft(id))).filter((i) => i.kind === 'stranded');
    expect(strands('lamplighter')).toHaveLength(1);
    expect(strands('wet-work')).toHaveLength(1);
    expect(strands('foundry-bell')).toHaveLength(1);
    expect(strands('collection')).toHaveLength(0);
    expect(strands('left-hand-first')).toHaveLength(0);
  });

  test('the heart draft needs both fixes: each alone still fails', () => {
    const d = draft('foundry-bell');
    const base = draftInside(d);
    const ampOnly = draftTest(d, AMP_FIX(base));
    const bendOnly = draftTest(d, BEND_FIX(base));
    expect(ampOnly.passed).toBe(false);
    expect(bendOnly.passed).toBe(false);
    // Amplify alone kills the rats but the spark points at the ceiling; the Bend alone can't kill.
    expect(ampOnly.goals.map((g) => g.met)).toEqual([true, true, false]);
    expect(bendOnly.goals.map((g) => g.met)).toEqual([false, false, false]);
  });

  test('a page the compiler cannot run just fails (no throw)', () => {
    const d = draft('lamplighter');
    const empty = { kind: d.kind, cells: [], entry: at(0, 0) };
    const r = draftTest(d, empty);
    expect(r.passed).toBe(false);
    expect(r.events.length).toBeGreaterThan(0);
  });
});

describe('goals (M32)', () => {
  /** A battle with every layer on the board, and a log with a few events. */
  const board = ['D o i ~ =', '. * . d .', 'r . . . .'].join('\n');
  const made = createBattle({ title: 't', board, seed: 1, lab: true, intents: {} });
  const state: BattleState = made.state;
  const events: GameEvent[] = [
    { type: 'ignite', at: at(1, 1), tiles: [at(1, 1)] },
    { type: 'ignite', at: at(1, 0), tiles: [at(1, 0)] },
    { type: 'detonate', unit: { id: 'dummy-1', name: 'dummy', at: at(3, 1), member: false } },
    {
      type: 'damage',
      target: { id: 'dummy-1', name: 'dummy', at: at(3, 1), member: false },
      amount: 2,
      source: 'Bolt',
      bonus: [],
      hpLeft: 10,
    },
    {
      type: 'damage',
      target: { id: 'dummy-1', name: 'dummy', at: at(3, 1), member: false },
      amount: 1,
      source: 'Spark',
      bonus: [],
      hpLeft: 9,
    },
    { type: 'died', unit: { id: 'rat-1', name: 'rat', at: at(0, 2), member: false } },
  ];

  test('happens: the event type, at least once or `atLeast` times', () => {
    expect(checkGoal({ happens: 'detonate' }, events, state)).toBe(true);
    expect(checkGoal({ happens: 'ignite', atLeast: 2 }, events, state)).toBe(true);
    expect(checkGoal({ happens: 'ignite', atLeast: 3 }, events, state)).toBe(false);
    expect(checkGoal({ happens: 'conduct' }, events, state)).toBe(false);
  });

  test('hurt: damage summed on that unit', () => {
    expect(checkGoal({ hurt: 'dummy-1', atLeast: 3 }, events, state)).toBe(true);
    expect(checkGoal({ hurt: 'dummy-1', atLeast: 4 }, events, state)).toBe(false);
    expect(checkGoal({ hurt: 'rat-1', atLeast: 1 }, events, state)).toBe(false);
  });

  test('dies: a died event or a unit at 0 hp; spared: the opposite', () => {
    expect(checkGoal({ dies: 'rat-1' }, events, state)).toBe(true);
    expect(checkGoal({ dies: 'dummy-1' }, events, state)).toBe(false);
    expect(checkGoal({ spared: 'dummy-1' }, events, state)).toBe(true);
    expect(checkGoal({ spared: 'rat-1' }, events, state)).toBe(false);
    const down = structuredClone(state);
    for (const u of down.units) if (u.id === 'dummy-1') u.hp = 0;
    expect(checkGoal({ dies: 'dummy-1' }, [], down)).toBe(true);
    expect(checkGoal({ spared: 'dummy-1' }, [], down)).toBe(false);
    expect(checkGoal({ spared: 'nobody' }, [], state)).toBe(false);
  });

  test('tile: the final state of a labelled tile', () => {
    expect(checkGoal({ tile: 'B1', has: 'oil' }, [], state)).toBe(true);
    expect(checkGoal({ tile: 'C1', has: 'ink' }, [], state)).toBe(true);
    expect(checkGoal({ tile: 'D1', has: 'steam' }, [], state)).toBe(true);
    expect(checkGoal({ tile: 'E1', has: 'plate' }, [], state)).toBe(true);
    expect(checkGoal({ tile: 'B2', has: 'fire' }, [], state)).toBe(true);
    expect(checkGoal({ tile: 'A1', has: 'fire' }, [], state)).toBe(false);
    expect(checkGoal({ tile: 'C1', has: 'oil' }, [], state)).toBe(false);
  });

  test('all: every part, nested', () => {
    expect(checkGoal({ all: [{ happens: 'ignite' }, { dies: 'rat-1' }] }, events, state)).toBe(
      true,
    );
    expect(
      checkGoal(
        { all: [{ happens: 'ignite' }, { all: [{ dies: 'rat-1' }, { happens: 'arc' }] }] },
        events,
        state,
      ),
    ).toBe(false);
  });

  test('a run lists each goal line (an all is flattened) with its tick', () => {
    const d = draft('foundry-bell');
    const r = draftTest(d, draftInside(d));
    expect(r.goals.map((g) => g.goal)).toEqual([
      { dies: 'rat-1' },
      { dies: 'rat-2' },
      { happens: 'detonate' },
    ]);
  });

  test('a Spell draft with endRound runs one idle enemy round', () => {
    const d = { ...draft('collection'), test: { ...draft('collection').test, endRound: true } };
    const r = draftTest(d, fixed('collection'));
    expect(r.state.round).toBe(2);
    expect(r.passed).toBe(true);
  });
});

describe('nextDraft (M30)', () => {
  test('none until the profile owns a Glyph', () => {
    const p = newProfile();
    expect(nextDraft(p, trip(p), 'heart')).toBeNull();
    expect(nextDraft(owner(), trip(owner()), 'shallow')).toBe('lamplighter');
  });

  test('story order, one at a time', () => {
    expect(nextDraft(owner(), trip(owner()), 'heart')).toBe('lamplighter');
    expect(nextDraft(owning('lamplighter'), trip(owner()), 'heart')).toBe('collection');
    const three = owning('lamplighter', 'collection', 'wet-work');
    expect(nextDraft(three, trip(three), 'heart')).toBe('left-hand-first');
  });

  test('the depth gate: shallow < deep < heart', () => {
    const two = owning('lamplighter', 'collection');
    expect(nextDraft(two, trip(two), 'shallow')).toBeNull();
    expect(nextDraft(two, trip(two), 'deep')).toBe('wet-work');
    const four = owning('lamplighter', 'collection', 'wet-work', 'left-hand-first');
    expect(nextDraft(four, trip(four), 'deep')).toBeNull();
    expect(nextDraft(four, trip(four), 'heart')).toBe('foundry-bell');
  });

  test('none once everything is owned (repaired or not)', () => {
    const all = owning(...DRAFT_IDS);
    expect(nextDraft(all, trip(all), 'heart')).toBeNull();
    const done = { ...all, drafts: all.drafts.map((d) => ({ ...d, repaired: true })) };
    expect(nextDraft(done, trip(done), 'heart')).toBeNull();
  });

  test('at most one per trip: none when the loot already holds one', () => {
    const p = owner();
    expect(nextDraft(p, trip(p, [{ kind: 'draft', draft: 'lamplighter' }]), 'shallow')).toBeNull();
    expect(nextDraft(p, trip(p, [{ kind: 'vellum', amount: 1 }]), 'shallow')).toBe('lamplighter');
  });

  test('a wiped draft is offered again', () => {
    // Picked on a trip that ends in a wipe: the loot never reaches the profile.
    const p = owner();
    const t0 = startTrip(p, SEED);
    const b = structuredClone(beginEncounter(p, t0).state);
    b.phase = 'lost';
    const r = finishEncounter(p, { ...t0, loot: [{ kind: 'draft', draft: 'lamplighter' }] }, b);
    expect(r.outcome).toBe('wiped');
    expect(r.profile.drafts).toEqual([]);
    expect(nextDraft(r.profile, startTrip(r.profile, SEED + 1), 'shallow')).toBe('lamplighter');
  });
});

describe('loot tables and offers', () => {
  const tables: LootTableId[] = ['shallow', 'deep', 'heart'];

  test('each table holds one draft entry, weight 1', () => {
    for (const t of tables) {
      const entries = LOOT_TABLES[t].entries.filter((e) => e.spec.kind === 'draft');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.weight).toBe(1);
    }
  });

  test('rolls without a draft due are unchanged by the draft entry (it is dropped)', () => {
    for (const t of tables) {
      for (let seed = 1; seed <= 50; seed++) {
        for (const o of rollOffers(seed, 0, t)) expect(o.kind).not.toBe('draft');
      }
    }
  });

  test('an offer never holds two drafts, and a draft sometimes appears', () => {
    let seen = 0;
    for (const t of tables) {
      for (let seed = 1; seed <= 400; seed++) {
        const offers = rollOffers(seed, 1, t, undefined, 'collection');
        const drafts = offers.filter((o) => o.kind === 'draft');
        expect(drafts.length).toBeLessThanOrEqual(1);
        seen += drafts.length;
        for (const o of drafts) expect(o).toEqual({ kind: 'draft', draft: 'collection' });
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  test('a won fight offers the due draft, once per trip', () => {
    // Search a seed whose first shallow fight offers it; then the picked draft blocks later offers.
    const p = owner();
    let found: { t: Trip; index: number } | null = null;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const t0 = startTrip(p, seed);
      const b = structuredClone(beginEncounter(p, t0).state);
      b.phase = 'won';
      for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
      const r = finishEncounter(p, t0, b);
      const index = r.trip?.offers.findIndex((o) => o.kind === 'draft') ?? -1;
      if (r.trip && index >= 0) found = { t: r.trip, index };
    }
    expect(found).not.toBeNull();
    const f = found as { t: Trip; index: number };
    expect(f.t.offers[f.index]).toEqual({ kind: 'draft', draft: 'lamplighter' });
    expect(ENCOUNTERS[0]?.loot).toBe('shallow');
    const picked = pickLoot(f.t, f.index);
    expect(picked.loot).toContainEqual({ kind: 'draft', draft: 'lamplighter' });
    expect(nextDraft(p, picked, 'deep')).toBeNull();
  });
});

describe('banking (M30)', () => {
  test("returning home banks the trip's draft with the owner's page", () => {
    const p = owner();
    const t: Trip = {
      ...startTrip(p, SEED),
      status: 'crossroads',
      loot: [
        { kind: 'draft', draft: 'collection' },
        { kind: 'vellum', amount: 1 },
      ],
    };
    const back = returnHome(p, t);
    expect(back.drafts).toEqual([
      { id: 'collection', inside: draftInside(draft('collection')), repaired: false },
    ]);
    expect(back.vellum).toBe(p.vellum + 1);
  });

  test('bankDrafts keeps what you own, ignores unknown ids and is idempotent', () => {
    const p = owning('lamplighter');
    const edited = editDraft(p, 'lamplighter', fixed('lamplighter'));
    const loot: LootItem[] = [
      { kind: 'draft', draft: 'lamplighter' },
      { kind: 'draft', draft: 'nope' },
      { kind: 'draft', draft: 'wet-work' },
    ];
    const once = bankDrafts(edited, loot);
    expect(once.drafts.map((d) => d.id)).toEqual(['lamplighter', 'wet-work']);
    // The working copy is not reset by a duplicate.
    expect(once.drafts[0]?.inside).toEqual(fixed('lamplighter'));
    expect(bankDrafts(once, loot)).toBe(once);
    expect(bankDrafts(p, [{ kind: 'vellum', amount: 1 }])).toBe(p);
  });
});

describe('repair (M33, M34)', () => {
  test('refuses what you do not have', () => {
    expect(() => repairDraft(owner(), 'lamplighter')).toThrow(/don't have/);
  });

  test('refuses a failing page', () => {
    expect(() => repairDraft(owning('collection'), 'collection')).toThrow(/fails its test/);
  });

  test('refuses an invalid page (blocking issue), even one that would pass', () => {
    const d = draft('collection');
    // Two runes on one cell: the page is invalid however the test goes.
    const bad: GlyphInside = {
      ...fixed(d.id),
      cells: [...fixed(d.id).cells, { at: at(1, 0), rune: 'ink' }],
    };
    const p = editDraft(owning(d.id), d.id, bad);
    expect(insideIssues(bad).some((i) => i.blocking)).toBe(true);
    expect(() => repairDraft(p, d.id)).toThrow(/share/);
  });

  test('refuses a page with a stranded cell (never reached) even when it passes', () => {
    const d = draft('collection');
    const stranded: GlyphInside = {
      ...fixed(d.id),
      cells: [...fixed(d.id).cells, { at: at(0, 2), rune: 'oil' }],
    };
    expect(draftTest(d, stranded).passed).toBe(true);
    const issues = insideIssues(stranded);
    expect(issues.map((i) => [i.kind, i.blocking])).toEqual([['stranded', false]]);
    const p = editDraft(owning(d.id), d.id, stranded);
    expect(() => repairDraft(p, d.id)).toThrow(/never reached/);
  });

  test('a passing, valid page becomes a Glyph v1 named after the draft, unproven', () => {
    const base = owning('lamplighter', 'collection');
    const p = editDraft(base, 'collection', fixed('collection'));
    const out = repairDraft(p, 'collection');
    const glyph = out.glyphs.find((g) => g.draft === 'collection');
    expect(glyph).toBeDefined();
    expect(glyph?.id).toBe('g2');
    expect(glyph?.name).toBe('Collection');
    expect(glyph?.version).toBe(1);
    expect(glyph?.params).toEqual([]);
    expect(glyph?.extraExit).toBeNull();
    expect(glyph?.kind).toBe('spell');
    expect(glyph?.entry).toEqual(at(0, 0));
    expect(glyph?.cells).toEqual(fixed('collection').cells);
    expect(out.glyphs).toHaveLength(2);
    expect(out.glyphRecords).toEqual(p.glyphRecords);
    expect(out.vellum).toBe(p.vellum);
    expect(out.drafts.find((d) => d.id === 'collection')?.repaired).toBe(true);
    expect(out.drafts.find((d) => d.id === 'lamplighter')?.repaired).toBe(false);
    // Once mended, it's done.
    expect(() => repairDraft(out, 'collection')).toThrow(/already mended/);
  });

  test('the idiom is recorded but the free first compile stays unused', () => {
    const p = editDraft(owning('collection'), 'collection', fixed('collection'));
    const out = repairDraft(p, 'collection');
    const glyph = out.glyphs.find((g) => g.draft === 'collection');
    expect(glyph?.idiom).not.toBeNull();
    expect(out.idioms).toContain(glyph?.idiom);
    expect(freeIdiomCompile(out, glyph?.idiom ?? null)).toBe(true);
  });

  test('every draft repairs into a Glyph that compiles into a spell', () => {
    for (const d of DRAFTS) {
      const p = editDraft(owning(d.id), d.id, fixed(d.id));
      const out = repairDraft(p, d.id);
      const g = out.glyphs.find((x) => x.draft === d.id);
      expect(g).toBeDefined();
      const lib = glyphLibrary(out);
      const lattice = parseLattice(
        d.kind === 'payload' ? `Bolt> G:${g?.id}> . . .` : `G:${g?.id}> . . . .`,
      );
      expect(compileLattice(lattice, [], lib).spells.length).toBeGreaterThan(0);
    }
  });

  test('repair does not pick the id of an archived Glyph', () => {
    const p = editDraft(owning('collection'), 'collection', fixed('collection'));
    const archived = { ...p, glyphArchive: [{ ...STUB_GLYPH, id: 'g2', version: 1 }] };
    const out = repairDraft(archived, 'collection');
    expect(out.glyphs.find((g) => g.draft === 'collection')?.id).toBe('g3');
  });
});

describe('editing a copy (M34)', () => {
  test("edit saves the working copy; reset restores the owner's page; test uses the copy", () => {
    const d = draft('lamplighter');
    const p = owning(d.id);
    const edited = editDraft(p, d.id, fixed(d.id));
    expect(edited.drafts[0]?.inside).toEqual(fixed(d.id));
    expect(draftTest(d, edited.drafts[0]?.inside as GlyphInside).passed).toBe(true);
    expect(p.drafts[0]?.inside).toEqual(draftInside(d));
    const back = resetDraft(edited, d.id);
    expect(back.drafts[0]?.inside).toEqual(draftInside(d));
    expect(draftTest(d, back.drafts[0]?.inside as GlyphInside).passed).toBe(false);
  });

  test('refusals: unknown, unowned, wrong kind, already mended', () => {
    const d = draft('lamplighter');
    expect(() => editDraft(owner(), d.id, draftInside(d))).toThrow(/don't have/);
    expect(() => editDraft(owning(d.id), 'nope', draftInside(d))).toThrow(/No draft/);
    expect(() => editDraft(owning(d.id), d.id, { ...draftInside(d), kind: 'payload' })).toThrow(
      /keeps its kind/,
    );
    const mended = repairDraft(editDraft(owning(d.id), d.id, fixed(d.id)), d.id);
    expect(() => editDraft(mended, d.id, draftInside(d))).toThrow(/already mended/);
    expect(() => resetDraft(mended, d.id)).toThrow(/already mended/);
  });
});
