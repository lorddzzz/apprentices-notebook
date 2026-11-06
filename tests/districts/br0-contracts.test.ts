import { describe, expect, expectTypeOf, test } from 'vitest';
import { APPRENTICES, ENEMIES, PLAYABLE_DISTRICTS } from '$data';
import {
  BRIDGE_FOE_IDS,
  BRIDGE_FOE_TOKENS,
  BRIDGE_TUNING,
  SPAN_KINDS,
  type SpanKind,
} from '$data/districts/bridges/types';
import { DISTRICT_TOKENS, DISTRICTS, tokenCollisions } from '$data/districts/index';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import { KIT } from '$engine/districts';
import {
  BRIDGE_EVENT_TYPES,
  BRIDGE_SHAPE,
  type BridgesState,
  type BridgeTripState,
  COLLAPSE_RULE_ID,
  initBridges,
  KEYSTONE_PIECE,
  PIER_PIECE,
  parseBridgeState,
  parseBridges,
  SPAN_PIECE,
} from '$engine/districts/bridges/types';
import type { Json } from '$engine/districts/types';
import { parseBoard, serializeBoard } from '$engine/notation';
import { DISTRICT_UI } from '$ui/districts';
import { board, draft } from '../scenarios/harness';

/** BR-0: the bridges' module is registered and inert; its contracts compile and read strictly. */
describe('BR-0 registration', () => {
  test('data, engine and UI modules are registered; the district is still drawing', () => {
    const d = DISTRICTS.bridges;
    expect(d.gate).toEqual({ kind: 'drawing' });
    expect(d.rooms).toEqual([]);
    expect(d.lean.lean).toBe('height');
    expect(PLAYABLE_DISTRICTS).not.toContain('bridges');
    expect(KIT.modules.bridges?.id).toBe('bridges');
    expect(DISTRICT_UI.bridges).toBeDefined();
  });

  test('the module registers pieces, one piece-scoped late rule, events and the trip shape only', () => {
    const m = KIT.modules.bridges;
    expect(m?.pieces?.map((p) => p.id)).toEqual([SPAN_PIECE, PIER_PIECE, KEYSTONE_PIECE]);
    expect(Object.keys(KIT.rules).filter((id) => id.startsWith('bridges:'))).toEqual([
      COLLAPSE_RULE_ID,
    ]);
    const rule = KIT.rules[COLLAPSE_RULE_ID];
    expect(rule?.slot).toBe('late');
    expect(rule?.scope).toBe('piece');
    expect(Object.keys(KIT.events).filter((t) => t.startsWith('bridges:'))).toEqual([
      ...BRIDGE_EVENT_TYPES,
    ]);
    expect(BRIDGE_EVENT_TYPES).toContain('bridges:stoneWorn');
    expect(BRIDGE_EVENT_TYPES).toContain('bridges:collapse');
    // nothing else: no foes, guards, steps, offers, causes or tricks yet
    expect(m?.foes ?? []).toEqual([]);
    expect(m?.harmGuards ?? []).toEqual([]);
    expect(m?.steps ?? []).toEqual([]);
    expect(m?.offerKinds ?? []).toEqual([]);
    expect(Object.keys(KIT.causes).filter((c) => c.startsWith('bridges:'))).toEqual([
      'bridges:fall',
    ]);
    expect(Object.keys(KIT.shapes)).toContain(BRIDGE_SHAPE);
  });
});

describe('BR-0 inert stubs', () => {
  test('the collapse rule changes nothing and keeps its state', () => {
    const rule = KIT.rules[COLLAPSE_RULE_ID];
    const own: BridgesState = {
      stone: { '1,1': 1 },
      originals: ['1,1'],
      cuts: { '2,2': { by: 'rat-1', cause: 'crush' } },
    };
    // With nothing cracked the step changes nothing and keeps its state (BR-3 adds the fall).
    const quiet = board('{pier} {span}');
    const r = draft(quiet, (ctx) => rule?.step(ctx, own));
    expect(r.events).toEqual([]);
    expect(rule?.init(board('.'), undefined)).toEqual(initBridges());
  });

  test('the pieces parse and round-trip in notation, with data suffixes', () => {
    const spec = parseBoard('P {span} {span:1} {pier} {keystone:3}');
    const pieces = spec.tiles.flat().map((t) => t.piece);
    expect(pieces.map((p) => p?.id)).toEqual([
      undefined,
      SPAN_PIECE,
      SPAN_PIECE,
      PIER_PIECE,
      KEYSTONE_PIECE,
    ]);
    expect(pieces[1]?.data).toEqual({ stone: BRIDGE_TUNING.stone.sound });
    expect(pieces[2]?.data).toEqual({ stone: 1 });
    expect(pieces[4]?.data).toEqual({ hp: 3 });
    const text = serializeBoard(spec);
    expect(serializeBoard(parseBoard(text))).toBe(text);
  });

  test('a board with no bridge pieces never activates the rule', () => {
    const spec = parseBoard('P r .\n. . .');
    expect(spec.tiles.flat().some((t) => t.piece)).toBe(false);
  });
});

