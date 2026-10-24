import { describe, expect, test } from 'vitest';
import type { BasicActionId } from '$data';
import { applyAction, type BattleState, type Dir, findUnit, scenarioBattle } from '$engine';
import {
  activeAction,
  basicDirAt,
  basicOf,
  type InputMode,
  memberMode,
  onBasic,
  onCancel,
  onCell,
  onConfirm,
  type PreviewCtx,
  previewOf,
} from '../../src/app/battleInput';
import { actionLabel, BASIC_LABEL, hintFor } from '../../src/app/describe';
import { fallbackLattices } from '../../src/app/lab';
import { overlayFor } from '../../src/app/overlay';
import { at } from './battleFixtures';

/**
 * AH-5: the member's own basic action as an input mode, its taps, previews and overlay. The
 * engine side (legality, lines, arrivals) is tested in tests/scenarios/basic-actions.test.ts.
 */

const pad = (row: string): string => [row, ...Array(7).fill('. . . . . .')].join('\n');
const unseen: PreviewCtx = { witnessed: new Set() };

/** A Lab battle where the Draughtsman (or `who`) is given `action`, whatever her registry entry says. */
function withAction(
  board: string,
  action: BasicActionId,
  who: 'draughtsman' | 'stoker' = 'draughtsman',
): BattleState {
  const s = scenarioBattle({ board }, { lab: true, lattices: fallbackLattices() });
  const u = findUnit(s, who);
  if (u?.kind !== 'member') throw new Error(`no ${who}`);
  u.action = action;
  return s;
}

function expectKind<K extends InputMode['kind']>(
  mode: InputMode,
  kind: K,
): Extract<InputMode, { kind: K }> {
  expect(mode.kind).toBe(kind);
  return mode as Extract<InputMode, { kind: K }>;
}

const open = (s: BattleState, who = 'draughtsman') =>
  expectKind(onBasic(s, memberMode(s, who)).mode, 'basic');

const confirmMode = (
  preview: ReturnType<typeof previewOf>,
  tap: string,
): Extract<InputMode, { kind: 'confirm' }> => ({
  kind: 'confirm',
  unit: 'draughtsman',
  spell: null,
  at: at(tap),
  preview,
});

describe('the basic mode', () => {
  test('the button opens the mode for the member own action, and pressing it again closes it', () => {
    const boards: Record<BasicActionId, string> = {
      shove: pad('D r . . . .'),
      pull: pad('D . r . . .'),
      hop: pad('D . . . . .'),
      swap: pad('D r . . . .'),
    };
    for (const action of ['shove', 'pull', 'hop', 'swap'] as const) {
      const s = withAction(boards[action], action);
      const mode = expectKind(onBasic(s, memberMode(s, 'draughtsman')).mode, 'basic');
      expect(mode.action).toBe(action);
      expect(onBasic(s, mode).mode.kind).toBe('member');
    }
  });

  test('every action has a label, icon and rule', () => {
    for (const a of ['shove', 'pull', 'hop', 'swap'] as const) {
      expect(BASIC_LABEL[a].name.toLowerCase()).toBe(a);
      expect(BASIC_LABEL[a].icon).not.toBe('');
    }
    const s = withAction(pad('D r . . . .'), 'swap');
    expect(hintFor(open(s), s).text).toBe(BASIC_LABEL.swap.hint);
  });

  test('with nothing in reach the button says so and stays on the member', () => {
    const s = withAction(pad('D . . . . .'), 'pull');
    const r = onBasic(s, memberMode(s, 'draughtsman'));
    expect(r.mode).toMatchObject({ kind: 'member', note: 'Nothing in reach to pull.' });
  });

  test('a member who has acted has no basic action to take', () => {
    const s = withAction(pad('D r . . . .'), 'swap');
    const m = findUnit(s, 'draughtsman');
    if (m?.kind !== 'member') throw new Error('no member');
    m.acted = true;
    expect(basicOf(s, 'draughtsman')).toBeNull();
    expect(onBasic(s, memberMode(s, 'draughtsman')).mode).toMatchObject({
      kind: 'member',
      note: 'Draughtsman has already acted.',
    });
  });

  test('a member out of the room cannot be picked or act', () => {
    const s = withAction(pad('D r . . . .'), 'swap');
    const m = findUnit(s, 'draughtsman');
    if (m?.kind !== 'member') throw new Error('no member');
    m.out = 'fell';
    expect(memberMode(s, 'draughtsman').kind).toBe('idle');
    expect(basicOf(s, 'draughtsman')).toBeNull();
    expect(onBasic(s, { kind: 'idle' }).mode.kind).toBe('idle');
  });

  test('only her own action: a Pull member is not offered Shove directions', () => {
    // A rat right beside her: Shove would be legal, Pull is not (it must be 2 away).
    const s = withAction(pad('D r . . . .'), 'pull');
    expect(basicOf(s, 'draughtsman')?.dirs).toEqual([]);
  });
});

