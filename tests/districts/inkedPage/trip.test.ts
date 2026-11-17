import { describe, expect, it, vi } from 'vitest';
import type { DistrictId, Drawing } from '$data';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  type Profile,
  pickLoot,
  pushOn,
  returnHome,
  startTrip,
  type Trip,
} from '$engine';
import { inkRoom, parseInkedState, storeDrawing } from '$engine/drawing';
import { FIXTURE_DRAWINGS, fullHousehold } from '../../drawing/fixtures';

/** Acceptance for the `inkedPage` module (EN-3; P1, P15, P16, P31). */

const INKED: DistrictId = 'inkedPage';

/**
 * A finished household past the handover (every rule and foe met, so each fixture drawing fits its
 * pen) with the fixture drawings on its three pages and the page open.
 */
function household(drawings: readonly (Drawing | null)[] = FIXTURE_DRAWINGS): Profile {
  const p = fullHousehold();
  return {
    ...p,
    drawings: [drawings[0] ?? null, drawings[1] ?? null, drawings[2] ?? null],
    city: { ...p.city, open: [...new Set([...p.city.open, INKED])] },
  };
}

const won = (b: BattleState): BattleState => {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
};
const lost = (b: BattleState): BattleState => {
  const s = structuredClone(b);
  s.phase = 'lost';
  for (const u of s.units) if (u.kind === 'member') u.hp = 0;
  return s;
};
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Sets out from `slot`, inks and fights the current room's opening. */
const setOut = (p: Profile, slot: 0 | 1 | 2, seed = 5): Trip =>
  inkRoom(p, startTrip(p, seed, INKED, { page: slot }));

describe('EN-3: the inkedPage module', () => {
  it('EN-3: trips of length 3 and 6 start, reload, return and wipe', () => {
    const p = household([FIXTURE_DRAWINGS[0] as Drawing, null, FIXTURE_DRAWINGS[2] as Drawing]);
    for (const [slot, length] of [
      [0, 3],
      [2, 6],
    ] as const) {
      let t = setOut(p, slot);
      expect(parseInkedState(t.kit?.state).drawing.length).toBe(length);
      // A reload parses the same trip and plays the same room.
      const again = json(t);
      expect(beginEncounter(p, again).state.units).toEqual(beginEncounter(p, t).state.units);
      // Win the first room and go home; a wipe in another trip ends it empty-handed.
      const r = closeBattle(p, t, won(beginEncounter(p, t).state));
      t = r.trip ?? (null as never);
      while (t.status === 'looting') t = pickLoot(t, 0);
      expect(() => returnHome(p, t)).not.toThrow();
      const wiped = closeBattle(p, setOut(p, slot), lost(beginEncounter(p, setOut(p, slot)).state));
      expect(wiped.trip?.status ?? 'wiped').toBe('wiped');
    }
  });

  it('EN-3: reload replays stored layouts without running the bot', async () => {
    const trial = await import('$engine/drawing/trial');
    const p = household();
    const t = setOut(p, 0);
    const spy = vi.spyOn(trial, 'botTrial');
    const reloaded = json(t);
    expect(inkRoom(p, reloaded)).toBe(reloaded);
    beginEncounter(p, reloaded);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('EN-3: a redraw during a trip changes nothing', () => {
    const p = household();
    const t = setOut(p, 0);
    const before = parseInkedState(t.kit?.state);
    // The page is locked while the trip is out (P1); another page is not.
    expect(() => storeDrawing(p, 0, null, t)).toThrow();
    expect(() => storeDrawing(p, 1, null, t)).not.toThrow();
    expect(parseInkedState(t.kit?.state)).toEqual(before);
    expect(roomOf(t)).toBe(roomOf(inkRoom(p, t)));
  });

  it('EN-3: no hearing, heart, page or recruit is given', () => {
    const p = household();
    const t = setOut(p, 0);
    const r = closeBattle(p, t, won(beginEncounter(p, t).state));
    expect(r.profile.city.hearts).toEqual(p.city.hearts);
    expect(r.profile.city.heard).toEqual(p.city.heard);
    expect(r.profile.recruits).toEqual(p.recruits);
    expect(r.profile.known).toEqual(p.known);
  });

  it('EN-3: a drawn trip leaves city.hearts, city.heard and recruits as they were', () => {
    const p = household();
    let t = setOut(p, 1);
    for (let room = 0; room < 4; room++) {
      t = inkRoom(p, t);
      const r = closeBattle(p, t, won(beginEncounter(p, t).state));
      expect(r.profile.city.hearts).toEqual(p.city.hearts);
      expect(r.profile.city.heard).toEqual(p.city.heard);
      expect(r.profile.recruits).toEqual(p.recruits);
      t = r.trip ?? t;
      while (t.status === 'looting') t = pickLoot(t, 0);
      if (t.status === 'crossroads') t = pushOn(t);
    }
    expect(t.status).toBe('cleared');
    const home = returnHome(p, t);
    expect(home.city.hearts).toEqual(p.city.hearts);
    expect(home.city.heard).toEqual(p.city.heard);
    expect(home.city.open).toEqual(p.city.open);
    expect(home.city.checkpoints).toEqual(p.city.checkpoints);
    expect(home.recruits).toEqual(p.recruits);
  });

  it('EN-3: beginEncounter on a room that is not inked throws', () => {
    const p = household();
    const t = startTrip(p, 5, INKED, { page: 0 });
    expect(parseInkedState(t.kit?.state).rooms).toEqual([null, null, null]);
    expect(() => beginEncounter(p, t)).toThrow('Room 0 is not inked');
  });
});

/** The stored layout of the trip's current room. */
const roomOf = (t: Trip): string | null => parseInkedState(t.kit?.state).rooms[t.encounter] ?? null;
