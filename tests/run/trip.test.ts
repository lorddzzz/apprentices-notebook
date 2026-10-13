import { describe, expect, test } from 'vitest';
import { ENCOUNTERS, MEMBER_IDS, type MemberId, TUNING } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  deriveSeed,
  describeLog,
  finishEncounter,
  type LootItem,
  latticeOf,
  legalMoves,
  memberById,
  newProfile,
  type Profile,
  pickLoot,
  pushOn,
  recordAction,
  returnHome,
  rollOffers,
  setMemberLattice,
  setSocket,
  startTrip,
  type Trip,
} from '$engine';

const SEED = 12345;

function fought(b: BattleState, phase: 'won' | 'lost'): BattleState {
  const s = structuredClone(b);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return s;
}

/** Wins the current encounter and ends at the looting screen. */
function win(p: Profile, t: Trip, tweak?: (b: BattleState) => void) {
  const b = fought(beginEncounter(p, t).state, 'won');
  tweak?.(b);
  const r = finishEncounter(p, t, b);
  if (!r.trip) throw new Error('expected a trip');
  return { profile: r.profile, trip: r.trip, outcome: r.outcome };
}

describe('start', () => {
  test('startTrip sets full hp and charges per spell key', () => {
    const t = startTrip(newProfile(), SEED);
    expect(t.status).toBe('fight');
    expect(t.encounter).toBe(0);
    expect(t.hp).toEqual({ draughtsman: 6, stoker: 8 });
    expect(t.charges).toEqual({ draughtsman: { '0,1': 3 }, stoker: { '1,0': 3 } });
    expect(t.loot).toEqual([]);
    expect(t.offers).toEqual([]);
  });

  test('startTrip refuses a bad loadout', () => {
    const p = newProfile();
    const l = setSocket(latticeOf(p, 'stoker'), { x: 1, y: 3 }, 'echo');
    expect(() => startTrip(setMemberLattice(p, 'stoker', l), SEED)).toThrow(/not ready/);
  });

  test('beginEncounter is deterministic per seed', () => {
    const p = newProfile();
    const a = beginEncounter(p, startTrip(p, SEED));
    const b = beginEncounter(p, startTrip(p, SEED));
    expect(b).toEqual(a);
    expect(describeLog(a.events)[0]).toBe('Encounter: Three rats');
    expect(a.state.rngState).toBe(deriveSeed(SEED, 0));
    const c = beginEncounter(p, startTrip(p, SEED + 1));
    expect(c.state.rngState).not.toBe(a.state.rngState);
    const members = a.state.units.filter((u) => u.kind === 'member');
    expect(members.map((m) => m.id)).toEqual(['draughtsman', 'stoker']);
  });

  test('beginEncounter does not change its inputs', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const before = structuredClone({ p, t });
    beginEncounter(p, t);
    expect({ p, t }).toEqual(before);
  });
});

