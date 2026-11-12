import { describe, expect, test } from 'vitest';
import {
  FOUNDRY_HEART,
  FOUNDRY_ROOMS_12,
  FOUNDRY_ROOMS_34,
  FOUNDRY_TUNING,
} from '$data/districts/foundry';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { basicDirs } from '$engine/basicActions';
import { applyAction } from '$engine/battle';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { botValue } from '$engine/districts/api';
import { castableSpells, legalAims, legalMoves, memberById } from '$engine/queries';
import { createRng } from '$engine/rng';
import { listRules } from '$engine/rules';
import type { Action, BattleState } from '$engine/types';
import { board, withLattices } from '../scenarios/harness';
import { botFight } from './bot';

/**
 * BF-20: the foundry's bot term (pulses that will hit foes and members) and a fuzz of full foundry
 * trips: the four rooms and the heart played with random legal play, every seed. No win-rate
 * target (calibration is CAL-4). Rooms are driven from their data, as the bathhouse sims do.
 */

describe('BF-20 the bot reads the ring', () => {
  test('BF-20: the bot prefers the cast whose ring pulses a foe', () => {
    // Bolt right strikes a low bell beside a rat; Bolt down strikes a mid bell beside nothing.
    const s = withLattices(
      'D . {bell:low} r\n. . . .\n{bell:mid} . . .\n. . . S',
      { draughtsman: 'Bolt> Strike' },
      { lineup: ['draughtsman'] },
    );
    const f = botFight(s, 1, ['draughtsman'], { gauge: true });
    const first = f.actions[0];
    expect(first).toMatchObject({ type: 'cast', aim: { kind: 'dir', dir: 'right' } });
    expect(f.events.some((e) => e.type === 'foundry:pulse')).toBe(true);
  });

  test('BF-20: the term is 0 off a foundry board and punishes a member beside a ringing bell', () => {
    expect(botValue(board('D . . r'))).toBe(0);
    const hazard = withLattices('D {bell:low} . r', { draughtsman: 'Bolt> Strike' });
    const safe = withLattices('. . D {bell:low} r', { draughtsman: 'Bolt> Strike' });
    expect(botValue(hazard)).toBeLessThan(botValue(safe));
  });
});

const ROOMS = [...FOUNDRY_ROOMS_12, ...FOUNDRY_ROOMS_34, FOUNDRY_HEART];
const HEART_SEED_RULE = 'foundry:tune';

/** Every legal action the party could take now, in a fixed order. */
function legalActions(s: BattleState): Action[] {
  const out: Action[] = [{ type: 'endTurn' }];
  for (const m of s.units.filter((u) => u.kind === 'member' && u.hp > 0 && !u.out)) {
    const id = memberById(s, m.id as never).id;
    for (const to of legalMoves(s, id)) out.push({ type: 'move', unit: id, to });
    if (!memberById(s, id).acted) {
      for (const dir of basicDirs(s, id)) {
        out.push({ type: memberById(s, id).action, unit: id, dir } as Action);
      }
    }
    for (const { spell, usable } of castableSpells(s, id)) {
      if (!usable) continue;
      for (const aim of legalAims(s, id, spell.key)) {
        out.push({ type: 'cast', unit: id, spell: spell.key, aim });
      }
    }
  }
  return out;
}

function playRoom(roomIndex: number, seed: number): number {
  const room = ROOMS[roomIndex];
  const layout = room?.variants[seed % (room?.variants.length ?? 1)];
  if (!room || !layout) throw new Error('no room');
  const rng = createRng(seed * 101 + roomIndex);
  let s = structuredClone(
    createBattle({
      title: room.title,
      board: layout.layout,
      seed,
      lineup: FOUNDERS,
      party: Object.fromEntries(
        FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
      ),
    }).state,
  );
  if (roomIndex === ROOMS.length - 1) {
    s.rules = listRules(s, [HEART_SEED_RULE], { [HEART_SEED_RULE]: { seed } });
  }
  let applied = 0;
  for (let n = 0; n < 60 && s.phase === 'player'; n++) {
    const acts = legalActions(s);
    const pick = acts[rng.int(0, acts.length - 1)];
    if (!pick) break;
    // Mostly random, but end the turn now and then so the foes act and the rounds advance.
    const a: Action = rng.int(0, 4) === 0 ? { type: 'endTurn' } : pick;
    const r = applyAction(s, a);
    s = r.state;
    applied++;
    // One action may emit up to the cap plus its fizzle line, never more.
    expect(r.events.length).toBeLessThanOrEqual(CAST_EVENT_CAP + 50);
  }
  return applied;
}

describe('BF-20 foundry trips never throw or overrun the cap', () => {
  test('BF-20: 200 seeded foundry trips never throw or overrun the cap', () => {
    let actions = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (let i = 0; i < ROOMS.length; i++) actions += playRoom(i, seed);
    }
    expect(actions).toBeGreaterThan(200);
    expect(FOUNDRY_TUNING.pulseDamage).toBeGreaterThan(0);
  }, 600_000);
});
