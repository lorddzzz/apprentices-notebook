import { expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
import {
  type Action,
  applyAction,
  type BattleSpec,
  type BattleState,
  beginEncounter,
  compiledFor,
  createBattle,
  describeLog,
  type GameEvent,
  legalAims,
  legalMoves,
  memberById,
  newProfile,
  replay,
  startTrip,
} from '$engine';
import { act, board, expectLogIncludes } from './harness';

/** Cross-module checks: sentries vs. clouds, shields, replay and reproducibility. */

test('sentry-cloud-block: a cloud stops the line, and without it the line hits (S10)', () => {
  const blocked = board('b . ~ . D', { intents: { A1: 'right' } });
  expectLogIncludes(act(blocked, { type: 'endTurn' }).events, [
    'Enemies act',
    'sentry at A1 fires right',
    'Line is stopped by the cloud at C1',
  ]);
  const open = board('b . . . D', { intents: { A1: 'right' } });
  expectLogIncludes(act(open, { type: 'endTurn' }).events, [
    'Enemies act',
    'sentry at A1 fires right',
    'Line hits Draughtsman for 2',
  ]);
});

test('shield absorbs a bite', () => {
  const s0 = board('r S++ D', { intents: { A1: 'right' } });
  const r = act(s0, { type: 'endTurn' });
  expectLogIncludes(r.events, [
    'rat at A1 bites right',
    'Bite hits Stoker for 1',
    "Stoker's shield absorbs 1 (1 left)",
  ]);
  const stoker = memberById(r.state, 'stoker');
  expect(stoker.hp).toBe(8);
  expect(stoker.shield).toBe(1);
});

test('a familiar spit lands Ink: a mark on whoever it hits (P11)', () => {
  const s0 = board('f . D', { intents: { A1: 'right' } });
  const r = act(s0, { type: 'endTurn' });
  expectLogIncludes(r.events, [
    'familiar at A1 spits right',
    'Spit hits Draughtsman for 1',
    'ink lands on Draughtsman as mark',
  ]);
  expect(memberById(r.state, 'draughtsman').mark).toMatchObject({ deep: false, bound: null });
});

function specFor(index: number): BattleSpec {
  const enc = ENCOUNTERS[index];
  if (!enc) throw new Error('no encounter');
  const p = newProfile();
  return {
    title: enc.title,
    board: enc.layout,
    seed: 42,
    party: {
      draughtsman: { spells: compiledFor(p, 'draughtsman').spells },
      stoker: { spells: compiledFor(p, 'stoker').spells },
    },
  };
}

/** A fixed, legal-by-construction script: every member walks, casts if it can, then end turn. */
function script(spec: BattleSpec, rounds: number): Action[] {
  const actions: Action[] = [];
  let s: BattleState = createBattle(spec).state;
  const apply = (a: Action) => {
    actions.push(a);
    s = applyAction(s, a).state;
  };
  for (let round = 0; round < rounds && s.phase === 'player'; round++) {
    for (const id of ['draughtsman', 'stoker'] as const) {
      const m = memberById(s, id);
      if (m.hp === 0) continue;
      const to = legalMoves(s, id).at(round % 2 === 0 ? -1 : 0);
      if (to) apply({ type: 'move', unit: id, to });
      const spell = memberById(s, id).spells[0];
      const aim = spell ? legalAims(s, id, spell.key)[0] : undefined;
      if (spell && aim && (memberById(s, id).charges[spell.key] ?? 0) > 0) {
        apply({ type: 'cast', unit: id, spell: spell.key, aim });
      }
    }
    apply({ type: 'endTurn' });
  }
  return actions;
}

test('replay equals step-by-step application', () => {
  const spec = specFor(0);
  const actions = script(spec, 3);
  expect(actions.filter((a) => a.type === 'endTurn').length).toBeGreaterThan(0);
  expect(actions.some((a) => a.type === 'cast')).toBe(true);

  const first = createBattle(spec);
  let state = first.state;
  const events: GameEvent[] = [...first.events];
  const states = [state];
  for (const a of actions) {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    states.push(state);
  }
  const r = replay(spec, actions);
  expect(r.states).toHaveLength(actions.length + 1);
  expect(r.states).toEqual(states);
  expect(r.states.at(-1)).toEqual(state);
  expect(describeLog(r.events)).toEqual(describeLog(events));
  expect(r.events).toEqual(events);
});

test('encounter 1 with an idle party for 3 rounds is reproducible', () => {
  const p = newProfile();
  const run = () => {
    const first = beginEncounter(p, startTrip(p, 777));
    let s = first.state;
    const lines = describeLog(first.events);
    for (let i = 0; i < 3 && s.phase === 'player'; i++) {
      const r = applyAction(s, { type: 'endTurn' });
      s = r.state;
      lines.push(...describeLog(r.events));
    }
    return { s, lines };
  };
  const a = run();
  const b = run();
  expect(b.lines).toEqual(a.lines);
  expect(b.s).toEqual(a.s);
  expect(a.lines.filter((l) => l === 'Enemies act').length).toBeGreaterThan(1);
});
