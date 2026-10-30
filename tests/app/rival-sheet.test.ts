import { describe, expect, test } from 'vitest';
import { LINES, type LineId, RUNES } from '$data';
import { createBattle, type EnemyUnit } from '$engine';
import { rivalSheet } from '../../src/app/describe';

/** RV-8: the rival sheet's view model, on the real Lamplighter. */

const make = () =>
  createBattle({
    title: 't',
    board: 'L . . . .\n. . . . .\n. . D . .\n. . . S .\n. . . . .',
    seed: 3,
  }).state;
const rivalOf = (s: ReturnType<typeof make>): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

describe('RV-8: rivalSheet', () => {
  test('draws each spell with headlines, charges and a separate trick', () => {
    const s = make();
    const v = rivalSheet(s, rivalOf(s));
    expect(v?.name).toBe('Lamplighter');
    expect(v?.spells.map((sp) => sp.id)).toEqual(['lantern', 'herd']);
    const lantern = v?.spells[0];
    expect(lantern?.cells).toHaveLength(4);
    expect(lantern?.cols).toBeGreaterThan(0);
    expect(lantern?.charges).toBe(5);
    expect(lantern?.headlines.map((h) => h.text)).toEqual(
      lantern?.headlines.map((h) => RUNES[h.rune].headline),
    );
    expect(v?.trick?.name).toBe('The long wick');
    expect(v?.plan.length).toBeGreaterThan(0);
  });

  test('charges left follow the rival', () => {
    const s = make();
    const e = rivalOf(s);
    if (!e.rival) throw new Error('no state');
    e.rival.charges.herd = 2;
    expect(rivalSheet(s, e)?.spells[1]?.charges).toBe(2);
  });

  test('unwitnessed fine print is never shown', () => {
    const s = make();
    const e = rivalOf(s);
    const none = rivalSheet(s, e, new Set());
    expect(none?.spells.every((sp) => sp.fine.length === 0)).toBe(true);
    expect(rivalSheet(s, e, null)?.spells.every((sp) => sp.fine.length === 0)).toBe(true);
    const text = JSON.stringify(none);
    for (const l of LINES) expect(text).not.toContain(l.text);
  });

  test('only a witnessed line of the spell runes appears', () => {
    const s = make();
    const e = rivalOf(s);
    const base = rivalSheet(s, e);
    const runes = new Set(base?.spells.flatMap((sp) => sp.cells.map((c) => c.rune)));
    const mine = LINES.find((l) => runes.has(l.subject as never));
    const other = LINES.find((l) => !runes.has(l.subject as never));
    if (!mine || !other) throw new Error('fixture lines');
    const seen = new Set<LineId>([mine.id, other.id]);
    const fine = rivalSheet(s, e, seen)?.spells.flatMap((sp) => sp.fine) ?? [];
    expect(fine).toContain(mine.text);
    expect(fine).not.toContain(other.text);
  });

  test('a plain foe has no sheet', () => {
    const s = createBattle({ title: 't', board: 'r . . .\n. D . .', seed: 1 }).state;
    const r = s.units.find((u): u is EnemyUnit => u.kind === 'enemy');
    if (!r) throw new Error('no foe');
    expect(rivalSheet(s, r)).toBeNull();
  });
});
