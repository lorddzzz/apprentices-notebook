import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { BRIDGE_HEART, spanVariantPool } from '$data/districts/bridges';
import { BRIDGE_TUNING } from '$data/districts/bridges/types';
import { RIVALS } from '$data/rivals';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { checkEnd } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import {
  CALL_STAFF,
  CHALK,
  CHIEF_SCRIPT,
  fogDir,
  HEART_STEPS,
  MIND_THE_EDGE,
  staffFor,
} from '$engine/districts/bridges/heart';
import { holdsRightOfWay } from '$engine/districts/bridges/keystoneRight';
import { cracksOf } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { KIT } from '$engine/districts/kit';
import { parseBoard } from '$engine/notation';
import { strikePiece } from '$engine/pieces';
import { push } from '$engine/push';
import { trickOf } from '$engine/rivals/tricks';
import { checkRoom } from '$engine/rooms';
import { awardsPage } from '$engine/standIn';
import { roundEnd } from '$engine/turn';
import type { BattleState, EnemyUnit } from '$engine/types';
import { board, cast, draft, unitAtLabel, withLattices } from '../../scenarios/harness';

/**
 * BR-11 (bridges P7, P16, P17): the great arch and the Chief Warden stand-in. He holds right of
 * way while the keystone stands (shoves and holds fail), crush plus a burst shatter the keystone,
 * he then falls like an elite and is ordinary, and felling him ends the room: the staff folds and
 * the remaining span drops as an epilogue. His script is a deterministic cycle by round.
 */

const chiefOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v): v is EnemyUnit => v.kind === 'enemy' && v.def === 'chiefWarden');
  if (!u) throw new Error('no chief');
  return u;
};
const ofType = (events: readonly { type: string }[], type: string) =>
  events.filter((e) => e.type === type);
type C = Parameters<Parameters<typeof draft>[1]>[0];
const shatter = (ctx: C, at = { x: 0, y: 0 }) => {
  strikePiece(ctx, at, 'push');
  strikePiece(ctx, at, 'burst');
};

describe('data and registration', () => {
  test('the rival: token K, an elite boss, no script, the shell and the def agree', () => {
    const e = ENEMIES.chiefWarden;
    expect(e).toMatchObject({ token: 'K', move: 0, elite: true, boss: true, anchored: false });
    expect(e.hp).toBe(BRIDGE_TUNING.chiefHp);
    expect(e.script).toBeUndefined();
    expect(RIVALS.chiefWarden).toMatchObject({ hp: e.hp, token: 'K', district: 'bridges' });
    expect(awardsPage({ def: 'chiefWarden' })).toBe(true);
  });

  test('steps, behaviour and the right-of-way trick are in the kit', () => {
    for (const step of HEART_STEPS) expect(KIT.steps[step.id]).toBe(step);
    expect(KIT.foes['bridges:chiefWarden']).toBeDefined();
    expect(trickOf('bridges:keystoneRight')).toBeDefined();
    expect(RIVALS.chiefWarden?.trick).toBe('bridges:keystoneRight');
  });

  test('the chief holds right of way while the keystone stands, and nobody else does', () => {
    const s = board('K{keystone:2} r . S');
    expect(chiefOf(s).rival?.rival).toBe('chiefWarden');
    expect(holdsRightOfWay(s, chiefOf(s))).toBe(true);
    const rat = s.units.find((u) => u.kind === 'enemy' && u.def === 'rat');
    expect(rat && holdsRightOfWay(s, rat)).toBe(false);
  });
});

