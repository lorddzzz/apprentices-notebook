import { describe, expect, test } from 'vitest';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  newProfile,
  type Profile,
  pickLoot,
  pushOn,
  startTrip,
} from '$engine';
import { crackedTiles } from '$engine/districts/api';
import { KIT } from '$engine/districts/kit';
import { LOWER_SEAM } from '$engine/districts/lowerSeam';
import { board } from '../scenarios/harness';

/** KIT-R1: the hooks core files call instead of naming a district. */

describe('KIT-R1', () => {
  test("KIT-R1: crackedTiles unions every module's unsupported tiles", () => {
    const s = board('{span} {span} {span}');
    const own = KIT.modules.bridges?.unsupported?.(s) ?? [];
    expect(own).toHaveLength(3);
    expect(crackedTiles(s)).toEqual(own);
    // A second module's tiles join the union after the first's, without duplicates.
    const seam = KIT.modules.seam;
    if (!seam) throw new Error('no seam module');
    const extra = { x: 0, y: 2 };
    seam.unsupported = () => [extra, own[0] as (typeof own)[number]];
    try {
      const all = crackedTiles(s);
      expect(all).toHaveLength(4);
      expect(all[0]).toEqual(extra); // the seam is first in registry order
      expect(all).toContainEqual(extra);
    } finally {
      delete seam.unsupported;
    }
    expect(crackedTiles(s)).toEqual(own);
  });

  test('KIT-R1: afterBattleClose marks the door seen on a Seam win only', () => {
    const p0 = newProfile();
    const TWO: Profile = {
      ...p0,
      city: {
        ...p0.city,
        heard: ['seam', 'canals', 'inkQuarter'],
        open: ['seam', 'canals', 'inkQuarter'],
        hearts: ['seam'],
      },
    };
    const won = (b: BattleState): BattleState => {
      const s = structuredClone(b);
      s.phase = 'won';
      for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
      return s;
    };
    // A plain Seam trip's win leaves the door alone.
    const seam = startTrip(TWO, 1, 'seam');
    const plain = closeBattle(TWO, seam, won(beginEncounter(TWO, seam).state));
    expect(plain.profile.city.doorSeen).toBeUndefined();
    // A floor above the lowest does too; the lowest lower-Seam floor sets it.
    let t = startTrip(TWO, 1, LOWER_SEAM);
    const first = closeBattle(TWO, t, won(beginEncounter(TWO, t).state));
    expect(first.profile.city.doorSeen).toBeUndefined();
    t = first.trip ?? (null as never);
    while (t.status === 'looting') t = pickLoot(t, 0);
    t = pushOn(t);
    const last = closeBattle(first.profile, t, won(beginEncounter(first.profile, t).state));
    expect(last.profile.city.doorSeen).toBe(true);
  });
});
