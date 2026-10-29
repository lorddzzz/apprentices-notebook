import { describe, expect, test } from 'vitest';
import { RIVAL_PAGES, type RivalPageDef } from '$data/rivals';
import {
  applyAction,
  type GameEvent,
  newProfile,
  newSave,
  type Profile,
  witnessedIn,
} from '$engine';
import { pageTrialActions, pageTrialBattle, trialPage } from '../../src/app/bench';
import { BenchStore } from '../../src/app/bench.svelte';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend, saveText } from '../../src/app/save';

/** The Bench page trial (rivals plan RV-18, P13): the whole spell, lent, isolated. */

const ID = 'lamplighter:lantern';
const found = RIVAL_PAGES['lamplighter:lantern'];
if (!found) throw new Error('missing page');
const page: RivalPageDef = found;

const held = (known: Profile['known'] = []): Profile => ({
  ...newProfile(),
  known,
  pages: [ID],
});

function run(p: Profile): GameEvent[] {
  let state = pageTrialBattle(page, p);
  const actions = pageTrialActions(state, { x: 4, y: 1 });
  expect(actions).not.toBeNull();
  const log: GameEvent[] = [];
  for (const a of actions ?? []) {
    const r = applyAction(state, a);
    state = r.state;
    log.push(...r.events);
  }
  return log;
}

describe('the page trial', () => {
  test('only a held page opens', () => {
    expect(trialPage(newProfile(), ID)).toBeNull();
    expect(trialPage(held(), 'nobody:nothing')).toBeNull();
    expect(trialPage(held(), ID)).toBe(page);
  });

  test('runs with parts the household does not own', () => {
    const p = held([]);
    expect(p.known).not.toContain('jar');
    const log = run(p);
    expect(log.length).toBeGreaterThan(0);
    expect(log.some((e) => e.type === 'cast')).toBe(true);
  });

  test('the profile is unchanged by a trial; unowned parts never become stock', () => {
    const p = held(['bolt']);
    const before = structuredClone(p);
    run(p);
    expect(p).toEqual(before);
    expect(p.known).toEqual(['bolt']);
  });

  test('no wick event in the trial log, and no rival on the scene', () => {
    const log = run(held());
    expect(JSON.stringify(log).toLowerCase()).not.toContain('wick');
    const state = pageTrialBattle(page, held());
    expect(state.units.some((u) => u.kind === 'enemy' && u.rival)).toBe(false);
  });

  test('the trial seals the lantern jar on the ready scene', () => {
    expect(run(held()).some((e) => e.type === 'jarSealed')).toBe(true);
  });
});

describe('the page trial store', () => {
  test('leaving changes only the witnessed lines of the save', async () => {
    const game = new GameStore(
      memoryBackend(saveText({ ...newSave(1), profile: held(['bolt']) })),
      () => 1,
    );
    const before = structuredClone(game.studyProfile);
    const bench = new BenchStore(game);
    bench.open(ID);
    expect(bench.page?.id).toBe(ID);
    bench.startAiming();
    expect(bench.aiming).toBe(true);
    // Tap to the right of the caster: the trial plays through.
    await bench.tap({ x: 4, y: 1 });
    await new Promise((r) => setTimeout(r, 50));
    bench.session?.skip();
    bench.leave();
    const after = game.studyProfile;
    expect({ ...after, witnessed: [] }).toEqual({ ...before, witnessed: [] });
    expect(after.known).toEqual(['bolt']);
    expect(after.witnessed).toEqual([
      ...new Set([...before.witnessed, ...witnessedIn(run(held(['bolt'])))]),
    ]);
  });

  test('a page that is not held falls back to the ordinary Bench', () => {
    const game = new GameStore(memoryBackend(saveText(newSave(1))), () => 1);
    const bench = new BenchStore(game);
    bench.open(ID);
    expect(bench.page).toBeNull();
  });
});
