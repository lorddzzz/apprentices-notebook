import { describe, expect, test } from 'vitest';
import { newProfile, newSave, type Profile, type SaveData, startTrip } from '$engine';
import { ROAD_REFUSAL } from '../../src/app/desk';
import { DeskStore } from '../../src/app/desk.svelte';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend, saveText } from '../../src/app/save';
import { toasts } from '../../src/app/toasts.svelte';

/** The desk store writes through the game, at home only (plan FN P10). */

const profile = (): Profile => {
  const base = newProfile();
  return {
    ...base,
    known: [...new Set([...base.known, 'shove' as const])],
    witnessed: ['shove:wall'],
    footnotes: { shove: { points: 8, slots: {} } },
    solvents: { ...base.solvents, gallnut: 2 },
  };
};

const storeFor = (save: SaveData): { game: GameStore; desk: DeskStore } => {
  const game = new GameStore(memoryBackend(saveText(save)), () => 1);
  return { game, desk: new DeskStore(game) };
};

describe('the desk store', () => {
  test('at home a write lands in the save and spends the solvent', () => {
    const { game, desk } = storeFor({ ...newSave(1), profile: profile() });
    expect(desk.atHome).toBe(true);
    desk.write('shove', 'shove-wall-soft');
    expect(game.save.profile.footnotes.shove?.slots['shove:wall@1']).toBe('shove-wall-soft');
    expect(game.save.profile.solvents.gallnut).toBe(1);
  });

  test('with a trip open the write is refused, with a toast, and nothing is spent', () => {
    const p = profile();
    const trip = { ...startTrip(p, 1), status: 'doorway' as const };
    const { game, desk } = storeFor({ ...newSave(1), profile: p, trip });
    expect(desk.atHome).toBe(false);
    desk.write('shove', 'shove-wall-soft');
    expect(game.save.profile.footnotes.shove?.slots).toEqual({});
    expect(game.save.profile.solvents.gallnut).toBe(2);
    expect(toasts.items.some((t) => t.text === ROAD_REFUSAL)).toBe(true);
  });
});
