import { describe, expect, test } from 'vitest';
import { DISTRICTS, MEMBER_IDS, MEMBERS, type MemberId, type RuneId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  type Coord,
  castableSpells,
  compiledFor,
  createEncounterBattle,
  describeLog,
  finishEncounter,
  isLegal,
  latticeOf,
  legalAims,
  legalMoves,
  type MemberUnit,
  memberById,
  newProfile,
  openAll,
  type PartyInit,
  type Profile,
  pickLoot,
  pushOn,
  returnHome,
  setMemberLattice,
  setSocket,
  startTrip,
  type Trip,
  validateLoadout,
  variantFor,
} from '$engine';
import type { Dir } from '$engine/grid';

/**
 * Canal balance (plan C1): a deterministic greedy bot plays seeded trips through the canals with
 * the start loadout (the lattice the player begins with; loot picked mid-trip is banked, not
 * wired, so the "average Seam collection" adds nothing a trip can use before a doorway). Win
 * rates per room are conditional on reaching it. Bands are loose: the sim is deterministic but
 * the bot is not a player, so these numbers are a guide to tune by playing.
 */

const TRIPS = Math.max(200, Number(process.env.CANALS_TRIPS ?? 200));
const ROOM_SEEDS = Number(process.env.CANALS_ROOM_SEEDS ?? 2);
const MAX_ROUNDS = 25;
const ROOMS = DISTRICTS.canals.encounters;
function roomAt(i: number): (typeof ROOMS)[number] {
  const r = ROOMS[i];
  if (!r) throw new Error(`no room ${i}`);
  return r;
}

const liveMembers = (s: BattleState): MemberUnit[] =>
  s.units.filter((u): u is MemberUnit => u.kind === 'member' && u.hp > 0);
const liveEnemies = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy' && u.hp > 0);
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const enemyHp = (s: BattleState): number => liveEnemies(s).reduce((a, u) => a + u.hp, 0);
const memberHp = (s: BattleState): number => liveMembers(s).reduce((a, u) => a + u.hp, 0);
const deadEnemies = (s: BattleState): number =>
  s.units.filter((u) => u.kind === 'enemy' && u.hp <= 0).length;

function step(s: BattleState, action: Action): BattleState {
  const why = isLegal(s, action);
  if (why !== null)
    throw new Error(`bot played an illegal action ${JSON.stringify(action)}: ${why}`);
  return applyAction(s, action).state;
}

function bestCast(s: BattleState, id: string): { action: Action; score: number } | null {
  let best: { action: Action; score: number } | null = null;
  for (const c of castableSpells(s, id)) {
    if (!c.usable) continue;
    for (const aim of legalAims(s, id, c.spell.key)) {
      const action: Action = { type: 'cast', unit: id, spell: c.spell.key, aim };
      const after = applyAction(s, action).state;
      const score =
        enemyHp(s) -
        enemyHp(after) +
        2 * (deadEnemies(after) - deadEnemies(s)) -
        1.5 * (memberHp(s) - memberHp(after));
      if (!best || score > best.score) best = { action, score };
    }
  }
  return best;
}

function nearestEnemy(s: BattleState, at: Coord): number {
  return Math.min(...liveEnemies(s).map((e) => manhattan(at, e.pos)), Number.POSITIVE_INFINITY);
}

/** Per member: cast the best damaging spell; else step toward the nearest enemy and retry. */
function greedyTurn(s0: BattleState): BattleState {
  let s = s0;
  for (const id of MEMBER_IDS) {
    if (s.phase !== 'player') return s;
    const m = memberById(s, id);
    if (m.hp <= 0) continue;
    let best = bestCast(s, id);
    if (!best || best.score <= 0) {
      if (!m.moved) {
        let target: Coord | null = null;
        let bestDist = nearestEnemy(s, m.pos);
        for (const to of legalMoves(s, id)) {
          const d = nearestEnemy(s, to);
          if (d < bestDist) {
            bestDist = d;
            target = to;
          }
        }
        if (target) s = step(s, { type: 'move', unit: id, to: target });
      }
      best = bestCast(s, id);
    }
    if (best && best.score > 0) s = step(s, best.action);
  }
  return s.phase === 'player' ? step(s, { type: 'endTurn' }) : s;
}

function playOut(start: BattleState): BattleState {
  let s = start;
  while (s.phase === 'player' && s.round <= MAX_ROUNDS) s = greedyTurn(s);
  return s;
}

const names = (s: BattleState): string => s.units.map((u) => u.def).join(',');

// ── Boards ──────────────────────────────────────────────

