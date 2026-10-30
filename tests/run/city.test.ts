import { describe, expect, test } from 'vitest';
import { DISTRICTS, type DistrictData, type DistrictId } from '$data';
import {
  type BattleState,
  bankKeys,
  beginEncounter,
  canReturn,
  cityDefaults,
  closeBattle,
  districtState,
  type EventLog,
  hearAfterTrip,
  hearFromBattle,
  keyOffer,
  newProfile,
  nextLanding,
  objectiveMet,
  openAll,
  type Profile,
  placeOf,
  returnHome,
  seeMap,
  solveThreshold,
  startTrip,
  type Trip,
} from '$engine';

/** One fire burst covering `n` tiles (the canals are heard from a 3-tile one in the Seam). */
const ignite = (n: number): EventLog => [
  {
    type: 'burst',
    burst: 'fire',
    at: { x: 0, y: 0 },
    tiles: Array.from({ length: n }, (_, i) => ({ x: i, y: 0 })),
    units: [],
  },
];

const withCanals = (p: Profile): Profile => ({
  ...p,
  city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
});

/** The real city, but only the canals hear by the given conditions (the drawn districts hear nothing). */
const fixture = (canals: Partial<DistrictData>): Record<DistrictId, DistrictData> => ({
  ...(Object.fromEntries(
    Object.entries(DISTRICTS).map(([id, d]) => [
      id,
      d.gate.kind === 'drawing' ? { ...d, hear: [] } : d,
    ]),
  ) as Record<DistrictId, DistrictData>),
  canals: { ...DISTRICTS.canals, ...canals },
});

const holds = (p: Profile) => {
  const c = p.city;
  for (const id of c.hearts) expect(c.open).toContain(id);
  for (const id of c.open) expect(c.heard).toContain(id);
};

describe('hearing from a battle (K-20)', () => {
  test('one fire of 3 tiles in the Seam hears the canals and marks them fresh', () => {
    const p = newProfile();
    const r = hearFromBattle(p, startTrip(p, 1), ignite(3));
    expect(r.heard).toEqual(['canals']);
    expect(r.profile.city.heard).toEqual(['seam', 'canals']);
    expect(r.profile.city.fresh).toEqual(['canals']);
    expect(districtState(r.profile, 'canals')).toBe('heard'); // threshold gate: not open yet
    holds(r.profile);
  });

  test('2 tiles do not, and several small fires do not add up', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    expect(hearFromBattle(p, t, ignite(2)).heard).toEqual([]);
    expect(hearFromBattle(p, t, [...ignite(2), ...ignite(2)]).profile).toBe(p);
  });

  test('a fire in a canal battle does not hear anything', () => {
    const p = withCanals(newProfile());
    const t = startTrip(p, 1, 'canals');
    expect(hearFromBattle(p, t, ignite(5)).heard).toEqual([]);
    // even where the canals are not yet heard: the condition names the Seam
    const unheard = newProfile();
    expect(hearFromBattle(unheard, t, ignite(5)).heard).toEqual([]);
  });

  test('hearing never happens twice', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    const once = hearFromBattle(p, t, ignite(4)).profile;
    const again = hearFromBattle(once, t, ignite(4));
    expect(again.heard).toEqual([]);
    expect(again.profile.city.heard).toEqual(['seam', 'canals']);
  });

  test('closeBattle keeps the hearing on a wipe', () => {
    const p = newProfile();
    const t = startTrip(p, 11);
    const b = structuredClone(beginEncounter(p, t).state) as BattleState;
    b.phase = 'lost';
    const r = closeBattle(p, t, b, ignite(3));
    expect(r.outcome).toBe('wiped');
    expect(r.profile.city.heard).toContain('canals');
    expect(r.stats.heard).toEqual(['canals']);
    expect(r.profile.city.trips).toBe(1); // the wipe counts the trip
  });

  test('closeBattle on a win hears too, with no trip counted yet', () => {
    const p = newProfile();
    const t = startTrip(p, 11);
    const b = structuredClone(beginEncounter(p, t).state) as BattleState;
    b.phase = 'won';
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    const r = closeBattle(p, t, b, ignite(3));
    expect(r.stats.heard).toEqual(['canals']);
    expect(r.profile.city.trips).toBe(0);
  });

  test('a discovery gate opens on hearing', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    const table = fixture({ gate: { kind: 'discovery' } });
    const r = hearFromBattle(p, t, ignite(3), table);
    expect(districtState(r.profile, 'canals')).toBe('open');
    holds(r.profile);
  });

  test('a named condition reads the named results (D7)', () => {
    const table = fixture({
      hear: [{ kind: 'named', id: 'burst:storm', voice: 'owner' }],
    });
    const p = newProfile();
    const t = startTrip(p, 1);
    expect(hearFromBattle(p, t, [], table).heard).toEqual([]);
    const learnt = { ...p, named: [...p.named, 'burst:storm'] };
    expect(hearFromBattle(learnt, t, [], table).heard).toEqual(['canals']);
  });
});

