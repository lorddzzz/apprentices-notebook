import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS, DISTRICTS, type DistrictDef, type DistrictId } from '$data';
import type { KitHearCondition } from '$data/districts/index';
import {
  type EventLog,
  type GameEvent,
  hearAfterTrip,
  hearFromBattle,
  namedIn,
  newProfile,
  type Profile,
  startTrip,
} from '$engine';
import { actorsOf, conditionHolds, HEARING_KINDS, type HearScene, hearOf } from '$engine/hearing';
import type { Origin } from '$engine/types';
import { act, board } from '../scenarios/harness';

/**
 * Hearing kinds (district-kit P12, DK-8): each kind is a predicate over a fight's log and the
 * profile. Every kind is shown meeting its bar and narrowly missing it, and only an apprentice's
 * act is heard.
 */

// ── Log fixtures ────────────────────────────────────────
const unitRef = (id: string, member = false) => ({
  id,
  name: id,
  at: { x: 0, y: 0 },
  member,
});
const STOKER = unitRef('stoker', true);
const DRAUGHTSMAN = unitRef('draughtsman', true);
const rat = (n: number) => unitRef(`rat-${n}`);
const orig = (caster: string, cast = 1): Origin => ({ caster, spell: 'a', cast });

const cast = (by: ReturnType<typeof unitRef>): GameEvent => ({
  type: 'cast',
  caster: by,
  spell: 'a',
  aim: { kind: 'self' },
  aimText: '',
});
const marked = (target: ReturnType<typeof unitRef>, by: string): GameEvent => ({
  type: 'marked',
  unit: target,
  deep: false,
  bound: null,
  origin: orig(by),
});
const damage = (target: ReturnType<typeof unitRef>, by: string | null): GameEvent => ({
  type: 'damage',
  target,
  amount: 2,
  source: 'Strike',
  bonus: [],
  hpLeft: 4,
  ...(by ? { origin: orig(by, 2) } : {}),
});
const burst = (
  id: 'storm' | 'conduct' | 'fire',
  units: ReturnType<typeof unitRef>[],
  by: string | null = 'stoker',
  tiles = 3,
): GameEvent => ({
  type: 'burst',
  burst: id,
  at: { x: 0, y: 0 },
  tiles: Array.from({ length: tiles }, (_, x) => ({ x, y: 0 })),
  units,
  ...(by ? { origin: orig(by) } : {}),
});
const idiom = (id: string, by: string | null = 'stoker'): GameEvent => ({
  type: 'named',
  what: 'idiom',
  id,
  ...(by ? { origin: orig(by) } : {}),
});
const round = (n: number): GameEvent => ({ type: 'round', round: n });
const phase = (p: 'resolve' | 'enemy' | 'player'): GameEvent => ({ type: 'phase', phase: p });

const scene = (log: EventLog, profile: Profile = newProfile(), district: DistrictId = 'seam') =>
  ({ profile, district, party: ['stoker', 'draughtsman'], log }) satisfies HearScene;
const holds = (c: KitHearCondition, log: EventLog, p?: Profile, d?: DistrictId) =>
  conditionHolds(c, scene(log, p, d));

const kit = (id: DistrictId): readonly KitHearCondition[] => hearOf(id);
const owner = (id: DistrictId): KitHearCondition => {
  const c = kit(id).find((x) => x.voice === 'owner');
  if (!c) throw new Error(`${id} has no owner hearing`);
  return c;
};