describe('canal rooms', () => {
  test('rooms 1–4 and the heart have three layouts each; the heart shares one name', () => {
    expect(ROOMS.map((r) => r.variants.length)).toEqual([3, 3, 3, 3, 3]);
    for (const r of ROOMS.slice(0, 4)) {
      expect(new Set(r.variants.map((v) => v.name)).size).toBe(3);
    }
    expect(new Set(ROOMS[4]?.variants.map((v) => v.name)).size).toBe(1);
  });

  test('every layout parses at 6 × 8 with both members', () => {
    for (const r of ROOMS) {
      for (const v of r.variants) {
        const s = createEncounterBattle(r, party(newProfile()), 1, r.variants.indexOf(v)).state;
        expect([s.width, s.height], v.name).toEqual([6, 8]);
        expect(liveMembers(s).length, v.name).toBe(2);
      }
    }
  });

  test('foes are the same across a room’s variants', () => {
    for (const r of ROOMS) {
      const sigs = r.variants.map((_, i) =>
        names(createEncounterBattle(r, party(newProfile()), 1, i).state)
          .split(',')
          .sort()
          .join(','),
      );
      expect(new Set(sigs).size, r.title).toBe(1);
    }
  });

  test('water grows by depth; room 4 has a lane that flows up; the heart is mostly water', () => {
    const waterOf = (ri: number, vi: number): number =>
      createEncounterBattle(roomAt(ri), party(newProfile()), 1, vi).state.tiles.filter(
        (t) => t.water !== null,
      ).length;
    const avg = (ri: number): number => [0, 1, 2].reduce((a, vi) => a + waterOf(ri, vi), 0) / 3;
    expect(avg(0)).toBeLessThan(avg(1));
    expect(avg(4)).toBeGreaterThan(avg(1));
    for (const ri of [2, 3]) {
      for (let vi = 0; vi < 3; vi++) {
        const s = createEncounterBattle(roomAt(ri), party(newProfile()), 1, vi).state;
        const dirs = new Set(s.tiles.map((t) => t.water).filter((d) => d !== null));
        expect(dirs.size, `room ${ri + 1} variant ${vi} has two lanes`).toBeGreaterThanOrEqual(2);
      }
    }
    for (let vi = 0; vi < 3; vi++) {
      const s = createEncounterBattle(roomAt(3), party(newProfile()), 1, vi).state;
      expect(
        s.tiles.some((t) => t.water === 'up'),
        `room 4 variant ${vi}`,
      ).toBe(true);
    }
  });

  test('every room-1 variant starts with an eel telegraphing a lunge at a member', () => {
    for (let vi = 0; vi < 3; vi++) {
      const r = createEncounterBattle(roomAt(0), party(newProfile()), 7, vi);
      expect(
        describeLog(r.events).some((l) => /eel .* will lunge/.test(l)),
        `variant ${vi}`,
      ).toBe(true);
    }
  });
});

// ── The sim ─────────────────────────────────────────────

/**
 * "Mid-career": the start collection plus roughly what a few Seam trips bank (two Oil, a Spark,
 * two Splash), wired into Splash / Oil / Spark chains: the party a player has when the canals
 * open (hearing needs a 3-tile oil fire in the Seam).
 */
function midProfile(): Profile {
  const base = openAll(newProfile());
  const collection = { ...base.collection };
  collection.oil += 2;
  collection.spark += 1;
  collection.splash += 2;
  let p: Profile = { ...base, collection };
  const wire = (m: MemberId, runes: readonly [number, number, RuneId, Dir?][]): void => {
    let lat = { shape: latticeOf(p, m).shape, runes: [] as ReturnType<typeof latticeOf>['runes'] };
    for (const [x, y, r, d] of runes) lat = setSocket(lat, { x, y }, r, d);
    p = setMemberLattice(p, m, lat);
  };
  wire('draughtsman', [
    [0, 0, 'splash', 'right'],
    [1, 0, 'oil'],
    [2, 0, 'spark'],
    [0, 1, 'bolt', 'right'],
    [1, 1, 'ink'],
  ]);
  wire('stoker', [
    [1, 0, 'bolt', 'down'],
    [1, 1, 'oil'],
    [1, 2, 'spark'],
    [2, 1, 'splash', 'down'],
    [2, 2, 'oil'],
    [2, 3, 'spark'],
  ]);
  return p;
}

function party(p: Profile): Partial<Record<MemberId, PartyInit>> {
  const out: Partial<Record<MemberId, PartyInit>> = {};
  for (const m of MEMBER_IDS) {
    const spells = compiledFor(p, m).spells;
    out[m] = {
      hp: MEMBERS[m].hp,
      spells,
      charges: Object.fromEntries(spells.map((sp) => [sp.key, sp.charges])),
    };
  }
  return out;
}

interface Tally {
  reached: number;
  won: number;
  lost: number;
  capped: number;
  hpIn: number;
  chIn: number;
}
const tally = (): Tally => ({ reached: 0, won: 0, lost: 0, capped: 0, hpIn: 0, chIn: 0 });

