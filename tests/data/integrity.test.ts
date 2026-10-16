import { expect, test } from 'vitest';
import type { RecipeDef, RuneDef, RuneId } from '$data';
import {
  ASPECT_IDS,
  ASPECTS,
  CODEX,
  ENCOUNTERS,
  IDIOMS,
  INTERACTION_IDS,
  LOOT_TABLES,
  MEMBER_IDS,
  MEMBERS,
  RECIPES,
  RUNE_IDS,
  RUNES,
  SOLVENTS,
  TUNING,
} from '$data';
import { parseBoard, parseLattice } from '$engine';

/** Unordered aspect pair as a key, e.g. 'mark+slick'. */
const pairKey = (aspects: readonly string[]): string => [...aspects].sort().join('+');

/**
 * Design doc research-and-mastery §2 (the explainability rules) and §9.1.
 * Returns one message per broken rule; an empty list means the recipes are valid.
 */
function recipeProblems(recipes: readonly RecipeDef[], runes: Record<RuneId, RuneDef>): string[] {
  const problems: string[] = [];
  const pairCounts = new Map<string, number>();
  for (const r of Object.values(runes)) {
    const key = pairKey(r.aspects);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const seenKeys = new Map<string, string>();
  for (const rec of recipes) {
    const result = runes[rec.result];
    const left = runes[rec.left];
    const right = runes[rec.right];
    const solvent = SOLVENTS[rec.solvent];
    if (!result || !left || !right || !solvent) {
      problems.push(`${rec.id}: unknown rune or solvent`);
      continue;
    }
    if (!result.aspects.includes(solvent.aspect)) {
      problems.push(
        `rule 1 ${rec.id}: solvent ${solvent.name} (${solvent.aspect}) is not an aspect of ${result.name}`,
      );
    }
    for (const [slot, parent] of [
      ['left', left],
      ['right', right],
    ] as const) {
      if (!parent.aspects.some((a) => result.aspects.includes(a))) {
        problems.push(
          `rule 2 ${rec.id}: ${slot} parent ${parent.name} shares no aspect with ${result.name}`,
        );
      }
    }
    const resultPair = pairKey(result.aspects);
    if ((pairCounts.get(resultPair) ?? 0) !== 1) {
      problems.push(`rule 3 ${rec.id}: aspect pair ${resultPair} is used by more than one rune`);
    }
    const parents = [rec.left, rec.right].sort().join('+');
    const key = `${parents}|${rec.solvent}`;
    const prev = seenKeys.get(key);
    if (prev) problems.push(`rule 4 ${rec.id}: same parents and solvent as ${prev}`);
    else seenKeys.set(key, rec.id);
  }
  return problems;
}

const recipe = (id: string): RecipeDef => {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`no recipe ${id}`);
  return r;
};

test('26 runes, unique tokens', () => {
  expect(RUNE_IDS).toHaveLength(26);
  expect(Object.keys(RUNES)).toHaveLength(26);
  for (const id of RUNE_IDS) expect(RUNES[id].id).toBe(id);
  const tokens = RUNE_IDS.map((id) => RUNES[id].token);
  expect(new Set(tokens).size).toBe(26);
});

test('arrow iff source or bend', () => {
  for (const id of RUNE_IDS) {
    const r = RUNES[id];
    expect(r.arrow, id).toBe(r.family === 'source' || r.id === 'bend');
  }
});

test('sources have charges (bolt 5, splash 3, ward 3)', () => {
  expect(RUNES.bolt.charges).toBe(5);
  expect(RUNES.splash.charges).toBe(3);
  expect(RUNES.ward.charges).toBe(3);
  for (const id of RUNE_IDS) {
    if (RUNES[id].family !== 'source') expect(RUNES[id].charges, id).toBe(0);
  }
});

test('every family has an ink cost', () => {
  for (const id of RUNE_IDS) expect(TUNING.inkCost[RUNES[id].family]).toBeGreaterThan(0);
});

