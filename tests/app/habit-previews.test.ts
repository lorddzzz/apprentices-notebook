import { describe, expect, test } from 'vitest';
import type { HabitId } from '$data';
import { type BattleState, findUnit, scenarioBattle } from '$engine';
import {
  type InputMode,
  memberMode,
  onBasic,
  onCell,
  onSpell,
  type Preview,
  previewOf,
} from '../../src/app/battleInput';
import { fallbackLattices } from '../../src/app/lab';
import { overlayFor } from '../../src/app/overlay';
import { at } from './battleFixtures';

/** AH-6: a habit shows in the preview chip and on its tile; a warded hit is calm; the far Touch is tinted. */

const pad = (row: string): string => [row, ...Array(7).fill('. . . . . .')].join('\n');

/** A Lab battle where `who` carries `habit`, whatever the registry says. */
function withHabit(
  board: string,
  habit: HabitId,
  lattices: Record<string, string> = {},
  who: 'draughtsman' | 'stoker' = 'stoker',
): BattleState {
  const s = scenarioBattle({ board, lattices }, { lab: true, lattices: fallbackLattices() });
  const u = findUnit(s, who);
  if (u?.kind !== 'member') throw new Error(`no ${who}`);
  u.lean.habit = habit;
  return s;
}

describe('longTouch: the far Touch', () => {
  const board = pad('S . r . . .');
  const lattices = { stoker: 'Touch> Strike' };

  test('aim mode tints the tiles only her habit reaches, apart from the plain ones', () => {
    const s = withHabit(board, 'longTouch', lattices);
    const aim = onSpell(s, memberMode(s, 'stoker'), '0,0').mode;
    const aims = overlayFor(s, aim).highlights.flatMap((h) => (h.kind === 'aim' ? [h] : []));
    expect(aims).toContainEqual({ kind: 'aim', at: at('B1') });
    expect(aims).toContainEqual({ kind: 'aim', at: at('C1'), habit: true });
    expect(aims.filter((h) => h.habit).length).toBeGreaterThan(0);
    expect(aims.find((h) => h.at.x === 0 && h.at.y === 1)?.habit).toBeUndefined();
  });

  test('without the habit nothing is tinted', () => {
    const s = withHabit(board, 'twoJars', lattices);
    const aim = onSpell(s, memberMode(s, 'stoker'), '0,0').mode;
    const aims = overlayFor(s, aim).highlights.flatMap((h) => (h.kind === 'aim' ? [h] : []));
    expect(aims.some((h) => h.habit)).toBe(false);
  });

  test('the preview carries the habit: a chip in the summary and a badge on the aimed tile', () => {
    const s = withHabit(board, 'longTouch', lattices);
    const aim = onSpell(s, memberMode(s, 'stoker'), '0,0').mode;
    const mode = onCell(s, aim, at('C1')).mode;
    expect(mode.kind).toBe('confirm');
    if (mode.kind !== 'confirm') return;
    expect(mode.preview.habits).toEqual([{ habit: 'longTouch', at: at('C1'), unharmed: false }]);
    expect(mode.preview.summary).toContain('Touch reaches two tiles away');
    const badges = overlayFor(s, mode).badges.filter((b) => b.kind === 'habit');
    expect(badges).toEqual([{ at: at('C1'), kind: 'habit', text: '' }]);
  });

  test('a plain Touch beside her shows no chip', () => {
    const s = withHabit(pad('S r . . . .'), 'longTouch', lattices);
    const p = previewOf(s, {
      type: 'cast',
      unit: 'stoker',
      spell: '0,0',
      aim: { kind: 'tile', at: at('B1') },
    });
    expect(p.habits).toEqual([]);
    expect(p.summary).not.toContain('Touch reaches');
  });
});

describe('unharmed: a calm badge, not the red ring', () => {
  test('the badge is drawn on the warded unit and no hurt ring is', () => {
    const s = withHabit(pad('D . . . . .'), 'steamproof', {}, 'draughtsman');
    const base = previewOf(s, { type: 'move', unit: 'draughtsman', to: at('B1') });
    const preview: Preview = {
      ...base,
      habits: [{ habit: 'steamproof', at: at('A1'), unharmed: true }],
      hurt: [],
    };
    const mode: InputMode = {
      kind: 'confirm',
      unit: 'draughtsman',
      spell: null,
      at: at('B1'),
      preview,
    };
    const o = overlayFor(s, mode);
    expect(o.badges).toContainEqual({ at: at('A1'), kind: 'unharmed', text: '' });
    expect(o.highlights.some((h) => h.kind === 'hurt')).toBe(false);
  });
});

describe('fuseOnStep: her own Fuse jars in reach', () => {
  const board = pad('D . . . . .');
  const withJar = (habit: HabitId, owner = 'draughtsman'): BattleState => {
    const s = withHabit(board, habit, {}, 'draughtsman');
    const tile = s.tiles[1];
    if (!tile) throw new Error('no tile');
    tile.jar = { owner, event: 'dusk', rest: null, heading: null, origin: 'rune' } as never;
    return s;
  };

  test('walk reach: the jar tile carries the habit badge', () => {
    const s = withJar('fuseOnStep');
    const o = overlayFor(s, memberMode(s, 'draughtsman'));
    expect(o.badges).toEqual([{ at: at('B1'), kind: 'habit', text: '' }]);
  });

  test('Hop reach: the landing jar carries it too', () => {
    const s = withJar('fuseOnStep');
    const u = findUnit(s, 'draughtsman');
    if (u?.kind !== 'member') throw new Error('no member');
    u.action = 'hop';
    for (const t of s.tiles) t.jar = null;
    const far = s.tiles[2];
    if (far) far.jar = { owner: 'draughtsman', event: 'dusk' } as never;
    const o = overlayFor(s, onBasic(s, memberMode(s, 'draughtsman')).mode);
    expect(o.badges).toContainEqual({ at: at('C1'), kind: 'habit', text: '' });
  });

  test('another unit jar, a step jar or no habit earns no badge', () => {
    expect(
      overlayFor(withJar('fuseOnStep', 'stoker'), memberMode(withJar('twoJars'), 'draughtsman'))
        .badges,
    ).toEqual([]);
    const plain = withJar('twoJars');
    expect(overlayFor(plain, memberMode(plain, 'draughtsman')).badges).toEqual([]);
  });
});