// The start loadout is a sanity check on the early rooms (60 trips); the mid-career loadout is the
// real balance run (TRIPS trips, at least 200).
describe.each([
  ['start loadout', () => openAll(newProfile()), 60, 0.9, [0, 1]],
  ['mid-career loadout', midProfile, TRIPS, 0.9, [0.3, 0.7]],
] as const)('canal sim: %s', (label, makeProfile, trips, room1Min, heartBand) => {
  test(`${trips} seeded greedy trips: win rate per room, lamp-mother kills`, () => {
    const t0 = Date.now();
    const p = makeProfile();
    expect(Object.keys(validateLoadout(p))).toEqual([]);
    const rooms = ROOMS.map(tally);
    const byVariant = new Map<string, Tally>();
    let motherKills = 0;
    let cleared = 0;
    for (let seed = 1; seed <= trips; seed++) {
      let trip: Trip | null = startTrip(p, seed * 7919, 'canals');
      let guard = 0;
      while (trip && guard++ < 30) {
        const t: Trip = trip;
        if (t.status === 'fight') {
          const r = rooms[t.encounter];
          if (!r) throw new Error('no room');
          const vi = variantFor(t, t.encounter);
          const vt = byVariant.get(`${t.encounter}.${vi}`) ?? tally();
          byVariant.set(`${t.encounter}.${vi}`, vt);
          r.reached += 1;
          vt.reached += 1;
          r.hpIn += t.hp.draughtsman + t.hp.stoker;
          r.chIn += MEMBER_IDS.reduce(
            (a, m) => a + Object.values(t.charges[m]).reduce((x, y) => x + y, 0),
            0,
          );
          const end = playOut(beginEncounter(p, t).state);
          if (end.phase === 'won') {
            r.won += 1;
            vt.won += 1;
            if (t.encounter === 4) motherKills += 1;
          } else if (end.phase === 'lost') {
            r.lost += 1;
            vt.lost += 1;
          } else {
            r.capped += 1;
            vt.capped += 1;
            trip = null;
            continue;
          }
          trip = finishEncounter(p, t, end).trip;
        } else if (t.status === 'looting') {
          const i = Math.max(
            0,
            t.offers.findIndex((o) => o.kind !== 'doorway'),
          );
          trip = pickLoot(t, i);
        } else if (t.status === 'crossroads') {
          trip = pushOn(t);
        } else if (t.status === 'cleared') {
          returnHome(p, t);
          cleared += 1;
          trip = null;
        } else {
          throw new Error(`unexpected status ${t.status}`);
        }
      }
    }
    const pct = (a: number, b: number): string =>
      b === 0 ? 'n/a' : `${((100 * a) / b).toFixed(0)}%`;
    const lines = [
      `canals sim, ${label}: ${trips} trips, ${Date.now() - t0} ms, cleared ${cleared}, lamp-mother kills ${motherKills}`,
    ];
    ROOMS.forEach((r, i) => {
      const t = rooms[i] ?? tally();
      const vs = r.variants.map((_, vi) => {
        const v = byVariant.get(`${i}.${vi}`) ?? tally();
        return `${pct(v.won, v.reached)} (${v.reached})`;
      });
      lines.push(
        `  room ${i + 1} ${r.title.padEnd(24)} reached ${String(t.reached).padStart(3)} hpIn ${(t.hpIn / Math.max(1, t.reached)).toFixed(1)} chIn ${(t.chIn / Math.max(1, t.reached)).toFixed(1)} win ${pct(t.won, t.reached)} capped ${t.capped}  variants ${vs.join(' / ')}`,
      );
    });
    console.log(lines.join('\n'));

    if (label === 'mid-career loadout') expect(trips).toBeGreaterThanOrEqual(200);
    for (const t of rooms.slice(0, 4)) expect(t.capped).toBe(0);
    const win = (i: number): number => {
      const t = rooms[i] ?? tally();
      return t.reached === 0 ? 0 : t.won / t.reached;
    };
    expect(win(0)).toBeGreaterThanOrEqual(room1Min);
    if (label === 'mid-career loadout') {
      expect(rooms[4]?.reached ?? 0).toBeGreaterThan(20);
      expect(win(4)).toBeGreaterThanOrEqual(heartBand[0] ?? 0);
      expect(win(4)).toBeLessThanOrEqual(heartBand[1] ?? 1);
      expect(motherKills).toBeGreaterThan(0);
      for (let vi = 0; vi < 3; vi++) {
        const v = byVariant.get(`4.${vi}`) ?? tally();
        expect(v.won / Math.max(1, v.reached), `heart variant ${vi}`).toBeGreaterThanOrEqual(0.15);
        expect(v.won / Math.max(1, v.reached), `heart variant ${vi}`).toBeLessThanOrEqual(0.8);
      }
    }
  }, 60_000);

  test('each room at full health: no softlock', () => {
    if (label !== 'mid-career loadout') return;
    const p = makeProfile();
    const lines: string[] = [];
    ROOMS.forEach((r, ri) => {
      r.variants.forEach((v, vi) => {
        const t = tally();
        for (let seed = 1; seed <= ROOM_SEEDS; seed++) {
          const end = playOut(createEncounterBattle(r, party(p), seed, vi).state);
          t.reached += 1;
          if (end.phase === 'won') t.won += 1;
          else if (end.phase === 'lost') t.lost += 1;
          else t.capped += 1;
        }
        lines.push(
          `  room ${ri + 1} v${vi} ${v.name.padEnd(24)} won ${t.won}/${t.reached} capped ${t.capped}`,
        );
        expect(t.capped, v.name).toBe(0);
      });
    });
    console.log(`${label}, rooms at full health\n${lines.join('\n')}`);
  }, 60_000);
});
