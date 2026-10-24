import { expect, test } from 'vitest';
import { scenarioBattle } from '$engine';
import { IDLE, memberMode, onBasic, onCell, onSpell } from '../../src/app/battleInput';
import { threatenedMembers } from '../../src/app/describe';
import { marksOf, overlayFor } from '../../src/app/overlay';
import { act, board } from '../scenarios/harness';
import { at, battleOf, CAST_BOARD, SHOVE_BOARD } from './battleFixtures';

test('intents drawn for each enemy with order', () => {
  const s = scenarioBattle({
    board: 'b . . .\n. . . D\nb . . .',
    intents: { A1: 'right', A3: 'right' },
  });
  const o = overlayFor(s, IDLE);
  expect(o.intents.map((d) => [d.from, d.order, d.hit])).toEqual([
    [at('A1'), 1, null],
    [at('A3'), 2, null],
  ]);
  expect(o.intents[0]?.path).toEqual([at('B1'), at('C1'), at('D1')]);
});

test('pending shove recomputes intents from the preview state', () => {
  const s = scenarioBattle({
    board: '. . . . .\nb . . . D\nS . . . .',
    intents: { A2: 'right' },
  });
  const before = overlayFor(s, IDLE).intents[0];
  expect(before?.hit).toEqual(at('E2'));
  expect(threatenedMembers(s)).toEqual(['draughtsman']);
  const shove = onBasic(s, memberMode(s, 'stoker')).mode;
  const confirm = onCell(s, shove, at('A2')).mode;
  const after = overlayFor(s, confirm).intents[0];
  expect(after?.from).toEqual(at('A1'));
  expect(after?.hit).toBeNull();
  expect(after?.path.at(-1)).toEqual(at('E1'));
});

test('ghost when a unit would move', () => {
  const s = battleOf(SHOVE_BOARD);
  const shove = onBasic(s, memberMode(s, 'stoker')).mode;
  const confirm = onCell(s, shove, at('B1')).mode;
  const o = overlayFor(s, confirm);
  expect(o.ghosts).toEqual([{ unit: 'rat-1', at: at('C1'), kind: 'enemy', def: 'rat' }]);
  expect(o.highlights).toContainEqual({ kind: 'target', at: at('B1') });
  expect(o.selected).toBe('stoker');
});

test('aim mode tints each bolt line with a chevron at its start; the preview marks what it hits', () => {
  const s = battleOf(CAST_BOARD);
  const aim = onSpell(s, memberMode(s, 'draughtsman'), '0,1').mode;
  const o = overlayFor(s, aim);
  const chevrons = o.highlights.filter((h) => h.kind === 'aim' && h.chevron);
  expect(chevrons).toEqual([
    { kind: 'aim', at: at('B1'), chevron: 'right' },
    { kind: 'aim', at: at('A2'), chevron: 'down' },
  ]);
  const confirm = onCell(s, aim, at('C1')).mode;
  const preview = overlayFor(s, confirm);
  expect(preview.highlights).toContainEqual({ kind: 'target', at: at('D1') });
  expect(preview.badges.map((b) => b.at)).toEqual([at('D1')]);
});

test('a touch aims at yourself or a neighbour; a splash anywhere in range', () => {
  const s = scenarioBattle(
    {
      board:
        'S r . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. D . . . .',
      lattices: { stoker: 'Touch> Strike' },
    },
    { lab: true },
  );
  const aim = onSpell(s, memberMode(s, 'stoker'), '0,0').mode;
  const aims = overlayFor(s, aim)
    .highlights.filter((h) => h.kind === 'aim')
    .map((h) => h.at);
  expect(aims).toContainEqual(at('A1')); // yourself
  expect(aims).toContainEqual(at('B1'));
  expect(aims).toContainEqual(at('A2'));
});

test('inspecting an enemy emphasises its intent and dims the others', () => {
  const s = scenarioBattle({
    board: 'b . . .\n. . . D\nb . . .',
    intents: { A1: 'right', A3: 'right' },
  });
  const o = overlayFor(s, onCell(s, IDLE, at('A3')).mode);
  expect(o.intents.map((d) => d.emphasis)).toEqual(['dim', 'strong']);
  expect(o.highlights).toContainEqual({ kind: 'focus', at: at('A3') });
});