describe('loot', () => {
  test('finishEncounter won → looting with 3 distinct offers, picks 1', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const r = win(p, t);
    expect(r.outcome).toBe('won');
    expect(r.trip.status).toBe('looting');
    expect(r.trip.offers).toHaveLength(TUNING.offersPerWin);
    expect(r.trip.picksLeft).toBe(1);
    expect(new Set(r.trip.offers.map((o) => JSON.stringify(o))).size).toBe(3);
    expect(r.trip.encounter).toBe(0);
    expect(t.status).toBe('fight'); // input untouched
  });

  test('offers deterministic per seed and differ by encounter', () => {
    const a = rollOffers(SEED, 0, 'shallow', MEMBER_IDS);
    expect(rollOffers(SEED, 0, 'shallow', MEMBER_IDS)).toEqual(a);
    const many = Array.from({ length: 20 }, (_, i) => rollOffers(SEED, i, 'shallow', MEMBER_IDS));
    expect(new Set(many.map((o) => JSON.stringify(o))).size).toBeGreaterThan(1);
    expect(rollOffers(SEED, 2, 'deep', MEMBER_IDS)).toHaveLength(3);
  });

  test('ink offer names a member and +2', () => {
    const seen = new Set<MemberId>();
    for (let seed = 0; seed < 300; seed++) {
      for (const o of rollOffers(seed, 0, 'shallow', MEMBER_IDS)) {
        if (o.kind !== 'ink') continue;
        expect(o.amount).toBe(2);
        seen.add(o.member);
      }
    }
    expect(seen.size).toBe(2);
  });

  test('every table offers three entries with positive amounts', () => {
    for (const table of ['shallow', 'deep', 'heart'] as const) {
      for (let seed = 0; seed < 50; seed++) {
        const offers = rollOffers(seed, 1, table, MEMBER_IDS);
        expect(offers).toHaveLength(3);
        for (const o of offers) if (o.kind !== 'rune') expect(o.amount).toBeGreaterThan(0);
      }
    }
  });

  test('pickLoot/pushOn/returnHome flow banks loot', () => {
    const p0 = newProfile();
    let t = startTrip(p0, SEED);
    let p = p0;
    const picked: LootItem[] = [];
    for (let i = 0; i < 3; i++) {
      const r = win(p, t);
      p = r.profile;
      expect(r.trip.encounter).toBe(i);
      picked.push(r.trip.offers[0] as LootItem);
      t = pickLoot(r.trip, 0);
      expect(t.status).toBe('crossroads');
      expect(t.offers).toEqual([]);
      expect(t.loot).toEqual(picked);
      t = pushOn(t);
      expect(t.status).toBe('fight');
      expect(t.encounter).toBe(i + 1);
    }
    expect(p.collection).toEqual(p0.collection); // nothing banked yet
    const home = returnHome(p, { ...t, status: 'crossroads' });
    const total = (q: Profile) => Object.values(q.collection).reduce((a, b) => a + b, 0);
    expect(total(home) - total(p0)).toBe(picked.filter((o) => o.kind === 'rune').length);
    const inkGain = Object.values(home.inkCapacity).reduce((a, b) => a + b, 0) - 16;
    expect(inkGain).toBe(picked.filter((o) => o.kind === 'ink').length * 2);
    const research = picked.reduce((a, o) => a + (o.kind === 'research' ? o.amount : 0), 0);
    expect(home.research).toBe(research);
    expect(p0).toEqual(newProfile());
  });

  test('returnHome banks each loot kind', () => {
    const p = newProfile();
    const t: Trip = {
      ...startTrip(p, SEED),
      status: 'crossroads',
      loot: [
        { kind: 'rune', rune: 'echo' },
        { kind: 'rune', rune: 'echo' },
        { kind: 'ink', member: 'stoker', amount: 2 },
        { kind: 'research', amount: 3 },
      ],
    };
    const home = returnHome(p, t);
    expect(home.collection.echo).toBe(2);
    expect(home.inkCapacity).toEqual({ draughtsman: 8, stoker: 10 });
    expect(home.research).toBe(3);
    expect(p.collection.echo).toBe(0);
  });

  test('heart gives 2 picks then cleared', () => {
    const p = newProfile();
    const heart = ENCOUNTERS.length - 1;
    const t0: Trip = { ...startTrip(p, SEED), encounter: heart };
    const r = win(p, t0);
    expect(r.trip.picksLeft).toBe(2);
    expect(r.trip.status).toBe('looting');
    const t1 = pickLoot(r.trip, 0);
    expect(t1.status).toBe('looting');
    expect(t1.picksLeft).toBe(1);
    expect(t1.offers).toHaveLength(2); // the same offers, minus the pick
    const t2 = pickLoot(t1, 1);
    expect(t2.status).toBe('cleared');
    expect(t2.offers).toEqual([]);
    expect(t2.loot).toHaveLength(2);
    expect(t2.loot[0]).not.toEqual(t2.loot[1]);
    expect(() => pushOn(t2)).toThrow();
    expect(() => returnHome(p, t2)).not.toThrow();
  });
});

