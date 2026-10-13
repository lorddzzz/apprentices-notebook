import { expect, test } from 'vitest';
import { INTERACTION_IDS } from '$data';
import { scenarioBattle } from '$engine';
import { IDLE, memberMode, onCell, onShove, onSpell } from '../../src/app/battleInput';
import { threatenedMembers } from '../../src/app/describe';
import { overlayFor } from '../../src/app/overlay';
import { at, labBattle } from './battleFixtures';

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
  const shove = onShove(s, memberMode(s, 'stoker')).mode;
  const confirm = onCell(s, shove, at('A2'), INTERACTION_IDS).mode;
  const after = overlayFor(s, confirm).intents[0];
  expect(after?.from).toEqual(at('A1'));
  expect(after?.hit).toBeNull();
  expect(after?.path.at(-1)).toEqual(at('E1'));
});

test('ghost when a unit would move', () => {
  const s = labBattle('shove-slide');
  const shove = onShove(s, memberMode(s, 'stoker')).mode;
  const confirm = onCell(s, shove, at('B1'), INTERACTION_IDS).mode;
  const o = overlayFor(s, confirm);
  expect(o.ghosts).toEqual([{ unit: 'rat-1', at: at('E1'), kind: 'enemy', def: 'rat' }]);
  expect(o.highlights).toContainEqual({ kind: 'target', at: at('B1') });
  expect(o.selected).toBe('stoker');
});

test('aim mode tints each bolt line with a chevron at its start; preview badges', () => {
  const s = labBattle('oil-chain');
  const aim = onSpell(s, memberMode(s, 'stoker'), '0,0', INTERACTION_IDS).mode;
  const o = overlayFor(s, aim);
  const chevrons = o.highlights.filter((h) => h.kind === 'aim' && h.chevron);
  expect(chevrons).toEqual([
    { kind: 'aim', at: at('A1'), chevron: 'up' },
    { kind: 'aim', at: at('B2'), chevron: 'right' },
  ]);
  const confirm = onCell(s, aim, at('C2'), INTERACTION_IDS).mode;
  const badges = overlayFor(s, confirm).badges;
  expect(badges).toContainEqual({ at: at('C2'), kind: 'kill', text: '' });
  expect(badges).toContainEqual({ at: at('E2'), kind: 'damage', text: '−2' });
});

test('inspecting an enemy emphasises its intent and dims the others', () => {
  const s = scenarioBattle({
    board: 'b . . .\n. . . D\nb . . .',
    intents: { A1: 'right', A3: 'right' },
  });
  const o = overlayFor(s, onCell(s, IDLE, at('A3'), INTERACTION_IDS).mode);
  expect(o.intents.map((d) => d.emphasis)).toEqual(['dim', 'strong']);
});