describe('taps map to a direction', () => {
  const from = at('C3');
  const dirs: Dir[] = ['up', 'right', 'down', 'left'];

  test('shove and swap take the adjacent tile', () => {
    expect(basicDirAt(from, 'shove', dirs, at('D3'))).toBe('right');
    expect(basicDirAt(from, 'swap', dirs, at('C2'))).toBe('up');
    expect(basicDirAt(from, 'swap', dirs, at('E3'))).toBeUndefined();
  });

  test('pull and hop take the tile 2 away, or the one between', () => {
    expect(basicDirAt(from, 'pull', dirs, at('E3'))).toBe('right');
    expect(basicDirAt(from, 'pull', dirs, at('D3'))).toBe('right');
    expect(basicDirAt(from, 'hop', dirs, at('C5'))).toBe('down');
    expect(basicDirAt(from, 'hop', dirs, at('C4'))).toBe('down');
    expect(basicDirAt(from, 'hop', ['up'], at('C5'))).toBeUndefined();
    expect(basicDirAt(from, 'hop', dirs, at('D4'))).toBeUndefined();
  });
});

describe('Pull', () => {
  const board = pad('D . r . . .');

  test('lists the unit 2 away and previews its hook path, target and summary', () => {
    const s = withAction(board, 'pull');
    const mode = open(s);
    expect(mode.dirs).toEqual(['right']);
    const o = overlayFor(s, mode);
    expect(o.highlights).toContainEqual({ kind: 'shove', at: at('C1') });

    const confirm = expectKind(onCell(s, mode, at('C1')).mode, 'confirm');
    expect(confirm.spell).toBeNull();
    expect(confirm.preview.action).toEqual({ type: 'pull', unit: 'draughtsman', dir: 'right' });
    expect(confirm.preview.path).toEqual([at('C1'), at('B1')]);
    expect(confirm.preview.targets).toEqual([at('C1')]);
    expect(confirm.preview.summary).toBe('Pull rat right: rat C1 pulled left');
    expect(activeAction(confirm)).toEqual({ spell: null, basic: true });

    const ov = overlayFor(s, confirm);
    expect(ov.highlights).toContainEqual({ kind: 'path', cells: [at('C1'), at('B1')] });
    expect(ov.highlights).toContainEqual({ kind: 'target', at: at('C1') });
    expect(ov.ghosts).toMatchObject([{ at: at('B1'), kind: 'enemy' }]);
  });

  test('tapping the tile between aims the same pull; tapping again confirms', () => {
    const s = withAction(board, 'pull');
    const confirm = expectKind(onCell(s, open(s), at('B1')).mode, 'confirm');
    expect(confirm.preview.action).toMatchObject({ type: 'pull', dir: 'right' });
    expect(onCell(s, confirm, at('B1')).action).toEqual(confirm.preview.action);
    expect(onConfirm(s, confirm).action).toEqual(confirm.preview.action);
    expect(onCancel(s, confirm).mode.kind).toBe('basic');
  });

  test('the confirmed action applies: the unit moves one tile and the caster stays', () => {
    const s = withAction(board, 'pull');
    const confirm = expectKind(onCell(s, open(s), at('C1')).mode, 'confirm');
    const r = applyAction(s, confirm.preview.action);
    expect(findUnit(r.state, 'rat-1')?.pos).toEqual(at('B1'));
    expect(findUnit(r.state, 'draughtsman')?.pos).toEqual(at('A1'));
  });

  test('a wrong tap explains the rule and stays in the mode', () => {
    const s = withAction(board, 'pull');
    const r = onCell(s, open(s), at('A5'));
    expect(r.mode).toMatchObject({ kind: 'basic', action: 'pull' });
    expect(hintFor(r.mode, s).tone).toBe('warn');
    expect(hintFor(r.mode, s).text).toMatch(/2 tiles away/);
  });

  test('a first Pull into a plate previews masked: the stay is not said, no ghost', () => {
    const s = withAction(pad('D {wall} r . . .'), 'pull');
    const action = { type: 'pull', unit: 'draughtsman', dir: 'right' } as const;
    expect(previewOf(s, action).masked).toBe(false);
    const p = previewOf(s, action, unseen);
    expect(p.masked).toBe(true);
    expect(p.summary).not.toMatch(/no effect|plate|wall|\?/i);
    expect(p.shown.every((e) => !e.line)).toBe(true);
    expect(overlayFor(s, confirmMode(p, 'C1')).ghosts).toEqual([]);
  });

  test('a pulled ally is drawn at its landing', () => {
    const s = withAction(pad('D . S . . .'), 'pull');
    const p = previewOf(s, { type: 'pull', unit: 'draughtsman', dir: 'right' });
    expect(overlayFor(s, confirmMode(p, 'C1')).ghosts).toMatchObject([
      { unit: 'stoker', at: at('B1') },
    ]);
  });
});