describe('rumours and trips (K-20)', () => {
  const rumours = fixture({
    hear: [
      { kind: 'heart', district: 'seam', voice: 'rumour' },
      { kind: 'trips', atLeast: 3, voice: 'rumour' },
    ],
  });

  test('every finished trip is counted, wiped or returned', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    const a = hearAfterTrip(p, t, 'wiped');
    const b = hearAfterTrip(a.profile, t, 'returned');
    expect(b.profile.city.trips).toBe(2);
    expect(b.profile.city.hearts).toEqual([]);
  });

  test('a cleared heart is marked on return, not on a wipe', () => {
    const p = newProfile();
    const t: Trip = { ...startTrip(p, 1), status: 'cleared' };
    expect(hearAfterTrip(p, t, 'wiped').profile.city.hearts).toEqual([]);
    const r = hearAfterTrip(p, t, 'returned');
    expect(r.profile.city.hearts).toEqual(['seam']);
    holds(r.profile);
  });

  test('the heart rumour is heard when the heart is cleared', () => {
    const p = newProfile();
    const t: Trip = { ...startTrip(p, 1), status: 'cleared' };
    const r = hearAfterTrip(p, t, 'returned', rumours);
    expect(r.heard).toEqual(['canals']);
    expect(r.profile.city.fresh).toEqual(['canals']);
    expect(hearAfterTrip(p, { ...t, status: 'crossroads' }, 'returned', rumours).heard).toEqual([]);
  });

  test('the trips rumour is heard on the third trip', () => {
    let p = newProfile();
    const t = startTrip(p, 1);
    const heard: DistrictId[][] = [];
    for (let i = 0; i < 3; i++) {
      const r = hearAfterTrip(p, t, i === 1 ? 'wiped' : 'returned', rumours);
      p = r.profile;
      heard.push(r.heard);
    }
    expect(heard).toEqual([[], [], ['canals', 'inkQuarter']]);
    expect(p.city.trips).toBe(3);
  });

  test('owner conditions are not rumours and rumours are not owner conditions', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    expect(hearFromBattle(p, t, ignite(9), rumours).heard).toEqual([]);
    expect(hearAfterTrip(p, t, 'returned').heard).toEqual([]); // the canals' own is an owner condition
  });

  test('returnHome counts the trip and marks the heart', () => {
    const p = newProfile();
    const t: Trip = { ...startTrip(p, 1), status: 'cleared' };
    const home = returnHome(p, t);
    expect(home.city.trips).toBe(1);
    expect(home.city.hearts).toEqual(['seam']);
  });
});

describe('landings (K-4)', () => {
  const canalTrip = (encounter: number, status: Trip['status'] = 'crossroads'): Trip => ({
    ...startTrip(withCanals(newProfile()), 3, 'canals'),
    encounter,
    status,
  });

  test('the Seam may return anywhere and has no next landing', () => {
    const t: Trip = { ...startTrip(newProfile(), 3), encounter: 1, status: 'crossroads' };
    expect(canReturn(t)).toBe(true);
    expect(nextLanding(t)).toBeNull();
  });

  test('the canals land after rooms 1, 3 and the heart', () => {
    expect([0, 1, 2, 3, 4].map((i) => canReturn(canalTrip(i)))).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(canReturn(canalTrip(4, 'cleared'))).toBe(true);
  });

  test('nextLanding names the next landing room, or null at one', () => {
    const t1 = canalTrip(1);
    expect(nextLanding(t1)).toBe(placeOf(t1, 2));
    const t3 = canalTrip(3);
    expect(nextLanding(t3)).toBe(placeOf(t3, 4));
    expect(nextLanding(canalTrip(0))).toBeNull();
    expect(nextLanding(canalTrip(2))).toBeNull();
  });

  test('returnHome throws away from a landing', () => {
    const p = withCanals(newProfile());
    expect(() => returnHome(p, canalTrip(1))).toThrow();
    expect(() => returnHome(p, canalTrip(2))).not.toThrow();
  });
});