test('an attack stopped by a cloud is drawn as blocked', () => {
  const s = scenarioBattle({
    board: 'b . ~ . D',
    intents: { A1: 'right' },
  });
  const [line] = overlayFor(s, IDLE).intents;
  expect(line?.hit).toBeNull();
  expect(line?.blocked).toBe(true);
  expect(threatenedMembers(s)).toEqual([]);
});

// ── The canals (U1) ──

const POOL = `
  l . . . l
  . . Mw> . .
  . . . . m
  D . . . .
`;

test('the lamp-mother marks the lamp she will call from', () => {
  const s = board(POOL);
  expect(s.units.find((u) => u.def === 'mother')?.kind).toBe('enemy');
  const o = overlayFor(s, IDLE);
  const summon = o.marks?.find((m) => m.kind === 'summon');
  expect(summon).toMatchObject({ kind: 'summon', from: at('C2'), at: at('A1') });
  // no attack arrow for her: she has none
  expect(o.intents.filter((d) => d.from.x === 2 && d.from.y === 1)).toEqual([]);
});

test('the flare marks every living moth', () => {
  const s = board(`
    l . . . . . . . . . .
    . . Mw> . . . . . . m m
    . . . . . . . . . . .
    D . . . . . . . . . .
  `);
  const r1 = act(s, { type: 'endTurn' });
  const r2 = act(r1.state, { type: 'endTurn' });
  const flare = overlayFor(r2.state, IDLE).marks?.find((m) => m.kind === 'flare');
  expect(flare?.kind).toBe('flare');
  if (flare?.kind !== 'flare') return;
  expect(flare.targets).toEqual(
    r2.state.units.filter((u) => u.def === 'moth' && u.hp > 0).map((u) => u.pos),
  );
  expect(flare.targets.length).toBeGreaterThan(0);
});

test('a moth beside a member draws a burst intent, an eel a lunge', () => {
  const o = overlayFor(
    board(
      `
      . . . . .
      D m . . .
      . . . . .
    `,
      { intents: { B2: 'left' } },
    ),
    IDLE,
  );
  expect(o.intents.map((d) => d.attack)).toEqual(['burst']);
  expect(o.intents[0]?.hit).toEqual(at('A2'));
});

test('drift ghosts: where a unit and a float will be after the current', () => {
  const s = board(`
    . . . .
    D w> w> w>
    . . . .
  `);
  const o = overlayFor(s, IDLE);
  expect(o.drift).not.toBeNull();
  expect(o.drift?.units.map((g) => [g.unit, g.at])).toEqual([]);
  const wet = board(`
    . . . .
    . w> Dw> w>
    . . . .
  `);
  const ghosts = overlayFor(wet, IDLE).drift?.units;
  expect(ghosts?.map((g) => [g.unit, g.at])).toEqual([['draughtsman', at('D2')]]);
});

test('drift preview: floats and no ghost on a board without water', () => {
  expect(overlayFor(board('. . .\nD . .'), IDLE).drift).toBeNull();
  const oily = board('. . .\nD w>o w>');
  expect(overlayFor(oily, IDLE).drift?.floats).toEqual([{ from: at('B2'), to: at('C2') }]);
});

test('marksOf works on a playback view', () => {
  const marks = marksOf(
    [
      {
        kind: 'enemy',
        id: 'mother-1',
        def: 'mother',
        pos: at('C2'),
        alive: true,
        intent: { kind: 'flare', order: 1 },
      },
      { kind: 'enemy', id: 'moth-1', def: 'moth', pos: at('A1'), alive: true, intent: null },
      { kind: 'enemy', id: 'moth-2', def: 'moth', pos: at('E3'), alive: false, intent: null },
    ],
    null,
  );
  expect(marks).toEqual([
    { kind: 'flare', from: at('C2'), targets: [at('A1')], order: 1, emphasis: 'normal' },
  ]);
});
