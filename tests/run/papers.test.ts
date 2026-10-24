import { describe, expect, test, vi } from 'vitest';
import type { KitRoomDef, PaperDef } from '$data/districts/index';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  startTrip,
  type Trip,
} from '$engine';
import { findPaper, paperIn, papersView } from '$engine/papers';

/** One fixture paper in the Seam's second room (no shipped lore yet). */
const LEDGER: PaperDef = {
  id: 'seam:fixture-ledger',
  district: 'seam',
  title: 'A lamp-ledger',
  hand: 'a Lamplighter',
  text: 'Fixture text.',
  group: 'Lamp-ledgers',
  found: { kind: 'room', room: 1 },
};
const LETTER: PaperDef = {
  ...LEDGER,
  id: 'seam:fixture-letter',
  title: 'A letter',
  group: 'Dead letters',
  found: { kind: 'room', room: 2 },
};

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      seam: {
        ...m.DISTRICT_KIT.seam,
        rooms: [{}, { lore: 'seam:fixture-ledger' }] as KitRoomDef[],
        papers: [
          {
            id: 'seam:fixture-ledger',
            district: 'seam',
            title: 'A lamp-ledger',
            hand: 'a Lamplighter',
            text: 'Fixture text.',
            group: 'Lamp-ledgers',
            found: { kind: 'room', room: 1 },
          },
        ],
      },
    },
  };
});

function fought(b: BattleState, phase: 'won' | 'lost'): BattleState {
  const s = structuredClone(b);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return s;
}

/** Wins the current room, takes the first offers; the profile carries what the fight filed. */
function clear(p: Profile, t: Trip): { profile: Profile; trip: Trip } {
  const r = finishEncounter(p, t, fought(beginEncounter(p, t).state, 'won'));
  let trip = r.trip;
  if (!trip) throw new Error('expected a trip');
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return { profile: r.profile, trip };
}

const roundTrip = (p: Profile): Profile =>
  parseSaveData(JSON.parse(JSON.stringify({ ...newSave(1), profile: p }))).profile;

describe('papers (lore registry, DK §9)', () => {
  test('a fresh notebook has none; a room without lore files nothing', () => {
    const p = newProfile();
    expect(p.papers).toEqual([]);
    expect(paperIn('seam', 0)).toBeNull();
    expect(findPaper(p, 'seam', 0)).toBe(p);
  });

  test('winning the room files its paper at once; a later wipe keeps it', () => {
    const p0 = newProfile();
    const room0 = clear(p0, startTrip(p0, 5));
    expect(room0.profile.papers).toEqual([]);
    const room1 = clear(room0.profile, pushOn(room0.trip));
    expect(room1.profile.papers).toEqual(['seam:fixture-ledger']);
    // Wiped in the next room: the paper was never trip loot, so nothing takes it away.
    const next = pushOn(room1.trip);
    const wiped = finishEncounter(
      room1.profile,
      next,
      fought(beginEncounter(room1.profile, next).state, 'lost'),
    );
    expect(wiped.outcome).toBe('wiped');
    expect(wiped.profile.papers).toEqual(['seam:fixture-ledger']);
    // Found again on a later trip: kept once.
    expect(findPaper(wiped.profile, 'seam', 1).papers).toEqual(['seam:fixture-ledger']);
  });

  test('papersView groups in found order', () => {
    const kit = {
      seam: { rooms: [{ lore: LETTER.id }, { lore: LEDGER.id }], papers: [LEDGER, LETTER] },
    };
    let p = findPaper(newProfile(), 'seam', 1, kit);
    p = findPaper(p, 'seam', 0, kit);
    expect(p.papers).toEqual([LEDGER.id, LETTER.id]);
    expect(papersView(p, kit)).toEqual([
      { group: 'Lamp-ledgers', papers: [LEDGER] },
      { group: 'Dead letters', papers: [LETTER] },
    ]);
    // An id no district defines any more is skipped, not an error.
    expect(papersView({ papers: ['seam:cut', LEDGER.id] }, kit)).toEqual([
      { group: 'Lamp-ledgers', papers: [LEDGER] },
    ]);
    expect(papersView(p)).toEqual([{ group: 'Lamp-ledgers', papers: [LEDGER] }]);
  });

  test('saves: papers round-trip; old saves load with none; a bad id is a bad save', () => {
    const p = findPaper(newProfile(), 'seam', 1);
    expect(roundTrip(p).papers).toEqual(['seam:fixture-ledger']);
    expect(roundTrip(p)).toEqual(p);
    const { papers: _, ...old } = newProfile();
    expect(roundTrip(old as Profile).papers).toEqual([]);
    for (const papers of [['nowhere:x'], ['seam:'], [3], 'seam:x']) {
      expect(() => roundTrip({ ...p, papers } as unknown as Profile)).toThrow('Not a valid save');
    }
  });
});
