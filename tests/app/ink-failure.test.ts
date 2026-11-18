import { expect, test, vi } from 'vitest';
import { newSave, type Profile, type SaveData } from '$engine';
import { setOut } from '../../src/app/flow';
import { GameStore } from '../../src/app/game.svelte';
import { needsRoom, type RoomInker, syncInker } from '../../src/app/generation';
import { memoryBackend, saveText } from '../../src/app/save';
import { FIXTURE_DRAWINGS, fullHousehold } from '../drawing/fixtures';

/** R5: a failed inking is not final: the fight offers "Try again" and "Home". */

function household(): Profile {
  const p = fullHousehold();
  return {
    ...p,
    drawings: [
      FIXTURE_DRAWINGS[0] ?? null,
      FIXTURE_DRAWINGS[1] ?? null,
      FIXTURE_DRAWINGS[2] ?? null,
    ],
    city: { ...p.city, open: [...new Set([...p.city.open, 'inkedPage' as const])] },
  };
}

const drawn = (): SaveData =>
  setOut({ ...newSave(9), profile: household() }, 'inkedPage', { page: 0 });

/** The fixture household is not a loadable save text, so the store starts new and takes the drawn save. */
function storeWith(inker: RoomInker): GameStore {
  const game = new GameStore(memoryBackend(saveText(newSave(1))), () => 1, inker);
  game.save = drawn();
  return game;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

test('R5: a rejected inking can be tried again and the room arrives', async () => {
  let calls = 0;
  const inker: RoomInker = {
    ink: vi.fn((profile, trip, room) =>
      ++calls === 1 ? Promise.reject(new Error('worker died')) : syncInker.ink(profile, trip, room),
    ),
  };
  const game = storeWith(inker);

  game.ensureBattle();
  expect(game.inking).toBe(true);
  expect(game.inkFailed).toBe(false);
  await settle();
  expect(game.inkFailed).toBe(true);
  expect(game.inking).toBe(true);

  game.retryInking();
  expect(game.inkFailed).toBe(false);
  await settle();
  expect(inker.ink).toHaveBeenCalledTimes(2);
  expect(game.inkFailed).toBe(false);
  expect(needsRoom(game.save, 0)).toBe(false);
  game.ensureBattle();
  expect(game.battle).not.toBeNull();
});

test('R5: Home after a failed inking closes the trip', async () => {
  const inker: RoomInker = { ink: () => Promise.reject(new Error('worker died')) };
  const game = storeWith(inker);
  game.ensureBattle();
  await settle();
  expect(game.inkFailed).toBe(true);

  game.leaveInking();
  expect(game.save.trip).toBeNull();
  expect(game.inkFailed).toBe(false);
});
