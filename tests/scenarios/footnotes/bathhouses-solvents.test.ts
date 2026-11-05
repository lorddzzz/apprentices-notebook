import { expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { type BattleState, libraryOf, parseLabel, tileAt } from '$engine';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, where } from './castHelper';

/** BH-F4: Bath salt and Fog jar margin lines (fourCombos), capstones, and the dry miss (B1). */
const at = parseLabel;
type Notes = Parameters<typeof castWith>[2];
const inv = (id: string, solvent: InventionDef['solvent']): InventionDef => ({
  id: `inv:${id}`,
  name: id,
  method: 'repeat',
  parts: ['strike'],
  solvent,
});
const inventions = libraryOf([inv('strike-salt', 'bathSalt'), inv('strike-fog', 'fogJar')]);
const aim = { kind: 'dir', dir: 'right' } as const;
const rounds = (s: BattleState, l: string) => tileAt(s, at(l)).state?.rounds ?? null;
const cloudsOf = (s: BattleState, labels: readonly string[]) =>
  labels.filter((l) => tileAt(s, at(l)).state?.id === 'cloud');

/** Labels (from the start board) of the units that lost hp, with how much each lost. */
function hurt(s0: BattleState, after: BattleState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const u of s0.units) {
    const now = after.units.find((x) => x.id === u.id);
    const lost = u.hp - (now && now.hp > 0 ? now.hp : 0);
    if (lost > 0) out[`${String.fromCharCode(65 + u.pos.x)}${u.pos.y + 1}`] = lost;
  }
  return out;
}

// ── bathSalt:cloud ───────────────────────────────────────

// The cloud runs B1 to G1 (units at B1, D1 your ally, E1, G1) and H1 stands just outside it.
const SALT_ROW = 'D r~ ~ S~ r~ ~ r~ r';
const HP = { B1: 9, E1: 9, G1: 9, H1: 9 };

