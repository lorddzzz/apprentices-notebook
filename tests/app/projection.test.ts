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
      branded: u.branded,
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
const castRight = (unit: 'draughtsman' | 'stoker'): Action => ({
  type: 'cast',
  unit,
  spell: '',
  aim: { kind: 'dir', dir: 'right' },
});

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

  test('bench runes: smear, mist, brand, quill, torch', () => {
    const lab = { lab: true } as const;
    const cases: Array<[string, Record<string, string>, Action]> = [
      ['D . r r\n. . r .', { draughtsman: 'Bolt> Smear' }, castRight('draughtsman')],
      ['D . r', { draughtsman: 'Bolt> Brand' }, castRight('draughtsman')],
      ['D . r', { draughtsman: 'Quill>' }, castRight('draughtsman')],
      ['S . . o o r', { stoker: 'Bolt> Torch' }, castRight('stoker')],
      [
        '. r~ r~\n. . .\nS . .',
        { stoker: 'Splash> Mist' },
        { type: 'cast', unit: 'stoker', spell: 'A1', aim: { kind: 'tile', at: { x: 1, y: 0 } } },
      ],
    ];
    for (const [board, lattices, action] of cases) {
      const created = createBattle(
        scenarioSpec({ board, lattices } as Parameters<typeof scenarioSpec>[0], lab),
      );
      const key = created.state.units.find((u) => u.kind === 'member')?.spells[0]?.key;
      playThrough(created, [action.type === 'cast' && key ? { ...action, spell: key } : action]);
    }
  });
});