describe('right of way while the keystone stands', () => {
  test('a Shove does not move him and is logged; it moves him once the keystone breaks', () => {
    const s = board('K{keystone:2} . S');
    const held = draft(s, (ctx) => {
      push(ctx, chiefOf(ctx.s), 'right', 1, null);
    });
    expect(chiefOf(held.state).pos).toEqual({ x: 0, y: 0 });
    expect(ofType(held.events, 'bridges:trickResists')).toHaveLength(1);
    const freed = draft(s, (ctx) => {
      shatter(ctx);
      push(ctx, chiefOf(ctx.s), 'right', 1, null);
    });
    expect(chiefOf(freed.state).pos).toEqual({ x: 1, y: 0 });
    expect(ofType(freed.events, 'bridges:trickResists')).toEqual([]);
  });

  test('a Hold is refused while it stands and lands after it breaks', () => {
    const page = { draughtsman: 'Bolt> Hold' };
    const stood = cast(withLattices('D K{keystone:2}', page), 'draughtsman', 'right');
    expect(chiefOf(stood.state).held).toBe(0);
    expect(ofType(stood.events, 'bridges:trickResists')).toHaveLength(1);
    const broken = draft(withLattices('D K{keystone:2}', page), (ctx) =>
      shatter(ctx, { x: 1, y: 0 }),
    );
    const freed = cast(broken.state, 'draughtsman', 'right');
    expect(chiefOf(freed.state).held).toBeGreaterThan(0);
  });

  test('plain damage still hurts him: right of way is not armour', () => {
    const s = board('K{keystone:2} . S');
    const r = draft(s, (ctx) => {
      dealDamage(ctx, chiefOf(ctx.s), 2, 'Test');
    });
    expect(chiefOf(r.state).hp).toBe(BRIDGE_TUNING.chiefHp - 2);
  });
});

describe('the keystone shatters', () => {
  const arch = 'K{keystone:2} {span} {pier} S';

  test('a crush and a burst break it; at dusk he falls as an elite and is ordinary', () => {
    const s = board(arch);
    const standing = draft(s, (ctx) => roundEnd(ctx));
    expect(chiefOf(standing.state).hp).toBe(BRIDGE_TUNING.chiefHp);
    expect(standing.state.tiles[0]?.terrain.drop).toBeFalsy();

    const r = draft(s, (ctx) => {
      shatter(ctx);
      // right away: no longer protected, though nothing has fallen yet
      expect(holdsRightOfWay(ctx.s, chiefOf(ctx.s))).toBe(false);
      roundEnd(ctx);
    });
    expect(ofType(r.events, 'bridges:keystoneBreaks')).toHaveLength(1);
    const chief = chiefOf(r.state);
    expect(r.state.tiles[0]?.terrain.drop).toBe(true);
    expect(chief.hp).toBe(BRIDGE_TUNING.chiefHp - BRIDGE_TUNING.eliteFall);
    expect(chief.stunned).toBe(true);
    expect(chief.out ?? null).toBeNull();
    expect(chief.pos).not.toEqual({ x: 0, y: 0 });
    expect(ofType(r.events, 'bridges:trickResists')).toEqual([]);
    expect(holdsRightOfWay(r.state, chief)).toBe(false);
  });

  test('before it breaks a dusk drop leaves him standing (the keystone tile holds)', () => {
    const r = draft(board('K{keystone:2} {span:1} S'), (ctx) => roundEnd(ctx));
    expect(chiefOf(r.state).hp).toBe(BRIDGE_TUNING.chiefHp);
  });
});