describe('wipes, hp and charges', () => {
  test('wipe loses loot but keeps codex discoveries', () => {
    const p = newProfile();
    const t: Trip = { ...startTrip(p, SEED), loot: [{ kind: 'rune', rune: 'echo' }] };
    const b = fought(beginEncounter(p, t).state, 'lost');
    b.discovered = ['ignite', 'arc'];
    const r = finishEncounter(p, t, b);
    expect(r.outcome).toBe('wiped');
    expect(r.trip).toBeNull();
    expect(r.profile.interactions).toEqual(['ignite', 'arc']);
    expect(r.profile.collection.echo).toBe(0);
    expect(p.interactions).toEqual([]);
  });

  test('wins keep discoveries too, without duplicates', () => {
    const p = { ...newProfile(), interactions: ['arc' as const] };
    const r = win(p, startTrip(p, SEED), (b) => {
      b.discovered = ['ignite', 'arc'];
    });
    expect(r.profile.interactions).toEqual(['arc', 'ignite']);
  });

  test('downed member returns at 1 HP after a win', () => {
    const p = newProfile();
    const r = win(p, startTrip(p, SEED), (b) => {
      memberById(b, 'draughtsman').hp = 0;
      memberById(b, 'stoker').hp = 5;
    });
    expect(r.trip.hp).toEqual({ draughtsman: TUNING.reviveHp, stoker: 5 });
  });

  test('charges and hp carry into the next encounter', () => {
    const p = newProfile();
    const r = win(p, startTrip(p, SEED), (b) => {
      memberById(b, 'stoker').hp = 3;
      memberById(b, 'draughtsman').charges['0,1'] = 1;
    });
    const t = pushOn(pickLoot(r.trip, 0));
    expect(t.hp.stoker).toBe(3);
    expect(t.charges.draughtsman).toEqual({ '0,1': 1 });
    const next = beginEncounter(r.profile, t);
    expect(next.state.title).toBe(ENCOUNTERS[1]?.title);
    expect(memberById(next.state, 'stoker').hp).toBe(3);
    expect(memberById(next.state, 'stoker').maxHp).toBe(8);
    expect(memberById(next.state, 'draughtsman').charges).toEqual({ '0,1': 1 });
    expect(memberById(next.state, 'stoker').charges).toEqual({ '1,0': 3 });
  });

  test('finishEncounter refuses a battle still in progress', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    expect(() => finishEncounter(p, t, beginEncounter(p, t).state)).toThrow(/not over/);
  });
});

describe('illegal transitions', () => {
  const p = newProfile();
  const fight = startTrip(p, SEED);
  const looting = win(p, fight).trip;
  const crossroads = pickLoot(looting, 0);

  test('pushOn needs the crossroads', () => {
    expect(() => pushOn(fight)).toThrow();
    expect(() => pushOn(looting)).toThrow();
    expect(() => pushOn(crossroads)).not.toThrow();
  });

  test('returnHome during a fight or while looting throws', () => {
    expect(() => returnHome(p, fight)).toThrow();
    expect(() => returnHome(p, looting)).toThrow();
    expect(() => returnHome(p, crossroads)).not.toThrow();
  });

  test('pickLoot needs offers on the table', () => {
    expect(() => pickLoot(fight, 0)).toThrow();
    expect(() => pickLoot(looting, 7)).toThrow(/No offer/);
    expect(() => pickLoot(crossroads, 0)).toThrow();
  });

  test('beginEncounter and finishEncounter need a fight', () => {
    expect(() => beginEncounter(p, looting)).toThrow();
    const b = fought(beginEncounter(p, fight).state, 'won');
    expect(() => finishEncounter(p, crossroads, b)).toThrow();
  });
});

describe('resume', () => {
  test('beginEncounter replays the recorded actions (a reload resumes the fight)', () => {
    const p = newProfile();
    let t = startTrip(p, SEED);
    const fresh = beginEncounter(p, t);
    const to = legalMoves(fresh.state, 'stoker')[0];
    if (!to) throw new Error('expected a legal move');
    const actions: Action[] = [{ type: 'move', unit: 'stoker', to }, { type: 'endTurn' }];
    let live = fresh;
    const events = [...fresh.events];
    for (const a of actions) {
      live = applyAction(live.state, a);
      events.push(...live.events);
      t = recordAction(t, a);
    }
    const resumed = beginEncounter(p, t);
    expect(resumed.state).toEqual(live.state);
    expect(resumed.events).toEqual(events);
    expect(resumed.state.round).toBe(2);
  });

  test('an illegal recorded action throws, and a won fight clears the record', () => {
    const p = newProfile();
    const t = recordAction(startTrip(p, SEED), {
      type: 'move',
      unit: 'stoker',
      to: { x: 99, y: 0 },
    });
    expect(() => beginEncounter(p, t)).toThrow(/Illegal action/);
    const ok = recordAction(startTrip(p, SEED), { type: 'endTurn' });
    expect(win(p, ok).trip.actions).toEqual([]);
    expect(() => recordAction(win(p, ok).trip, { type: 'endTurn' })).toThrow(/looting/);
  });
});
