import { describe, expect, it } from 'vitest';
import { IDIOMS } from '$data/idioms';
import { METHOD_IDS, METHODS } from '$data/methods';
import { RUNE_IDS, RUNES } from '$data/runes';
import { SOLVENT_IDS, SOLVENTS } from '$data/solvents';
import type { Role } from '$data/types';
import { CAST_EVENT_CAP, CapReached, type Ctx, emit, withLine, withOrigin } from '$engine/ctx';
import type { BattleState } from '$engine/types';

describe('rune redesign contracts (W0)', () => {
  it('has the 31 authored runes with the design §5.3 role counts', () => {
    expect(RUNE_IDS).toHaveLength(31);
    expect(new Set(RUNE_IDS).size).toBe(31);
    const count = (r: Role) => RUNE_IDS.filter((id) => RUNES[id].role === r).length;
    expect([
      count('source'),
      count('action'),
      count('kind'),
      count('shape'),
      count('trigger'),
      count('seal'),
      count('aura'),
    ]).toEqual([4, 9, 5, 5, 3, 2, 3]);
  });

  it('gives every rune a school, a district and a headline; only sources carry charges', () => {
    for (const id of RUNE_IDS) {
      const r = RUNES[id];
      expect(r.id).toBe(id);
      expect(r.headline.length).toBeGreaterThan(5);
      expect(r.charges > 0).toBe(r.role === 'source');
    }
    expect(RUNE_IDS.filter((id) => RUNES[id].school === 'seam')).toHaveLength(13);
  });

  it('has 5 methods, 14 solvents (two per district) and 9 idioms', () => {
    expect(METHOD_IDS.map((m) => METHODS[m].id)).toEqual([...METHOD_IDS]);
    expect(SOLVENT_IDS).toHaveLength(14);
    const perDistrict = new Map<string, number>();
    for (const s of SOLVENT_IDS)
      perDistrict.set(SOLVENTS[s].district, (perDistrict.get(SOLVENTS[s].district) ?? 0) + 1);
    expect([...perDistrict.values()]).toEqual([2, 2, 2, 2, 2, 2, 2]);
    expect(IDIOMS).toHaveLength(9);
  });

  it('stamps line and origin on emitted events and caps a cast', () => {
    const ctx: Ctx = {
      s: {} as BattleState,
      log: [],
      cast: { events: 0, capped: false },
      meta: {},
      footnotes: {},
    };
    const origin = { caster: 'stoker', spell: '0,0', cast: 1 };
    withOrigin(ctx, origin, () =>
      withLine(ctx, 'shove:edge', () => emit(ctx, { type: 'stunned', unit: who })),
    );
    emit(ctx, { type: 'stunned', unit: who });
    expect(ctx.log[0]).toMatchObject({ line: 'shove:edge', origin });
    expect(ctx.log[1]).not.toHaveProperty('line');
    // At the cap the cast unwinds (P11): `emit` throws to the cast's `inCastScope`.
    expect(() => {
      for (let i = 0; i < CAST_EVENT_CAP + 10; i++) emit(ctx, { type: 'stunned', unit: who });
    }).toThrow(CapReached);
    expect(ctx.log.filter((e) => e.type === 'fizzles')).toHaveLength(1);
    expect(ctx.log).toHaveLength(CAST_EVENT_CAP + 1);
  });
});

const who = { id: 'rat-1', name: 'rat', at: { x: 0, y: 0 }, member: false };