describe('the heart steps (the old stand-in script, kept for the Lab)', () => {
  test('the cycle is chalk, mind the edge, call the staff', () => {
    expect(CHIEF_SCRIPT).toEqual(['bridges:chalk', 'bridges:mindTheEdge', 'bridges:callStaff']);
  });

  test('chalk: telegraphs the apprentice in line, and he is held when it lands', () => {
    const s = board('S . K{keystone:6}');
    const tg = CHALK.plan(s, chiefOf(s));
    expect(tg).toMatchObject({ label: 'chalk' });
    const r = draft(s, (ctx) => {
      if (tg) CHALK.act(ctx, chiefOf(ctx.s), tg);
    });
    expect(unitAtLabel(r.state, 'A1').held).toBeGreaterThan(0);
  });

  test('mind the edge: whoever stands beside fog is shoved into it and falls', () => {
    const s = board('S . _ K{keystone:6}');
    const at = unitAtLabel(s, 'A1');
    expect(fogDir(s, at.pos)).toBeNull();
    const beside = board('. S _ K{keystone:6}');
    expect(fogDir(beside, unitAtLabel(beside, 'B1').pos)).toBe('right');
    const e = chiefOf(beside);
    const tg = MIND_THE_EDGE.plan(beside, e);
    expect(tg).toMatchObject({ label: 'mind the edge', units: [unitAtLabel(beside, 'B1').id] });
    expect(MIND_THE_EDGE.plan(s, chiefOf(s))).toBeNull();
    const r = draft(beside, (ctx) => {
      if (tg) MIND_THE_EDGE.act(ctx, chiefOf(ctx.s), tg);
    });
    expect(ofType(r.events, 'dropped').length + ofType(r.events, 'outOfRoom').length).toBe(1);
  });

  test('mind the edge: the one who stepped away is missed', () => {
    const beside = board('. S _ K{keystone:6}');
    const tg = MIND_THE_EDGE.plan(beside, chiefOf(beside));
    const r = draft(beside, (ctx) => {
      unitAtLabel(ctx.s, 'B1').pos = { x: 0, y: 0 };
      if (tg) MIND_THE_EDGE.act(ctx, chiefOf(ctx.s), tg);
    });
    expect(ofType(r.events, 'outOfRoom')).toEqual([]);
  });

  test('call the staff: a Gargoyle then a Mason by round, on the nearest free span, up to the cap', () => {
    expect([3, 6, 9, 12].map(staffFor)).toEqual(['gargoyle', 'mason', 'gargoyle', 'mason']);
    const s = board('K{keystone:6} {span} {span} {pier} S');
    const at = (round: number) => {
      const t = structuredClone(s);
      t.round = round;
      return t;
    };
    const tg = CALL_STAFF.plan(at(3), chiefOf(s));
    expect(tg).toMatchObject({ label: 'call a gargoyle', tiles: [{ x: 1, y: 0 }] });
    const r = draft(at(3), (ctx) => {
      if (tg) CALL_STAFF.act(ctx, chiefOf(ctx.s), tg);
    });
    expect(r.state.units.some((u) => u.kind === 'enemy' && u.def === 'gargoyle')).toBe(true);
    expect(ofType(r.events, 'summon')).toHaveLength(1);
    expect(CALL_STAFF.plan(at(6), chiefOf(s))).toMatchObject({ label: 'call a mason' });
    // at the cap nothing more comes
    const full = board('K{keystone:6} {span} {span} {pier} j y J');
    full.round = 3;
    expect(CALL_STAFF.plan(full, chiefOf(full))).toBeNull();
  });
});

describe('felling him ends the room, and the bridge drops after the win', () => {
  const FIGHT = 'D {span} K{keystone:6} {span} j{span} {pier}';

  test('a killing blow: staff folds, phase won, epilogue collapse, piers stand', () => {
    const s = withLattices(FIGHT, { draughtsman: 'Bolt> Strike' });
    const chief = chiefOf(s);
    chief.hp = 1;
    const r = draft(s, (ctx) => {
      dealDamage(ctx, chiefOf(ctx.s), 5, 'Test');
      checkEnd(ctx);
    });
    expect(r.state.phase).toBe('won');
    const epilogue = ofType(r.events, 'bridges:collapse') as unknown as {
      data: { epilogue: boolean; units: string[]; tiles: unknown[] };
    }[];
    expect(epilogue).toHaveLength(1);
    expect(epilogue[0]?.data).toMatchObject({ epilogue: true, units: [] });
    expect(epilogue[0]?.data.tiles).toHaveLength(4); // 3 span + keystone, not the pier
    expect(r.state.units.filter((u) => u.kind === 'enemy' && u.hp > 0)).toEqual([]);
    const members = r.state.units.filter((u) => u.kind === 'member');
    expect(members.every((m) => m.hp > 0 && !m.out)).toBe(true);
    const dropped = r.state.tiles.filter((t) => t.terrain.drop).length;
    expect(dropped).toBe(4);
    expect(r.state.tiles.some((t) => t.piece?.id === 'bridges:pier')).toBe(true);
    // the win is logged after the chief's own death and the staff's
    const types = r.events.map((e) => e.type);
    expect(types.lastIndexOf('died')).toBeLessThan(types.indexOf('bridges:collapse'));
    expect(types).toContain('won');
  });

  test('a real cast does it: the Strike that fells him wins the fight', () => {
    const s = withLattices('D . K{keystone:6} {pier}', { draughtsman: 'Bolt> Strike' });
    chiefOf(s).hp = 1;
    const r = cast(s, 'draughtsman', 'right');
    expect(r.state.phase).toBe('won');
    expect(ofType(r.events, 'bridges:collapse')).toHaveLength(1);
  });

  test('felled after the keystone broke: no keystone tile left to drop, the rest still falls', () => {
    const s = board('D K{keystone:2} {span} {pier}');
    const r = draft(s, (ctx) => {
      shatter(ctx, { x: 1, y: 0 });
      roundEnd(ctx);
      const chief = chiefOf(ctx.s);
      dealDamage(ctx, chief, chief.hp, 'Test');
      checkEnd(ctx);
    });
    expect(r.state.phase).toBe('won');
    const collapses = ofType(r.events, 'bridges:collapse');
    expect(collapses.length).toBeGreaterThanOrEqual(1);
  });
});

