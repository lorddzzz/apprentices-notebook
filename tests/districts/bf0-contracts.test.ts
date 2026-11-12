import { describe, expect, expectTypeOf, test } from 'vitest';
import { APPRENTICES, ENEMIES, PLAYABLE_DISTRICTS } from '$data';
import {
  DEFAULT_HANG,
  FOUNDRY_FOE_IDS,
  FOUNDRY_FOE_TOKENS,
  FOUNDRY_TUNING,
  LOCK_OF_NOTE,
  LOCKS,
  type Note,
  retunedTone,
  TONES,
  type Tone,
} from '$data/districts/foundry';
import { DISTRICT_TOKENS, DISTRICTS, tokenCollisions } from '$data/districts/index';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import { KIT } from '$engine/districts';
import {
  BELL_PIECE,
  BELLS_RULE_ID,
  type BellsState,
  FOUNDRY_EVENT_TYPES,
  FOUNDRY_MEANINGFUL_TYPES,
  FOUNDRY_SHAPE,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  HOOK_PIECE,
  initBells,
  initFoundryState,
  initTune,
  parseBells,
  parseFoundryState,
  parseTune,
  ROPE_PIECE,
  TUNE_RULE_ID,
  type TuneState,
} from '$engine/districts/foundry/types';
import type { Json } from '$engine/districts/types';
import { MEANINGFUL } from '$engine/index';
import { parseBoard, serializeBoard } from '$engine/notation';
import { solidityOf } from '$engine/pieces';
import { board, draft } from '../scenarios/harness';

/** BF-0: the foundry's module is registered and inert; its contracts compile and read strictly. */
describe('BF-0 registration', () => {
  test('the district is open (BF-22): threshold gate, five rooms, playable', () => {
    const d = DISTRICTS.foundry;
    expect(d.gate.kind).toBe('threshold');
    expect(d.rooms).toHaveLength(5);
    expect(d.lean.lean).toBe('brass');
    expect(PLAYABLE_DISTRICTS).toContain('foundry');
  });

  test('the module registers four pieces, two late rules, the events and the trip shape only', () => {
    const m = KIT.modules.foundry;
    expect(m?.pieces?.map((p) => p.id)).toEqual([
      BELL_PIECE,
      ROPE_PIECE,
      HOOK_PIECE,
      GREAT_BELL_PIECE,
    ]);
    expect(Object.keys(KIT.rules).filter((id) => id.startsWith('foundry:'))).toEqual([
      BELLS_RULE_ID,
      TUNE_RULE_ID,
    ]);
    expect(KIT.rules[BELLS_RULE_ID]).toMatchObject({ slot: 'late', scope: 'piece', order: 90 });
    expect(KIT.rules[TUNE_RULE_ID]).toMatchObject({ slot: 'late', scope: 'district' });
    expect(Object.keys(KIT.events).filter((t) => t.startsWith('foundry:'))).toEqual([
      ...FOUNDRY_EVENT_TYPES,
    ]);
    // nothing else: no guards, steps, offers, causes or tricks yet (BF-6/7: the staff's three foes)
    expect(m?.harmGuards ?? []).toEqual([]);
    expect(m?.steps ?? []).toEqual([]);
    expect((m?.foes ?? []).map((f) => f.id)).toEqual([
      'foundry:ringer',
      'foundry:detuner',
      'foundry:clapper',
    ]);
    expect(m?.offerKinds ?? []).toEqual([]);
    expect(Object.keys(KIT.causes).filter((c) => c.startsWith('foundry:'))).toEqual([]);
    expect(Object.keys(KIT.shapes)).toContain(FOUNDRY_SHAPE);
  });

  test('the bell rule is last in late; the tune rule is a district rule that never comes with a piece', () => {
    const bells = KIT.rules[BELLS_RULE_ID];
    const tune = KIT.rules[TUNE_RULE_ID];
    expect(bells?.activatedBy).toEqual({ kind: 'piece', pieces: [BELL_PIECE, GREAT_BELL_PIECE] });
    expect(tune?.activatedBy).toEqual({ kind: 'district' });
    expect(tune?.order).toBeLessThan(bells?.order ?? 0);
  });
});