// ── crossDebt ───────────────────────────────────────────
describe('crossDebt', () => {
  const c = owner('inkQuarter');

  test('meets: one apprentice marks a foe, a different apprentice hits it, same turn', () => {
    const log = [
      round(1),
      phase('player'),
      marked(rat(1), 'stoker'),
      damage(rat(1), 'draughtsman'),
    ];
    expect(holds(c, log)).toBe(true);
  });

  test('misses: the same apprentice hits its own mark', () => {
    const log = [round(1), marked(rat(1), 'stoker'), damage(rat(1), 'stoker')];
    expect(holds(c, log)).toBe(false);
  });

  test('misses: the other apprentice hits it on the next turn', () => {
    const log = [round(1), marked(rat(1), 'stoker'), round(2), damage(rat(1), 'draughtsman')];
    expect(holds(c, log)).toBe(false);
  });

  test('misses: the hit lands on a different foe than the marked one', () => {
    const log = [round(1), marked(rat(1), 'stoker'), damage(rat(2), 'draughtsman')];
    expect(holds(c, log)).toBe(false);
  });

  test('misses: the hit comes before the mark', () => {
    const log = [round(1), damage(rat(1), 'draughtsman'), marked(rat(1), 'stoker')];
    expect(holds(c, log)).toBe(false);
  });

  test('misses: a foe (or a rival) landed the second hit', () => {
    const log = [round(1), marked(rat(1), 'stoker'), damage(rat(1), 'rat-2')];
    expect(holds(c, log)).toBe(false);
  });

  test('a Shove has no origin; it is the shoving apprentice who hit', () => {
    const shove: GameEvent = {
      type: 'shove',
      by: DRAUGHTSMAN,
      target: rat(1),
      dir: 'right',
    };
    const log = [round(1), cast(STOKER), marked(rat(1), 'stoker'), shove, damage(rat(1), null)];
    expect(holds(c, log)).toBe(true);
  });

  test('only in the Seam', () => {
    const log = [round(1), marked(rat(1), 'stoker'), damage(rat(1), 'draughtsman')];
    expect(holds(c, log, undefined, 'canals')).toBe(false);
  });
});

// ── burstUnits ──────────────────────────────────────────
describe('burstUnits', () => {
  const c = owner('bathhouses');

  test('meets: a Storm reaching three units', () => {
    expect(holds(c, [burst('storm', [rat(1), rat(2), rat(3)])])).toBe(true);
  });

  test('misses: a Storm reaching two', () => {
    expect(holds(c, [burst('storm', [rat(1), rat(2)])])).toBe(false);
  });

  test('misses: three units in a burst that is not a Storm', () => {
    expect(holds(c, [burst('fire', [rat(1), rat(2), rat(3)])])).toBe(false);
  });

  test('counts units reached, once each, not tiles or hits', () => {
    expect(holds(c, [burst('storm', [rat(1), rat(1), rat(2)], 'stoker', 9)])).toBe(false);
  });

  test('misses: the Storm was not an apprentice cast (no origin, a foe origin)', () => {
    const three = [rat(1), rat(2), rat(3)];
    expect(holds(c, [burst('storm', three, null)])).toBe(false);
    expect(holds(c, [burst('storm', three, 'rat-9')])).toBe(false);
  });

  test('only in the Seam', () => {
    expect(holds(c, [burst('storm', [rat(1), rat(2), rat(3)])], undefined, 'bridges')).toBe(false);
  });
});

// ── conducted ───────────────────────────────────────────
describe('conducted', () => {
  const c = owner('foundry');

  test('meets: a Conduct burst reaching three units', () => {
    expect(holds(c, [burst('conduct', [rat(1), rat(2), rat(3)])])).toBe(true);
  });

  test('meets: a conducted Spark from the Bench reaching three units', () => {
    const e: GameEvent = {
      type: 'conducted',
      action: 'spark',
      units: [rat(1), rat(2), rat(3)],
      origin: orig('stoker'),
    };
    expect(holds(c, [e])).toBe(true);
  });

  test('misses: two units, or a conducted action that is not Spark', () => {
    expect(holds(c, [burst('conduct', [rat(1), rat(2)])])).toBe(false);
    const strike: GameEvent = {
      type: 'conducted',
      action: 'strike',
      units: [rat(1), rat(2), rat(3)],
      origin: orig('stoker'),
    };
    expect(holds(c, [strike])).toBe(false);
  });

  test('misses: three units in a Storm, not a Conduct; or a foe cast it', () => {
    expect(holds(c, [burst('storm', [rat(1), rat(2), rat(3)])])).toBe(false);
    expect(holds(c, [burst('conduct', [rat(1), rat(2), rat(3)], 'rat-9')])).toBe(false);
  });
});

