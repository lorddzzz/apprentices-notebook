import { describe, expect, it } from 'vitest';
import { type Action, type ActionResult, type BattleState, isSilent, memberById } from '$engine';
import { applyAction } from '$engine/battle';
import { type BoardView, projectWith, viewOf } from '../../../src/app/view';
import { withLattices } from '../../scenarios/harness';
import { ev, ringTones, seeded } from './helpers';

/**
 * BF-4 acceptance (foundry-plan §2 P3; BF-T2): ring cascades are bounded and replay-safe. Each is
 * `it.fails` until BF-3 builds the ring and passes `eventCap` through `applyAction` (its fourth
 * argument, tested in `bells.acceptance.test.ts`); the sweep below needs both. Every test first
 * asserts that the cascade really happened, so none passes on a board where nothing rings.
 */

/** What the board draws, minus silent counters (as `tests/engine/cap.test.ts`). */
function drawn(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive
        ? { id: u.id, pos: u.pos, hp: u.hp, mark: u.mark, shield: u.shield, held: u.held > 0 }
        : { id: u.id, alive: false },
    ),
    tiles: v.tiles.map((t) => ({ state: t.state, jar: t.jar })),
  };
}

type Run = (s: BattleState, a: Action, footnotes: object, cap: number) => ActionResult;
const run = applyAction as unknown as Run;

const castRight = (s: BattleState): Action => ({
  type: 'cast',
  unit: 'draughtsman',
  spell: memberById(s, 'draughtsman').spells[0]?.key ?? '',
  aim: { kind: 'dir', dir: 'right' },
});

const UNCAPPED = 10_000;
const projects = (s: BattleState, r: ActionResult): boolean => {
  const got = r.events.reduce((v, e) => (isSilent(e) ? v : projectWith(v, e)), viewOf(s));
  return JSON.stringify(drawn(got)) === JSON.stringify(drawn(viewOf(r.state)));
};

const LOW_MID_HIGH = 'D . {bell:low} r {bell:mid} r {bell:high} .';

describe('BF-4 cascade proof', () => {
  it.fails('BF-4: a ring chain cut at every event index projects to the board it ended on', () => {
    const s = withLattices(LOW_MID_HIGH, { draughtsman: 'Bolt> Strike' });
    const full = run(s, castRight(s), {}, UNCAPPED);
    expect(ringTones(full.events)).toEqual(['low', 'mid', 'high']);
    const drifting: number[] = [];
    for (let cap = 0; cap <= full.events.length; cap++) {
      if (!projects(s, run(s, castRight(s), {}, cap))) drifting.push(cap);
    }
    expect(drifting).toEqual([]);
  });

  it.fails('BF-4: random bell nets ring each tone once and never reach the cap', () => {
    let rang = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = withLattices(net(seed), { draughtsman: 'Bolt> Strike' });
      const r = run(s, castRight(s), {}, UNCAPPED);
      const tones = ringTones(r.events);
      rang += tones.length;
      expect(new Set(tones).size, `seed ${seed}`).toBe(tones.length);
      expect(tones.length, `seed ${seed}`).toBeLessThanOrEqual(3);
      expect(
        r.events.some((e) => e.type === 'fizzles'),
        `seed ${seed}`,
      ).toBe(false);
    }
    expect(rang).toBeGreaterThan(0); // the nets did ring
  });

  it.fails('BF-4: random bell nets project to the final board', () => {
    let pulses = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = withLattices(net(seed), { draughtsman: 'Bolt> Strike' });
      const r = run(s, castRight(s), {}, UNCAPPED);
      pulses += ev(r.events, 'foundry:pulse').length;
      expect(projects(s, r), `seed ${seed}`).toBe(true);
    }
    expect(pulses).toBeGreaterThan(0);
  });
});

/** A 7×5 board: the Draughtsman at A3, a bell at C3 in his line, then random bells and rats. */
function net(seed: number): string {
  const rnd = seeded(seed);
  const tones = ['low', 'mid', 'high'];
  const cells = Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => '.'));
  const put = (x: number, y: number, c: string) => {
    const row = cells[y];
    if (row) row[x] = c;
  };
  const tone = () => tones[Math.floor(rnd() * 3)];
  put(0, 2, 'D');
  put(2, 2, `{bell:${tone()}}`);
  const extra = 3 + Math.floor(rnd() * 6);
  for (let i = 0; i < extra + 4; i++) {
    const x = Math.floor(rnd() * 7);
    const y = Math.floor(rnd() * 5);
    if ((x === 0 && y === 2) || (x === 1 && y === 2) || (x === 2 && y === 2)) continue;
    if (cells[y]?.[x] !== '.') continue;
    put(x, y, i < extra ? `{bell:${tone()}}` : 'r');
  }
  return cells.map((row) => row.join(' ')).join('\n');
}
