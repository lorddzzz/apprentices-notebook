import { expect, test } from 'vitest';
import { INTERACTION_IDS } from '$data';
import { type Action, applyAction } from '$engine';
import { previewOf } from '../../src/app/battleInput';
import { labBattle, scenario } from './battleFixtures';

test('S1 second cast preview: dummy −8 total (3+3+2)', () => {
  const def = scenario('ink-spark-detonation');
  const [first, second] = def.demo as [Action, Action];
  const s = applyAction(labBattle(def.id), first).state;
  const p = previewOf(s, second, INTERACTION_IDS);
  expect(p.damage['dummy-1']).toBe(8);
  expect(p.kills).toEqual([]);
  expect(p.summary).toBe('Bolt up: dummy D1 −8, ink detonates');
});

test('S2 preview lists both rat kills', () => {
  const def = scenario('oil-chain');
  const p = previewOf(labBattle(def.id), def.demo[0] as Action, INTERACTION_IDS);
  expect(p.kills).toEqual(['rat-1', 'rat-2']);
  expect(p.summary).toBe('Bolt right: rat C2 −2 dies, rat E2 −2 dies, oil ignites');
  expect(p.targets).toHaveLength(1);
});

test('preview never changes the session state', () => {
  const def = scenario('oil-chain');
  const s = labBattle(def.id);
  const snapshot = structuredClone(s);
  previewOf(s, def.demo[0] as Action, INTERACTION_IDS);
  expect(s).toEqual(snapshot);
});

test('summary hides unknown interaction names', () => {
  const def = scenario('oil-chain');
  const p = previewOf(labBattle(def.id), def.demo[0] as Action, []);
  expect(p.summary).not.toMatch(/ignite/);
  expect(p.summary).toMatch(/\?\?\?/);
});
