import { describe, expect, test } from 'vitest';
import { applyAction, type BattleState, castableSpells, memberById } from '$engine';
import {
  activeAction,
  afterAction,
  aimAt,
  IDLE,
  type InputMode,
  memberMode,
  onBasic,
  onCancel,
  onCell,
  onConfirm,
  onSpell,
  unspentCasters,
} from '../../src/app/battleInput';
import { hintFor } from '../../src/app/describe';
import { at, battleOf, CAST_BOARD, labBattle, SHOVE_BOARD } from './battleFixtures';

function expectKind<K extends InputMode['kind']>(
  mode: InputMode,
  kind: K,
): Extract<InputMode, { kind: K }> {
  expect(mode.kind).toBe(kind);
  return mode as Extract<InputMode, { kind: K }>;
}

describe('battle input', () => {
  test('tap member selects and lists moves', () => {
    const s = labBattle('sandbox');
    const r = onCell(s, IDLE, at('B7'));
    const m = expectKind(r.mode, 'member');
    expect(m.unit).toBe('draughtsman');
    expect(m.moves).toContainEqual(at('B6'));
    expect(m.moves.every((c) => Math.abs(c.x - 1) + Math.abs(c.y - 6) <= 3)).toBe(true);
    expect(r.action).toBeUndefined();
  });

  test('tap reachable tile emits a move action', () => {
    const s = labBattle('sandbox');
    const r = onCell(s, memberMode(s, 'draughtsman'), at('B6'));
    expect(r.action).toEqual({ type: 'move', unit: 'draughtsman', to: at('B6') });
  });

  test('tap enemy inspects and keeps the member', () => {
    const s = labBattle('sandbox');
    const r = onCell(s, memberMode(s, 'draughtsman'), at('B2'));
    const m = expectKind(r.mode, 'inspect');
    expect(m.member).toBe('draughtsman');
    expect(m.moves.length).toBeGreaterThan(0);
    expect(hintFor(r.mode, s).text).toMatch(/^dummy B2 · 12\/12 HP · waiting/);
    // tapping the same tile again closes the readout
    expect(onCell(s, r.mode, at('B2')).mode.kind).toBe('member');
  });

  test('spell → aim → confirm on the S1 board emits the cast', () => {
    const s = battleOf(CAST_BOARD);
    const aim = expectKind(onSpell(s, memberMode(s, 'draughtsman'), '0,1').mode, 'aim');
    expect(aim.aims).toHaveLength(2); // right and down from the corner
    const confirm = expectKind(onCell(s, aim, at('D1')).mode, 'confirm');
    expect(confirm.preview.summary).toBe('Bolt right: dummy D1 −2 marked');
    const r = onConfirm(s, confirm);
    expect(r.action).toEqual({
      type: 'cast',
      unit: 'draughtsman',
      spell: '0,1',
      aim: { kind: 'dir', dir: 'right' },
    });
  });

  test('bolt aim from any tile in the line', () => {
    const s = battleOf(CAST_BOARD);
    for (const lbl of ['B1', 'C1', 'F1']) {
      expect(aimAt(s, 'draughtsman', '0,1', at(lbl))).toEqual({ kind: 'dir', dir: 'right' });
    }
    expect(aimAt(s, 'draughtsman', '0,1', at('A3'))).toEqual({ kind: 'dir', dir: 'down' });
    expect(aimAt(s, 'draughtsman', '0,1', at('B2'))).toBeNull();
    expect(aimAt(s, 'draughtsman', '0,1', at('A1'))).toBeNull();
  });

  test('tapping the same tile twice confirms', () => {
    const s = battleOf(CAST_BOARD);
    const aim = onSpell(s, memberMode(s, 'draughtsman'), '0,1').mode;
    const confirm = onCell(s, aim, at('C1')).mode;
    const further = onCell(s, confirm, at('E1')); // same line: re-previews, no cast
    expect(further.action).toBeUndefined();
    expect(expectKind(further.mode, 'confirm').at).toEqual(at('E1'));
    const again = onCell(s, confirm, at('C1'));
    expect(again.action?.type).toBe('cast');
    const other = onCell(s, confirm, at('A2')); // another legal aim re-previews
    expect(other.action).toBeUndefined();
    const m = expectKind(other.mode, 'confirm');
    expect(m.preview.action.type === 'cast' && m.preview.action.aim).toEqual({
      kind: 'dir',
      dir: 'down',
    });
  });

  test('illegal aim keeps aim mode with a reason', () => {
    const s = battleOf(CAST_BOARD);
    const aim = onSpell(s, memberMode(s, 'draughtsman'), '0,1').mode;
    const r = onCell(s, aim, at('B2'));
    const m = expectKind(r.mode, 'aim');
    expect(m.note).toMatch(/B2 is not in a straight line/);
    expect(hintFor(m, s).tone).toBe('warn');
    expect(r.action).toBeUndefined();
  });

  test('spell without charges stays in member mode', () => {
    const base = battleOf(CAST_BOARD, false);
    const s: BattleState = structuredClone(base);
    memberById(s, 'draughtsman').charges['0,1'] = 0;
    const r = onSpell(s, memberMode(s, 'draughtsman'), '0,1');
    const m = expectKind(r.mode, 'member');
    expect(m.note).toBe('No charges left.');
  });

  test('shove flow emits shove with dir', () => {
    const s = battleOf(SHOVE_BOARD);
    const shove = expectKind(onBasic(s, memberMode(s, 'stoker')).mode, 'basic');
    expect(shove.dirs).toEqual(['right']);
    const confirm = expectKind(onCell(s, shove, at('B1')).mode, 'confirm');
    expect(confirm.preview.targets).toEqual([at('B1')]);
    expect(confirm.preview.summary).toMatch(/^Shove rat right: /);
    expect(onCell(s, confirm, at('B1')).action).toEqual({
      type: 'shove',
      unit: 'stoker',
      dir: 'right',
    });
    expect(onCancel(s, confirm).mode.kind).toBe('basic');
  });

  test('cancel steps back one level', () => {
    const s = battleOf(CAST_BOARD);
    const member = memberMode(s, 'draughtsman');
    const aim = onSpell(s, member, '0,1').mode;
    const confirm = onCell(s, aim, at('D1')).mode;
    expect(onCancel(s, confirm).mode.kind).toBe('aim');
    expect(onCancel(s, aim).mode.kind).toBe('member');
    expect(onCancel(s, member).mode.kind).toBe('idle');
    // pressing the active spell again also steps back
    expect(onSpell(s, aim, '0,1').mode.kind).toBe('member');
  });

  test('afterAction keeps a member that can still act, else selects the next ready one', () => {
    const s = labBattle('sandbox');
    const moved = applyAction(s, { type: 'move', unit: 'draughtsman', to: at('B6') }).state;
    expect(afterAction(moved, memberMode(s, 'draughtsman'))).toMatchObject({
      kind: 'member',
      unit: 'draughtsman',
    });
    const done = applyAction(moved, {
      type: 'cast',
      unit: 'draughtsman',
      spell: '0,1',
      aim: { kind: 'dir', dir: 'up' },
    }).state;
    expect(afterAction(done, memberMode(moved, 'draughtsman'))).toMatchObject({
      kind: 'member',
      unit: 'stoker',
    });
  });

  test('every mode has a caption', () => {
    const s = battleOf(CAST_BOARD);
    const member = memberMode(s, 'draughtsman');
    expect(hintFor(IDLE, s).text).toMatch(/Tap a party member/);
    expect(hintFor(member, s).text).toBe('Draughtsman: tap a dot to move or pick a spell.');
    const aim = onSpell(s, member, '0,1').mode;
    expect(hintFor(aim, s).text).toMatch(/^Bolt: tap any tile/);
    const confirm = onCell(s, aim, at('D1')).mode;
    expect(hintFor(confirm, s).text).toMatch(/Tap again or Confirm\.$/);
  });

  test('end-turn warning names only members with a usable spell and a legal aim', () => {
    const s = labBattle('sandbox');
    expect(unspentCasters(s)).toEqual(['Draughtsman', 'Stoker']);
    // A member who has already acted is not named.
    const cast = applyAction(s, {
      type: 'cast',
      unit: 'draughtsman',
      spell: '0,1',
      aim: { kind: 'dir', dir: 'up' },
    }).state;
    expect(unspentCasters(cast)).toEqual(['Stoker']);
    // Out of charges in a real (non-lab) battle: no usable spell, no warning.
    const real = labBattle('sandbox', false);
    expect(unspentCasters(real)).toContain('Stoker');
    const spent = {
      ...real,
      units: real.units.map((u) =>
        u.kind === 'member' && u.id === 'stoker'
          ? { ...u, charges: Object.fromEntries(Object.keys(u.charges).map((k) => [k, 0])) }
          : u,
      ),
    };
    expect(unspentCasters(spent)).not.toContain('Stoker');
  });

  test('only the active mode lights an action button', () => {
    const s = battleOf(SHOVE_BOARD);
    const member = memberMode(s, 'stoker');
    expect(activeAction(member)).toEqual({ spell: null, basic: false });
    expect(activeAction(onBasic(s, member).mode)).toEqual({ spell: null, basic: true });
    const key = castableSpells(s, 'stoker')[0]?.spell.key ?? '';
    const aim = onSpell(s, member, key).mode;
    expect(activeAction(aim)).toEqual({ spell: key, basic: false });
    const confirm = onCell(s, aim, at('B1')).mode;
    expect(activeAction(confirm)).toEqual({ spell: key, basic: false });
  });
});
