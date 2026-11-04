import { describe, expect, test } from 'vitest';
import { LOOT_TABLES, type LootSpec, type LootTableId } from '$data';
import { CANALS_INTRUSION } from '$data/districts/canals';
import { DISTRICT_KIT, type IntrusionSpec } from '$data/districts/index';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  type LootItem,
  newProfile,
  type Profile,
  pickLoot,
  pushOn,
  startTrip,
  type Trip,
} from '$engine';
import { KIT } from '$engine/districts';
import { checkFloor, floorRoom, LOWER_SEAM } from '$engine/districts/lowerSeam';
import { removeFromRoom } from '$engine/outOfRoom';
import { rollOffers } from '$engine/trip/offers';
import { act, board, draft } from '../scenarios/harness';

/**
 * SM-8: the floor builder (P9, P10). The canals and the ink quarter ship real intrusions, so the
 * floors here are real ones; fixtures stand in for a floor that breaks the rules.
 */

const below = (open: Profile['city']['open']): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: ['seam', ...open], open: ['seam', ...open], hearts: ['seam'] },
  };
};
const BOTH = below(['canals', 'inkQuarter']);

const won = (b: BattleState): BattleState => {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
};

const districtRule = () => {
  const r = Object.values(KIT.rules).find((x) => x.scope === 'district');
  if (!r) throw new Error('no district-scoped rule in the kit');
  return r;
};

describe('a floor room is the intrusion, piece-scoped rules only (P9)', () => {
  test('the floor district’s three layouts are the room’s boards', () => {
    const room = floorRoom(['canals'], 0);
    expect(room.variants.map((v) => v.layout)).toEqual([...CANALS_INTRUSION.rooms]);
    expect(room.loot).toBe('lowerSeam');
  });

  test('the fight runs the current and the drop, and no district-scoped rule', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const t = startTrip(BOTH, seed, LOWER_SEAM);
      const s = beginEncounter(BOTH, t).state;
      const ids = Object.keys(s.rules ?? {}).sort();
      expect(ids).toEqual(['canals:current', 'lowerSeam:drop']);
      const scopes = Object.values(KIT.rules)
        .filter((r) => ids.includes(r.id))
        .map((r) => r.scope);
      expect(scopes).toEqual(['piece', 'piece']);
    }
  });

  test('a floor whose spec carries a district-scoped rule is refused', () => {
    const bad: IntrusionSpec = { ...CANALS_INTRUSION, rules: [districtRule().id] };
    expect(() => floorRoom(['canals'], 0, { canals: { intrusion: bad } })).toThrow(
      /not piece-scoped/,
    );
  });

  test('checkFloor rejects a fixture floor carrying a district-scoped rule', () => {
    const rule = districtRule();
    const problems = checkFloor({ ...CANALS_INTRUSION, rules: [rule.id] });
    expect(problems).toContainEqual({
      layout: null,
      message: `Rule '${rule.id}' is district-scoped (P9)`,
    });
    expect(checkFloor(CANALS_INTRUSION)).toEqual([]);
  });

  test('a lane floor drifts a unit on the water at the round end', () => {
    const t = startTrip(BOTH, 3, LOWER_SEAM);
    const s = beginEncounter(BOTH, t).state;
    const water = s.tiles.findIndex((tile) => tile.terrain.water !== null);
    expect(water).toBeGreaterThanOrEqual(0);
    const rat = s.units.find((u) => u.def === 'rat');
    if (!rat) throw new Error('no rat on the floor');
    const at = { x: water % s.width, y: Math.floor(water / s.width) };
    rat.pos = at;
    rat.hp = rat.maxHp;
    const after = act(s, { type: 'endTurn' }).state.units.find((u) => u.id === rat.id);
    expect(after?.pos).not.toEqual(at);
  });
});

describe('a fall below is the Seam drop (P9)', () => {
  const floor = (): BattleState => {
    const s = beginEncounter(BOTH, startTrip(BOTH, 4, LOWER_SEAM)).state;
    for (const u of s.units) if (u.kind === 'enemy') u.hp = u.maxHp;
    return s;
  };

  test('an apprentice takes 4 and is stunned, and stays in the room', () => {
    const s = floor();
    const m = s.units.find((u) => u.kind === 'member');
    if (!m) throw new Error('no member');
    m.hp = m.maxHp;
    const r = draft(s, (ctx) => removeFromRoom(ctx, m.id, 'fell'));
    const after = r.state.units.find((u) => u.id === m.id);
    expect(after?.out ?? null).toBeNull();
    expect(after?.hp).toBe(m.maxHp - 4);
    expect(after?.stunned).toBe(true);
    expect(r.events.map((e) => e.type)).toContain('dropped');
    expect(r.events.map((e) => e.type)).not.toContain('outOfRoom');
  });

  test('a minion is gone', () => {
    const s = floor();
    const rat = s.units.find((u) => u.def === 'rat');
    if (!rat) throw new Error('no rat');
    const r = draft(s, (ctx) => removeFromRoom(ctx, rat.id, 'fell'));
    expect(r.state.units.find((u) => u.id === rat.id)?.hp).toBe(0);
    expect(r.events.map((e) => e.type)).toContain('dropped');
    expect(r.events.map((e) => e.type)).not.toContain('outOfRoom');
  });

  test('elsewhere a fall still takes the apprentice out of the room', () => {
    const r = draft(board('D S . . r'), (ctx) => removeFromRoom(ctx, 'stoker', 'fell'));
    expect(r.state.units.find((u) => u.id === 'stoker')?.out).toBe('fell');
  });

  test('an erase on a floor is still an erase', () => {
    const s = floor();
    const m = s.units.find((u) => u.kind === 'member');
    if (!m) throw new Error('no member');
    const r = draft(s, (ctx) => removeFromRoom(ctx, m.id, 'erased'));
    expect(r.state.units.find((u) => u.id === m.id)?.out).toBe('erased');
  });
});

