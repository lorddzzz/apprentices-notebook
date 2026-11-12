import { describe, expect, test } from 'vitest';
import {
  beginEncounter,
  closeBattle,
  emptyStats,
  newProfile,
  parseSaveData,
  returnHome,
  type SpellTally,
  startTrip,
  type Trip,
  type TripStats,
} from '$engine';
import { ledgerOf } from '$engine/drawing';
import { feedLedger } from '$engine/ledger';

const tally = (casts: number): SpellTally => ({
  member: 'draughtsman',
  spell: 'a',
  name: 'Bolt',
  casts,
  damage: 0,
  kills: 0,
  cells: [],
  fired: [],
});
const stats = (casts: number, reactions: number | null): TripStats => ({
  ...emptyStats(),
  spells: casts ? [tally(casts), tally(1)] : [],
  biggestChain:
    reactions === null ? null : { member: 'stoker', spell: 'a', name: 'Big', reactions },
});
const home = (t: Trip): Trip => ({ ...t, status: 'crossroads' });

describe('the lifetime ledger (EN-1)', () => {
  test('EN-1: counts grow on return and on wipe', () => {
    const p = newProfile();
    const t = { ...startTrip(p, 7), stats: stats(3, 4) };
    const back = returnHome(p, home(t));
    expect(ledgerOf(back).casts).toBe(4);
    expect(ledgerOf(back).biggest).toEqual({ chain: 4, caster: 'stoker', name: 'Big' });
    // a smaller chain does not replace it; a larger one does
    const again = returnHome(back, home({ ...t, stats: stats(2, 3) }));
    expect(ledgerOf(again).casts).toBe(7);
    expect(ledgerOf(again).biggest?.chain).toBe(4);
    const bigger = returnHome(again, home({ ...t, stats: stats(1, 9) }));
    expect(ledgerOf(bigger).biggest?.chain).toBe(9);

    const wt = { ...startTrip(p, 7), stats: stats(1, 2) };
    const b = beginEncounter(p, wt).state;
    const lost = {
      ...b,
      phase: 'lost' as const,
      units: b.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
    };
    const r = closeBattle(p, wt, lost, []);
    expect(r.outcome).toBe('wiped');
    expect(ledgerOf(r.profile).casts).toBe(2);
    expect(ledgerOf(r.profile).biggest?.chain).toBe(2);
  });

  test('EN-1: lab and bench never feed the ledger', () => {
    const p = newProfile();
    const t = startTrip(p, 7);
    const b = beginEncounter(p, t).state; // the battle itself, as Lab and Bench run it
    expect(b.phase).toBe('player');
    expect(p.ledger).toBeUndefined();
    // a won fight that goes on (not a wipe, not a return) leaves it alone
    const won = {
      ...b,
      phase: 'won' as const,
      units: b.units.map((u) => (u.kind === 'enemy' ? { ...u, hp: 0 } : u)),
    };
    const r = closeBattle(p, { ...t, stats: stats(5, 5) }, won, []);
    expect(r.outcome).not.toBe('wiped');
    expect(r.profile.ledger).toBeUndefined();
  });

  test('EN-1: city.open keeps opening order', () => {
    const p = newProfile();
    const open = [...p.city.open, 'canals' as const];
    const fed = feedLedger(
      { ...p, city: { ...p.city, open: [...open, 'canals'] } },
      stats(1, null),
    );
    expect(ledgerOf(fed).districts).toEqual(open);
  });

  test('EN-1: the ledger round-trips through save', () => {
    const p = returnHome(newProfile(), home({ ...startTrip(newProfile(), 7), stats: stats(2, 6) }));
    const save = { profile: p, trip: null, seedCounter: 1, lastTrip: null };
    const back = parseSaveData(JSON.parse(JSON.stringify(save)));
    expect(ledgerOf(back.profile)).toEqual(ledgerOf(p));
    expect(ledgerOf(back.profile).casts).toBe(3);
  });
});
