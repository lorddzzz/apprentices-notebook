import { expect, test } from 'vitest';
import { ENCOUNTERS, MEMBER_IDS, MEMBERS, type MemberId } from '$data';
import {
  type Action,
  type ActionResult,
  applyAction,
  type BattleState,
  type Coord,
  canUndoMove,
  castableSpells,
  compiledFor,
  createEncounterBattle,
  createRng,
  isLegal,
  legalAims,
  legalMoves,
  type MemberUnit,
  memberById,
  newProfile,
  type PartyInit,
  type Rng,
  shoveDirs,
} from '$engine';

/**
 * Every board of every depth is played by the fuzz bots (the same two as `fuzz.test.ts`: a random
 * one and a greedy one) with the starting collection and a full-health party. A board is fine if
 * no battle softlocks (every bot action is legal and every fight ends inside the round cap) and
 * at least one bot wins it.
 */

const SEEDS = Number(process.env.VARIANT_SEEDS ?? 12);
const MAX_ROUNDS = 60;

const liveMembers = (s: BattleState): MemberUnit[] =>
  s.units.filter((u): u is MemberUnit => u.kind === 'member' && u.hp > 0);
const liveEnemies = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy' && u.hp > 0);
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function pick<T>(rng: Rng, xs: readonly T[]): T {
  const x = xs[rng.int(0, xs.length - 1)];
  if (x === undefined) throw new Error('pick from empty');
  return x;
}

function party(): Partial<Record<MemberId, PartyInit>> {
  const p = newProfile();
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

function step(s: BattleState, action: Action): BattleState {
  const why = isLegal(s, action);
  if (why !== null) {
    throw new Error(`bot played an illegal action ${JSON.stringify(action)}: ${why}`);
  }
  return applyAction(s, action).state;
}

function randomTurn(s0: BattleState, rng: Rng): BattleState {
  let s = s0;
  const order = liveMembers(s)
    .map((m) => m.id)
    .sort(() => rng.next() - 0.5);
  for (const id of order) {
    if (s.phase !== 'player') return s;
    if (memberById(s, id).hp <= 0) continue;
    if (!memberById(s, id).moved && rng.next() < 0.8) {
      const tiles = legalMoves(s, id);
      if (tiles.length > 0) s = step(s, { type: 'move', unit: id, to: pick(rng, tiles) });
    }
    if (canUndoMove(s, id) && rng.next() < 0.1) s = step(s, { type: 'undoMove', unit: id });
    const roll = rng.next();
    if (roll < 0.6) {
      const usable = castableSpells(s, id).filter((c) => c.usable);
      if (usable.length > 0) {
        const spell = pick(rng, usable).spell.key;
        const aims = legalAims(s, id, spell);
        if (aims.length > 0) s = step(s, { type: 'cast', unit: id, spell, aim: pick(rng, aims) });
      }
    } else if (roll < 0.85) {
      const dirs = shoveDirs(s, id);
      if (dirs.length > 0) s = step(s, { type: 'shove', unit: id, dir: pick(rng, dirs) });
    }
  }
  return s.phase === 'player' ? step(s, { type: 'endTurn' }) : s;
}

const enemyHp = (s: BattleState): number => liveEnemies(s).reduce((a, u) => a + u.hp, 0);
const memberHp = (s: BattleState): number => liveMembers(s).reduce((a, u) => a + u.hp, 0);
const kills = (s: BattleState): number =>
  s.units.filter((u) => u.kind === 'enemy' && u.hp <= 0).length;

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
        2 * (kills(after) - kills(s)) -
        1.5 * (memberHp(s) - memberHp(after));
      if (!best || score > best.score) best = { action, score };
    }
  }
  return best;
}

function nearestEnemy(s: BattleState, at: Coord): number {
  return Math.min(...liveEnemies(s).map((e) => manhattan(at, e.pos)), Number.POSITIVE_INFINITY);
}

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

type Outcome = 'won' | 'lost' | 'capped';

function play(start: ActionResult, bot: 'random' | 'greedy', rng: Rng): Outcome {
  let s = start.state;
  while (s.phase === 'player' && s.round <= MAX_ROUNDS) {
    s = bot === 'random' ? randomTurn(s, rng) : greedyTurn(s);
  }
  if (s.phase === 'won') return 'won';
  if (s.phase === 'lost') return 'lost';
  return 'capped';
}

for (const [depth, enc] of ENCOUNTERS.entries()) {
  enc.variants.forEach((variant, vi) => {
    test(`bots play ${variant.name} (depth ${depth + 1}): no softlock, a bot wins`, () => {
      const tally = { won: 0, lost: 0, capped: 0 };
      for (let seed = 1; seed <= SEEDS; seed++) {
        for (const bot of ['random', 'greedy'] as const) {
          const rng = createRng(seed * 7919 + depth * 31 + vi);
          const start = createEncounterBattle(enc, party(), seed, vi);
          tally[play(start, bot, rng)] += 1;
        }
      }
      expect(tally.capped, `${variant.name} ${JSON.stringify(tally)}`).toBe(0);
      expect(tally.won, `${variant.name} ${JSON.stringify(tally)}`).toBeGreaterThan(0);
    });
  });
}
