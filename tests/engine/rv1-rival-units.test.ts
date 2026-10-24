import { describe, expect, it } from 'vitest';
import { boardOf, createBattle, labSetCell } from '$engine/battle';
import { cloneData } from '$engine/clone';
import type { EnemyUnit, RivalIntent } from '$engine/types';

const board = ['. . .', '. L .', '. . .'].join('\n');
const make = () => createBattle({ title: 't', board, seed: 1, intents: {} }).state;
const rivalOf = (s: ReturnType<typeof make>) =>
  s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival) as EnemyUnit;

describe('RV-1 rival units', () => {
  it('spawns L with compiled spells and per-encounter charges', () => {
    const r = rivalOf(make()).rival;
    expect(r?.rival).toBe('lamplighter');
    expect(r?.charges).toEqual({ lantern: 5, herd: 5 });
    expect(r?.spells.lantern?.charges).toBe(5);
  });

  it('clones, serialises and round-trips through boardOf and labSetCell', () => {
    const s = make();
    const u = rivalOf(s);
    if (!u.rival) throw new Error('no rival');
    u.rival.charges.lantern = 2;
    expect(rivalOf(cloneData(s)).rival?.charges.lantern).toBe(2);
    expect(rivalOf(JSON.parse(JSON.stringify(s))).rival?.charges).toEqual({ lantern: 2, herd: 5 });
    expect(boardOf(s)).toContain('L');
    const placed = labSetCell(make(), { x: 0, y: 0 }, 'L');
    expect(placed.units.filter((x) => x.kind === 'enemy' && x.rival)).toHaveLength(2);
  });

  it('keeps a pinned intent on the rival state', () => {
    const s = make();
    const pin: RivalIntent = { kind: 'rivalStrike', dir: 'right', order: 1 };
    const r = rivalOf(s).rival;
    if (!r) throw new Error('no rival');
    r.pinned = pin;
    expect(rivalOf(cloneData(s)).rival?.pinned).toEqual(pin);
  });
});