describe('BF-0 pieces', () => {
  test('bells are solid, rope and hook are open footing, only the bell has triggers (P1, P2)', () => {
    const tiles = parseBoard('{bell} {greatBell:1} {rope} {hook}').tiles.flat();
    expect(tiles.map((t) => solidityOf(t))).toEqual([
      'unitsAndShots',
      'unitsAndShots',
      'none',
      'none',
    ]);
    for (const p of KIT.modules.foundry?.pieces ?? []) {
      if (p.id === BELL_PIECE)
        expect(Object.keys(p.triggers).sort()).toEqual(['onHit', 'onKind', 'onStruck']);
      else if (p.id === GREAT_BELL_PIECE)
        expect(Object.keys(p.triggers).sort()).toEqual(['onHit', 'onStruck']);
      else expect(p.triggers).toEqual({});
    }
  });

  test('every piece parses and round-trips in notation, with data suffixes', () => {
    const spec = parseBoard(
      'P {bell} {bell:high} {rope:mid} {hook} {hook:3} {greatBell:2} {greatBell:2:high:allied:rung}',
    );
    const pieces = spec.tiles.flat().map((t) => t.piece);
    expect(pieces.map((p) => p?.id)).toEqual([
      undefined,
      BELL_PIECE,
      BELL_PIECE,
      ROPE_PIECE,
      HOOK_PIECE,
      HOOK_PIECE,
      GREAT_BELL_PIECE,
      GREAT_BELL_PIECE,
    ]);
    expect(pieces[1]?.data).toEqual({ tone: 'low' });
    expect(pieces[2]?.data).toEqual({ tone: 'high' });
    expect(pieces[3]?.data).toEqual({ tone: 'mid' });
    expect(pieces[4]?.data).toEqual({ note: 0 });
    expect(pieces[5]?.data).toEqual({ note: 3 });
    expect(pieces[6]?.data).toEqual({
      note: 2,
      hang: DEFAULT_HANG[2],
      allied: false,
      rung: false,
    });
    expect(pieces[7]?.data).toEqual({ note: 2, hang: 'high', allied: true, rung: true });
    const text = serializeBoard(spec);
    expect(text).toContain('{bell:low}');
    expect(text).toContain('{hook}');
    expect(text).toContain('{hook:3}');
    expect(text).toContain('{greatBell:2}');
    expect(text).toContain('{greatBell:2:high:allied:rung}');
    expect(serializeBoard(parseBoard(text))).toBe(text);
  });

  test('a suffix the piece cannot read is an error', () => {
    for (const bad of [
      '{bell:loud}',
      '{rope:0}',
      '{hook:9}',
      '{greatBell:5}',
      '{greatBell:1:big}',
    ]) {
      expect(() => parseBoard(`P ${bad}`), bad).toThrow();
    }
  });

  test('a board with no foundry pieces never activates its rules', () => {
    const s = board('P r .\n. . .');
    expect(Object.keys(s.rules ?? {}).filter((id) => id.startsWith('foundry:'))).toEqual([]);
  });
});

