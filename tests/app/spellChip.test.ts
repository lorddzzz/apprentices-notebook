import { describe, expect, test } from 'vitest';
import { type BattleState, castableSpells, memberById, type SpellKey } from '$engine';
import { BattleSession } from '../../src/app/battle.svelte';
import { selectedOf } from '../../src/app/battleInput';
import { armFromSheet, spellChipModel, tapChip } from '../../src/app/spellChip';
import { at, battleOf, CAST_BOARD } from './battleFixtures';

/** Pell with `extra` more Bolts under new keys, each with the given charges (the first keeps 5). */
function pellWith(extra: Record<string, number>): BattleState {
  const s: BattleState = structuredClone(battleOf(CAST_BOARD, false));
  const pell = memberById(s, 'draughtsman');
  const first = pell.spells[0];
  if (!first) throw new Error('Pell has no spell');
  for (const [key, charges] of Object.entries(extra)) {
    pell.spells.push({ ...first, key });
    pell.charges[key] = charges;
  }
  return s;
}

const sessionOf = (state: BattleState): BattleSession =>
  new BattleSession({ state, events: [] }, 'trip', {});

/** Taps the chip the way the view does: through the model, then the session's own handlers. */
function tap(session: BattleSession): { sheet: boolean } {
  const model = spellChipModel(
    castableSpells(session.state, selectedOf(session.input) ?? ''),
    session.input,
  );
  const seen = { sheet: false };
  tapChip(model, {
    choose: (key) => session.chooseSpell(key),
    openSheet: () => {
      seen.sheet = true;
    },
  });
  return seen;
}

describe('spell chip', () => {
  test('single spell arms on tap', () => {
    const s = sessionOf(battleOf(CAST_BOARD, false));
    s.selectMember('draughtsman');
    expect(tap(s)).toEqual({ sheet: false });
    expect(s.input).toMatchObject({ kind: 'aim', spell: '0,1' });
    // tapping the lit chip steps back to the member
    tap(s);
    expect(s.input.kind).toBe('member');
  });

  test('one usable among several known arms directly', () => {
    const state = pellWith({ a: 0, b: 0 });
    const model = spellChipModel(castableSpells(state, 'draughtsman'), { kind: 'idle' });
    expect(model.usable).toEqual(['0,1']);
    expect(model.more).toBe(2);
    expect(model.tap).toEqual({ kind: 'arm', key: '0,1' });
    const s = sessionOf(state);
    s.selectMember('draughtsman');
    expect(tap(s)).toEqual({ sheet: false });
    expect(s.input).toMatchObject({ kind: 'aim', spell: '0,1' });
  });

  test('two usable spells open the sheet', () => {
    const state = pellWith({ a: 3 });
    const s = sessionOf(state);
    s.selectMember('draughtsman');
    expect(tap(s)).toEqual({ sheet: true });
    // opening the sheet arms nothing: the input is still the member
    expect(s.input.kind).toBe('member');
    const model = spellChipModel(castableSpells(s.state, 'draughtsman'), s.input);
    expect(model.tap).toEqual({ kind: 'sheet' });
    expect(armFromSheet(model, 'a', (key) => s.chooseSpell(key))).toBe(true);
    expect(s.input).toMatchObject({ kind: 'aim', spell: 'a' });
  });

  test('spent charges cannot arm', () => {
    const state = pellWith({});
    memberById(state, 'draughtsman').charges['0,1'] = 0;
    const s = sessionOf(state);
    s.selectMember('draughtsman');
    const model = spellChipModel(castableSpells(s.state, 'draughtsman'), s.input);
    expect(model.tap).toEqual({ kind: 'none', reason: 'No charges left.' });
    expect(tap(s)).toEqual({ sheet: false });
    expect(s.input.kind).toBe('member');
    // the handler itself also refuses, with the reason in the caption
    s.chooseSpell('0,1');
    expect(s.input).toMatchObject({ kind: 'member', note: 'No charges left.' });
  });

  test('choosing another clears the old preview', () => {
    const s = sessionOf(pellWith({ a: 3 }));
    s.selectMember('draughtsman');
    s.chooseSpell('0,1');
    s.tapCell(at('D1'), s.cellInputEpoch);
    expect(s.input).toMatchObject({ kind: 'confirm', spell: '0,1' });
    const model = spellChipModel(castableSpells(s.state, 'draughtsman'), s.input);
    expect(model.active).toBe('0,1');
    expect(armFromSheet(model, 'a', (key) => s.chooseSpell(key))).toBe(true);
    expect(s.input.kind).toBe('aim');
    expect(s.input).toMatchObject({ spell: 'a' });
  });

  test('switching during confirm clears it', () => {
    const s = sessionOf(battleOf(CAST_BOARD, false));
    s.selectMember('draughtsman');
    s.chooseSpell('0,1');
    s.tapCell(at('D1'), s.cellInputEpoch);
    expect(s.input.kind).toBe('confirm');
    s.selectMember('stoker');
    expect(s.input).toMatchObject({ kind: 'member', unit: 'stoker' });
    expect(s.overlay.selected).toBe('stoker');
    // a confirm made for Pell cannot be sent for Stoker
    s.confirm();
    expect(s.log.some((e) => e.type === 'cast')).toBe(false);
  });

  test('unusable spell cannot arm', () => {
    const state = pellWith({ a: 0 });
    const pell = memberById(state, 'draughtsman');
    pell.acted = true;
    const model = spellChipModel(castableSpells(state, 'draughtsman'), { kind: 'idle' });
    expect(model.usable).toEqual([]);
    expect(model.tap).toEqual({ kind: 'none', reason: 'Already acted.' });
    const taken: SpellKey[] = [];
    expect(armFromSheet(model, 'a', (key) => taken.push(key))).toBe(false);
    expect(armFromSheet(model, '0,1', (key) => taken.push(key))).toBe(false);
    expect(taken).toEqual([]);
    const s = sessionOf(state);
    s.selectMember('draughtsman');
    s.chooseSpell('a');
    expect(s.input.kind).toBe('member');
  });
});
