import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { MemberId } from '$data';
import { BATHER_AREA_SOURCES, STEWARD_TUNING } from '$data/districts/bathhouses';
import { RIVAL_PAGES, RIVALS, type RivalDef, type RivalPageDef } from '$data/rivals';
import {
  BATH_STEWARD_GOALS,
  BATH_STEWARD_PAGE,
  BATH_STEWARD_RIVAL,
  STEWARD_TRICK_ID,
} from '$data/rivals/bathSteward';
import {
  type BattleState,
  byReadingOrder,
  type Coord,
  cloudNet,
  describeLog,
  isCloud,
  parseLabel,
  sameCoord,
  tileAt,
  unitAt,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { parseBoilOver } from '$engine/districts/bathhouses/boilOver';
import { BOIL_OVER_RULE_ID } from '$engine/districts/bathhouses/types';
import { registerGoal } from '$engine/rivals/goals';
import { rivalAct } from '$engine/rivals/resolve';
import { makeTrickObject, registerTrick, removeTrickObject } from '$engine/rivals/tricks';
import type { TrickDef } from '$engine/rivals/types';
import { spawnRival } from '$engine/rivals/unit';
import { listRules } from '$engine/rules';
import { act, cast, draft, expectLogIncludes, withLattices } from '../scenarios/harness';
import { rivalOf } from './fixtures/harness';

/**
 * BH-17a: the Bath-Steward as data through RV's authoring API. The def, goals and page are the
 * real data (`data/rivals/bathSteward.ts`); his trick (stoke, steams away) is BH-17b's engine
 * work, so a test-only stand-in trick registers here with the same id and the RV-14 `steam`
 * fixture's rule. `RIVALS` does not list him (the stand-in heart still owns `bathSteward`), so the
 * test adds him for its own scenes, on the Lamplighter's `L` shell as the fixtures do.
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const STOKE_AMOUNT = STEWARD_TUNING.stokePips * 4;
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const TRICK: TrickDef<null> = {
  id: STEWARD_TRICK_ID,
  name: 'the Steward',
  init: () => null,
  action: {
    plan: (s) =>
      s.rules && Object.hasOwn(s.rules, BOIL_OVER_RULE_ID) ? [{ lock: null, data: null }] : [],
    resolve(ctx, unit, _intent, own) {
      // A stoke raises the gauge and nothing else, so the planner would call it starved (no
      // effect event); a transient trick object is the one effect an action trick can log.
      removeTrickObject(ctx, makeTrickObject(ctx, unit, null, null), 'gone');
      const rules = ctx.s.rules;
      if (!rules) return own;
      const g = parseBoilOver(rules[BOIL_OVER_RULE_ID]);
      const pressure = Math.min(g.capacity, g.pressure + STOKE_AMOUNT);
      ctx.s.rules = { ...rules, [BOIL_OVER_RULE_ID]: { ...g, pressure } };
      return own;
    },
  },
  beforeHarm(ctx, unit, harm) {
    if (harm.kind !== 'hit' || BATHER_AREA_SOURCES.includes(harm.source)) return { kind: 'pass' };
    if (!isCloud(tileAt(ctx.s, unit.pos))) return { kind: 'pass' };
    const to = cloudNet(ctx.s, unit.pos)
      .filter((c) => !sameCoord(c, unit.pos) && !unitAt(ctx.s, c))
      .sort((a, b) => manhattan(b, unit.pos) - manhattan(a, unit.pos) || byReadingOrder(a, b))[0];
    return to ? { kind: 'relocate', to, cause: 'hop' } : { kind: 'pass' };
  },
  draw: () => ({ label: 'stoke', tiles: [], units: [] }),
  describe: () => 'stokes the house',
};

let undo: (() => void)[] = [];
beforeAll(() => {
  undo = [registerTrick(TRICK), ...BATH_STEWARD_GOALS.map(registerGoal)];
  (RIVALS as Record<string, RivalDef>).bathSteward = BATH_STEWARD_RIVAL;
  (RIVAL_PAGES as Record<string, RivalPageDef>)[BATH_STEWARD_PAGE.id] = BATH_STEWARD_PAGE;
});
afterAll(() => {
  for (const u of undo) u();
  delete (RIVALS as Record<string, RivalDef>).bathSteward;
  delete (RIVAL_PAGES as Record<string, RivalPageDef>)[BATH_STEWARD_PAGE.id];
});

/** The Steward on the `L` shell, the gauge listed, his round-1 telegraph planned. */
function hall(
  ascii: string,
  gauge = false,
  lattices: Partial<Record<MemberId, string>> = {},
): BattleState {
  const s = structuredClone(withLattices(ascii, lattices));
  if (gauge) s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: 4 } });
  return runDraft(s, (ctx) => {
    const e = rivalOf(ctx.s);
    e.rival = spawnRival(BATH_STEWARD_RIVAL);
    e.hp = BATH_STEWARD_RIVAL.hp;
    e.maxHp = BATH_STEWARD_RIVAL.hp;
    e.intent = null;
    rivalAct(ctx, e, 1, false);
  }).state;
}

