import { describe, expect, test } from 'vitest';
import { APPRENTICE_IDS, APPRENTICES, type MemberId } from '$data';
import {
  BENCH_ROUNDS,
  CARTOGRAPHERS_THRESHOLD,
  CARTOGRAPHERS_THRESHOLD_LAY_FIGURE,
  LAY_FIGURE_TILE,
} from '$data/districts/cartographers/threshold';
import type { ThresholdSpec } from '$data/districts/index';
import {
  type Action,
  applyAction,
  type BattleState,
  type Coord,
  compiledFor,
  createBattle,
  memberById,
  newProfile,
  type Profile,
  parseBoard,
  parseLabel,
  parseLattice,
} from '$engine';
import { objectiveMet } from '$engine/city';
import { legalMoves } from '$engine/queries';
import { checkRoom } from '$engine/rooms';
import { thresholdStart } from '../../../src/app/threshold';

/**
 * CG-11 (cartographers-plan P16): "the drafting table". Pencil over blank, no foes, fixed fates;
 * a member on the inked bench within four rounds. The solver walks the engine itself.
 */

const SPEC = parseBoard(CARTOGRAPHERS_THRESHOLD.board);
/** The nine kits a household can field: everyone but the owner. */
const KITS = APPRENTICE_IDS.filter((id) => id !== 'owner');

/** Every apprentice, each with their own starter page. */
const profile = (): Profile => {
  const p = newProfile();
  const lattices = { ...p.lattices } as Record<string, Profile['lattices'][MemberId]>;
  for (const id of APPRENTICE_IDS) {
    lattices[id] = [...parseLattice(APPRENTICES[id].starterPage).runes];
  }
  return { ...p, lattices: lattices as Profile['lattices'] };
};

/** The battle with exactly the `P` at `at` kept, for one apprentice (as a trip with one member). */
function startAt(room: ThresholdSpec, member: MemberId, at: Coord): BattleState {
  const start = parseBoard(room.board).starts;
  let n = 0;
  const board = room.board
    .split('\n')
    .map((row) =>
      row
        .split(' ')
        .map((c) => {
          if (c !== 'P') return c;
          const here = start[n++];
          return here && here.x === at.x && here.y === at.y ? 'P' : '.';
        })
        .join(' '),
    )
    .join('\n');
  const spells = compiledFor(profile(), member).spells;
  return createBattle({
    title: room.name,
    board,
    seed: 1,
    objective: room.goal,
    party: {
      [member]: { spells, charges: Object.fromEntries(spells.map((s) => [s.key, s.charges])) },
    },
    lineup: [member],
    startSeed: 1,
  }).state;
}

const DIRS = ['up', 'down', 'left', 'right'] as const;
/** The member's own basic action (Shove, Pull, Swap or Hop) in every direction it is legal. */
function basicActions(s: BattleState, member: MemberId): Action[] {
  const type = APPRENTICES[member].action;
  const out: Action[] = [];
  for (const dir of DIRS) {
    const a = { type, unit: member, dir } as Action;
    try {
      applyAction(s, a);
      out.push(a);
    } catch {
      // not legal from here
    }
  }
  return out;
}

/** Depth-first search over (move or stay, optional basic action, end turn) for four rounds; memoised by round and tile. */
function solve(
  s0: BattleState,
  member: MemberId,
  opts: { shove: boolean; keep?: string },
): Action[] | null {
  const dead = new Set<string>();
  const alive = (s: BattleState) => {
    const m = memberById(s, member);
    return m.hp > 0 && !m.out;
  };
  const figureSaved = (s: BattleState) => {
    if (!opts.keep) return true;
    const u = s.units.find((x) => x.id === opts.keep);
    return !!u && u.hp > 0 && !u.out;
  };
  const go = (s: BattleState, script: Action[]): Action[] | null => {
    if (s.phase === 'won') return figureSaved(s) ? script : null;
    if (s.phase !== 'player' || !alive(s) || s.round > BENCH_ROUNDS) return null;
    const m = memberById(s, member);
    const fig = s.units.find((x) => x.id === opts.keep);
    const key = `${s.round}|${m.pos.x},${m.pos.y}|${fig ? `${fig.pos.x},${fig.pos.y},${fig.out}` : ''}`;
    if (dead.has(key)) return null;
    const spots: (Coord | null)[] = [null, ...legalMoves(s, member)];
    for (const to of spots) {
      const moved: Action[] = to ? [{ type: 'move', unit: member, to }] : [];
      const afterMove = to ? applyAction(s, moved[0] as Action).state : s;
      const variants: (Action | null)[] = [
        null,
        ...(opts.shove ? basicActions(afterMove, member) : []),
      ];
      for (const shove of variants) {
        const acts: Action[] = [...moved, ...(shove ? [shove] : [])];
        const mid = shove ? applyAction(afterMove, shove).state : afterMove;
        if (mid.phase === 'won') {
          const r = figureSaved(mid) ? [...script, ...acts] : null;
          if (r) return r;
          continue;
        }
        const end = applyAction(mid, { type: 'endTurn' }).state;
        const found = go(end, [...script, ...acts, { type: 'endTurn' }]);
        if (found) return found;
      }
    }
    dead.add(key);
    return null;
  };
  return go(s0, []);
}

/** Replays a script from the start: the state it ends in. */
function replay(s0: BattleState, script: readonly Action[]): BattleState {
  return script.reduce((s, a) => applyAction(s, a).state, s0);
}

