import { describe, expect, test } from 'vitest';
import { ROOM_PENCIL } from '$data/districts/cartographers/rooms';
import { newProfile, newSave, type SaveData } from '$engine';
import { GUILD_HAND_RULE_ID, type GuildHandState } from '$engine/districts/cartographers/types';
import { setOutAt } from '../../../src/app/crossroads';
import { startBattle } from '../../../src/app/flow';

/** CG-8b (P4): each room's battle lists the guild's hand with that room's `ROOM_PENCIL` config. */

describe('CG-8b room pencil', () => {
  test("CG-8b: each room's battle starts with its ROOM_PENCIL config", () => {
    const p = newProfile();
    const profile = {
      ...p,
      city: {
        ...p.city,
        heard: [...p.city.heard, 'cartographers' as const],
        open: [...p.city.open, 'cartographers' as const],
      },
    };
    for (let room = 0; room < 6; room++) {
      const save: SaveData = setOutAt({ ...newSave(3), profile }, 'cartographers', 'start');
      if (!save.trip) throw new Error('expected a trip');
      const at: SaveData = { ...save, trip: { ...save.trip, encounter: room } };
      const hand = startBattle(at).state.rules?.[GUILD_HAND_RULE_ID] as GuildHandState | undefined;
      const want = ROOM_PENCIL[room];
      expect(hand, `room ${room + 1}`).toBeDefined();
      expect(hand).toMatchObject({ ...want, planned: expect.any(Number) });
    }
  });
});