describe('BF-0 rule state', () => {
  test('bell state round-trips through JSON and reads strictly (P3, P8)', () => {
    const s: BellsState = { humming: ['low', 'high'], struck: { '1,1': ['a', 'b'] } };
    const saved: unknown = JSON.parse(JSON.stringify(s));
    expect(parseBells(saved)).toEqual(s);
    expect(initBells()).toEqual({ humming: [], struck: {} });
    for (const raw of [undefined, null, 3, 'x', [], {}])
      expect(parseBells(raw)).toEqual(initBells());
    expect(
      parseBells({
        humming: ['high', 'low', 'high', 'shrill', 4],
        struck: { '1,1': ['a', 'a', 3], bad: ['a'], '2,2': [], '3,3': 'x' },
      }),
    ).toEqual({ humming: ['low', 'high'], struck: { '1,1': ['a'] } });
  });

  test('tune state round-trips and a malformed tune reads as none (P9)', () => {
    const s: TuneState = { tune: ['low', 'mid', 'mid', 'high'], at: 2, peals: 1, answered: 3 };
    const saved: unknown = JSON.parse(JSON.stringify(s));
    expect(parseTune(saved)).toEqual(s);
    expect(initTune()).toEqual({ tune: [], at: 0, peals: 0, answered: 0 });
    for (const raw of [undefined, null, 3, [], {}]) expect(parseTune(raw)).toEqual(initTune());
    expect(parseTune({ ...s, tune: ['low', 'mid'] })).toEqual({
      ...initTune(),
      peals: 1,
      answered: 3,
    });
    expect(parseTune({ ...s, at: 9 }).at).toBe(FOUNDRY_TUNING.tuneLength - 1);
    expect(parseTune({ ...s, at: -1, peals: 'x' })).toMatchObject({ at: 0, peals: 0 });
  });

  test('the tune keeps its state on a round end; the bell rule clears its hum and strikers (BF-3)', () => {
    const bells = KIT.rules[BELLS_RULE_ID];
    const tune = KIT.rules[TUNE_RULE_ID];
    const own: BellsState = { humming: ['mid'], struck: { '0,0': ['u'] } };
    const t: TuneState = { tune: ['low', 'low', 'mid', 'high'], at: 1, peals: 0, answered: 0 };
    const s = board('.');
    expect(bells?.init(s, undefined)).toEqual(initBells());
    expect(tune?.init(s, undefined)).toEqual(initTune());
    const dusk = draft(s, (ctx) => expect(bells?.step(ctx, own)).toEqual(initBells()));
    expect(dusk.events.map((e) => e.type)).toEqual(['foundry:hum']);
    expect(tune?.step({ s } as never, t)).toBe(t);
  });
});

describe('BF-0 trip state (P7)', () => {
  test('keeps the great bells rung, through the registered shape', () => {
    const t: FoundryTripState = {
      rung: [
        { room: 0, note: 1 },
        { room: 2, note: 3 },
      ],
    };
    const saved: unknown = JSON.parse(JSON.stringify(t));
    expect(parseFoundryState(saved)).toEqual(t);
    expect(KIT.shapes[FOUNDRY_SHAPE]?.parseState(saved)).toEqual(t);
    expect(KIT.modules.foundry?.trip?.initState()).toEqual({ rung: [] });
  });

  test('anything malformed reads strictly: bad entries dropped, one per room, sorted', () => {
    for (const raw of [undefined, null, 3, [], {}, { rung: 'x' }]) {
      expect(parseFoundryState(raw)).toEqual(initFoundryState());
    }
    expect(
      parseFoundryState({
        rung: [
          { room: 3, note: 4 },
          { room: 1, note: 2 },
          { room: 1, note: 3 }, // second entry for a room
          { room: 4, note: 1 }, // no such room
          { room: -1, note: 1 },
          { room: 0.5, note: 1 },
          { room: 0, note: 5 },
          { room: 0 },
          'x',
        ],
      }),
    ).toEqual({
      rung: [
        { room: 1, note: 2 },
        { room: 3, note: 4 },
      ],
    });
  });

  test('types: states are JSON', () => {
    expectTypeOf<BellsState>().toMatchTypeOf<Json>();
    expectTypeOf<TuneState>().toMatchTypeOf<Json>();
    expectTypeOf<FoundryTripState>().toMatchTypeOf<Json>();
    expectTypeOf<Tone>().toEqualTypeOf<'low' | 'mid' | 'high'>();
    expectTypeOf<Note>().toEqualTypeOf<1 | 2 | 3 | 4>();
  });
});

describe('BF-0 events and MEANINGFUL', () => {
  test('every foundry event has a line; the meaningful ones are in MEANINGFUL, the rest are not', () => {
    for (const type of FOUNDRY_EVENT_TYPES) {
      expect(KIT.events[type]?.describe({ type })).toMatch(/\w/);
    }
    for (const type of FOUNDRY_MEANINGFUL_TYPES) expect(MEANINGFUL.has(type), type).toBe(true);
    for (const type of FOUNDRY_EVENT_TYPES) {
      const listed = (FOUNDRY_MEANINGFUL_TYPES as readonly string[]).includes(type);
      expect(MEANINGFUL.has(type), type).toBe(listed);
    }
    expect([...MEANINGFUL].filter((t) => t.startsWith('foundry:')).sort()).toEqual(
      [...FOUNDRY_MEANINGFUL_TYPES].sort(),
    );
  });
});