describe('the drafting table (P16)', () => {
  test('a 6x7 sheet of pencil over blank with four start points and no foes, passing checkRoom', () => {
    expect(checkRoom(CARTOGRAPHERS_THRESHOLD.board)).toEqual([]);
    expect([SPEC.width, SPEC.height]).toEqual([6, 7]);
    expect(SPEC.starts).toHaveLength(4);
    expect(SPEC.units).toHaveLength(0);
    const pieces = SPEC.tiles.map((t) => t.piece?.id);
    expect(pieces.filter((p) => p === 'cartographers:blank').length).toBeGreaterThan(0);
    expect(pieces.filter((p) => p === 'cartographers:pencil').length).toBeGreaterThan(20);
    // Every pencil tile carries a fixed fate and a due round (shown a round ahead).
    for (const t of SPEC.tiles) {
      if (t.piece?.id !== 'cartographers:pencil') continue;
      expect(t.piece.data).toMatchObject({ fate: expect.stringMatching(/^(ink|rub)$/) });
      expect((t.piece.data as { due: number | null }).due).toBeGreaterThan(0);
    }
    expect(CARTOGRAPHERS_THRESHOLD.goal).toEqual({ reach: ['B1', 'C1', 'D1', 'E1'], byRound: 4 });
    expect(CARTOGRAPHERS_THRESHOLD.solvedArt).toBe('cartographers-bench');
  });

  test('CG-11: a scripted solve exists from every P with each available kit alone', () => {
    expect(KITS).toHaveLength(9);
    for (const member of KITS) {
      for (const at of SPEC.starts) {
        const s0 = startAt(CARTOGRAPHERS_THRESHOLD, member, at);
        const script = solve(s0, member, { shove: false });
        const label = `${member} from ${at.x},${at.y}`;
        expect(script, label).not.toBeNull();
        if (!script) continue;
        // The script is movement and waiting only, and replays to a win through the goal.
        expect(
          script.every((a) => a.type === 'move' || a.type === 'endTurn'),
          label,
        ).toBe(true);
        const end = replay(s0, script);
        expect(end.phase, label).toBe('won');
        expect(objectiveMet(end, []), label).toBe(true);
        expect(end.round, label).toBeLessThanOrEqual(BENCH_ROUNDS);
      }
    }
  }, 60_000);

  test('standing still loses to the pencil nowhere on the start tiles, but the bench is not reached', () => {
    for (const at of SPEC.starts) {
      let s = startAt(CARTOGRAPHERS_THRESHOLD, 'draughtsman', at);
      for (let i = 0; i < BENCH_ROUNDS + 1 && s.phase === 'player'; i++) {
        s = applyAction(s, { type: 'endTurn' }).state;
      }
      expect(s.phase).not.toBe('won');
    }
  });

  test('the lay-figure sheet: walking past still reaches the bench but loses the figure; a shove saves it', () => {
    const figure = 'barge-1';
    const room = CARTOGRAPHERS_THRESHOLD_LAY_FIGURE;
    expect(checkRoom(room.board)).toEqual([]);
    expect(parseBoard(room.board).units.map((u) => u.def)).toEqual(['barge']);
    expect(room.goal).toEqual(CARTOGRAPHERS_THRESHOLD.goal);
    const tile = parseLabel(LAY_FIGURE_TILE);
    expect(parseBoard(room.board).units[0]?.at).toEqual(tile);
    for (const member of KITS) {
      let saves = 0;
      for (const at of SPEC.starts) {
        const label = `${member} from ${at.x},${at.y}`;
        const s0 = startAt(room, member, at);
        const walked = solve(s0, member, { shove: false });
        expect(walked, label).not.toBeNull();
        if (walked) {
          const end = replay(s0, walked);
          expect(end.phase, label).toBe('won');
          expect(end.units.find((x) => x.id === figure)?.out, label).toBe('erased');
        }
        // Shove, Pull and Swap save the figure; a Hop cannot move it.
        if (APPRENTICES[member].action === 'hop') continue;
        const saved = solve(s0, member, { shove: true, keep: figure });
        if (saved) {
          saves++;
          const end = replay(s0, saved);
          expect(end.phase, label).toBe('won');
          const u = end.units.find((x) => x.id === figure);
          expect(u?.out, label).toBeFalsy();
          expect(u?.hp, label).toBeGreaterThan(0);
          expect(
            saved.some((a) => a.type === APPRENTICES[member].action),
            label,
          ).toBe(true);
        }
      }
      // Every Shove, Pull or Swap kit saves the figure from at least one start point.
      if (APPRENTICES[member].action !== 'hop') expect(saves, member).toBeGreaterThan(0);
    }
  }, 60_000);

  test('CG-11: retry replays the same fates', () => {
    const p = profile();
    const a = thresholdStart(p, CARTOGRAPHERS_THRESHOLD).state;
    const b = thresholdStart(p, CARTOGRAPHERS_THRESHOLD).state;
    expect(b).toEqual(a);
    // The same turns resolve the same fates round after round.
    const run = (s0: BattleState) => {
      let s = s0;
      const tiles: string[] = [];
      for (let i = 0; i < 4; i++) {
        s = applyAction(s, { type: 'endTurn' }).state;
        tiles.push(
          JSON.stringify(s.tiles.map((t) => [t.piece?.id ?? null, t.piece?.data ?? null])),
        );
      }
      return tiles;
    };
    expect(run(b)).toEqual(run(a));
    // The fates are authored, not drawn: they are in the board and do not move with the seed.
    const other = createBattle({
      title: 't',
      board: CARTOGRAPHERS_THRESHOLD.board,
      seed: 99,
      objective: CARTOGRAPHERS_THRESHOLD.goal,
      party: {},
      lineup: ['draughtsman'],
      startSeed: 99,
    }).state;
    expect(run(other).at(-1)).toBe(run(a).at(-1));
  });
});
