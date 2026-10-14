import { expect, test } from 'vitest';
import { ENCOUNTERS, MEMBERS } from '$data';
import {
  type BattleState,
  type GameEvent,
  memberById,
  newSave,
  placeOf,
  type SaveData,
  type Trip,
  type UnitRef,
} from '$engine';
import {
  endBattle,
  goHome,
  newDiscoveries,
  pushOnward,
  resolveScreen,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';
import { loadSave, memoryBackend, saveText, writeSave } from '../../src/app/save';

const fresh = (): SaveData => newSave(7);
const out = (): SaveData => setOut(fresh());

/** The party wins at once: every enemy down, phase won. */
const won = (s: BattleState): BattleState => ({
  ...s,
  phase: 'won',
  units: s.units.map((u) => (u.kind === 'enemy' ? { ...u, hp: 0 } : u)),
});
const lost = (s: BattleState): BattleState => ({
  ...s,
  phase: 'lost',
  units: s.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
});

/** Plays encounter `save.trip.encounter` to a win and takes the first offer(s). Ends on crossroads or cleared. */
function clearEncounter(save: SaveData): SaveData {
  let s = endBattle(save, won(startBattle(save).state)).save;
  while (s.trip?.status === 'looting') s = takeOffer(s, 0);
  return s;
}

test('setOut writes a fight trip with full HP and charges, and advances the seed counter', () => {
  const s0 = fresh();
  const s1 = setOut(s0);
  expect(s1.trip).toMatchObject({ status: 'fight', encounter: 0, loot: [], offers: [] });
  expect(s1.trip?.hp).toEqual({ draughtsman: MEMBERS.draughtsman.hp, stoker: MEMBERS.stoker.hp });
  expect(s1.seedCounter).toBe(s0.seedCounter + 1);
  expect(s0.trip).toBeNull(); // pure
  // it survives the save text
  const b = memoryBackend();
  writeSave(b, s1);
  expect(loadSave(b, 0).save).toEqual(s1);
  expect(b.read()).toBe(saveText(s1));
});

test('setOut refuses a second trip and an unready loadout', () => {
  expect(() => setOut(out())).toThrow(/already out/);
  const s = fresh();
  // the lattice uses a Bolt the collection no longer has
  const profile = { ...s.profile, collection: { ...s.profile.collection, bolt: 0 } };
  expect(() => setOut({ ...s, profile })).toThrow(/not ready/);
});

test('startBattle is deterministic for a save: a reload restarts the same fight', () => {
  const save = out();
  const a = startBattle(save);
  const b = startBattle(JSON.parse(JSON.stringify(save)) as SaveData);
  expect(b.state).toEqual(a.state);
  expect(b.events).toEqual(a.events);
  expect(a.state.title).toBe(placeOf(save.trip as Trip));
  expect(a.state.round).toBe(1);
});

test('startBattle needs a trip in the fight status', () => {
  expect(() => startBattle(fresh())).toThrow(/not out/);
  const looting = endBattle(out(), won(startBattle(out()).state)).save;
  expect(() => startBattle(looting)).toThrow(/looting/);
});

test('endBattle won: looting with offers, HP and charges carried, learned = only new interactions', () => {
  const save = out();
  const battle = startBattle(save).state;
  const hurt: BattleState = {
    ...won(battle),
    discovered: ['ignite', 'arc'],
    units: won(battle).units.map((u) =>
      u.kind === 'member' && u.def === 'stoker' ? { ...u, hp: 2 } : u,
    ),
  };
  const known = { ...save, profile: { ...save.profile, interactions: ['ignite' as const] } };
  const end = endBattle(known, hurt);
  expect(end.outcome).toBe('won');
  expect(end.wipe).toBeNull();
  expect(end.learned).toEqual(['arc']);
  expect(end.save.profile.interactions).toEqual(['ignite', 'arc']);
  expect(end.save.trip?.status).toBe('looting');
  expect(end.save.trip?.offers).toHaveLength(3);
  expect(end.save.trip?.picksLeft).toBe(1);
  expect(end.save.trip?.hp.stoker).toBe(2);
  expect(end.save.trip?.hp.draughtsman).toBe(memberById(hurt, 'draughtsman').hp);
});

test('endBattle lost: the trip ends, the WipeSummary lists the lost loot and keeps discoveries', () => {
  const afterOne = clearEncounter(out()); // crossroads with one pending find
  const next = pushOnward(afterOne);
  const battle = startBattle(next).state;
  const end = endBattle(next, { ...lost(battle), discovered: ['conduct'] });
  expect(end.outcome).toBe('wiped');
  expect(end.save.trip).toBeNull();
  expect(end.wipe).toEqual({
    encounter: placeOf(next.trip as Trip),
    lost: afterOne.trip?.loot,
    learned: ['conduct'],
  });
  expect(end.wipe?.lost).toHaveLength(1);
  // knowledge is not loot; the collection is untouched
  expect(end.save.profile.interactions).toEqual(['conduct']);
  expect(end.save.profile.collection).toEqual(fresh().profile.collection);
  expect(end.save.profile.inkCapacity).toEqual(fresh().profile.inkCapacity);
});

test('takeOffer → crossroads; the heart takes two picks, then the trip is cleared', () => {
  let s = out();
  const looting = endBattle(s, won(startBattle(s).state)).save;
  const crossroads = takeOffer(looting, 1);
  expect(crossroads.trip?.status).toBe('crossroads');
  expect(crossroads.trip?.loot).toEqual([looting.trip?.offers[1]]);
  expect(crossroads.trip?.offers).toEqual([]);

  s = out();
  for (let i = 0; i < ENCOUNTERS.length - 1; i++) {
    s = pushOnward(clearEncounter(s));
    expect(s.trip?.encounter).toBe(i + 1);
  }
  const heart = endBattle(s, won(startBattle(s).state)).save;
  expect(heart.trip?.picksLeft).toBe(2);
  const mid = takeOffer(heart, 0);
  expect(mid.trip?.status).toBe('looting');
  expect(mid.trip?.picksLeft).toBe(1);
  const done = takeOffer(mid, 0);
  expect(done.trip?.status).toBe('cleared');
  expect(done.trip?.loot).toHaveLength(ENCOUNTERS.length - 1 + 2);
  expect(() => pushOnward(done)).toThrow();
});

test('goHome banks the loot into the collection and clears the trip', () => {
  const s = clearEncounter(out());
  const item = s.trip?.loot[0];
  expect(item).toBeDefined();
  const home = goHome(s);
  expect(home.trip).toBeNull();
  const before = fresh().profile;
  if (item?.kind === 'rune') {
    expect(home.profile.collection[item.rune]).toBe(before.collection[item.rune] + 1);
  } else if (item?.kind === 'ink') {
    expect(home.profile.inkCapacity[item.member]).toBe(
      before.inkCapacity[item.member] + item.amount,
    );
  } else if (item?.kind === 'solvent') {
    expect(home.profile.solvents[item.solvent]).toBe(before.solvents[item.solvent] + 1);
  } else {
    expect(home.profile.vellum).toBe(before.vellum + (item?.kind === 'vellum' ? item.amount : 0));
  }
  // a new trip can start again, with the next seed
  expect(setOut(home).trip?.seed).not.toBe(s.trip?.seed);
});

test('goHome and takeOffer need the right trip status', () => {
  expect(() => goHome(out())).toThrow();
  expect(() => takeOffer(out(), 0)).toThrow();
  expect(() => pushOnward(out())).toThrow();
  expect(() => goHome(fresh())).toThrow(/not out/);
});

const ref: UnitRef = { id: 'u', name: 'x', at: { x: 0, y: 0 }, member: true };
const ev = (...types: ('ignite' | 'arc' | 'conduct')[]): GameEvent[] =>
  types.map(
    (t): GameEvent =>
      t === 'ignite'
        ? { type: 'ignite', at: ref.at, tiles: [ref.at] }
        : t === 'arc'
          ? { type: 'arc', from: ref.at, tiles: [ref.at] }
          : { type: 'conduct', from: ref.at, tiles: [ref.at] },
  );

test('newDiscoveries dedups against the notebook and what was already toasted', () => {
  const events = ev('ignite', 'ignite', 'arc', 'conduct');
  expect(newDiscoveries(events, [], [])).toEqual(['ignite', 'arc', 'conduct']);
  expect(newDiscoveries(events, ['ignite'], [])).toEqual(['arc', 'conduct']);
  expect(newDiscoveries(events, ['ignite'], ['arc'])).toEqual(['conduct']);
  expect(newDiscoveries(events, ['ignite', 'arc', 'conduct'], [])).toEqual([]);
  expect(newDiscoveries([], [], [])).toEqual([]);
});

test('resolveScreen follows each trip status through a whole trip', () => {
  let s = out();
  expect(resolveScreen('trip', s.trip, null).screen).toBe('battle');
  s = endBattle(s, won(startBattle(s).state)).save;
  expect(resolveScreen('trip', s.trip, null).screen).toBe('loot');
  s = takeOffer(s, 0);
  expect(resolveScreen('trip', s.trip, null).screen).toBe('crossroads');
  expect(resolveScreen('study', s.trip, null)).toEqual({ screen: 'crossroads', redirect: 'trip' });
  s = pushOnward(s);
  const end = endBattle(s, lost(startBattle(s).state));
  expect(resolveScreen('trip', end.save.trip, end.wipe).screen).toBe('wiped');
  expect(resolveScreen('trip', goHome(clearEncounter(out())).trip, null).screen).toBe('study');
});