// ── performed ───────────────────────────────────────────
describe('performed', () => {
  const c = owner('bridges');

  test('meets: The Wall named in this battle in the Seam', () => {
    expect(holds(c, [idiom('theWall')])).toBe(true);
  });

  test('misses: another idiom, or a district that is not the Seam', () => {
    expect(holds(c, [idiom('bonfire')])).toBe(false);
    expect(holds(c, [idiom('theWall')], undefined, 'canals')).toBe(false);
  });

  test('misses: the idiom was learned in an earlier battle (not in this log)', () => {
    const p = { ...newProfile(), named: ['idiom:theWall'] };
    expect(holds(c, [], p)).toBe(false);
  });

  test('misses: no apprentice behind it', () => {
    expect(holds(c, [idiom('theWall', null)])).toBe(false);
  });

  test('a real Shove along oil into a plate performs The Wall and the Seam hears the bridges', () => {
    const s = board('D r o o o {wall}');
    const r = act(s, { type: 'shove', unit: 'draughtsman', dir: 'right' });
    expect(namedIn(r.events)).toContain('idiom:theWall');
    const p = newProfile();
    const heard = hearFromBattle({ ...p, named: namedIn(r.events) }, startTrip(p, 1), r.events);
    expect(heard.heard).toEqual(['bridges']);
  });
});

// ── pages ───────────────────────────────────────────────
describe('pages', () => {
  const c = owner('cartographers');
  const held = (...pages: string[]): Profile =>
    ({ ...newProfile(), pages: pages as Profile['pages'] }) as Profile;
  const five = ['lamplighter:lantern', 'a:x', 'b:x', 'c:x', 'd:x'];

  test('meets: five pages held', () => {
    expect(holds(c, [], held(...five))).toBe(true);
  });

  test('misses: four pages, or none recorded', () => {
    expect(holds(c, [], held(...five.slice(1)))).toBe(false);
    expect(holds(c, [], newProfile())).toBe(false);
  });

  test("the Registrar's page never counts toward the five", () => {
    expect(holds(c, [], held(...five.slice(1), 'registrar:erasure'))).toBe(false);
    expect(holds(c, [], held(...five, 'registrar:erasure'))).toBe(true);
  });

  test('is heard from the fight that banks the fifth page', () => {
    const p = held(...five);
    const t = startTrip(newProfile(), 1);
    expect(hearFromBattle(p, t, []).heard).toEqual(['cartographers']);
    expect(hearFromBattle(held(...five.slice(1)), t, []).heard).toEqual([]);
  });
});

// ── named (district scope) and the registry ─────────────
describe('named, scoped to a district', () => {
  const learnt = (voice: 'owner' | 'rumour', district?: DistrictId): KitHearCondition => ({
    kind: 'named',
    id: 'idiom:bonfire',
    voice,
    ...(district ? { district } : {}),
  });
  const p = { ...newProfile(), named: ['idiom:bonfire'] };
  const named: GameEvent = { type: 'named', what: 'idiom', id: 'bonfire' };

  test('unscoped it is the profile, as built', () => {
    expect(holds(learnt('owner'), [], p, 'canals')).toBe(true);
    expect(holds(learnt('owner'), [], newProfile())).toBe(false);
  });

  test('scoped it must happen in this fight in that district', () => {
    expect(holds(learnt('owner', 'seam'), [named], p, 'seam')).toBe(true);
    expect(holds(learnt('owner', 'seam'), [named], p, 'canals')).toBe(false);
    expect(holds(learnt('owner', 'seam'), [], p, 'seam')).toBe(false);
  });

  test('scoped as a rumour it is the profile, on a trip to that district', () => {
    expect(holds(learnt('rumour', 'seam'), [], p, 'seam')).toBe(true);
    expect(holds(learnt('rumour', 'seam'), [], p, 'canals')).toBe(false);
  });
});