describe('keys (K-23)', () => {
  const keyed = fixture({ gate: { kind: 'key', from: 'seam', table: 'deep', weight: 2 } });
  const heard: Profile = (() => {
    const p = newProfile();
    return { ...p, city: { ...p.city, heard: ['seam', 'canals'] } };
  })();
  const trip = (p: Profile): Trip => startTrip(p, 5);

  test('offered in the named table only while heard and closed', () => {
    expect(keyOffer(heard, trip(heard), 'deep', keyed)).toEqual({ district: 'canals', weight: 2 });
    expect(keyOffer(heard, trip(heard), 'shallow', keyed)).toBeNull();
    const unheard = newProfile();
    expect(keyOffer(unheard, trip(unheard), 'deep', keyed)).toBeNull();
    const open = withCanals(newProfile());
    expect(keyOffer(open, trip(open), 'deep', keyed)).toBeNull();
  });

  test("only from the gate's own district", () => {
    const fromCanals = fixture({ gate: { kind: 'key', from: 'canals', table: 'deep', weight: 2 } });
    expect(keyOffer(heard, trip(heard), 'deep', fromCanals)).toBeNull();
  });

  test('at most one per trip: in the loot or in the offers', () => {
    const t = trip(heard);
    const inLoot: Trip = { ...t, loot: [{ kind: 'key', district: 'canals' }] };
    const inOffers: Trip = { ...t, offers: [{ kind: 'key', district: 'canals' }] };
    expect(keyOffer(heard, inLoot, 'deep', keyed)).toBeNull();
    expect(keyOffer(heard, inOffers, 'deep', keyed)).toBeNull();
  });

  test('a wipe loses the key; a return opens the district; then never again', () => {
    const t: Trip = {
      ...trip(heard),
      status: 'crossroads',
      loot: [{ kind: 'key', district: 'canals' }],
    };
    const wiped = hearAfterTrip(heard, t, 'wiped').profile;
    expect(districtState(wiped, 'canals')).toBe('heard');
    const home = returnHome(heard, t);
    expect(districtState(home, 'canals')).toBe('open');
    holds(home);
    expect(keyOffer(home, trip(home), 'deep', keyed)).toBeNull();
  });

  test('bankKeys is a no-op without keys and never reopens', () => {
    expect(bankKeys(heard, [{ kind: 'vellum', amount: 1 }])).toBe(heard);
    const open = bankKeys(heard, [{ kind: 'key', district: 'canals' }]);
    expect(bankKeys(open, [{ kind: 'key', district: 'canals' }])).toBe(open);
  });
});

describe('thresholds, the map and the dev toggle', () => {
  const heardCanals = () => {
    const p = newProfile();
    return hearFromBattle(p, startTrip(p, 1), ignite(3)).profile;
  };

  test('solveThreshold opens and records the district, once', () => {
    const s = solveThreshold(heardCanals(), 'canals');
    expect(s.city.solved).toEqual(['canals']);
    expect(districtState(s, 'canals')).toBe('open');
    expect(solveThreshold(s, 'canals').city).toEqual(s.city);
    holds(s);
  });

  test('objectiveMet reads gateBurns off the log', () => {
    const state = { objective: { happens: 'gateBurns' } } as BattleState;
    const burns = [{ type: 'gateBurns', at: [1, 1] }] as unknown as EventLog;
    expect(objectiveMet(state, [])).toBe(false);
    expect(objectiveMet(state, burns)).toBe(true);
    expect(objectiveMet({ objective: undefined } as BattleState, burns)).toBe(false);
  });

  test('seeMap clears fresh and keeps the rest', () => {
    const p = heardCanals();
    const seen = seeMap(p);
    expect(seen.city.fresh).toEqual([]);
    expect(seen.city.heard).toEqual(p.city.heard);
    expect(seeMap(seen)).toBe(seen);
  });

  test('openAll hears every district and opens the ones with rooms; defaults are Seam-only', () => {
    expect(cityDefaults().open).toEqual(['seam']);
    const all = openAll(newProfile());
    expect(all.city.heard).toHaveLength(7);
    expect(all.city.open).toEqual(['seam', 'canals', 'inkQuarter']);
    expect(openAll(all).city).toEqual(all.city);
  });
});
