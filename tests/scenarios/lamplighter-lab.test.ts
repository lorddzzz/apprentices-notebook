import { describe, expect, test } from 'vitest';
import type { ScenarioDef } from '$data';
import { applyAction, type BattleState, type EnemyUnit, scenarioBattle } from '$engine';
import { LAB_SCENARIOS, labLocation, resolveScenario } from '../../src/app/lab';
import { botFight } from '../sim/bot';

/**
 * RV-9: the Lamplighter's two Lab prototypes. Each opens from `#/lab?scenario=<id>`, and each plays
 * to a win (the greedy bot) and to a loss (the party holds still until the round cap runs out).
 */

const IDS = ['lamplighter-alone', 'lamplighter-canal'] as const;

const scenario = (id: string): ScenarioDef => {
  const { def, unknown } = resolveScenario(id);
  if (unknown !== null || def.id !== id) throw new Error(`no scenario ${id}`);
  return def;
};

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

const partyAlive = (s: BattleState): number =>
  s.units.filter((u) => u.kind === 'member' && u.hp > 0).length;

describe('the Lamplighter Lab scenarios', () => {
  test.each(IDS)('%s opens from the Lab route and creates a battle', (id) => {
    const { scenario: picked } = labLocation(new URLSearchParams(`scenario=${id}`));
    expect(picked).toBe(id);
    expect(LAB_SCENARIOS.some((s) => s.id === id)).toBe(true);
    const def = scenario(id);
    const s = scenarioBattle(def, { lab: true });
    expect(s.phase).toBe('player');
    expect(rivalOf(s).def).toBe('lamplighter');
    expect(partyAlive(s)).toBeGreaterThan(0);
  });

  test.each(IDS)('%s is won when the party plays on and the Lamplighter falls', (id) => {
    const s = scenarioBattle(scenario(id), { lab: true });
    const r = botFight(s, 40);
    expect(r.state.phase).toBe('won');
    expect(rivalOf(r.state).hp).toBe(0);
  });

  test.each(IDS)('%s is lost when the party holds still', (id) => {
    let s = scenarioBattle(scenario(id), { lab: true });
    for (let n = 0; n < 40 && s.phase === 'player'; n++)
      s = applyAction(s, { type: 'endTurn' }).state;
    expect(s.phase).toBe('lost');
    expect(partyAlive(s)).toBe(0);
  });
});