/** The handoff invariants BF-2..BF-9 build on (see the comment block in `foundry/types.ts`). */
describe('BF-0 handoff invariants (P1-P9)', () => {
  test('P1 pieces: the four tokens, never brass-named', () => {
    expect(KIT.modules.foundry?.pieces?.map((p) => p.token)).toEqual([
      'bell',
      'rope',
      'hook',
      'greatBell',
    ]);
  });

  test('P3 a tone rings once a round; the tones run low to high', () => {
    expect(FOUNDRY_TUNING.ringsPerToneRound).toBe(1);
    expect(TONES).toEqual(['low', 'mid', 'high']);
  });

  test('P4 retune is up one tone and wraps', () => {
    expect(TONES.map(retunedTone)).toEqual(['mid', 'high', 'low']);
  });

  test('P1 pulse: 1 damage, pushed 1; P8 allied great bells hit harder (foes only, tune by playing)', () => {
    expect(FOUNDRY_TUNING.pulseDamage).toBe(1);
    expect(FOUNDRY_TUNING.pulsePush).toBe(1);
    expect(FOUNDRY_TUNING.alliedPulseDamage).toBe(2);
    expect(FOUNDRY_TUNING.alliedPulsePush).toBe(1);
  });

  test('P6 the four locks follow the four notes', () => {
    expect(LOCKS).toEqual(['reach', 'match', 'unison', 'chord']);
    expect(LOCK_OF_NOTE).toEqual({ 1: 'reach', 2: 'match', 3: 'unison', 4: 'chord' });
    expect(FOUNDRY_TUNING.rooms).toBe(4);
  });

  test('P7 a room bonus reads the great bell as rung through its data flag', () => {
    const rung = parseBoard('P {greatBell:1:rung}').tiles.flat()[1]?.piece?.data as Json;
    expect(rung).toMatchObject({ rung: true });
  });

  test('P9 the tune is four notes, no tone more than twice, seeded per Great Peal', () => {
    expect(FOUNDRY_TUNING.tuneLength).toBe(4);
    expect(FOUNDRY_TUNING.maxPerToneInTune).toBe(2);
    expect(Object.keys(initTune())).toEqual(['tune', 'at', 'peals', 'answered']);
  });

  test('P12 tones per room: two early, three later', () => {
    expect(FOUNDRY_TUNING.tonesInRoom).toEqual({ 1: 2, 2: 2, 3: 3, 4: 3, heart: 3 });
  });
});

describe('BF-0 tokens', () => {
  test('foe tokens are claimed and collide with nothing; the staff are in ENEMIES', () => {
    expect(FOUNDRY_FOE_IDS.map((id) => FOUNDRY_FOE_TOKENS[id])).toEqual(['Z', 'X', 'Q']);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'foundry' && t.kind === 'foe').map((t) => t.id),
    ).toEqual([...FOUNDRY_FOE_IDS]);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'foundry' && t.kind === 'piece').map(
        (t) => t.token,
      ),
    ).toEqual(['bell', 'rope', 'hook', 'greatBell']);
    // BF-6/7 put the staff in ENEMIES; BF-9 made the Carillonneur a rival (his `V` is in RIVAL_TOKENS)
    for (const id of FOUNDRY_FOE_IDS) expect(Object.hasOwn(ENEMIES, id)).toBe(true);
    const builtIn = [
      ...Object.values(ENEMIES)
        .filter((e) => !Object.hasOwn(RIVALS, e.id))
        .filter((e) => !DISTRICT_TOKENS.some((t) => t.kind === 'foe' && t.id === e.id))
        .map((e) => e.token),
      ...Object.values(APPRENTICES).map((a) => a.token),
      ...'DSRNBWTCE',
      ...'Piow~=#*hgl@_{!&$+>^v<.x',
    ];
    expect(tokenCollisions([...DISTRICT_TOKENS, ...RIVAL_TOKENS], [...new Set(builtIn)])).toEqual(
      [],
    );
  });

  test('the default hang tones are tones', () => {
    for (const note of [1, 2, 3, 4] as const) expect(TONES).toContain(DEFAULT_HANG[note]);
  });
});