// ── The two approach boards ──────────────────────────────

const boardOf = (layout: string) =>
  createBattle({
    title: 't',
    board: layout,
    seed: 1,
    edge: 'drop',
    lineup: FOUNDERS,
    party: Object.fromEntries(
      FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
    ),
  }).state;

describe('the great arch boards', () => {
  test('two approaches, sound then crumbling, with the heart room flagged and named', () => {
    expect(BRIDGE_HEART.heart).toBe(true);
    expect(BRIDGE_HEART.title).toBe('The great arch');
    expect(BRIDGE_HEART.depth).toBe(5);
    expect(BRIDGE_HEART.variants).toHaveLength(2);
    expect(spanVariantPool(4, 'sound')).toEqual([0]);
    expect(spanVariantPool(4, 'crumbling')).toEqual([1]);
    const names = BRIDGE_HEART.variants?.map((v) => v.name) ?? [];
    expect(new Set(names).size).toBe(2);
  });

  describe.each([
    { name: 'sound', index: 0, stone: BRIDGE_TUNING.stone.sound },
    { name: 'crumbling', index: 1, stone: BRIDGE_TUNING.stone.crumbling },
  ])('$name approach', ({ index, stone, name }) => {
    const layout = BRIDGE_HEART.variants?.[index]?.layout ?? '';
    const spec = parseBoard(layout);
    const state = boardOf(layout);

    test('passes checkRoom, in the size band, with enough start points', () => {
      expect(checkRoom(layout)).toEqual([]);
      if (name === 'sound') {
        expect(spec.width).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBe(9);
      } else {
        expect(spec.width).toBeLessThanOrEqual(6);
        expect(spec.height).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBeLessThanOrEqual(7);
      }
      expect(spec.starts.length).toBeGreaterThanOrEqual(BRIDGE_TUNING.minStarts);
      expect(state.edge).toBe('drop');
    });

    test('the chief stands on the keystone with right of way; nothing starts cracked', () => {
      const chief = chiefOf(state);
      const t = state.tiles[chief.pos.y * state.width + chief.pos.x];
      expect(t?.piece?.id).toBe('bridges:keystone');
      expect(holdsRightOfWay(state, chief)).toBe(true);
      expect(cracksOf(state)).toEqual([]);
    });

    test('every standable tile is span or pier; span has the approach stone; one keystone', () => {
      const rule = state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      for (const t of state.tiles.filter((x) => !x.terrain.drop)) expect(t.piece).not.toBeNull();
      const keystones = state.tiles.filter((t) => t.piece?.id === 'bridges:keystone').length;
      expect(keystones).toBe(1);
      const spanStone = state.tiles.flatMap((t, i) =>
        t.piece?.id === 'bridges:span'
          ? [rule.stone[`${i % state.width},${Math.floor(i / state.width)}`]]
          : [],
      );
      expect(spanStone.every((n) => n === stone)).toBe(true);
    });

    test('foes are the chief and the staff, three or more tiles from every start', () => {
      const foes = state.units.filter((u) => u.kind === 'enemy');
      for (const u of foes) {
        expect(['chiefWarden', 'warden', 'gargoyle', 'mason']).toContain(u.def);
      }
      expect(foes.filter((u) => u.def === 'chiefWarden')).toHaveLength(1);
      for (const p of spec.starts) {
        for (const u of spec.units) {
          expect(Math.abs(p.x - u.at.x) + Math.abs(p.y - u.at.y)).toBeGreaterThanOrEqual(3);
        }
      }
    });

    test('no start stands beside fog, so round one cannot shove anyone off', () => {
      for (const p of spec.starts) expect(fogDir(state, p)).toBeNull();
    });

    test('a pier-held start survives the keystone going', () => {
      const s = structuredClone(state);
      const rule = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      const k = Object.keys(rule.stone).find((key) => {
        const [x, y] = key.split(',').map(Number);
        return s.tiles[(y ?? 0) * s.width + (x ?? 0)]?.piece?.id === 'bridges:keystone';
      });
      if (k) rule.stone[k] = 0;
      const cracked = new Set(cracksOf(s).map((c) => `${c.x},${c.y}`));
      expect(spec.starts.some((p) => !cracked.has(`${p.x},${p.y}`))).toBe(true);
    });
  });
});
