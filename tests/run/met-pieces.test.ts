import { describe, expect, test } from 'vitest';
import { newProfile, newSave, parseSaveData } from '$engine';
import { createBattle } from '$engine/battle';
import { learnFromFight, metIn } from '$engine/trip/finish';
import { sceneItems } from '../../src/app/bench';

const fight = (board: string) => createBattle({ title: 't', board, seed: 1, intents: {} }).state;
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('a fight records vents, lamps and district pieces as met', () => {
  test.each([
    ['@ . .\n. D .\n. . .', 'vent', '@'],
    ['l . .\n. D .\n. . .', 'lamp', 'l'],
    ['{moor} . .\n. D .\n. . .', 'moor', '{moor}'],
  ])('%j records %s and the Bench then offers it', (ascii, key, item) => {
    const b = fight(ascii);
    expect(metIn(b, []).met).toContain(key);
    const learned = learnFromFight(newProfile(), b, []);
    expect(learned.met).toContain(key);
    expect(sceneItems(newProfile())).not.toContain(item);
    expect(sceneItems(learned)).toContain(item);
  });

  test('a board with none of them records none', () => {
    const met = metIn(fight('. . .\n. D .\n. . .'), []).met;
    for (const k of ['vent', 'lamp', 'moor']) expect(met).not.toContain(k);
  });

  test('old saves parse, and the new keys round-trip', () => {
    const save = newSave(1);
    const old = parseSaveData(json({ ...save, profile: { ...save.profile, met: ['slick'] } }));
    expect(old.profile.met).toEqual(['slick']);
    const met = ['slick', 'vent', 'lamp', 'moor'];
    const next = parseSaveData(json({ ...save, profile: { ...save.profile, met } }));
    expect(next.profile.met).toEqual(met);
  });
});
