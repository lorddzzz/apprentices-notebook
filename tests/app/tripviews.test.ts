import { describe, expect, test } from 'vitest';
import type { Placed, Spell, SpellTally, TierUp } from '$engine';
import { deadCellNotes, freshDeadCells, spellLine, tierUpLine } from '../../src/app/tripviews';

const up = (metric: TierUp['metric'], tier: TierUp['tier']): TierUp => ({
  glyph: 'g1',
  name: 'Cashing In',
  version: 2,
  metric,
  tier,
});

const spell = (cells: string[], extra: Partial<Spell> = {}): Spell =>
  ({
    key: '0,1',
    path: cells.map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { at: { x, y } };
    }),
    ...extra,
  }) as unknown as Spell;

const tally = (over: Partial<SpellTally> = {}): SpellTally => ({
  member: 'draughtsman',
  spell: '0,1',
  name: 'Bolt',
  casts: 6,
  damage: 9,
  kills: 0,
  cells: ['0,1', '1,1', '2,1'],
  fired: ['0,1', '1,1'],
  ...over,
});

describe('tierUpLine', () => {
  test('silver Reliability points at the extra exit', () => {
    expect(tierUpLine(up('reliability', 2))).toBe(
      'Cashing In v2 reached silver Reliability. Pick its extra exit at the desk.',
    );
  });
  test('gold Reliability mentions the second cell; Economy is bare', () => {
    expect(tierUpLine(up('reliability', 3))).toContain('second cell open');
    expect(tierUpLine(up('economy', 1))).toBe('Cashing In v2 reached bronze Economy.');
  });
});

describe('dead cells', () => {
  const cur = spell(['0,1', '1,1', '2,1']);
  test('fresh data lists the cells that never fired', () => {
    expect(freshDeadCells(tally(), [cur])).toEqual(['2,1']);
    expect(spellLine(tally(), cur)).toBe('last trip: 6 casts, 9 harm · 1 cell never fired');
  });
  test('a rewired path is stale and shows nothing', () => {
    const rewired = spell(['0,1', '1,1']);
    expect(freshDeadCells(tally(), [rewired])).toBeNull();
    expect(spellLine(tally(), rewired)).toBeNull();
    expect(deadCellNotes(tally(), [rewired], [])).toEqual([]);
  });
  test('a Glyph spell and a missing tally show nothing', () => {
    expect(freshDeadCells(tally(), [spell(['0,1', '1,1', '2,1'], { glyph: 'g1' })])).toBeNull();
    expect(spellLine(undefined, cur)).toBeNull();
  });
  test('no dead cell leaves just the profile; a note names the rune and cell', () => {
    expect(spellLine(tally({ casts: 1, fired: ['0,1', '1,1', '2,1'] }), cur)).toBe(
      'last trip: 1 cast, 9 harm',
    );
    const placed: Placed[] = [{ at: { x: 2, y: 1 }, rune: 'fork' }];
    expect(deadCellNotes(tally(), [cur], placed)).toEqual(['the Fork at C2 never fired']);
  });
});
