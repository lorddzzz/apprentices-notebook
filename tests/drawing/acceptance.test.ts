import { describe, expect, expectTypeOf, it, test, vi } from 'vitest';
import type { ApprenticeId, DistrictId, Drawing, EnemyId, MasterId, ShapeId } from '$data';
import { COSTS, GEN_LIMITS, MASTER_HOME } from '$data/drawing';
import {
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import { KIT } from '$engine/districts/kit';
import { ownerDoor } from '$engine/districts/lowerSeam';
import type { TripShapeDef } from '$engine/districts/types';
import {
  BLOCKED_SHARE,
  type Credits,
  checkDrawing,
  checkGenerated,
  creditsOf,
  DRAWING_SLOTS,
  drawingsOf,
  EN_SALT,
  endingOf,
  GEN_KITS,
  HEART_FRAMES,
  handover,
  ledgerOf,
  MASTER_IDS,
  MAX_ATTEMPTS,
  MAX_DRAWS,
  MIN_FOE_DISTANCE,
  NAME_MAX,
  paletteOf,
  parseInkedState,
  ROOM_ROUNDS,
  readDrawing,
  SPIKE_KITS,
  specFor,
  storeDrawing,
} from '$engine/drawing';
import { botTrial } from '$engine/drawing/trial';
import type {
  FoeKit,
  GenKit,
  HeartFrame,
  Issue,
  Need,
  PieceKit,
  RuleKit,
  ShapeKit,
} from '$engine/drawing/types';
import { botTrial as simBotTrial, TRIAL_BUDGET } from '$engine/sim';
import { newTripKit, shapeOf } from '$engine/trip/shape';
import {
  FIXTURE_DRAWINGS,
  fullHousehold,
  handoverProfile,
  heartDrawing,
  heartRoom,
  heartSpec,
  inputFor,
} from './fixtures';
import { scriptedSolve } from './kits-a.scripts';

/**
 * EN-W0 (ending-plan §4, §5): the ending's contracts exist, are inert and read strictly. Every
 * `it.todo` below is a later task's acceptance; its owner fills it in and removes the marker.
 */

const DRAWING: Drawing = {
  name: 'The wet room',
  rule: 'canals:current',
  foes: ['eel', 'moth'],
  pieces: ['canals:lamp'],
  shape: 'plain',
  length: 4,
  heart: 'mother',
};

/** A save that round-trips through JSON like the app's own storage, with `edit` applied to its profile. */
function reload(edit: (profile: Record<string, unknown>) => void = () => {}): SaveData {
  const raw = JSON.parse(JSON.stringify(newSave(1))) as { profile: Record<string, unknown> };
  edit(raw.profile);
  return parseSaveData(raw);
}

describe('EN-W0: the profile fields', () => {
  test('EN-W0: a profile without the ending fields parses with empty defaults', () => {
    const p = reload().profile;
    expect(drawingsOf(p)).toEqual([null, null, null]);
    expect(endingOf(p)).toEqual({ handover: false, creditsSeen: false });
    expect(ledgerOf(p)).toEqual({ casts: 0, biggest: null, districts: [] });
  });

  test('empty fields are not stored, so recorded saves keep their form', () => {
    const p = reload((profile) => {
      profile.drawings = [null, null, null];
      profile.ending = { handover: false, creditsSeen: false };
      profile.ledger = { casts: 0, biggest: null, districts: [] };
    }).profile;
    expect(Object.keys(p)).not.toEqual(expect.arrayContaining(['drawings']));
    expect('ending' in p).toBe(false);
    expect('ledger' in p).toBe(false);
  });

  test('saved values round-trip', () => {
    const ledger = {
      casts: 41,
      biggest: { chain: 9, caster: 'draughtsman' as ApprenticeId, name: 'Bonfire' },
      districts: ['seam', 'canals'],
    };
    const p = reload((profile) => {
      profile.drawings = [DRAWING, null, null];
      profile.ending = { handover: true, creditsSeen: false };
      profile.ledger = ledger;
    }).profile;
    expect(drawingsOf(p)).toEqual([DRAWING, null, null]);
    expect(endingOf(p)).toEqual({ handover: true, creditsSeen: false });
    expect(ledgerOf(p)).toEqual(ledger);
  });

  test('a malformed value is dropped, never thrown', () => {
    const p = reload((profile) => {
      profile.drawings = [{ ...DRAWING, length: 9 }, 'x', DRAWING, DRAWING];
      profile.ending = { handover: 'yes', creditsSeen: true };
      profile.ledger = {
        casts: -3,
        biggest: { chain: 2, caster: 'nobody', name: 'x' },
        districts: ['seam', 'nowhere', 'seam', 'canals'],
      };
    }).profile;
    expect(drawingsOf(p)).toEqual([null, null, DRAWING]);
    expect(endingOf(p)).toEqual({ handover: false, creditsSeen: true });
    expect(ledgerOf(p)).toEqual({ casts: 0, biggest: null, districts: ['seam', 'canals'] });
    expect(
      reload((profile) => {
        profile.drawings = 'junk';
        profile.ending = 7;
        profile.ledger = [];
      }).profile,
    ).toEqual(reload().profile);
  });

  test('a drawing is checked on its limits: name 1-24 trimmed, 1-3 foes, 2 pieces, length 3-6', () => {
    expect(readDrawing({ ...DRAWING, name: `  ${DRAWING.name}  ` })?.name).toBe(DRAWING.name);
    expect(NAME_MAX).toBe(24);
    expect(DRAWING_SLOTS).toBe(3);
    for (const bad of [
      { name: '   ' },
      { name: 'x'.repeat(25) },
      { foes: [] },
      { foes: ['eel', 'eel', 'moth', 'rat'] },
      { foes: ['nothing'] },
      { pieces: ['canals:a', 'canals:b', 'canals:c'] },
      { pieces: ['nodistrict:a'] },
      { length: 2 },
      { length: 7 },
      { shape: 'bathhouses' },
      { heart: 'rat' },
      { rule: 'current' },
    ]) {
      expect(readDrawing({ ...DRAWING, ...bad }), JSON.stringify(bad)).toBeNull();
    }
    expect(readDrawing({ ...DRAWING, rule: null, shape: 'bathhouses:heat' })).not.toBeNull();
  });

  test('types: the drawing, its ids and the profile fields', () => {
    expectTypeOf<Drawing['length']>().toEqualTypeOf<3 | 4 | 5 | 6>();
    expectTypeOf<Drawing['shape']>().toEqualTypeOf<ShapeId | 'plain'>();
    expectTypeOf<Drawing['foes']>().toEqualTypeOf<EnemyId[]>();
    expectTypeOf<Profile['drawings']>().toEqualTypeOf<(Drawing | null)[] | undefined>();
    expect([...MASTER_IDS].sort()).toEqual(
      (
        [
          'marginalia',
          'mother',
          'lamplighter',
          'postmaster',
          'bathSteward',
          'chiefWarden',
          'carillonneur',
          'registrar',
        ] satisfies MasterId[]
      ).sort(),
    );
  });
});

describe('EN-W0: the stubs and kit interfaces', () => {
  const profile = newSave(1).profile;
  const calls: [string, string, () => unknown][] = [
    ['EN-10', 'handover', () => handover(profile)],
    ['EN-11', 'creditsOf', () => creditsOf(profile)],
  ];
  test.each(calls)('%s: %s throws "not built" until its task', (task, _name, call) => {
    expect(call).toThrow(`not built (${task})`);
  });

  test('botTrial is the engine bot of EN-0, not a stub', () => {
    expect(botTrial).toBe(simBotTrial);
  });

  test('EN takes salts 7000-7999 and keeps the fallback inside them', () => {
    expect(EN_SALT).toEqual({ from: 7000, to: 7999, fallback: 7900 });
  });

  test('every kit interface carries needs with a reason (P5)', () => {
    expectTypeOf<RuleKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<PieceKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<FoeKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<ShapeKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<HeartFrame['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<Need['reason']>().toEqualTypeOf<string>();
    expectTypeOf<GenKit['frames']>().toEqualTypeOf<readonly HeartFrame[]>();
    expectTypeOf<Issue['reason']>().toEqualTypeOf<string>();
    expectTypeOf<Credits['biggest']>().toEqualTypeOf<{
      chain: number;
      caster: ApprenticeId;
      name: string;
    } | null>();
  });
});

// ── EN-W1: the contracts Packs E to L build on (P30-P35) ───────────────────────

describe('EN-W1: the contracts', () => {
  test('EN-W1: GEN_LIMITS carries the spike’s limits', () => {
    expect(GEN_LIMITS).toEqual({
      attempts: 4,
      heartAttempts: 3,
      rounds: 12,
      heartRounds: 16,
      draws: 8,
      foeDistance: 3,
      blockedShare: 0.3,
      phone: { medianMs: 500, p95Ms: 2000 },
    });
    // The generator keeps its exported names, as reads of the data.
    expect([ROOM_ROUNDS, MAX_ATTEMPTS, MIN_FOE_DISTANCE, BLOCKED_SHARE, MAX_DRAWS]).toEqual([
      12, 4, 3, 0.3, 8,
    ]);
    expect(MASTER_HOME).toEqual({
      marginalia: 'seam',
      mother: 'canals',
      lamplighter: 'canals',
      postmaster: 'inkQuarter',
      bathSteward: 'bathhouses',
      chiefWarden: 'bridges',
      carillonneur: 'foundry',
      registrar: 'cartographers',
    });
    expect(Object.keys(MASTER_HOME).sort()).toEqual([...MASTER_IDS].sort());
  });

  test('EN-W1: the registries hold the spike’s kits', () => {
    expect(GEN_KITS.map((k) => k.district)).toEqual(['seam', 'canals']);
    expect(SPIKE_KITS).toBe(GEN_KITS);
    expect(GEN_KITS[0]?.foes.map((f) => f.id)).toEqual(['rat', 'familiar', 'sentry']);
    expect(GEN_KITS[1]?.rules.map((r) => r.id)).toEqual(['canals:current']);
    expect(GEN_KITS[1]?.foes.map((f) => f.id)).toEqual(['eel', 'moth']);
    const input = inputFor(FIXTURE_DRAWINGS[1] as Drawing, 1, 0);
    expect(specFor(input, 1).kits).toBe(GEN_KITS);
    // The Marginalia's frame is the Seam's heart in a minimal frame (P35).
    expect(Object.keys(HEART_FRAMES)).toEqual(['marginalia']);
    const frame = HEART_FRAMES.marginalia;
    expect(frame).toMatchObject({
      master: 'marginalia',
      cost: COSTS.hearts.marginalia,
      size: { width: 7, height: 7 },
      escorts: [],
      ruleAt: [],
      needs: [],
    });
    expect(frame?.setup).toBe(KIT.modules.seam?.heart);
    expect(frame?.fallback).toMatchObject({ width: 7, height: 7 });
    expect(frame?.fallback.tiles).toHaveLength(49);
    // A shape kit carries the shape it lends (P33).
    expectTypeOf<ShapeKit['shape']>().toEqualTypeOf<TripShapeDef>();
  });

  test('EN-W1: storeDrawing refuses an unfit drawing and a page in use', () => {
    const p = handoverProfile();
    const plain = FIXTURE_DRAWINGS[0] as Drawing;
    expect(checkDrawing(p, plain)).toEqual([]);
    const stored = storeDrawing(p, 1, plain, null);
    expect(drawingsOf(stored)).toEqual([null, plain, null]);
    expect(p.drawings).toBeUndefined();
    // Unfit: the first issue's reason; the eel needs the current, which is not drawn.
    const wet: Drawing = { ...plain, foes: ['eel'] };
    const first = checkDrawing(p, wet)[0];
    expect(first?.reason).toBeTruthy();
    expect(() => storeDrawing(p, 0, wet, null)).toThrow(first?.reason as string);
    // Before the handover the table is the owner's.
    const early = { ...p, ending: undefined };
    expect(() => storeDrawing(early, 0, plain, null)).toThrow();
    // A drawn trip locks its own page and no other; a trip of another district never locks.
    const trip = (district: string, slot: number) =>
      ({
        district,
        kit: {
          state: { slot, drawing: plain, rooms: [null, null, null], inner: null },
          choices: [],
          checkpoint: false,
          bonuses: [],
        },
      }) as unknown as Trip;
    expect(parseInkedState(trip('inkedPage', 1).kit?.state).slot).toBe(1);
    expect(() => storeDrawing(stored, 1, null, trip('inkedPage', 1))).toThrow();
    expect(() => storeDrawing(stored, 0, plain, trip('inkedPage', 1))).not.toThrow();
    expect(() => storeDrawing(stored, 1, null, trip('bathhouses', 1))).not.toThrow();
    // Clearing the last slot drops the field again (P22).
    expect(storeDrawing(stored, 1, null, null).drawings).toBeUndefined();
    // The state reads strictly.
    expect(() => parseInkedState({ slot: 3 })).toThrow();
    expect(() =>
      parseInkedState({ slot: 0, drawing: plain, rooms: [null], inner: null }),
    ).toThrow();
  });

  test('EN-W1: startTrip passes the page to the shape', () => {
    const base = newProfile();
    const p: Profile = { ...base, city: { ...base.city, open: ['seam', 'bathhouses'] } };
    const shape = KIT.modules.bathhouses?.trip;
    if (!shape) throw new Error('the bathhouses have a trip shape');
    const spy = vi.spyOn(shape, 'initState');
    try {
      startTrip(p, 3, 'bathhouses', { page: 2 });
      expect(spy).toHaveBeenLastCalledWith(p, { page: 2 });
      startTrip(p, 3, 'bathhouses');
      expect(spy).toHaveBeenLastCalledWith(p, undefined);
    } finally {
      spy.mockRestore();
    }
    // `newTripKit` hands the option on to any shape.
    const calls: unknown[] = [];
    const lent: TripShapeDef = {
      id: 'bathhouses:heat',
      parseState: () => null,
      initState: (...args) => {
        calls.push(args);
        return null;
      },
    };
    newTripKit({ ...shapeOf('seam'), trip: lent }, undefined, { page: 1 });
    expect(calls).toEqual([[undefined, { page: 1 }]]);
  });
});

// ── Acceptance owed by later tasks (ending-plan §5), by task ──────────────────

// EN-S1 (Pack B) is built: its three tests are in tests/sim/generator.test.ts (they run the bot).
// Pack E's tests are real `it.fails` in generator.test.ts and tests/districts/inkedPage/trip.test.ts.

// The EN-8 tests (offers, held pages, solvents, heavy picks) are in tests/drawing/loot.test.ts.

describe('EN-4 (Pack G): the generation worker', () => {
  it.todo('EN-4: worker results equal the synchronous path');
});

// ── Kits and frames (Packs I-K) ─────────────────────────

/** The kit of a shape id, or the error the generator will throw for it (P34). */
function shapeKit(id: string): ShapeKit {
  const found = GEN_KITS.flatMap((k) => k.shapes).find((s) => s.id === id);
  if (!found) throw new RangeError(`No kit for ${id}`);
  return found;
}
function frameOf(master: MasterId): HeartFrame {
  const found = HEART_FRAMES[master];
  if (!found) throw new RangeError(`No kit for ${master}`);
  return found;
}
/** The three tests every heart frame shares (EN-K1 to EN-K7), for the masters of one district. */
function frameTests(pack: string, masters: readonly MasterId[], built = false): void {
  // `built`: the pack's frame exists (EN-W1's Marginalia frame, drawn since EN-2), so its tests must pass.
  const check = built ? it : it.fails;
  check(
    `${pack}: the frame passes checkGenerated over 50 seeds`,
    () => {
      for (const master of masters) {
        frameOf(master);
        for (let seed = 1; seed <= 50; seed++) {
          const { input, room, masterOnBoard } = heartRoom(master, seed);
          expect(masterOnBoard, `${master}, seed ${seed}`).toBe(true);
          expect(checkGenerated(room.layout, heartSpec(input))).toEqual([]);
        }
      }
    },
    120_000,
  );
  // The kit pack adds the scripted solve of each fallback board beside the guardrail check.
  check(`${pack}: the fallback board passes checkGenerated and has a scripted solve`, () => {
    for (const master of masters) {
      const spec = heartSpec(inputFor(heartDrawing(master), 1));
      expect(checkGenerated(frameOf(master).fallback, spec)).toEqual([]);
      expect(scriptedSolve(master).phase, `${master}'s scripted solve`).toBe('won');
    }
  });
  check(`${pack}: the bot trial ends within its op budget`, () => {
    for (const master of masters) {
      const { room, masterOnBoard } = heartRoom(master, 1);
      expect(masterOnBoard).toBe(true);
      expect(room.ops).toBeLessThanOrEqual(TRIAL_BUDGET * GEN_LIMITS.heartAttempts);
    }
  });
}

describe('EN-K: every kit and frame', () => {
  it.fails('EN-K: every element a full household can offer has a kit', () => {
    const palette = paletteOf(fullHousehold());
    const has = {
      rules: new Set<string>(GEN_KITS.flatMap((k) => k.rules.map((r) => r.id))),
      foes: new Set<string>(GEN_KITS.flatMap((k) => k.foes.map((f) => f.id))),
      pieces: new Set<string>(GEN_KITS.flatMap((k) => k.pieces.map((x) => x.id))),
      shapes: new Set<string>(GEN_KITS.flatMap((k) => k.shapes.map((x) => x.id))),
    };
    expect(palette.rules.filter((id) => !has.rules.has(id))).toEqual([]);
    expect(palette.foes.filter((id) => !has.foes.has(id))).toEqual([]);
    expect(palette.pieces.filter((id) => !has.pieces.has(id))).toEqual([]);
    // `canals:landings` is lent by KIT-R3 and listed once the canals open (EN-K2).
    expect(palette.shapes.filter((id) => !has.shapes.has(id))).toEqual([]);
    expect(palette.masters.filter((id) => HEART_FRAMES[id] === undefined)).toEqual([]);
  });
});

describe('EN-K1 to EN-K7 (Packs I-K): kits and frames', () => {
  frameTests('EN-K1', ['marginalia'], true);

  frameTests('EN-K2', ['mother', 'lamplighter']);
  // Already true (EN-5's needs rows), so a plain test: the eel and the moth are greyed without the current.
  it('EN-K2: eel and moth are greyed without water and lamps', () => {
    const p = fullHousehold();
    const dry: Drawing = { ...heartDrawing('marginalia'), foes: ['eel', 'moth'] };
    const reasons = checkDrawing(p, dry).map((i) => i.reason);
    expect(reasons).toContain('The eel needs water: draw the current.');
    expect(reasons).toContain(
      'The lamp-moth needs lamps: draw the current, which lights its lanes.',
    );
    const wet = checkDrawing(p, { ...dry, rule: 'canals:current' });
    expect(wet.filter((i) => i.id === 'eel' || i.id === 'moth')).toEqual([]);
  });

  frameTests('EN-K3', ['postmaster']);
  it.fails('EN-K3: no term at the heart', () => {
    const kit = shapeKit('inkQuarter:terms');
    expect(kit.lengths).toEqual([3, 4, 5, 6]);
    // The pack asserts the heart room's offers carry no term, at every length.
  });

  frameTests('EN-K4', ['bathSteward']);
  it.fails('EN-K4: heat reaches 4 at the heart for every length', () => {
    const kit = shapeKit('bathhouses:heat');
    expect(kit.lengths).toEqual([3, 4, 5, 6]);
    // The pack asserts `heatOf` at room `length - 1` is 4 for each length.
  });

  frameTests('EN-K5', ['chiefWarden']);
  it.fails('EN-K5: never stranded on a span choice', () => {
    const kit = shapeKit('bridges:span');
    expect(kit.lengths).toEqual([3, 4, 5, 6]);
    // The pack asserts every crossroads offers a way forward, at every length.
  });

  frameTests('EN-K6', ['carillonneur']);
  it.fails('EN-K6: bells hang only where rung', () => {
    const kit = shapeKit('foundry:peal');
    expect(kit.lengths).toEqual([3, 4, 5, 6]);
    // The pack asserts great bells hang in the heart room alone.
  });

  frameTests('EN-K7', ['registrar']);
  it.fails('EN-K7: no return after the point and none needed at the heart', () => {
    const kit = shapeKit('cartographers:doorway');
    expect(kit.lengths).toEqual([3, 4, 5, 6]);
    // The pack asserts `returnBlocks` after the point of no return and none at the heart.
  });
});

// ── Handover and credits (Pack L, engine half) ──────────

/** A household whose door to the owner is open: the Cartographers' heart cleared and the door seen. */
function doorOpen(): Profile {
  const p = newProfile();
  return { ...p, city: { ...p.city, doorSeen: true, hearts: [...p.city.hearts, 'cartographers'] } };
}

describe('EN-10 and EN-11 (Pack L): handover and credits', () => {
  it.fails('EN-10: the handover is hidden before the door opens', () => {
    const p = newProfile();
    expect(ownerDoor(p)).toBe('hidden');
    // Not asked for yet, it changes nothing.
    expect(handover(p)).toEqual(p);
  });

  it.fails('EN-10: the handover is idempotent', () => {
    const once = handover(doorOpen());
    expect(endingOf(once).handover).toBe(true);
    expect(handover(once)).toEqual(once);
  });

  it.fails('EN-10: nothing is lost on joining', () => {
    const before = doorOpen();
    const after = handover(before);
    expect(after.household.members).toEqual(expect.arrayContaining(before.household.members));
    expect(after.household.members.length).toBeGreaterThan(before.household.members.length);
    expect(after.known).toEqual(expect.arrayContaining(before.known));
    expect(after.pages).toEqual(before.pages);
    expect(after.city).toEqual(before.city);
  });

  it.fails('EN-10: gifted pages are learned only when missing', () => {
    const once = handover(doorOpen());
    expect(new Set(once.known).size).toBe(once.known.length);
    // Learning again from a household that already has every gifted page adds none.
    expect(handover({ ...once, ending: undefined }).known).toEqual(once.known);
  });

  it.fails('EN-11: creditsOf lists districts in opening order', () => {
    const p = doorOpen();
    const open = ['seam', 'bridges', 'canals'] as const;
    const credits = creditsOf({ ...p, city: { ...p.city, open: [...open] } });
    expect(credits.districts).toEqual([...open]);
  });

  it.fails('EN-11: creditsOf carries the ledger counts', () => {
    const ledger = {
      casts: 41,
      biggest: { chain: 9, caster: 'draughtsman' as ApprenticeId, name: 'Bonfire' },
      districts: ['seam', 'canals'] as DistrictId[],
    };
    const credits = creditsOf({ ...doorOpen(), ledger });
    expect(credits.casts).toBe(41);
    expect(credits.biggest).toEqual(ledger.biggest);
  });
});