function saltRow(footnotes: Notes) {
  const s = withLattices(
    SALT_ROW,
    { draughtsman: 'Bolt> inv:strike-salt' },
    { inventions, hp: HP },
  );
  const r = castWith(s, aim, footnotes);
  return {
    hurt: hurt(s, r.state),
    rounds: ['B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map((l) => rounds(r.state, l)),
    before: ['B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map((l) => rounds(s, l)),
  };
}

test('bathSalt:cloud fourCombos: shore or near, then kin or spent', () => {
  const runs = fourCombos(
    'bathSalt:cloud',
    ['bathSalt-cloud-shore', 'bathSalt-cloud-near'],
    ['bathSalt-cloud-kin', 'bathSalt-cloud-spent'],
    ({ footnotes }) => saltRow(footnotes),
  );
  const [shoreKin, shoreSpent, nearKin, nearSpent] = runs.map((r) => r.result);
  // shore reaches H1 outside the cloud; near stops 3 steps out (D1 is 2, E1 is 3, G1 is 5).
  expect(Object.keys(shoreKin?.hurt ?? {})).toEqual(['B1', 'E1', 'G1', 'H1']);
  expect(Object.keys(nearKin?.hurt ?? {})).toEqual(['B1', 'E1']);
  // kin passes over your ally at D1; without it the ally is struck too (spent keeps the ally in).
  expect(shoreSpent?.hurt.D1).toBeGreaterThan(0);
  expect(nearSpent?.hurt.D1).toBeGreaterThan(0);
  expect(shoreKin?.hurt.D1).toBeUndefined();
  // spent: every tile salt carried through loses a round; kin leaves the cloud as it was.
  expect(shoreKin?.rounds).toEqual(shoreKin?.before);
  const down = (r: typeof nearSpent) => r?.rounds.map((n, i) => (r.before[i] ?? 0) - (n ?? 0));
  expect(down(shoreSpent)).toEqual([1, 1, 1, 1, 1, 1]);
  // near + spent: only the tiles within 3 of the target (B1 to E1) lose a round.
  expect(down(nearSpent)).toEqual([1, 1, 1, 1, 0, 0]);
});

test('bathSalt spent clears a 1-round tile', () => {
  const s = withLattices(
    'D r~ r~',
    { draughtsman: 'Bolt> inv:strike-salt' },
    { inventions, hp: { B1: 9, C1: 9 } },
  );
  for (const tile of ['B1', 'C1']) {
    const layer = tileAt(s, at(tile)).state;
    if (layer) layer.rounds = 1;
  }
  const r = castWith(s, aim, withFootnotes(['bathSalt-cloud-spent']));
  expect(tileAt(r.state, at('B1')).state).toBeNull();
  expect(tileAt(r.state, at('C1')).state).toBeNull();
  expect(r.events.some((e) => e.type === 'stateFades' && e.line === 'bathSalt:cloud')).toBe(true);
});

test('bathSalt:dry: salt with nothing to carry to is a stamped miss (B1)', () => {
  const dry = (ascii: string) => {
    const s = withLattices(
      ascii,
      { draughtsman: 'Bolt> inv:strike-salt' },
      { inventions, hp: { B1: 9 } },
    );
    return castWith(s, aim, {}).events;
  };
  for (const row of ['D r . .', 'D r~ ~ .']) {
    expect(
      dry(row).some((e) => e.type === 'miss' && e.line === 'bathSalt:dry'),
      row,
    ).toBe(true);
  }
  expect(dry('D r~ ~ r~').some((e) => e.line === 'bathSalt:dry')).toBe(false);
});

test('bathSalt-cap-again: three or more units reached strike the target once more', () => {
  const run = (ascii: string, units: string[], ids: string[]) => {
    const s = withLattices(
      ascii,
      { draughtsman: 'Bolt> inv:strike-salt' },
      { inventions, hp: Object.fromEntries(units.map((l) => [l, 9])) },
    );
    return hurt(s, castWith(s, aim, withFootnotes(ids)).state);
  };
  const three = 'D r~ r~ ~ r~';
  expect(run(three, ['B1', 'C1', 'E1'], [])).toEqual({ B1: 2, C1: 2, E1: 2 });
  expect(run(three, ['B1', 'C1', 'E1'], ['bathSalt-cap-again'])).toEqual({ B1: 4, C1: 2, E1: 2 });
  // two units are not enough
  expect(run('D r~ ~ ~ r~', ['B1', 'E1'], ['bathSalt-cap-again'])).toEqual({ B1: 2, E1: 2 });
});

test('bathSalt-cap-condense: a bare target tile takes a 1-round cloud, a cloudy one is left alone', () => {
  const run = (ascii: string, ids: string[]) => {
    const s = withLattices(
      ascii,
      { draughtsman: 'Bolt> inv:strike-salt' },
      { inventions, hp: { B1: 9 } },
    );
    const r = castWith(s, aim, withFootnotes(ids));
    return { rounds: rounds(r.state, 'B1'), before: rounds(s, 'B1') };
  };
  expect(run('D r . .', [])).toEqual({ rounds: null, before: null });
  expect(run('D r . .', ['bathSalt-cap-condense']).rounds).toBe(1);
  const cloudy = run('D r~ ~ .', ['bathSalt-cap-condense']);
  expect(cloudy.rounds).toBe(cloudy.before);
});

// ── fogJar:unit ──────────────────────────────────────────

// Target C3 (hit by the Bolt from A3). In line: B3 (empty) and D3; off the line: C2, C4; diagonals:
// B2, D2, B4, D4. D3 and D4 stand on cloud.
const FOG = ['. . . . .', '. r r . .', 'D . r r~ .', '. . . r~ .', '. . . . .'].join('\n');
const FOG_HP = { B2: 9, C2: 9, C3: 9, D3: 9, D4: 9 };
const FOG_TILES = ['B3', 'C4', 'D2', 'B4', 'B2', 'C2'];

function fogLine(footnotes: Notes) {
  const s = withLattices(FOG, { draughtsman: 'Bolt> inv:strike-fog' }, { inventions, hp: FOG_HP });
  const r = castWith(s, aim, footnotes);
  return { hurt: hurt(s, r.state), clouds: cloudsOf(r.state, FOG_TILES) };
}

test('fogJar:unit fourCombos: line or ring, then cloud or mist', () => {
  const runs = fourCombos(
    'fogJar:unit',
    ['fogJar-unit-line', 'fogJar-unit-ring'],
    ['fogJar-unit-cloud', 'fogJar-unit-mist'],
    ({ footnotes }) => fogLine(footnotes),
  );
  const [lineCloud, lineMist, ringCloud, ringMist] = runs.map((r) => r.result);
  // The Strike does 2; one step weaker is 1, two steps weaker is nothing, and a cloud tile is full.
  expect(lineCloud?.hurt).toEqual({ C3: 2, D3: 2 });
  expect(lineMist?.hurt).toEqual({ C3: 2, D3: 1 });
  // the ring adds the off-line and diagonal neighbours (the diagonals are two steps weaker)
  expect(ringCloud?.hurt).toEqual({ C3: 2, C2: 1, D3: 2, D4: 2 });
  expect(ringMist?.hurt).toEqual({ C3: 2, C2: 1, D3: 1 });
  // mist: a 1-round cloud on each empty neighbour it reaches (in the line only, or all eight)
  expect(lineMist?.clouds).toEqual(['B3']);
  expect(ringMist?.clouds.sort()).toEqual(['B3', 'B4', 'C4', 'D2']);
  expect(lineCloud?.clouds).toEqual([]);
});

test('fogJar-cap-spill: a fallen neighbour passes the invention to its own neighbours, weaker still', () => {
  const s = withLattices(
    '. . . . .\nD . r r r\n. . . . .',
    { draughtsman: 'Bolt> inv:strike-fog' },
    { inventions, hp: { C2: 9, D2: 1, E2: 9 } },
  );
  const plain = hurt(s, castWith(s, aim, {}).state);
  expect(plain).toEqual({ C2: 2, D2: 1 });
  const r = castWith(s, aim, withFootnotes(['fogJar-cap-spill']));
  // E2 is two steps weaker than the Strike: it is reached, and a Strike two steps weaker does 0.
  expect(r.state.units.find((u) => u.id === 'rat-3')?.hp).toBe(9);
  expect(
    r.events.some(
      (e) => e.line === 'fogJar:unit' && e.type === 'damage' && e.target.id === 'rat-3',
    ),
  ).toBe(false);
});

test('fogJar-cap-draw: reached neighbours are pulled one tile toward the target', () => {
  const s = withLattices(
    '. . r . .\nD . r r .\n. . . . .',
    { draughtsman: 'Bolt> inv:strike-fog' },
    { inventions, hp: { C1: 9, C2: 2, D2: 9 } },
  );
  const stay = castWith(s, aim, {});
  expect(where(stay.state, 'rat-1')).toBe('C1');
  const r = castWith(s, aim, withFootnotes(['fogJar-cap-draw']));
  // the target (rat-2, C2) is struck dead; the neighbour above is pulled in first, the one beside is blocked
  expect(r.state.units.find((u) => u.id === 'rat-2')?.hp).toBeLessThanOrEqual(0);
  expect(where(r.state, 'rat-1')).toBe('C2');
  expect(where(r.state, 'rat-3')).toBe('D2');
});
