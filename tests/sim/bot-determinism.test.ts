import { expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { botFight, botTrial } from '$engine/sim';

const room = () => {
  const p = newProfile();
  const e = ENCOUNTERS[0];
  const v = e?.variants[0];
  if (!e || !v) throw new Error('no encounter');
  return createBattle({
    title: e.title,
    board: v.layout,
    seed: 7,
    lineup: FOUNDERS,
    party: Object.fromEntries(FOUNDERS.map((id) => [id, { spells: compiledFor(p, id).spells }])),
  }).state;
};

test('EN-0: same state and budget give the same actions', () => {
  const a = botTrial(room(), 6000);
  const b = botTrial(room(), 6000);
  expect(a.actions).toEqual(b.actions);
  expect(a.ops).toBe(b.ops);
  expect(a.ops).toBeLessThanOrEqual(6000);
});

test('EN-0: a spent budget stops the bot and the room is not won', () => {
  const r = botTrial(room(), 3);
  expect(r.actions).toHaveLength(3);
  expect(r.exhausted).toBe(true);
  expect(r.won).toBe(false);
});

test('EN-0: a budget never reached gives the unbudgeted run', () => {
  const a = botFight(room());
  const b = botFight(room(), 40, undefined, { budget: 1e9 });
  expect(a.actions).toEqual(b.actions);
  expect(a.exhausted).toBe(false);
});