describe('Hop', () => {
  test('lists landings 2 away and draws the arc, a ghost on the landing and the summary', () => {
    const s = withAction(pad('D r . . . .'), 'hop');
    const mode = open(s);
    expect(mode.dirs).toEqual(['right', 'down']);
    const o = overlayFor(s, mode);
    expect(o.highlights).toContainEqual({ kind: 'shove', at: at('C1') });
    expect(o.highlights).toContainEqual({ kind: 'shove', at: at('A3') });

    // The rat in between is stepped over; tapping it aims the hop too.
    for (const tap of ['B1', 'C1']) {
      const confirm = expectKind(onCell(s, mode, at(tap)).mode, 'confirm');
      expect(confirm.preview.action).toEqual({ type: 'hop', unit: 'draughtsman', dir: 'right' });
      expect(confirm.preview.summary).toBe('Hop right: lands at C1');
      const ov = overlayFor(s, confirm);
      expect(ov.highlights).toContainEqual({ kind: 'arc', from: at('A1'), to: at('C1') });
      expect(ov.ghosts).toMatchObject([{ unit: 'draughtsman', at: at('C1') }]);
    }
    expect(actionLabel(s, { type: 'hop', unit: 'draughtsman', dir: 'right' })).toBe('Hop right');
  });

  test('the confirmed hop lands and spends the action, not the move', () => {
    const s = withAction(pad('D r . . . .'), 'hop');
    const confirm = expectKind(onCell(s, open(s), at('C1')).mode, 'confirm');
    const r = applyAction(s, confirm.preview.action);
    expect(findUnit(r.state, 'draughtsman')).toMatchObject({
      pos: at('C1'),
      acted: true,
      moved: false,
    });
  });

  test('a blocking tile in between takes that direction out of the list', () => {
    const s = withAction(pad('D {wall} . . . .'), 'hop');
    expect(open(s).dirs).toEqual(['down']);
  });
});

describe('Swap', () => {
  test('previews both ghosts and the two-way arc', () => {
    const s = withAction(pad('D r . . . .'), 'swap');
    const mode = open(s);
    expect(mode.dirs).toEqual(['right']);
    const confirm = expectKind(onCell(s, mode, at('B1')).mode, 'confirm');
    expect(confirm.preview.action).toEqual({ type: 'swap', unit: 'draughtsman', dir: 'right' });
    expect(confirm.preview.targets).toEqual([at('B1')]);
    expect(confirm.preview.summary).toBe('Swap rat right: Draughtsman and rat B1 trade places');
    const ov = overlayFor(s, confirm);
    expect(ov.highlights).toContainEqual({ kind: 'arc', from: at('A1'), to: at('B1'), both: true });
    expect(ov.ghosts).toMatchObject([
      { unit: 'draughtsman', at: at('B1') },
      { unit: 'rat-1', at: at('A1') },
    ]);
  });

  test('swapping an ally takes the tap even though a tap on a member normally selects it', () => {
    const s = withAction(pad('D S . . . .'), 'swap');
    const r = onCell(s, open(s), at('B1'));
    expect(expectKind(r.mode, 'confirm').preview.action).toMatchObject({ type: 'swap' });
  });

  test('a swap with a held unit previews without moving anyone', () => {
    const s = withAction(pad('D r . . . .'), 'swap');
    const rat = findUnit(s, 'rat-1');
    if (!rat) throw new Error('no rat');
    rat.held = 1;
    const p = previewOf(s, { type: 'swap', unit: 'draughtsman', dir: 'right' });
    expect(overlayFor(s, confirmMode(p, 'B1')).ghosts).toEqual([]);
  });
});

describe('Shove keeps working', () => {
  test('a unit in reach is offered and previews as before', () => {
    const s = withAction(pad('D r . . . .'), 'shove');
    expect(open(s).dirs).toEqual(['right']);
    const confirm = expectKind(onCell(s, open(s), at('B1')).mode, 'confirm');
    expect(confirm.preview.summary).toMatch(/^Shove rat right: /);
  });
});
