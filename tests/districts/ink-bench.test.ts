import { describe, expect, test } from 'vitest';
import { applyAction, type GameEvent, newProfile, type Profile } from '$engine';
import {
  type Draft,
  EMPTY_DRAFT,
  emptyScene,
  paintScene,
  pickMethod,
  type Scene,
  sceneBattle,
  sceneEntries,
  sceneItems,
  setEvent,
  setPart,
  trialActions,
} from '../../src/app/bench';
import { PALETTE } from '../../src/app/lab';

/** IQ-19: the quarter's pieces and staff on the Lab palette and the Bench, and two trials. */

const household = (over: { met?: string[]; foesMet?: Profile['foesMet'] } = {}): Profile => ({
  ...newProfile(),
  methods: ['bind', 'lift'],
  foesMet: over.foesMet ?? [],
  met: (over.met ?? []) as unknown as Profile['met'],
});

const PIECES: [string, string][] = [
  ['return', '{return}'],
  ['order', '{order}'],
  ['forward', '{forward}'],
  ['address', '{address}'],
  ['stamp', '{stamp}'],
  ['wax', '{wax}'],
];
const STAFF: [Profile['foesMet'][number], string][] = [
  ['deadLetter', 'x'],
  ['sorter', 'u'],
  ['sealer', 'z'],
  ['clockSeal', 'q'],
  ['letter', 'a'],
];

describe('IQ-19: the Lab', () => {
  test('the Lab palette carries every piece and every staff member but the rival', () => {
    const items = PALETTE.map((e) => e.item);
    for (const [, item] of PIECES) expect(items).toContain(item);
    for (const [, token] of STAFF) expect(items).toContain(token);
  });
});

describe('IQ-19: the Bench offers each only after it is met', () => {
  test.each(PIECES)('piece %s', (met, item) => {
    expect(sceneItems(household())).not.toContain(item);
    expect(sceneItems(household({ met: [met] }))).toContain(item);
  });

  test.each(STAFF)('staff %s', (foe, token) => {
    expect(sceneItems(household())).not.toContain(token);
    expect(sceneItems(household({ foesMet: [foe] }))).toContain(token);
  });

  test('the postmaster stays off the Bench even when met', () => {
    const p = household({ foesMet: ['postmaster'] });
    expect(sceneItems(p)).not.toContain('p');
    expect(sceneEntries(p).some((e) => /postmaster/i.test(e.name))).toBe(false);
  });
});

function trial(items: [number, number, string][], d: Draft, tap: { x: number; y: number }) {
  let scene: Scene = emptyScene();
  for (const [x, y, item] of items) {
    const r = paintScene(scene, { x, y }, item);
    if (!('scene' in r)) throw new Error(r.why);
    scene = r.scene;
  }
  let state = sceneBattle(scene, household(), d);
  const actions = trialActions(state, d, tap);
  expect(actions).not.toBeNull();
  const log: GameEvent[] = [];
  for (const a of actions ?? []) {
    const r = applyAction(state, a);
    state = r.state;
    log.push(...r.events);
  }
  return log;
}

describe('IQ-19: Bench trials', () => {
  test('a Bind trial loads and the rune resolves', () => {
    const d = setEvent(setPart(pickMethod(EMPTY_DRAFT, 'bind'), 1, 'shove'), 'hit');
    const log = trial([[4, 2, 'r']], d, { x: 4, y: 2 });
    expect(log.some((e) => e.type === 'cast')).toBe(true);
  });

  test('a Lift trial loads and the rune resolves', () => {
    const d = setPart(pickMethod(EMPTY_DRAFT, 'lift'), 0, 'shove');
    const log = trial([[4, 2, 'r']], d, { x: 4, y: 2 });
    expect(log.some((e) => e.type === 'cast')).toBe(true);
  });
});
