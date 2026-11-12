import { describe, expect, test } from 'vitest';
import type { MemberId, RuneId } from '$data';
import {
  FOUNDRY_HEART,
  FOUNDRY_INK,
  FOUNDRY_LEDGERS,
  FOUNDRY_LOOT_TABLES,
  FOUNDRY_RECRUIT_KIT,
  FOUNDRY_ROOMS_12,
  FOUNDRY_ROOMS_34,
  foundryShallow,
} from '$data/districts/foundry';
import type { KitRoomDef } from '$data/districts/index';
import {
  type BattleState,
  type Dir,
  newProfile,
  type Profile,
  parseBoard,
  startTrip,
  type Trip,
} from '$engine';
import { HEART_HOOKS, pealOffersFor, pealRoomSetup } from '$engine/districts/foundry';
import { newTune, tuneOf } from '$engine/districts/foundry/tune';
import { type FoundryTripState, TUNE_RULE_ID } from '$engine/districts/foundry/types';
import type { ShapeInput } from '$engine/districts/types';
import { joinHousehold } from '$engine/household';
import { guaranteesFor, isReady, preconditionsOf, recruitOffers } from '$engine/recruits';
import { checkRoom } from '$engine/rooms';
import { setUpRoom } from '$engine/trip/setup';
import type { DistrictShape } from '$engine/trip/shape';
import { ev } from '../districts/foundry/helpers';
import { act, cast, type Step, withLattices } from '../scenarios/harness';

/**
 * BF-10 and BF-11 (foundry-plan P6, P12, P22, P23): rooms 1 to 4, three layouts each. Every great
 * bell has a scripted solve: apprentices start on a `P`, walk, and cast with the starting runes
 * plus Brass, all inside one player turn (nothing in these solves needs a round).
 */

type At = readonly [number, number];
interface Shot {
  who: MemberId;
  /** Where the member walks first (absent: it casts from its start point). */
  to?: At;
  aim: Dir;
  lattice?: string;
}
interface Script {
  /** The start points the members take, by member. */
  starts: Partial<Record<MemberId, At>>;
  shots: readonly Shot[];
}

const TOKEN: Partial<Record<MemberId, string>> = { draughtsman: 'D', stoker: 'S', runaway: 'R' };
const BOLT = 'Bolt> Strike';

/** The room's layout with the named members standing on their start points and every other `P` bare. */
function fielded(layout: string, starts: Script['starts']): string {
  const spots = new Map(
    Object.entries(starts).map(([m, at]) => [`${(at as At)[0]},${(at as At)[1]}`, m as MemberId]),
  );
  const rows = layout.split('\n').map((row, y) =>
    row
      .split(/\s+/)
      .map((cell, x) => {
        const m = spots.get(`${x},${y}`);
        if (m) {
          if (cell !== 'P') throw new Error(`(${x},${y}) is not a start point: ${cell}`);
          return TOKEN[m];
        }
        return cell === 'P' ? '.' : cell;
      })
      .join(' '),
  );
  return rows.join('\n');
}