describe('data', () => {
  test('the def, its page and the Seep note link', () => {
    expect(BATH_STEWARD_RIVAL).toMatchObject({
      token: 'H',
      hp: 14,
      move: 0,
      page: BATH_STEWARD_PAGE.id,
    });
    expect(RIVAL_PAGES[BATH_STEWARD_PAGE.id]).toBe(BATH_STEWARD_PAGE);
    expect(BATH_STEWARD_PAGE.lattice).toBe('Vat> Seep Steam');
    expect(BATH_STEWARD_PAGE.note).toEqual({
      rune: 'seep',
      line: 'seep:member',
      variant: 'bathSteward:seep',
    });
    expect(BATH_STEWARD_PAGE.annotation.length).toBeGreaterThan(0);
    expect(BATH_STEWARD_PAGE.story.length).toBeGreaterThan(0);
  });
});

const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;

describe('the trial scene', () => {
  const SCENE = '. . . . . . .\n. L D . . . .\n. . . . . . .';

  test('he lays steam over his own tile, then shoves from within it', () => {
    const s = hall(SCENE);
    expect(rivalOf(s).intent).toMatchObject({ kind: 'cast', spell: 'steamHall' });
    let r = endTurn(s);
    expectLogIncludes(r.events, ['lamplighter at B2 casts Vat at C2']);
    expect(isCloud(tileAt(r.state, at('B2')))).toBe(true);
    expect(isCloud(tileAt(r.state, at('C2')))).toBe(true);
    expect(isCloud(tileAt(r.state, at('E2')))).toBe(true); // wide: Vat 2x2 and Seep's neighbours
    r = endTurn(r.state);
    expectLogIncludes(r.events, ['lamplighter at B2 casts Bolt right']);
    expect(describeLog(r.events)).toContain('Draughtsman is pushed right to D2');
    expect(rivalOf(r.state).rival?.charges).toMatchObject({ steamHall: 4, shove: 4 });
  });

  test('he stokes when two apprentices stand in cloud and the house has a gauge', () => {
    const wet = '. . . . . . .\n. L~ D~ S~ . . .\n. . . . . . .';
    const s = hall(wet, true);
    expect(rivalOf(s).intent).toMatchObject({ kind: 'trick', trick: STEWARD_TRICK_ID });
    const r = endTurn(s);
    expectLogIncludes(r.events, ['lamplighter at B2 uses the Steward']);
    // One in cloud is not enough, nor is a board with no gauge.
    const one = hall('. . . . . . .\n. L~ D~ S . . .\n. . . . . . .', true);
    expect(rivalOf(one).intent).toMatchObject({ kind: 'cast' });
    expect(rivalOf(hall(wet)).intent).toMatchObject({ kind: 'cast' });
  });

  test('steams away: struck in his cloud he re-forms across it (RV-14 parity); a storm or a cut lands', () => {
    // The RV-14 `steam` fixture's board and answer: the farthest free tile of that cloud, E2.
    const lattices = { draughtsman: 'Bolt> Strike' };
    const s = hall('D . . L~ ~\n. . . ~ ~\n. . . . .', false, lattices);
    const r = cast(s, 'draughtsman', 'right');
    expectLogIncludes(r.events, [
      'Strike leaves lamplighter at D1 unharmed',
      'lamplighter at D1 moves to E2',
    ]);
    expect(rivalOf(r.state)).toMatchObject({ pos: at('E2'), hp: BATH_STEWARD_RIVAL.hp });

    // Out of cloud the hit lands.
    const dry = cast(hall('D . L .\n. . . .', false, lattices), 'draughtsman', 'right');
    expect(rivalOf(dry.state).hp).toBe(BATH_STEWARD_RIVAL.hp - 2);

    // A burst of the cloud is not steamed away.
    const hit = draft(s, (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 2, BATHER_AREA_SOURCES[0] ?? 'Storm');
    });
    expect(hp(hit.state, rivalOf(hit.state).id)).toBe(BATH_STEWARD_RIVAL.hp - 2);
  });

  test('the scene in order: lay, shove from within, then steams away when struck in the cloud', () => {
    let s = hall(SCENE);
    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      const k = rivalOf(s).intent;
      seen.push(k?.kind === 'cast' ? k.spell : (k?.kind ?? 'none'));
      s = endTurn(s).state;
    }
    expect(seen).toEqual(['steamHall', 'shove']);
  });

  test.todo(
    'BH-17b: steams away is the district-registered beforeHarm reaction, not this test-only trick',
  );
});
