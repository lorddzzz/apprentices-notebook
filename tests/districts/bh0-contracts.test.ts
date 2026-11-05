import { describe, expect, expectTypeOf, test } from 'vitest';
import { APPRENTICES, ATTACKS, ENEMIES, PLAYABLE_DISTRICTS } from '$data';
import {
  BATH_FOE_IDS,
  BATH_FOE_TOKENS,
  BOIL_CAPACITY_PIPS,
  HEAT,
  type HeatLevel,
} from '$data/districts/bathhouses/types';
import { DISTRICT_TOKENS, DISTRICTS, tokenCollisions } from '$data/districts/index';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import type { AttackDef } from '$data/types';
import type { ArrivalCause, UnitTrait } from '$engine/arrival';
import { KIT } from '$engine/districts';
import {
  BATH_EVENT_TYPES,
  BATH_SHAPE,
  type BathTripState,
  BOIL_OVER_RULE_ID,
  type BoilOverState,
  parseBathState,
  STEAM_CAUSE,
} from '$engine/districts/bathhouses/types';
import type { Json } from '$engine/districts/types';
import { parseBoard } from '$engine/notation';
import { DISTRICT_UI } from '$ui/districts';

/** BH-0: the bathhouses' module is registered and inert; its contracts compile and read strictly. */
describe('BH-0 registration', () => {
  test('data, engine and UI modules are registered; the district is still drawing', () => {
    const d = DISTRICTS.bathhouses;
    expect(d.gate).toEqual({ kind: 'drawing' });
    expect(d.ret).toEqual({ kind: 'any' });
    expect(d.lean.lean).toBe('steam');
    expect(d.rooms).toEqual([]);
    expect(PLAYABLE_DISTRICTS).not.toContain('bathhouses');
    expect(KIT.modules.bathhouses?.id).toBe('bathhouses');
    expect(DISTRICT_UI.bathhouses).toEqual({});
  });

  test("inert but for BH-1's rule, BH-4/5's foes and the bather's guard: no pieces or steps; lines, the shape and the cause", () => {
    const m = KIT.modules.bathhouses;
    expect(m?.foes?.map((f) => f.id)).toEqual([
      'bathhouses:attendant',
      'bathhouses:boilerman',
      'bathhouses:bather',
    ]);
    expect(m?.harmGuards?.map((g) => g.id)).toEqual(['bathhouses:bather']);
    for (const k of ['pieces', 'steps'] as const) {
      expect(m?.[k] ?? []).toEqual([]);
    }
    // BH-3 adds the cold plunge, the only offer kind
    expect((m?.offerKinds ?? []).map((o) => o.id)).toEqual(['bathhouses:plunge']);
    expect(Object.keys(KIT.rules).filter((id) => id.startsWith('bathhouses:'))).toEqual([
      BOIL_OVER_RULE_ID,
    ]);
    expect(Object.keys(KIT.events).filter((t) => t.startsWith('bathhouses:'))).toEqual([
      ...BATH_EVENT_TYPES,
      'bathhouses:passesThrough', // BH-4
    ]);
    expect(KIT.causes[STEAM_CAUSE]).toBe('landing');
    expect(
      Object.values(ATTACKS)
        .filter((a) => a.push !== undefined)
        .map((a) => a.id),
    ).toEqual(['shove']);
  });
});

describe('BH-0 trip state', () => {
  test('round-trips through JSON and the registered shape', () => {
    const s: BathTripState = { pendingCool: 1 };
    const saved: unknown = JSON.parse(JSON.stringify(s));
    expect(parseBathState(saved)).toEqual(s);
    expect(KIT.shapes[BATH_SHAPE]?.parseState(saved)).toEqual(s);
    expect(KIT.modules.bathhouses?.trip?.initState()).toEqual({ pendingCool: 0 });
  });

  test('anything else reads as not cooled', () => {
    for (const raw of [undefined, null, 3, 'x', [], {}, { pendingCool: 2 }, { pendingCool: '1' }]) {
      expect(parseBathState(raw)).toEqual({ pendingCool: 0 });
    }
  });
});

describe('BH-0 contracts', () => {
  test('heat table: four rows, whole-pip capacity', () => {
    expect(Object.keys(HEAT)).toEqual(['1', '2', '3', '4']);
    expect(BOIL_CAPACITY_PIPS).toBe(12);
    const h: HeatLevel = 4;
    expect(HEAT[h].tileQuarters).toBeGreaterThan(HEAT[1].tileQuarters);
  });

  test('types: rule state is JSON, traits and the steam cause join the unions, attacks may push', () => {
    expectTypeOf<BoilOverState>().toMatchTypeOf<Json>();
    expectTypeOf<BathTripState>().toMatchTypeOf<Json>();
    expectTypeOf<'dissolves' | 'feeds' | 'steamsAway'>().toMatchTypeOf<UnitTrait>();
    expectTypeOf<typeof STEAM_CAUSE>().toMatchTypeOf<ArrivalCause>();
    expectTypeOf<AttackDef['push']>().toEqualTypeOf<number | undefined>();
  });

  test('foe tokens are claimed and collide with no foe, roster, rival, district or board char', () => {
    expect(BATH_FOE_IDS.map((id) => BATH_FOE_TOKENS[id])).toEqual(['s', 't', 'c', 'H']);
    expect(DISTRICT_TOKENS.filter((t) => t.district === 'bathhouses').map((t) => t.id)).toEqual([
      ...BATH_FOE_IDS,
    ]);
    const builtIn = [
      ...Object.values(ENEMIES)
        .filter((e) => !Object.hasOwn(RIVALS, e.id)) // the rivals' own shells (RV-1, IQ-22)
        .filter((e) => !DISTRICT_TOKENS.some((t) => t.kind === 'foe' && t.id === e.id)) // a district's claimed foes (BH-5)
        .map((e) => e.token),
      ...Object.values(APPRENTICES).map((a) => a.token),
      ...'DSRNBWTCE',
      ...'Piow~=#*hgl@_{!&$+>^v<.x',
    ];
    expect(tokenCollisions([...DISTRICT_TOKENS, ...RIVAL_TOKENS], [...new Set(builtIn)])).toEqual(
      [],
    );
    // BH-4's and BH-5's foes parse; the Steward is not a foe yet.
    expect(parseBoard('s t c').units.map((u) => u.def)).toEqual([
      'dissolvedBather',
      'attendant',
      'boilerman',
    ]);
    expect(() => parseBoard('H')).toThrow();
  });
});
