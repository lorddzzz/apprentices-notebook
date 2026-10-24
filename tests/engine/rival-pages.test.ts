import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import {
  type BattleState,
  beginEncounter,
  type EnemyUnit,
  finishEncounter,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  startTrip,
  type Trip,
} from '$engine';
import { bankPages, holdsPage, pagesHeld, rivalNoteVisible } from '$engine/rivals/pages';
import { awardsPage } from '$engine/standIn';
import { board } from '../scenarios/harness';

/** Recovered pages (rivals §3, RV-15): banked on the win, kept on a wipe, once, never from a stand-in. */

const PAGE = 'lamplighter:lantern' as const;

const canalsProfile = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] } };
};

/** The room's battle with the Lamplighter on it, as the engine would have spawned him (RV-1). */
function withRival(b: BattleState): BattleState {
  const l = board('L . . . .').units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
  if (!l) throw new Error('no rival');
  const s = structuredClone(b);
  s.units.push({ ...structuredClone(l), id: 'lamp-test', pos: { x: 4, y: 3 } });
  return s;
}

/** The fight over: foes down for a win, the party down for a loss. */
function over(b: BattleState, phase: 'won' | 'lost'): BattleState {
  const s = structuredClone(b);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return s;
}

const fightAt = (p: Profile, t: Trip, rival: boolean) => {
  const b = beginEncounter(p, t).state;
  return rival ? withRival(b) : b;
};

const roundTrip = (p: Profile): Profile =>
  parseSaveData(JSON.parse(JSON.stringify({ ...newSave(1), profile: p }))).profile;

describe('banking a rival page', () => {
  test('beating the Lamplighter in the canals banks his page, once', () => {
    const p = canalsProfile();
    const t = startTrip(p, 7, 'canals');
    const won = finishEncounter(p, t, over(fightAt(p, t, true), 'won'));
    expect(won.outcome).toBe('won');
    expect(pagesHeld(won.profile)).toEqual([PAGE]);
    expect(holdsPage(won.profile, PAGE)).toBe(true);
    // A repeat win adds nothing, and the ordinary loot offers are untouched (no key offer used).
    const again = finishEncounter(won.profile, t, over(fightAt(won.profile, t, true), 'won'));
    expect(pagesHeld(again.profile)).toEqual([PAGE]);
    expect(again.trip?.offers).toEqual(won.trip?.offers);
    expect(won.trip?.loot).toEqual([]);
    const plain = finishEncounter(p, t, over(fightAt(p, t, false), 'won'));
    expect(won.trip?.picksLeft).toBe(plain.trip?.picksLeft);
    expect(won.trip?.offers).toEqual(plain.trip?.offers);
  });

  test('a win without a rival banks nothing; a loss against him banks nothing', () => {
    const p = canalsProfile();
    const t = startTrip(p, 7, 'canals');
    expect(pagesHeld(finishEncounter(p, t, over(fightAt(p, t, false), 'won')).profile)).toEqual([]);
    const lost = finishEncounter(p, t, over(fightAt(p, t, true), 'lost'));
    expect(lost.outcome).toBe('wiped');
    expect(pagesHeld(lost.profile)).toEqual([]);
  });

  test('a page held is kept when a later fight is a wipe', () => {
    const p = canalsProfile();
    const t = startTrip(p, 7, 'canals');
    const won = finishEncounter(p, t, over(fightAt(p, t, true), 'won'));
    const wiped = finishEncounter(won.profile, t, over(fightAt(won.profile, t, false), 'lost'));
    expect(wiped.outcome).toBe('wiped');
    expect(pagesHeld(wiped.profile)).toEqual([PAGE]);
  });

  test('a rival met away from his home district gives no page', () => {
    const p = newProfile();
    const t = startTrip(p, 7);
    expect(t.district).toBe('seam');
    expect(pagesHeld(finishEncounter(p, t, over(fightAt(p, t, true), 'won')).profile)).toEqual([]);
  });

  test('a downed rival counts, a living one does not', () => {
    const p = canalsProfile();
    const b = fightAt(p, startTrip(p, 7, 'canals'), true);
    expect(bankPages(p, b, 'canals', awardsPage)).toBe(p);
    const down = structuredClone(b);
    for (const u of down.units) if (u.kind === 'enemy') u.hp = 0;
    expect(pagesHeld(bankPages(p, down, 'canals', awardsPage))).toEqual([PAGE]);
  });
});

describe('stand-ins award no page', () => {
  const original = ENEMIES.dummy;
  beforeEach(() => {
    ENEMIES.dummy = { ...original, script: { steps: [], standIn: true } };
  });
  afterEach(() => {
    ENEMIES.dummy = original;
  });

  test('a stand-in carrying the rival state banks nothing', () => {
    const p = canalsProfile();
    const b = fightAt(p, startTrip(p, 7, 'canals'), true);
    for (const u of b.units)
      if (u.kind === 'enemy') {
        u.def = 'dummy';
        u.hp = 0;
      }
    expect(bankPages(p, b, 'canals', awardsPage)).toBe(p);
  });
});

describe('saves and the Desk hook', () => {
  test('pages round-trip; old saves load with none; a bad id is a bad save', () => {
    const p: Profile = { ...newProfile(), pages: [PAGE] };
    expect(roundTrip(p).pages).toEqual([PAGE]);
    expect(roundTrip(p)).toEqual(p);
    expect(newProfile().pages).toEqual([]);
    const { pages: _, ...old } = newProfile();
    expect(roundTrip(old as Profile).pages).toEqual([]);
    for (const pages of [['nobody:x'], ['lamplighter:'], [3], 'lamplighter:x']) {
      expect(() => roundTrip({ ...p, pages } as unknown as Profile)).toThrow('Not a valid save');
    }
  });

  test('the rival note shows once the page is held', () => {
    const variant = 'lamplighter:wick';
    expect(rivalNoteVisible(newProfile(), variant)).toBe(false);
    const p = canalsProfile();
    const t = startTrip(p, 7, 'canals');
    const won = finishEncounter(p, t, over(fightAt(p, t, true), 'won'));
    expect(rivalNoteVisible(won.profile, variant)).toBe(true);
  });
});
