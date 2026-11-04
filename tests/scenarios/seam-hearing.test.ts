import { describe, expect, test } from 'vitest';
import { SEAM_ROOMS } from '$data/districts/seam';
import { hearFromBattle, newProfile, parseLattice, startTrip } from '$engine';
import {
  EVENT_DISTRICT,
  fightFor,
  LOADOUTS,
  notable,
  playScript,
  ROOM_EVENTS,
  type SeamEvent,
  sweep,
} from '../sim/seamHearing';

/**
 * SM-4 (seam-grows P4, P5): every hearing event the base Seam is laid for can be reached with the
 * starting seven runes and Shove. One scripted solution per (event, room, variant), then a search
 * bot over every seating of the pair on each room's start points.
 *
 * Scripts (`tests/sim/seamHearing.ts`): `D>C3` moves the Draughtsman, `S!up` casts the Stoker's
 * page up, `D^left` is a Shove, `/` ends the turn. Seats are start points in reading order.
 */

type Script = [event: SeamEvent, room: number, variant: number, d: number, s: number, play: string];

const SCRIPTS: readonly Script[] = [
  // Room 1: fire on 3+ oil, The Wall, cross debt.
  ['fire', 0, 0, 2, 3, 'S>B5 / S!up'],
  ['theWall', 0, 0, 0, 1, 'D>E1 S>A2 / D^left'],
  ['crossDebt', 0, 0, 1, 2, 'D!right S!up'],
  ['fire', 0, 1, 0, 1, 'S!left'],
  ['theWall', 0, 1, 0, 1, 'S>E4 / D>B2 D^down'],
  ['crossDebt', 0, 1, 0, 3, 'D!left S!up'],
  ['fire', 0, 2, 0, 2, 'S!right'],
  ['theWall', 0, 2, 1, 2, 'S>E3 / S>F2 / S^down'],
  ['crossDebt', 0, 2, 1, 2, 'D!right S!up'],
  // Room 2: fire, Storm on 3, conducted on 3, cross debt.
  ['fire', 1, 0, 0, 2, 'S>D4 / S>E2 S!up'],
  ['storm', 1, 0, 0, 2, 'D>E4 S>D4 / S!right'],
  ['conducted', 1, 0, 0, 1, 'D>C5 S>B7 / S!up'],
  ['crossDebt', 1, 0, 0, 1, 'D>C5 D!left S!up'],
  ['fire', 1, 1, 0, 1, 'S>A6 S!right'],
  ['storm', 1, 1, 0, 1, 'D>C3 S>B4 / D>D3 S>C4 / S!up'],
  ['conducted', 1, 1, 2, 1, 'D>E5 S>D6 / S!up'],
  ['crossDebt', 1, 1, 0, 1, 'D!down S>B5 S!left'],
  ['fire', 1, 2, 0, 1, 'S>D5 S!left'],
  ['storm', 1, 2, 0, 1, 'D>C3 S>D3 / / S!right'],
  ['conducted', 1, 2, 1, 2, 'D>D5 S>C6 S!right'],
  ['crossDebt', 1, 2, 1, 3, 'D!down S>F7 S!up'],
  // Room 3: Storm, conducted, The Wall.
  ['storm', 2, 0, 2, 0, 'D>D5 S>D4 / S>C4 S!down'],
  ['conducted', 2, 0, 0, 2, 'D>F4 S>E4 S!up'],
  ['theWall', 2, 0, 0, 1, 'D>D4 S>D6 / D^left'],
  ['storm', 2, 1, 0, 1, 'D>C5 S>D5 / S!left'],
  ['conducted', 2, 1, 0, 1, 'D>B2 S>F3 / S>D2 S!down'],
  ['theWall', 2, 1, 0, 1, 'D>D4 S>E4 / D^right'],
  ['storm', 2, 2, 3, 0, 'S>D4 / S>C3 / S!right'],
  ['conducted', 2, 2, 0, 1, 'D>D4 S>B6 / D>B4 S!up'],
  ['theWall', 2, 2, 3, 0, 'S>D4 / S>C3 S^right'],
];

const variantOf = (room: number, variant: number) => {
  const v = SEAM_ROOMS[room]?.variants[variant];
  if (!v) throw new Error(`No variant ${room}/${variant}`);
  return v;
};

describe('the loadouts (starting runes only)', () => {
  test('every page is written with the seven starting runes', () => {
    const known = new Set<string>(newProfile().known);
    for (const [event, pages] of Object.entries(LOADOUTS)) {
      for (const [who, page] of Object.entries(pages)) {
        parseLattice(page);
        const runes = page
          .split(/\s+/)
          .filter((t) => t !== '.' && t !== 'x')
          .map((t) => t.replace(/[<>^v]$/, '').toLowerCase());
        for (const r of runes) expect(known.has(r), `${event} ${who} ${r}`).toBe(true);
      }
    }
  });

  test('P4: each event is laid in at least two of rooms 1-3', () => {
    for (const event of Object.keys(EVENT_DISTRICT) as SeamEvent[]) {
      expect(ROOM_EVENTS.filter((r) => r.includes(event)).length, event).toBeGreaterThanOrEqual(2);
    }
  });

  test('a script for every (event, room, variant) P4 names', () => {
    const want = ROOM_EVENTS.flatMap((events, room) =>
      (SEAM_ROOMS[room]?.variants ?? []).flatMap((_, v) => events.map((e) => `${e} ${room} ${v}`)),
    );
    expect(SCRIPTS.map(([e, r, v]) => `${e} ${r} ${v}`).sort()).toEqual(want.sort());
  });
});

describe('scripted solutions hear the right district (SM-4)', () => {
  test.each(SCRIPTS)(
    '%s in room %i, variant %i (seats %i, %i)',
    (event, room, variant, d, s, script) => {
      const v = variantOf(room, variant);
      const f = playScript(fightFor(v.layout, event, d, s), script);
      const p = newProfile();
      const heard = hearFromBattle(p, startTrip(p, 1), f.log).heard;
      expect(heard, `${v.name}: ${notable(f.log).join(', ')}`).toContain(EVENT_DISTRICT[event]);
    },
  );
});

describe('the search bot over every seating (SM-4)', () => {
  // About 9 s alone on a laptop: 324 searches, most stop in the first round or two.
  test('reaches each event from at least half the seatings of each room P4 names', () => {
    const t0 = performance.now();
    const rows = sweep();
    const table = rows.map(
      (r) =>
        `${r.room.padEnd(18)} ${r.event.padEnd(10)} ${String(r.reached).padStart(2)}/${r.of} ${Math.round((100 * r.reached) / r.of)}%`,
    );
    console.log(`${table.join('\n')}\n(${Math.round(performance.now() - t0)} ms)`);
    for (const r of rows) {
      expect(
        r.reached / r.of,
        `${r.room} ${r.event} missed ${r.missed.join('; ')}`,
      ).toBeGreaterThanOrEqual(0.5);
    }
  }, 120_000);
});