test('loot tables reference real runes, at least 3 entries, positive weights', () => {
  for (const table of Object.values(LOOT_TABLES)) {
    expect(table.entries.length).toBeGreaterThanOrEqual(3);
    for (const e of table.entries) {
      expect(e.weight).toBeGreaterThan(0);
      if (e.spec.kind === 'rune') expect(RUNE_IDS).toContain(e.spec.rune);
    }
  }
});

test('codex has an entry per rune, interaction, recipe, idiom and aspect', () => {
  const expected =
    RUNE_IDS.length + INTERACTION_IDS.length + RECIPES.length + IDIOMS.length + ASPECT_IDS.length;
  expect(CODEX).toHaveLength(expected);
  expect(CODEX).toHaveLength(56);
  for (const id of RUNE_IDS) expect(CODEX.some((c) => c.id === `rune:${id}`)).toBe(true);
  for (const id of INTERACTION_IDS)
    expect(CODEX.some((c) => c.id === `interaction:${id}`)).toBe(true);
  expect(new Set(CODEX.map((c) => c.id)).size).toBe(CODEX.length);
  for (const c of CODEX) {
    expect(c.ownerNote.length, c.id).toBeGreaterThan(0);
    expect(c.text.length, c.id).toBeGreaterThan(0);
  }
});

test('every codex entry has an owner hint, except torn recipes (which have none)', () => {
  const torn = new Set(RECIPES.filter((r) => r.torn !== null).map((r) => `recipe:${r.id}`));
  for (const c of CODEX) {
    if (torn.has(c.id)) expect(c.hint, c.id).toBeUndefined();
    else expect(c.hint?.length ?? 0, c.id).toBeGreaterThan(0);
  }
});

test('every rune has two different aspects', () => {
  for (const id of RUNE_IDS) {
    const [a, b] = RUNES[id].aspects;
    expect(a, id).not.toBe(b);
  }
});

test('all 26 rune aspect pairs are unique (unordered)', () => {
  const pairs = RUNE_IDS.map((id) => pairKey(RUNES[id].aspects));
  expect(new Set(pairs).size).toBe(26);
});

test('recipe results are bench runes, and every bench rune is a recipe result', () => {
  const results = new Set(RECIPES.map((r) => r.result));
  for (const r of RECIPES) expect(RUNES[r.result].origin, r.id).toBe('bench');
  for (const id of RUNE_IDS) {
    if (RUNES[id].origin === 'bench') expect(results.has(id), id).toBe(true);
  }
});

test('solvents point at real aspects, and each aspect points back at its solvent', () => {
  for (const s of Object.values(SOLVENTS)) expect(Object.keys(ASPECTS), s.id).toContain(s.aspect);
  for (const a of ASPECT_IDS) expect(SOLVENTS[ASPECTS[a].solvent].aspect, a).toBe(a);
});

test('every recipe and idiom has a codex entry', () => {
  for (const r of RECIPES)
    expect(
      CODEX.some((c) => c.id === `recipe:${r.id}`),
      r.id,
    ).toBe(true);
  for (const i of IDIOMS)
    expect(
      CODEX.some((c) => c.id === `idiom:${i.id}`),
      i.id,
    ).toBe(true);
});

test('recipes satisfy the explainability rules (real data)', () => {
  expect(recipeProblems(RECIPES, RUNES)).toEqual([]);
});

test('rule 1 catches a solvent whose aspect is not in the result', () => {
  const broken = RECIPES.map((r): RecipeDef => (r.id === 'smear' ? { ...r, solvent: 'chalk' } : r));
  expect(recipeProblems(broken, RUNES).some((p) => p.startsWith('rule 1 smear'))).toBe(true);
});

test('rule 2 catches a parent that shares no aspect with the result', () => {
  const broken = RECIPES.map((r): RecipeDef => (r.id === 'torch' ? { ...r, left: 'ward' } : r));
  expect(recipeProblems(broken, RUNES).some((p) => p.startsWith('rule 2 torch'))).toBe(true);
});