/** The pages each other district teaches: its own loot tables, less the Seam's. */
const SEAM_TABLES: readonly LootTableId[] = ['shallow', 'deep', 'heart', 'lowerSeam'];
const pageKey = (s: LootSpec | LootItem): string | null => {
  switch (s.kind) {
    case 'rune':
      return `rune:${s.rune}`;
    case 'method':
      return `method:${s.method}`;
    case 'solvent':
      return `solvent:${s.solvent}`;
    default:
      return null;
  }
};
const districtPages = (): Set<string> => {
  const out = new Set<string>();
  for (const [id, def] of Object.entries(LOOT_TABLES)) {
    if (SEAM_TABLES.includes(id as LootTableId)) continue;
    for (const e of def.entries) {
      const k = pageKey(e.spec);
      if (k) out.add(k);
    }
    const g = def.guaranteed && pageKey(def.guaranteed);
    if (g) out.add(g);
  }
  return out;
};
const seamPages = (): Set<string> => {
  const out = new Set<string>();
  for (const id of ['shallow', 'deep', 'heart'] as const) {
    for (const e of LOOT_TABLES[id].entries) {
      const k = pageKey(e.spec);
      if (k) out.add(k);
    }
  }
  return out;
};

describe('the lowerSeam loot table (P10)', () => {
  const table = LOOT_TABLES.lowerSeam;

  test('Seam pages, ink weighted up, Gallnut, Cinder, vellum and the doorway; no methods', () => {
    const kinds = table.entries.map((e) => e.spec.kind);
    expect(kinds).not.toContain('method');
    expect(kinds).not.toContain('key');
    for (const k of ['rune', 'ink', 'solvent', 'vellum', 'doorway']) expect(kinds).toContain(k);
    const seam = seamPages();
    for (const e of table.entries) {
      const k = pageKey(e.spec);
      if (k && !k.startsWith('solvent:')) expect(seam.has(k), k).toBe(true);
    }
    const w = (kind: string) =>
      Math.max(...table.entries.filter((e) => e.spec.kind === kind).map((e) => e.weight));
    expect(w('ink')).toBeGreaterThan(w('rune'));
    expect(table.guaranteed).toBeUndefined();
  });

  test('it holds none of the districts’ pages', () => {
    const theirs = districtPages();
    expect(theirs.size).toBeGreaterThan(0);
    for (const e of table.entries)
      expect(theirs.has(pageKey(e.spec) ?? ''), pageKey(e.spec) ?? '').toBe(false);
  });

  test('floors pick once, the lowest twice, from this table', () => {
    const a = floorRoom(['canals', 'inkQuarter'], 0);
    const b = floorRoom(['canals', 'inkQuarter'], 1);
    expect([a.picks, b.picks]).toEqual([1, 2]);
    expect([a.loot, b.loot]).toEqual(['lowerSeam', 'lowerSeam']);
  });

  test('fuzz: no roll offers a page of the intruding district', () => {
    const theirs = districtPages();
    for (let seed = 0; seed < 400; seed++) {
      for (let room = 0; room < 3; room++) {
        for (const o of rollOffers(seed, room, 'lowerSeam')) {
          expect(theirs.has(pageKey(o) ?? ''), `${seed}/${room} ${JSON.stringify(o)}`).toBe(false);
        }
      }
    }
  });

  test('fuzz: a real trip through both floors never offers their pages', () => {
    const theirs = districtPages();
    for (let seed = 1; seed <= 60; seed++) {
      let t: Trip = startTrip(BOTH, seed, LOWER_SEAM);
      for (let f = 0; f < 2; f++) {
        const r = closeBattle(BOTH, t, won(beginEncounter(BOTH, t).state));
        t = r.trip ?? (null as never);
        expect(t.offers.length).toBeGreaterThan(0);
        for (const o of t.offers) {
          expect(theirs.has(pageKey(o) ?? ''), `${seed}/${f} ${JSON.stringify(o)}`).toBe(false);
        }
        while (t.status === 'looting') {
          const i = t.offers.findIndex((o) => o.kind !== 'doorway');
          t = pickLoot(t, Math.max(i, 0));
        }
        if (f === 0) t = pushOn(t);
      }
    }
  });
});

describe('floor format of the shipped intrusions', () => {
  test('every floor district in the kit passes checkFloor', () => {
    for (const [id, k] of Object.entries(DISTRICT_KIT)) {
      if (k?.intrusion) expect(checkFloor(k.intrusion), id).toEqual([]);
    }
  });
});
