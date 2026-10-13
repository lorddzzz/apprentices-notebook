import { describe, expect, test } from 'vitest';
import { ENCOUNTERS, SCENARIOS } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  createBattle,
  type GameEvent,
  scenarioSpec,
} from '$engine';
import { fallbackLattices } from '../../src/app/lab';
import { buildSteps } from '../../src/app/playback';
import { type BoardView, viewOf, withoutIntents } from '../../src/app/view';

/**
 * The drift guard: playback projects events onto a view; at the end it must agree with the
 * engine's own state on everything the board draws.
 */
function drawn(v: BoardView) {
  return {
    units: v.units.map((u) => ({
      id: u.id,
      pos: u.pos,
      hp: u.hp,
      alive: u.alive,
      inked: u.inked,
      shield: u.shield,
      brass: u.brass,
      intent: u.alive ? u.intent : null,
    })),
    tiles: v.tiles.map((t) => ({
      oil: t.oil,
      ink: t.ink,
      plate: t.plate,
      vent: t.vent,
      steam: t.steam > 0,
      fire: t.fire > 0,
    })),
    round: v.round,
    phase: v.phase,
  };
}

function expectProjects(start: BoardView, events: readonly GameEvent[], end: BattleState): void {
  const last = buildSteps(start, events).at(-1)?.view ?? start;
  expect(drawn(last)).toEqual(drawn(viewOf(end)));
}

function playThrough(
  created: { state: BattleState; events: GameEvent[] },
  actions: readonly Action[],
) {
  expectProjects(withoutIntents(viewOf(created.state)), created.events, created.state);
  let s = created.state;
  for (const a of actions) {
    const r = applyAction(s, a);
    expectProjects(viewOf(s), r.events, r.state);
    s = r.state;
  }
}

const endTurn: Action = { type: 'endTurn' };

describe('projection matches engine state', () => {
  for (const def of SCENARIOS) {
    test(`scenario ${def.id}`, () => {
      const created = createBattle(scenarioSpec(def, { lab: true, lattices: fallbackLattices() }));
      playThrough(created, [...def.demo, endTurn, endTurn, endTurn]);
    });
  }

  for (const enc of ENCOUNTERS) {
    test(`encounter ${enc.id}, idle party for 4 rounds`, () => {
      const created = createBattle({ title: enc.title, board: enc.layout, seed: 7 });
      let s = created.state;
      const actions: Action[] = [];
      for (let i = 0; i < 4 && s.phase === 'player'; i++) {
        actions.push(endTurn);
        s = applyAction(s, endTurn).state;
      }
      playThrough(created, actions);
    });
  }
});
