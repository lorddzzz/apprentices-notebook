import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { FOUNDRY_THRESHOLD } from '$data/districts/foundry';
import {
  applyAction,
  type BattleState,
  boardOf,
  createBattle,
  type EventLog,
  hearFromBattle,
  memberById,
  namedIn,
  newProfile,
  parseBoard,
  startTrip,
} from '$engine';
import { objectiveMet } from '$engine/city';
import { toneOfPiece } from '$engine/districts/foundry/pieces';
import type { Coord } from '$engine/grid';
import { conditionHolds, type HearScene, hearOf } from '$engine/hearing';
import { checkRoom, placeParty } from '$engine/rooms';
import { cast, withLattices } from '../scenarios/harness';

/**
 * BF-14 (foundry-plan P26): the hearing is a conducted Spark reaching three units in the Seam.
 * Shown on real fights: a plate chain of brass with units touching it, one Spark on its first plate.
 */

function sparkOnPlates(board: string): EventLog {
  const s = withLattices(board, { draughtsman: 'Splash> Spark' });
  return cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } }).events;
}

const ownerEntry = () => {
  const c = hearOf('foundry').find((x) => x.voice === 'owner');
  if (!c) throw new Error('no owner hearing');
  return c;
};
const sceneOf = (log: EventLog, district: 'seam' | 'canals'): HearScene => ({
  profile: newProfile(),
  district,
  party: ['draughtsman'],
  log,
});

describe('the foundry hearing and map (BF-14)', () => {
  test('BF-14: the foundry is heard by a conducted burst reaching three units in the Seam', () => {
    expect(ownerEntry()).toMatchObject({ kind: 'conducted', atLeast: 3, district: 'seam' });
    const log = sparkOnPlates('D # # # r\n. r . r .');
    expect(log.find((e) => e.type === 'burst')).toMatchObject({ burst: 'conduct' });
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'seam'))).toBe(true);
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'canals'))).toBe(false);
    const t = startTrip(newProfile(), 1);
    const heard = hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard;
    expect(heard).toEqual(['foundry']);
  });

  test('BF-14: two units are not enough', () => {
    const log = sparkOnPlates('D # # # .\n. r . . .');
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'seam'))).toBe(false);
    const t = startTrip(newProfile(), 1);
    expect(hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard).toEqual([]);
  });

  test('BF-14: the map entry has its caption, brass lean and solved art key', () => {
    const d = DISTRICTS.foundry;
    expect(d.line).toBe('one bang, heard three tiles away');
    expect(d.lean).toEqual({ lean: 'brass', text: 'Brass' });
    expect(d.map.solvedArt).toBe('foundry-bell');
  });
});

describe('the far bell (BF-15)', () => {
  const SPEC = parseBoard(FOUNDRY_THRESHOLD.board);

  /** The hall with exactly one `P` kept (the one at `at`). */
  function startAt(at: Coord): BattleState {
    let n = 0;
    const rows = FOUNDRY_THRESHOLD.board.split('\n').map((row) =>
      row
        .split(' ')
        .map((c) => {
          if (c !== 'P') return c;
          const here = SPEC.starts[n++];
          return here && here.x === at.x && here.y === at.y ? 'P' : '.';
        })
        .join(' '),
    );
    return structuredClone(
      createBattle({
        title: FOUNDRY_THRESHOLD.name,
        board: rows.join('\n'),
        seed: 1,
        objective: FOUNDRY_THRESHOLD.goal,
        party: {},
        lineup: ['draughtsman'],
        startSeed: 1,
      }).state,
    );
  }
  const bellsOfTone = (s: BattleState, tone: string) =>
    s.tiles.filter(
      (t) => t.piece?.id === 'foundry:bell' && toneOfPiece(t.piece.id, t.piece.data) === tone,
    ).length;

  test('a 6x8 hall with four start points, passing checkRoom, no foes', () => {
    expect(checkRoom(FOUNDRY_THRESHOLD.board)).toEqual([]);
    expect([SPEC.width, SPEC.height]).toEqual([6, 8]);
    expect(SPEC.starts.length).toBeGreaterThanOrEqual(4);
    expect(SPEC.units).toEqual([]);
  });

  test('two low bells far apart and a decoy of another tone', () => {
    const s = startAt(SPEC.starts[0] as Coord);
    expect(bellsOfTone(s, 'low')).toBe(2);
    expect(bellsOfTone(s, 'high')).toBe(1);
    const lows = s.tiles.flatMap((t, i) =>
      t.piece && toneOfPiece(t.piece.id, t.piece.data) === 'low'
        ? [{ x: i % s.width, y: Math.floor(i / s.width) }]
        : [],
    );
    const [a, b] = lows as [Coord, Coord];
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(4);
    expect(FOUNDRY_THRESHOLD.goal).toEqual({ happens: 'foundry:ring' });
    expect(FOUNDRY_THRESHOLD.solvedArt).toBe(DISTRICTS.foundry.map.solvedArt);
  });

  test('BF-15: a Shove from every start point rings the far bell', () => {
    for (const p of SPEC.starts) {
      const s0 = startAt(p);
      const me = memberById(s0, 'draughtsman').pos;
      expect(me, `${p.x},${p.y}`).toEqual(p);
      // Walk to a tile beside the near bell on the way in, then shove it.
      const beside = { x: 2, y: 6 };
      const moved = applyAction(s0, { type: 'move', unit: 'draughtsman', to: beside });
      const shove = applyAction(moved.state, {
        type: 'shove',
        unit: 'draughtsman',
        dir: 'up',
      });
      const events = [...moved.events, ...shove.events];
      const rings = events.filter((e) => e.type === 'foundry:ring');
      expect(rings, `${p.x},${p.y}`).toHaveLength(1);
      expect(objectiveMet(shove.state, events), `${p.x},${p.y}`).toBe(true);
    }
  });

  test('the muffled decoy rings nothing: striking it does not open the door', () => {
    const s0 = startAt({ x: 5, y: 6 });
    const moved = applyAction(s0, { type: 'move', unit: 'draughtsman', to: { x: 4, y: 4 } });
    const shove = applyAction(moved.state, { type: 'shove', unit: 'draughtsman', dir: 'up' });
    const events = [...moved.events, ...shove.events];
    expect(events.some((e) => e.type === 'foundry:ring')).toBe(false);
    expect(objectiveMet(shove.state, events)).toBe(false);
  });

  test('BF-15: Retry keeps the same spots', () => {
    const lineup = ['draughtsman'] as const;
    const a = placeParty(SPEC, lineup, 1);
    const b = placeParty(SPEC, lineup, 1);
    expect(a.units).toEqual(b.units);
    const make = () =>
      createBattle({
        title: FOUNDRY_THRESHOLD.name,
        board: FOUNDRY_THRESHOLD.board,
        seed: 1,
        objective: FOUNDRY_THRESHOLD.goal,
        party: {},
        lineup,
        startSeed: 1,
      }).state;
    expect(boardOf(make())).toBe(boardOf(make()));
    expect(memberById(make(), 'draughtsman').pos).toEqual(memberById(make(), 'draughtsman').pos);
  });
});
