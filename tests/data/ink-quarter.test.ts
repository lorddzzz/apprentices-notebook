import { describe, expect, test, vi } from 'vitest';
import {
  DISTRICT_IDS,
  DISTRICTS,
  LOOT_TABLES,
  type LootTableId,
  METHOD_IDS,
  PLAYABLE_DISTRICTS,
  RUNE_IDS,
  SOLVENT_IDS,
  TUNING,
} from '$data';
import { INK_LOOT_TABLES } from '$data/districts/inkQuarter/loot';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { INK_TABLE_IDS, type TermDef } from '$data/districts/inkQuarter/types';
import {
  type BattleState,
  type EventLog,
  hearFromBattle,
  newProfile,
  type Profile,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';
import { TERMED, termFor } from '$engine/districts/inkQuarter/offers';
import { checkTermDefs, rewardPage } from '$engine/districts/inkQuarter/terms';
import type { OfferRollCtx } from '$engine/districts/types';
import { cast, withLattices } from '../scenarios/harness';

/**
 * IQ-8: the ink-makers' quarter's data. The quarter has no rooms yet (IQ-9, IQ-10), so the
 * rooms are mocked for the offer tests (as `terms-trip.test.ts` does), and the loot tables are
 * registered by hand: `LOOT_TABLES` takes them with the gate flip.
 */

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const room = (i: number, heart: boolean) => ({
    id: `iq-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: 'P . .',
    variants: [{ name: `Room ${i}`, layout: 'P . .' }],
    loot: heart ? 'inkQuarter:heart' : i < 2 ? 'inkQuarter:shallow' : 'inkQuarter:deep',
    picks: heart ? 2 : 1,
    heart,
  });
  const rooms = [room(0, false), room(1, false), room(2, false), room(3, false), room(4, true)];
  const DISTRICTS = { ...m.DISTRICTS, inkQuarter: { ...m.DISTRICTS.inkQuarter, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

// The gate flip puts these in `LOOT_TABLES`; until then a test adds them (and takes them out).
Object.assign(LOOT_TABLES, INK_LOOT_TABLES);

const KIT = DISTRICTS.inkQuarter;
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

// ── Helpers ─────────────────────────────────────────────
const open = (p: Profile): Profile => ({
  ...p,
  city: { ...p.city, heard: [...p.city.heard, 'inkQuarter'], open: [...p.city.open, 'inkQuarter'] },
});
const START = open(newProfile());

/** A trip into the quarter for `p` (its kit state is the quarter's own). */
const tripFor = (p: Profile, seed: number): Trip => startTrip(p, seed, 'inkQuarter');

const table = (room: number): LootTableId => {
  const t = KIT.tables?.[room < 2 ? 0 : room < 4 ? 1 : 2];
  if (!t) throw new Error('no table');
  return t as LootTableId;
};

const ctxFor = (p: Profile, seed: number, room: number): OfferRollCtx => ({
  profile: p,
  trip: tripFor(p, seed),
  room,
  table: table(room),
  seed,
});

/** What the household's offers look like at `room` for `seed`, rolled the way a won room rolls. */
function offersAt(p: Profile, seed: number, room: number) {
  const t = tripFor(p, seed);
  return rollOffers(seed, room, table(room), t.party, null, ownedOf(p), { profile: p, trip: t });
}
const ownedOf = (p: Profile) => ({ known: p.known, methods: p.methods });

const withPages = (p: Profile, pages: { runes?: string[]; methods?: string[] }): Profile =>
  ({
    ...p,
    known: [...p.known, ...(pages.runes ?? [])],
    methods: [...p.methods, ...(pages.methods ?? [])],
  }) as Profile;

const hasRune = (offers: ReturnType<typeof offersAt>, rune: string) =>
  offers.some((o) => o.kind === 'rune' && o.rune === rune);
const hasMethod = (offers: ReturnType<typeof offersAt>, method: string) =>
  offers.some((o) => o.kind === 'method' && o.method === method);
const termedDefs = (offers: ReturnType<typeof offersAt>) =>
  offers.flatMap((o) => (o.kind === TERMED ? [(o.data as { def: string }).def] : []));

// ── Integrity ───────────────────────────────────────────
describe('the quarter as data', () => {
  test('it keeps the drawn gate this build, with the plan P7 return policy and its tables', () => {
    expect(KIT.id).toBe('inkQuarter');
    expect(KIT.gate.kind).toBe('drawing');
    expect(PLAYABLE_DISTRICTS).not.toContain('inkQuarter');
    expect(KIT.ret).toEqual({ kind: 'any' });
    expect(KIT.lean).toEqual({ lean: 'ink', text: 'Ink' });
    expect(KIT.map.label).toBe('above');
    expect(KIT.line).not.toBe('');
    expect(KIT.barred).not.toBe('');
    expect(KIT.tables).toEqual(INK_TABLE_IDS);
  });

  test('its map spot is its own among the districts', () => {
    const at = (d: (typeof DISTRICT_IDS)[number]) => `${DISTRICTS[d].map.x},${DISTRICTS[d].map.y}`;
    const spots = DISTRICT_IDS.map(at);
    expect(new Set(spots).size).toBe(spots.length);
  });

  test('every table is owned by the quarter, namespaced, and named by the kit', () => {
    expect(Object.keys(INK_LOOT_TABLES).sort()).toEqual([...INK_TABLE_IDS].sort());
    for (const id of INK_TABLE_IDS) expect(INK_LOOT_TABLES[id].id).toBe(id);
  });

  test('every table entry is a real page, with a positive weight and no repeat', () => {
    for (const id of INK_TABLE_IDS) {
      const seen = new Set<string>();
      for (const { spec, weight } of INK_LOOT_TABLES[id].entries) {
        expect(weight, id).toBeGreaterThan(0);
        const key = JSON.stringify(spec);
        expect(seen.has(key), `${id}: ${key} twice`).toBe(false);
        seen.add(key);
        if (spec.kind === 'rune') expect(RUNE_IDS).toContain(spec.rune);
        if (spec.kind === 'method') expect(METHOD_IDS).toContain(spec.method);
        if (spec.kind === 'solvent') expect(SOLVENT_IDS).toContain(spec.solvent);
      }
      // Enough distinct cards for a win's offers even after the guarantee is taken.
      expect(INK_LOOT_TABLES[id].entries.length).toBeGreaterThanOrEqual(TUNING.offersPerWin);
    }
  });

  test('Bind, Wax and Sand are never ordinary offers: they come only on a term', () => {
    const termed = new Set(INK_TERMS.map((d) => rewardPage(d)));
    for (const page of ['bind', 'wax', 'sand']) expect(termed.has(page), page).toBe(true);
    for (const id of INK_TABLE_IDS) {
      for (const { spec } of INK_LOOT_TABLES[id].entries) {
        const page = spec.kind === 'method' ? spec.method : spec.kind === 'rune' ? spec.rune : '';
        expect(['bind', 'wax', 'sand']).not.toContain(page);
        if (spec.kind === 'solvent') expect(['wax', 'sand']).not.toContain(spec.solvent);
      }
    }
  });

  test('the term list passes the data check for four rooms and a heart', () => {
    expect(checkTermDefs(INK_TERMS, 5)).toEqual([]);
  });

  test('every term shows its reward, condition and penalty, in its own words', () => {
    for (const d of INK_TERMS) {
      expect(d.id.startsWith('inkQuarter:'), d.id).toBe(true);
      for (const line of Object.values(d.text)) expect(line.trim(), d.id).not.toBe('');
      expect(
        d.rooms.every((r) => r >= 0 && r <= 3),
        d.id,
      ).toBe(true);
    }
  });

  test('the three stakes are all in play, and every number is a positive whole one', () => {
    expect(new Set(INK_TERMS.map((d) => d.stake.kind))).toEqual(
      new Set(['reward', 'resources', 'nextRoom']),
    );
    for (const d of INK_TERMS) {
      if (d.stake.kind === 'resources') {
        expect(Number.isInteger(d.stake.loss.amount) && d.stake.loss.amount > 0, d.id).toBe(true);
      }
    }
  });

  test('the checker still catches a term at the heart in this list', () => {
    const bad: TermDef = { ...(INK_TERMS[0] as TermDef), rooms: [4] };
    expect(checkTermDefs([...INK_TERMS.slice(1), bad], 5)).toEqual([
      'inkQuarter:term-sampler: a term at the heart',
    ]);
  });
});

// ── Guarantees (P7) ─────────────────────────────────────
describe('Tally, Bind and Lift while lacking', () => {
  test('Tally is offered in rooms 1 and 2 on every seed while the household lacks it', () => {
    for (const seed of SEEDS) {
      for (const room of [0, 1]) {
        expect(hasRune(offersAt(START, seed, room), 'tally'), `seed ${seed} room ${room}`).toBe(
          true,
        );
      }
    }
  });

  test('once Tally is owned it is not guaranteed again: it drops as ink', () => {
    const p = withPages(START, { runes: ['tally'] });
    for (const seed of SEEDS) {
      const offers = offersAt(p, seed, 0);
      expect(hasRune(offers, 'tally'), `seed ${seed}`).toBe(false);
      expect(offers.filter((o) => o.kind !== TERMED)).toHaveLength(TUNING.offersPerWin);
    }
  });

  test('Bind is a termed card in room 2 on every seed while lacking, and only then', () => {
    for (const seed of SEEDS) {
      expect(termedDefs(offersAt(START, seed, 1)), `seed ${seed}`).toEqual([
        'inkQuarter:term-bind',
      ]);
      expect(termFor(ctxFor(START, seed, 1))?.id).toBe('inkQuarter:term-bind');
    }
    const owns = withPages(START, { methods: ['bind'] });
    for (const seed of SEEDS) {
      expect(termedDefs(offersAt(owns, seed, 1)), `seed ${seed}`).not.toContain(
        'inkQuarter:term-bind',
      );
    }
  });

  test('Bind is a plain card in no room: the offered page is the term, not a table card', () => {
    for (const seed of SEEDS) {
      for (const room of [0, 1, 2, 3, 4]) {
        expect(hasMethod(offersAt(START, seed, room), 'bind'), `${seed}/${room}`).toBe(false);
      }
    }
  });

  test('room 1 carries a sampler term on every seed, never a page', () => {
    for (const seed of SEEDS) {
      const defs = termedDefs(offersAt(START, seed, 0));
      expect(defs, `seed ${seed}`).toEqual(['inkQuarter:term-sampler']);
    }
    expect(INK_TERMS.find((d) => d.id === 'inkQuarter:term-sampler')?.reward.kind).toBe(
      'extraPick',
    );
  });

  test('rooms 3 and 4 offer one term at most, from Wax, Sand and the ledger', () => {
    for (const seed of SEEDS) {
      for (const room of [2, 3]) {
        const defs = termedDefs(offersAt(START, seed, room));
        expect(defs.length, `${seed}/${room}`).toBeLessThanOrEqual(1);
        for (const d of defs) {
          expect(
            ['inkQuarter:term-wax', 'inkQuarter:term-sand', 'inkQuarter:term-ledger'],
            d,
          ).toContain(d);
        }
      }
    }
  });

  test('Lift is offered at the heart on every seed while lacking, and no term is', () => {
    for (const seed of SEEDS) {
      const offers = offersAt(START, seed, 4);
      expect(hasMethod(offers, 'lift'), `seed ${seed}`).toBe(true);
      expect(termedDefs(offers), `seed ${seed}`).toEqual([]);
    }
  });

  test('once Lift is owned the heart offers it as ink, not a second copy', () => {
    const p = withPages(START, { methods: ['lift'] });
    for (const seed of SEEDS) expect(hasMethod(offersAt(p, seed, 4), 'lift')).toBe(false);
  });

  test('the Seam and the canals roll as they did (the tables are not theirs)', () => {
    const seam = rollOffers(5, 0, 'shallow');
    expect(seam).toHaveLength(TUNING.offersPerWin);
    expect(seam.some((o) => o.kind === 'rune' && o.rune === 'tally')).toBe(false);
  });
});

// ── Hearing (P14) ───────────────────────────────────────
describe('the hearing', () => {
  /** Starting basics only: the draughtsman marks the rat in row 1; the stoker stands under it. */
  const BOARD = 'D . . . r\n. . . . S\n. . . . r';
  const hearing = (log: EventLog) => hearFromBattle(newProfile(), startTrip(newProfile(), 1), log);

  /** The draughtsman's Bolt > Ink, then the stoker's Bolt > Strike in `dir`, a turn later or not. */
  function play(dir: 'up' | 'down', gap: boolean): EventLog {
    const s: BattleState = withLattices(BOARD, {
      draughtsman: 'Bolt> Ink',
      stoker: 'Bolt> Strike',
    });
    const mark = cast(s, 'draughtsman', 'right');
    const hit = cast(mark.state, 'stoker', dir);
    return [...mark.events, ...(gap ? [{ type: 'round' as const, round: 2 }] : []), ...hit.events];
  }

  test('meets: one apprentice marks the rat and the other hits it in the same turn', () => {
    const log = play('up', false);
    expect(log.some((e) => e.type === 'marked')).toBe(true);
    expect(log.some((e) => e.type === 'damage')).toBe(true);
    expect(hearing(log).heard).toEqual(['inkQuarter']);
  });

  test('narrowly misses: the other apprentice hits it a turn later', () => {
    expect(hearing(play('up', true)).heard).toEqual([]);
  });

  test('narrowly misses: the other apprentice hits a different rat', () => {
    const log = play('down', false);
    expect(log.some((e) => e.type === 'damage')).toBe(true);
    expect(hearing(log).heard).toEqual([]);
  });

  test('heard once: a second telling changes nothing', () => {
    const log = play('up', false);
    const once = hearing(log);
    expect(hearFromBattle(once.profile, startTrip(once.profile, 1), log).heard).toEqual([]);
  });
});