/** Plays a script and returns the final state with the whole log. */
function play(
  layout: string,
  script: Script,
  opts: { hp?: Record<string, number> } = {},
): { state: BattleState; events: Step['events'] } {
  const lattices: Partial<Record<MemberId, string>> = {};
  for (const m of Object.keys(script.starts) as MemberId[]) lattices[m] = BOLT;
  for (const shot of script.shots) if (shot.lattice) lattices[shot.who] = shot.lattice;
  let state = withLattices(fielded(layout, script.starts), lattices, opts);
  const events: Step['events'] = [];
  for (const shot of script.shots) {
    if (shot.to) {
      const r = applyMove(state, shot.who, shot.to);
      state = r.state;
      events.push(...r.events);
    }
    const r = cast(state, shot.who, shot.aim);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const applyMove = (state: BattleState, who: MemberId, to: At) =>
  act(state, { type: 'move', unit: who, to: { x: to[0], y: to[1] } });

const [one, two] = FOUNDRY_ROOMS_12;
const [three, four] = FOUNDRY_ROOMS_34;
if (!one || !two || !three || !four) throw new Error('missing room');

const defs = (layout: string): string =>
  parseBoard(layout)
    .units.map((u) => u.def)
    .sort()
    .join(',');
const tonesOf = (layout: string): string[] =>
  [...new Set([...layout.matchAll(/(?:bell|rope):(low|mid|high)/g)].map((m) => m[1] ?? ''))].sort();

function expectRoom(room: KitRoomDef, size: [number, number], foes: string, tones: number): void {
  expect(room.variants).toHaveLength(3);
  expect(new Set(room.variants.map((v) => v.name)).size).toBe(3);
  expect(room.layout).toBe(room.variants[0]?.layout);
  expect(room.heart).toBe(false);
  expect(room.bonus?.goal).toEqual({ piece: 'foundry:greatBell', state: 'rung' });
  for (const v of room.variants) {
    expect(checkRoom(v.layout), v.name).toEqual([]);
    const spec = parseBoard(v.layout);
    expect([spec.width, spec.height], v.name).toEqual(size);
    expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
    expect(defs(v.layout), v.name).toBe(foes);
    expect(tonesOf(v.layout), v.name).toHaveLength(tones);
    expect(v.layout, v.name).toMatch(/\{bell:/);
    expect(v.layout.match(/\{greatBell:/g), v.name).toHaveLength(1);
  }
}

const rung = (events: Step['events']) => ev(events, 'foundry:bellRung');

describe('foundry rooms 1 and 2 (BF-10)', () => {
  test('BF-10: rooms 1 and 2 pass checkRoom', () => {
    expectRoom(one, [5, 7], 'clapper,ringer', 2);
    expectRoom(two, [6, 7], 'clapper,ringer,ringer', 2);
    expect(one.depth).toBe(1);
    expect(two.depth).toBe(2);
    expect(one.bonus?.reward).toEqual({ kind: 'state', tag: 'peal' });
    for (const v of one.variants) expect(v.layout).toContain('{greatBell:1}');
    for (const v of two.variants) expect(v.layout).toContain('{greatBell:2}');
  });

  test('BF-10: lock 1 reach has a scripted solve', () => {
    const solves: Script[] = [
      { starts: { draughtsman: [0, 6] }, shots: [{ who: 'draughtsman', to: [0, 3], aim: 'up' }] },
      { starts: { draughtsman: [4, 6] }, shots: [{ who: 'draughtsman', to: [4, 3], aim: 'up' }] },
      { starts: { draughtsman: [2, 6] }, shots: [{ who: 'draughtsman', to: [2, 3], aim: 'up' }] },
    ];
    one.variants.forEach((v, i) => {
      const r = play(v.layout, solves[i] as Script);
      expect(rung(r.events), v.name).toHaveLength(1);
      expect(ev(r.events, 'foundry:bellRung')[0]?.data).toMatchObject({ note: 1, lock: 'reach' });
    });
  });

  test('BF-10: lock 2 match has a scripted solve', () => {
    const brass = 'Bolt> Brass Strike';
    const solves: Script[] = [
      {
        starts: { draughtsman: [1, 5] },
        shots: [{ who: 'draughtsman', to: [1, 4], aim: 'up', lattice: brass }],
      },
      {
        starts: { draughtsman: [3, 6] },
        shots: [{ who: 'draughtsman', to: [4, 5], aim: 'up', lattice: brass }],
      },
      {
        starts: { draughtsman: [2, 6] },
        shots: [{ who: 'draughtsman', to: [2, 4], aim: 'up', lattice: brass }],
      },
    ];
    two.variants.forEach((v, i) => {
      const r = play(v.layout, solves[i] as Script);
      expect(rung(r.events), v.name).toHaveLength(1);
      expect(rung(r.events)[0]?.data).toMatchObject({ note: 2, lock: 'match', hang: 'mid' });
      // Control: without the retune the same strike rings low and the great bell stays silent.
      const plain = play(v.layout, {
        ...(solves[i] as Script),
        shots: (solves[i] as Script).shots.map((s) => ({ ...s, lattice: BOLT })),
      });
      expect(rung(plain.events), `${v.name} without Brass`).toHaveLength(0);
    });
  });
});

/** One firing line in a Unison room: the start point, where to walk (if anywhere) and the aim. */
interface Line {
  start: At;
  to?: At;
  aim: Dir;
}
const shotOf = (who: MemberId, line: Line): Shot => ({
  who,
  aim: line.aim,
  ...(line.to ? { to: line.to } : {}),
});

describe('foundry rooms 3 and 4 (BF-11)', () => {
  test('BF-11: rooms 3 and 4 pass checkRoom', () => {
    expectRoom(three, [5, 9], 'clapper,detuner,ringer', 3);
    expectRoom(four, [6, 8], 'clapper,detuner,detuner,ringer', 3);
    expect(three.depth).toBe(3);
    expect(four.depth).toBe(4);
    for (const v of three.variants) expect(v.layout).toContain('{greatBell:3}');
    for (const v of four.variants) expect(v.layout).toContain('{greatBell:4}');
    expect(three.bonus?.text).toMatch(/Casts and Spark count; a Shove does not/); // P23
    for (const room of [three, four])
      for (const v of room.variants) expect(v.layout.match(/Q/g), v.name).toHaveLength(1); // P22: a lone low Clapper
  });

  test('BF-11: lock 3 unison has a scripted solve with 1, 2 and 3 apprentices', () => {
    const lines: Line[][] = [
      [
        { start: [2, 7], to: [2, 6], aim: 'up' },
        { start: [0, 6], to: [0, 3], aim: 'right' },
        { start: [4, 6], to: [4, 3], aim: 'left' },
      ],
      [
        { start: [3, 7], aim: 'up' },
        { start: [0, 6], to: [0, 4], aim: 'right' },
        { start: [4, 6], to: [4, 4], aim: 'left' },
      ],
      [
        { start: [1, 7], aim: 'up' },
        { start: [4, 7], to: [4, 4], aim: 'left' },
        { start: [0, 6], to: [0, 4], aim: 'right' },
      ],
    ];
    const party: MemberId[] = ['draughtsman', 'stoker', 'runaway'];
    three.variants.forEach((v, i) => {
      const mine = lines[i] as Line[];
      for (const size of [1, 2, 3]) {
        const who = party.slice(0, size);
        const script: Script = {
          starts: Object.fromEntries(who.map((m, n) => [m, (mine[n] as Line).start])),
          shots: who.map((m, n) => shotOf(m, mine[n] as Line)),
        };
        const r = play(v.layout, script);
        expect(rung(r.events), `${v.name}, ${size} apprentices`).toHaveLength(1);
        expect(rung(r.events)[0]?.data).toMatchObject({ note: 3, lock: 'unison', hang: 'high' });
      }
      // Control: with two apprentices fielded, one strike alone is struck but not rung.
      const first = mine[0] as Line;
      const lone = play(v.layout, {
        starts: { draughtsman: first.start, stoker: (mine[1] as Line).start },
        shots: [shotOf('draughtsman', first)],
      });
      expect(ev(lone.events, 'foundry:bellStruck'), `${v.name} one striker`).toHaveLength(1);
      expect(rung(lone.events), `${v.name} one striker`).toHaveLength(0);
    });
  });

  const chord: Script[] = [
    { starts: { draughtsman: [4, 7] }, shots: [{ who: 'draughtsman', to: [4, 5], aim: 'up' }] },
    { starts: { draughtsman: [1, 6] }, shots: [{ who: 'draughtsman', to: [1, 3], aim: 'up' }] },
    { starts: { draughtsman: [1, 7] }, shots: [{ who: 'draughtsman', to: [1, 6], aim: 'right' }] },
  ];

  test('BF-11: lock 4 chord has a scripted solve', () => {
    four.variants.forEach((v, i) => {
      const r = play(v.layout, chord[i] as Script);
      expect(rung(r.events), v.name).toHaveLength(1);
      expect(rung(r.events)[0]?.data).toMatchObject({ note: 4, lock: 'chord', hang: 'low' });
    });
  });

  test('BF-11: killing the Clapper breaks the chord', () => {
    const v = four.variants[0];
    if (!v) throw new Error('no layout');
    // Striking the Clapper while it stands rings low with it in the net: two bells and it make a chord.
    const hit: Script = {
      starts: { draughtsman: [4, 7] },
      shots: [{ who: 'draughtsman', to: [3, 6], aim: 'up' }],
    };
    const standing = play(v.layout, hit);
    expect(rung(standing.events)).toHaveLength(1);
    expect(standing.state.units.find((u) => u.id === 'clapper-1')?.hp).toBeGreaterThan(0);
    // The same blow on a Clapper it kills leaves two bells: the ring has no third voice.
    const dead = play(v.layout, hit, { hp: { D4: 1 } }); // D4 is the Clapper's tile
    expect(dead.state.units.find((u) => u.id === 'clapper-1')?.hp).toBeLessThanOrEqual(0);
    expect(rung(dead.events)).toHaveLength(0);
  });
});

describe('the heart (BF-12)', () => {
  const trip = { ...startTrip(newProfile(), 11), district: 'foundry' as const };
  const kit = { state: null, choices: [], checkpoint: false, bonuses: [] };
  const notes = (n: number) => Array.from({ length: n }, (_, i) => ({ room: i, note: i + 1 }));
  const setupFor = (n: number, t = trip) =>
    pealRoomSetup({
      trip: t,
      kit,
      room: 4,
      length: 5,
      state: { rung: notes(n) },
    } as ShapeInput<FoundryTripState>);
  const shape: DistrictShape = { ret: { kind: 'any' }, length: 5, rules: [TUNE_RULE_ID] };

  test('BF-12: every heart layout passes checkRoom with its tones, hooks and staff', () => {
    expect(FOUNDRY_HEART.heart).toBe(true);
    expect(FOUNDRY_HEART.variants).toHaveLength(3);
    FOUNDRY_HEART.variants?.forEach((v, i) => {
      expect(checkRoom(v.layout), v.name).toEqual([]);
      const spec = parseBoard(v.layout);
      expect([spec.width, spec.height], v.name).toEqual([7, 9]);
      expect(tonesOf(v.layout), v.name).toHaveLength(3);
      expect(v.layout.match(/\{hook\}/g), v.name).toHaveLength(4);
      expect(HEART_HOOKS[i], v.name).toHaveLength(4);
      expect(defs(v.layout), v.name).toContain('carillonneur');
      expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
      // Safe tiles: no start point beside a bell.
      const bells = spec.tiles.flatMap((t, k) =>
        t.piece?.id === 'foundry:bell'
          ? [{ x: k % spec.width, y: Math.floor(k / spec.width) }]
          : [],
      );
      expect(bells.length, v.name).toBeGreaterThan(0);
      for (const s of spec.starts)
        for (const b of bells)
          expect(Math.abs(s.x - b.x) + Math.abs(s.y - b.y), v.name).toBeGreaterThan(1);
    });
  });

  test("BF-12: the heart's tune is seeded from the trip seed", () => {
    expect(setupFor(0).rulesConfig).toEqual({ [TUNE_RULE_ID]: { seed: trip.seed } });
    const s = setUpRoom(withLattices(FOUNDRY_HEART.layout, {}), shape, setupFor(0));
    expect(tuneOf(s).tune).toEqual(newTune(trip.seed));
    expect(tuneOf(s).tune).toHaveLength(4);
    const other = { ...trip, seed: trip.seed + 1 };
    expect(setupFor(0, other).rulesConfig).toEqual({ [TUNE_RULE_ID]: { seed: other.seed } });
  });

  test('BF-12: a scripted full heart fight with 0 and with 4 bells hung ends without a throw', () => {
    for (const n of [0, 4]) {
      const layout = fielded(FOUNDRY_HEART.layout, { draughtsman: [0, 7], stoker: [2, 7] });
      let s = setUpRoom(
        withLattices(layout, { draughtsman: BOLT, stoker: BOLT }, { hp: { A8: 99, C8: 99 } }),
        shape,
        setupFor(n),
      );
      const hung = s.tiles.filter((t) => t.piece?.id === 'foundry:greatBell');
      expect(hung, `${n} bells`).toHaveLength(n);
      for (let round = 0; round < 40 && s.phase === 'player'; round++) {
        if (round < 3) s = cast(s, 'draughtsman', 'up').state;
        s = act(s, { type: 'endTurn' }).state;
      }
      expect(['player', 'won', 'lost'], `${n} bells`).toContain(s.phase);
    }
  });
});

describe('loot and the tuner (BF-13)', () => {
  const KIT = { foundry: FOUNDRY_RECRUIT_KIT };
  const card = { kind: 'recruit', apprentice: 'tuner' } as const;
  const owned = preconditionsOf('tuner').runes.all;
  const heard = (known: readonly RuneId[]): Profile => {
    const p = newProfile();
    return {
      ...p,
      known: [...new Set([...p.known, ...known])],
      city: { ...p.city, heard: ['seam', 'foundry'], fresh: [] },
    };
  };
  const tripAt = (p: Profile, room: number, loot: Trip['loot'] = []): Trip => ({
    ...startTrip(p, 5),
    district: 'foundry',
    encounter: room,
    loot,
  });

  test("BF-13: the tuner's offer appears only when her preconditions hold", () => {
    expect(FOUNDRY_RECRUIT_KIT.recruit).toEqual([{ apprentice: 'tuner', room: 2 }]);
    // Without her pages: no card in room 3.
    const bare = heard([]);
    expect(recruitOffers(bare, tripAt(bare, 2), 2, KIT)).toEqual([]);
    // With every page held she is offered in room 3 and only there.
    const ready = heard(owned);
    expect(isReady(ready, 'tuner', { trip: tripAt(ready, 2), atLandmark: true })).toBe(true);
    expect(recruitOffers(ready, tripAt(ready, 2), 2, KIT)).toEqual([card]);
    for (const room of [0, 1, 3, 4])
      expect(recruitOffers(ready, tripAt(ready, room), room, KIT)).toEqual([]);
    // Pages picked on this very trip count; a card already in the trip is not offered twice.
    const picked = owned.map((rune) => ({ kind: 'rune', rune }) as const);
    expect(recruitOffers(bare, tripAt(bare, 2, picked), 2, KIT)).toEqual([card]);
    expect(recruitOffers(ready, tripAt(ready, 2, [card]), 2, KIT)).toEqual([]);
    // Once she has joined the household, never again.
    expect(recruitOffers(joinHousehold(ready, 'tuner'), tripAt(ready, 2), 2, KIT)).toEqual([]);
  });

  test('BF-13: a trip can always bank Unison', () => {
    const p = heard(owned.filter((r) => r !== 'unison'));
    expect(p.known).not.toContain('unison');
    // Room 2 guarantees the page while she waits on it; once picked (or known) nothing more.
    expect(guaranteesFor(p, tripAt(p, 1), 1, KIT)).toEqual({ kind: 'rune', rune: 'unison' });
    expect(guaranteesFor(p, tripAt(p, 1, [{ kind: 'rune', rune: 'unison' }]), 1, KIT)).toBeNull();
    expect(guaranteesFor(heard(owned), tripAt(p, 1), 1, KIT)).toBeNull();
    // Her line names room 2 only, and every table the foundry offers from can hold Unison or the guarantee reaches it.
    expect(guaranteesFor(p, tripAt(p, 3), 3, KIT)).toBeNull();
    expect(
      foundryShallow.entries.some((e) => e.spec.kind === 'rune' && e.spec.rune === 'unison'),
    ).toBe(true);
    // The module offers room 2 from the shallow table with one pick, the heart from its own with two.
    const input = (room: number) =>
      ({
        trip: tripAt(p, room),
        kit: tripAt(p, room).kit,
        state: { rung: [] },
        room,
        length: 5,
      }) as ShapeInput<FoundryTripState>;
    expect(pealOffersFor(input(1))).toEqual({ table: 'foundry:shallow', picks: 1 });
    expect(pealOffersFor(input(2))).toEqual({ table: 'foundry:deep', picks: 1 });
    expect(pealOffersFor(input(4))).toEqual({ table: 'foundry:heart', picks: 2 });
    expect(Object.keys(FOUNDRY_LOOT_TABLES).sort()).toEqual([
      'foundry:deep',
      'foundry:heart',
      'foundry:shallow',
    ]);
  });

  test('BF-13: every room and the heart has its ink and lore lines', () => {
    const rooms = [one, two, three, four, FOUNDRY_HEART];
    expect(FOUNDRY_LEDGERS).toHaveLength(5);
    rooms.forEach((room, i) => {
      const paper = FOUNDRY_LEDGERS.find((l) => l.id === room.lore);
      expect(paper, room.id).toBeDefined();
      expect(paper?.text.length, room.id).toBeGreaterThan(40);
      expect(paper?.title, room.id).toBeTruthy();
      expect(paper?.found, room.id).toEqual(
        i === 4 ? { kind: 'heart' } : { kind: 'room', room: i },
      );
      expect(FOUNDRY_INK[room.id]?.length, room.id).toBeGreaterThan(10);
    });
    expect(new Set(rooms.map((r) => r.lore)).size).toBe(5);
  });
});