test('rule 3 catches a result whose aspect pair another rune also has', () => {
  const broken: Record<RuneId, RuneDef> = {
    ...RUNES,
    splash: { ...RUNES.splash, aspects: ['slick', 'vapor'] },
  };
  expect(recipeProblems(RECIPES, broken).some((p) => p.startsWith('rule 3 smear'))).toBe(true);
});

test('rule 4 catches two recipes with the same parents and solvent', () => {
  const smear = recipe('smear');
  const twin: RecipeDef = { ...smear, id: 'smear-twin', left: 'oil', right: 'ink' };
  expect(recipeProblems([...RECIPES, twin], RUNES).some((p) => p.startsWith('rule 4'))).toBe(true);
});

test('encounters: 4, depth 1..4, only last is heart with picks 2', () => {
  expect(ENCOUNTERS).toHaveLength(4);
  ENCOUNTERS.forEach((e, i) => {
    expect(e.depth).toBe(i + 1);
    expect(e.heart).toBe(i === 3);
    expect(e.picks).toBe(i === 3 ? 2 : 1);
  });
  expect(ENCOUNTERS[3]?.loot).toBe('heart');
});

/** Every board of every depth, labelled for failure messages. */
const VARIANTS = ENCOUNTERS.flatMap((e, i) =>
  e.variants.map((v, j) => ({ depth: i, label: `${e.id}/${v.name}`, index: j, ...v })),
);

test('every depth has 3 uniquely named variants and layout = variants[0]', () => {
  const names = new Set<string>();
  for (const e of ENCOUNTERS) {
    expect(e.variants, e.id).toHaveLength(3);
    expect(e.layout, e.id).toBe(e.variants[0]?.layout);
    for (const v of e.variants) {
      expect(v.name.trim(), e.id).not.toBe('');
      expect(names.has(v.name), v.name).toBe(false);
      names.add(v.name);
    }
    expect(new Set(e.variants.map((v) => v.layout)).size, e.id).toBe(3);
  }
});

test('dummy never in encounter layouts', () => {
  for (const v of VARIANTS) {
    const tokens = v.layout.split(/\s+/);
    expect(
      tokens.some((t) => t.startsWith('d')),
      v.label,
    ).toBe(false);
  }
});

test('encounter layouts parse to 6x8 with D and S', () => {
  for (const v of VARIANTS) {
    const b = parseBoard(v.layout);
    expect([b.width, b.height], v.label).toEqual([TUNING.grid.width, TUNING.grid.height]);
    const members = b.units.filter((u) => u.kind === 'member').map((u) => u.def);
    expect(members.sort(), v.label).toEqual(['draughtsman', 'stoker']);
  }
});

test('encounter enemy counts hold for every variant of a depth', () => {
  for (const v of VARIANTS) {
    const b = parseBoard(v.layout);
    const count = (def: string) => b.units.filter((u) => u.def === def).length;
    const got = [count('rat'), count('familiar'), count('sentry')];
    const want = [
      [3, 0, 0],
      [2, 1, 0],
      [2, 0, 1],
      [2, 1, 2],
    ][v.depth];
    expect(got, v.label).toEqual(want);
    if (v.depth === 2) expect(b.tiles.filter((t) => t.oil).length, v.label).toBeGreaterThan(0);
    if (v.depth === 3) {
      expect(b.tiles.filter((t) => t.vent).length, v.label).toBeGreaterThanOrEqual(1);
      expect(b.tiles.filter((t) => t.plate).length, v.label).toBeGreaterThanOrEqual(1);
    }
  }
});

test('member start lattices match their shape (dims + holes)', () => {
  for (const id of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[id].shape).shape;
    const start = parseLattice(MEMBERS[id].startLattice);
    expect(start.shape, id).toEqual(shape);
    expect(start.runes.length, id).toBeGreaterThan(0);
  }
});