describe('the registry and the drawn districts', () => {
  test('every kind the data uses has a predicate', () => {
    for (const id of DISTRICT_IDS) {
      for (const c of hearOf(id))
        expect(HEARING_KINDS[c.kind], `${id} ${c.kind}`).toBeTypeOf('function');
    }
  });

  test('the placeholder triggers are gone from the five drawn districts', () => {
    for (const id of ['inkQuarter', 'bathhouses', 'bridges', 'foundry', 'cartographers'] as const) {
      const kinds = hearOf(id).map((c) => c.kind);
      expect(kinds, id).not.toContain('named');
      expect(kinds, id).not.toContain('heart');
    }
    expect(hearOf('cartographers').map((c) => c.kind)).toEqual(['pages']);
  });

  test('each of the five is heard by exactly its own event', () => {
    const three = [rat(1), rat(2), rat(3)];
    const t = startTrip(newProfile(), 1);
    const p = newProfile();
    const cases: [DistrictId, EventLog][] = [
      ['inkQuarter', [round(1), marked(rat(1), 'stoker'), damage(rat(1), 'draughtsman')]],
      ['bathhouses', [burst('storm', three)]],
      ['bridges', [idiom('theWall')]],
      ['foundry', [burst('conduct', three)]],
    ];
    for (const [id, log] of cases) {
      const heard = hearFromBattle({ ...p, named: namedIn(log) }, t, log).heard;
      expect(heard, id).toEqual([id]);
    }
  });

  test('a trip rumour still reaches the four, and the hall has none', () => {
    let p = newProfile();
    const t = startTrip(p, 1);
    for (let i = 0; i < 8; i++) p = hearAfterTrip(p, t, 'returned').profile;
    expect(p.city.heard).toEqual(
      expect.arrayContaining(['seam', 'inkQuarter', 'bathhouses', 'bridges', 'foundry']),
    );
    expect(p.city.heard).not.toContain('cartographers');
  });
});

describe('the canals keep their hearing', () => {
  test('a 3-tile fire in the Seam, from any source', () => {
    const c = DISTRICTS.canals.hear[0];
    expect(c).toMatchObject({ kind: 'burst', burst: 'fire', atLeast: 3, district: 'seam' });
    expect(hearOf('canals')).toBe(DISTRICTS.canals.hear);
    const fire = (by: string | null, tiles: number) => [burst('fire', [], by, tiles)];
    const k = hearOf('canals')[0] as KitHearCondition;
    expect(holds(k, fire(null, 3))).toBe(true);
    expect(holds(k, fire(null, 2))).toBe(false);
    expect(holds(k, fire(null, 3), undefined, 'canals')).toBe(false);
  });

  test('fixture tables read their own entries, not the kit', () => {
    const table = {
      ...DISTRICTS,
      bridges: { ...DISTRICTS.bridges, hear: [] },
    } as Record<DistrictId, DistrictDef>;
    expect(hearOf('bridges', table)).toEqual([]);
    expect(hearOf('bridges')).not.toEqual([]);
  });
});

describe('whose act it was', () => {
  test('origin wins; with none, the last apprentice action in the same phase', () => {
    const log: EventLog = [
      phase('player'),
      cast(STOKER),
      burst('fire', [], null),
      phase('enemy'),
      burst('fire', [], null),
      burst('fire', [], 'draughtsman'),
    ];
    expect(actorsOf(log, ['draughtsman'])).toEqual([
      null,
      'stoker',
      'stoker',
      null,
      null,
      'draughtsman',
    ]);
  });
});
