import { describe, expect, test } from 'vitest';
import { RIVAL_PAGES } from '$data/rivals';
import {
  applyAction,
  describeLog,
  type GameEvent,
  newProfile,
  newSave,
  runScenario,
  type SaveData,
  scenarioById,
  type Trip,
} from '$engine';
import { pageTrialActions, pageTrialBattle } from '../../src/app/bench';
import { endBattle, setOut, startBattle } from '../../src/app/flow';
import { botFight } from './bot';
import { inkProfile } from './ink-bot';

/**
 * IQ-23: the postmaster in the Lab and at the heart. Checks only (no balance tuning): the Lab
 * prototype replays, a won heart banks his page, a wipe at the heart keeps a held page and banks
 * none, and the Bench page trial isolates the spell from his trick.
 */
const PAGE = 'postmaster:serveNotice' as const;
const page = RIVAL_PAGES[PAGE];
if (!page) throw new Error('missing page');

const heartSave = (seed: number): SaveData => {
  const save = setOut({ ...newSave(seed), profile: inkProfile() }, 'inkQuarter');
  const t = save.trip as Trip;
  return { ...save, trip: { ...t, encounter: 4 } };
};

describe('the Lab prototype', () => {
  test('the postmaster counter scenario runs his writ and his kit', () => {
    const def = scenarioById('postmaster-heart');
    expect(def).not.toBeNull();
    if (!def) return;
    const text = describeLog(runScenario(def).events).join('\n');
    expect(text).toContain('postmaster at F2 uses the clock writ');
    expect(text).toContain('a clock writ is served');
    expect(def.expected.length).toBeGreaterThan(0);
  });
});

describe('page banking at the heart', () => {
  test('the heart room fields the postmaster as a rival', () => {
    const b = startBattle(heartSave(1)).state;
    const u = b.units.find((x) => x.kind === 'enemy' && x.def === 'postmaster');
    expect(u?.kind === 'enemy' && u.rival?.rival).toBe('postmaster');
  });

  test('a won heart banks the page, once', () => {
    const seeds = [1000, 1001, 1002];
    let wins = 0;
    for (const seed of seeds) {
      const save = heartSave(seed);
      const fight = botFight(startBattle(save).state, 40);
      if (fight.state.phase !== 'won') continue;
      wins++;
      const end = endBattle(save, fight.state, fight.events);
      expect(end.outcome).toBe('won');
      expect(end.save.profile.pages).toEqual([PAGE]);
      // A repeat win adds nothing.
      const again = endBattle({ ...save, profile: end.save.profile }, fight.state, fight.events);
      expect(again.save.profile.pages).toEqual([PAGE]);
    }
    expect(wins).toBeGreaterThan(0);
  });

  test('a wiped heart keeps a held page and banks none', () => {
    const lost = (profile: SaveData['profile']) => {
      const save = { ...heartSave(7), profile };
      const b = structuredClone(startBattle(save).state);
      b.phase = 'lost';
      for (const u of b.units) if (u.kind === 'member') u.hp = 0;
      return endBattle(save, b, []);
    };
    const fresh = lost(inkProfile());
    expect(fresh.outcome).toBe('wiped');
    expect(fresh.save.profile.pages).toEqual([]);
    const held = lost({ ...inkProfile(), pages: [PAGE] });
    expect(held.outcome).toBe('wiped');
    expect(held.save.profile.pages).toEqual([PAGE]);
  });
});

describe('the Bench page trial isolates his trick', () => {
  const profile = { ...newProfile(), pages: [PAGE] };
  const run = (): GameEvent[] => {
    let state = pageTrialBattle(page, profile);
    const actions = pageTrialActions(state, { x: 2, y: 1 });
    expect(actions).not.toBeNull();
    const log: GameEvent[] = [];
    for (const a of actions ?? []) {
      const r = applyAction(state, a);
      state = r.state;
      log.push(...r.events);
    }
    return log;
  };

  test('no rival on the scene, no clock writ in the log', () => {
    const state = pageTrialBattle(page, profile);
    expect(state.units.some((u) => u.kind === 'enemy' && u.rival)).toBe(false);
    expect(state.units.some((u) => u.def === 'clockSeal')).toBe(false);
    const text = describeLog(run()).join('\n').toLowerCase();
    expect(text).not.toContain('clock writ');
    expect(text).not.toContain('seal');
  });

  test('the spell itself casts: Serve notice marks the target', () => {
    const log = run();
    expect(log.some((e) => e.type === 'cast')).toBe(true);
    expect(describeLog(log).join('\n')).toContain('is marked');
  });

  test('the profile is unchanged by a trial', () => {
    const before = structuredClone(profile);
    run();
    expect(profile).toEqual(before);
  });
});