describe('BR-0 rule state and trip state', () => {
  test('rule state round-trips through JSON and has no cracked set', () => {
    const s: BridgesState = {
      stone: { '0,0': 2, '1,0': 0 },
      originals: ['0,0', '1,0'],
      cuts: { '1,0': { by: null, cause: 'burst' } },
    };
    const saved: unknown = JSON.parse(JSON.stringify(s));
    expect(parseBridges(saved)).toEqual(s);
    expect(Object.keys(initBridges()).sort()).toEqual(['cuts', 'originals', 'stone']);
    // a stored `cracked` field (the derived set) is never read back
    expect(parseBridges({ ...s, cracked: ['0,0'] })).toEqual(s);
  });

  test('anything malformed reads strictly', () => {
    for (const raw of [undefined, null, 3, 'x', [], {}]) {
      expect(parseBridges(raw)).toEqual(initBridges());
    }
    expect(
      parseBridges({
        stone: { '1,1': -2, bad: 1, '2,2': 'x', '3,3': 1.7 },
        originals: ['1,1', '1,1', 5, 'nope'],
        cuts: {
          '1,1': { by: 4, cause: 'crush' },
          '2,2': { by: 'a', cause: 'poof' },
          '3,3': { by: null, cause: 'shatter' },
        },
      }),
    ).toEqual({
      stone: { '1,1': 0, '3,3': 1 },
      originals: ['1,1'],
      cuts: { '3,3': { by: null, cause: 'shatter' } },
    });
  });

  test('trip state keeps the recorded span kinds, through the registered shape', () => {
    const t: BridgeTripState = { spans: ['sound', 'crumbling'] };
    const saved: unknown = JSON.parse(JSON.stringify(t));
    expect(parseBridgeState(saved)).toEqual(t);
    expect(KIT.shapes[BRIDGE_SHAPE]?.parseState(saved)).toEqual(t);
    expect(KIT.modules.bridges?.trip?.initState()).toEqual({ spans: [] });
    expect(parseBridgeState({ spans: ['sound', 'wide', 3, 'crumbling'] })).toEqual({
      spans: ['sound', 'crumbling'],
    });
    for (const raw of [undefined, null, 3, [], {}, { spans: 'sound' }]) {
      expect(parseBridgeState(raw)).toEqual({ spans: [] });
    }
  });

  test('types: states are JSON', () => {
    expectTypeOf<BridgesState>().toMatchTypeOf<Json>();
    expectTypeOf<BridgeTripState>().toMatchTypeOf<Json>();
    expectTypeOf<SpanKind>().toEqualTypeOf<'sound' | 'crumbling'>();
  });
});

describe('BR-0 tuning and tokens', () => {
  test("the design's numbers", () => {
    expect(SPAN_KINDS).toEqual(['sound', 'crumbling']);
    expect(BRIDGE_TUNING.stone).toEqual({ sound: 2, crumbling: 1 }); // P3
    expect(BRIDGE_TUNING.keystoneHp).toBe(6); // P7
    expect(BRIDGE_TUNING.chiefHp).toBe(10);
    expect(BRIDGE_TUNING.eliteFall).toBe(4); // P5
    expect(BRIDGE_TUNING.rooms + 1).toBe(5); // P1: four rooms and the heart
    expect(BRIDGE_TUNING.choices).toBe(4);
    const { room1, mid, heart } = BRIDGE_TUNING.layouts; // P10: 17 boards
    const total =
      room1.sound +
      room1.crumbling +
      3 * (mid.sound + mid.crumbling) +
      heart.sound +
      heart.crumbling;
    expect(total).toBe(17);
    expect(BRIDGE_TUNING.foes.warden).toMatchObject({ hp: 4, move: 2, elite: true });
    expect(BRIDGE_TUNING.foes.gargoyle).toMatchObject({
      hp: 3,
      move: 3,
      flies: true,
      elite: false,
    });
    expect(BRIDGE_TUNING.foes.mason).toMatchObject({ hp: 3, move: 2 });
  });

  test('foe tokens are claimed and collide with nothing; the staff is not in ENEMIES yet', () => {
    expect(BRIDGE_FOE_IDS.map((id) => BRIDGE_FOE_TOKENS[id])).toEqual(['j', 'y', 'J', 'K']);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'bridges' && t.kind === 'foe').map((t) => t.id),
    ).toEqual([...BRIDGE_FOE_IDS]);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'bridges' && t.kind === 'piece').map(
        (t) => t.token,
      ),
    ).toEqual(['span', 'pier', 'keystone']);
    for (const id of BRIDGE_FOE_IDS) expect(Object.hasOwn(ENEMIES, id)).toBe(false);
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
});
