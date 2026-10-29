import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import type { ThresholdSpec } from '$data/districts/index';
import { type BattleState, type EnemyUnit, label, newProfile, objectiveMet } from '$engine';
import { candidatesOf } from '$engine/ai';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts/kit';
import type {
  BoardRule,
  DistrictModule,
  FoeBehaviour,
  Json,
  PieceDef,
} from '$engine/districts/types';
import type { HarmGuard } from '$engine/harm';
import { applyMark } from '$engine/marks';
import { IDLE } from '../../src/app/battleInput';
import { intentPhrase } from '../../src/app/describe';
import { overlayFor } from '../../src/app/overlay';
import { thresholdStart } from '../../src/app/threshold';
import { act, board, draft, unitAtLabel } from '../scenarios/harness';

/**
 * DK-IQ: the district kit's answers to the ink quarter's requests, with a fixture module's entries
 * put into the kit's registries for this file (as the stand-in test does: a mocked kit is not the
 * one the engine modules loaded during the mock bound to). D1 harm guards on marks and from modules; D2 ordinary foes on the behaviour
 * registry; D3 kit goals as a room objective; D7 `aiAvoid` pieces; D8 brought rules at creation.
 */

const FIXTURE = ((): DistrictModule => {
  const at = (s: { units: readonly { id: string; pos: { x: number; y: number } }[] }) =>
    Object.fromEntries(s.units.map((u) => [u.id, `${u.pos.x},${u.pos.y}`]));
  return {
    id: 'bathhouses',
    harmGuards: [
      {
        id: 'bathhouses:forward',
        kinds: ['hit', 'mark'],
        run: (_ctx, h) =>
          h.unit === 'rat-1'
            ? { kind: 'redirect', to: 'rat-2' }
            : h.unit === 'rat-3' && h.kind === 'mark'
              ? { kind: 'cancel' }
              : { kind: 'pass' },
      },
    ],
    pieces: [
      {
        id: 'bathhouses:puddle',
        token: 'puddle',
        solid: 'none',
        triggers: {},
        aiAvoid: true,
        art: 'puddle',
      },
      {
        id: 'bathhouses:mat',
        token: 'mat',
        solid: 'none',
        triggers: {},
        aiAvoid: true,
        exempt: ['rat'],
        art: 'mat',
      },
      {
        id: 'bathhouses:stake',
        token: 'stake',
        solid: 'none',
        triggers: {},
        rules: ['bathhouses:snap'],
        art: 'stake',
      },
    ],
    rules: [
      {
        id: 'bathhouses:snap',
        slot: 'late',
        order: 0,
        scope: 'piece',
        activatedBy: { kind: 'piece', pieces: ['bathhouses:stake'] },
        init: (s) => ({ at: at(s), seen: null }),
        step: (ctx, own) => ({ at: at(ctx.s), seen: (own as { at: Json }).at }),
      },
    ],
    foes: [
      {
        id: 'bathhouses:splash',
        plan: (s) => {
          const m = s.units.find((u) => u.kind === 'member' && u.hp > 0);
          return m ? { label: 'splash', tiles: [m.pos], units: [] } : null;
        },
        resolve: (ctx, unit, tg) => {
          const victim = ctx.s.units.find(
            (u) => u.hp > 0 && tg.tiles.some((t) => t.x === u.pos.x && t.y === u.pos.y),
          );
          if (victim) dealDamage(ctx, victim, 2, 'Splash', [], { heading: null, at: unit.pos });
        },
        preview: (_s, _u) => [{ kind: 'pulse', at: { x: 0, y: 0 } }],
        describe: (tg) => `splash ${tg.tiles.map((t) => `${'ABCDEFGH'[t.x]}${t.y + 1}`).join(',')}`,
      },
    ],
  };
})();

type Table<T> = Record<string, T>;
const tables = () => ({
  pieces: KIT.pieces as Table<PieceDef>,
  tokens: KIT.tokens as Table<PieceDef>,
  rules: KIT.rules as Table<BoardRule>,
  foes: KIT.foes as Table<FoeBehaviour>,
  guards: KIT.harmGuards as HarmGuard[],
});
beforeAll(() => {
  const t = tables();
  for (const p of FIXTURE.pieces ?? []) {
    t.pieces[p.id] = p;
    t.tokens[p.token] = p;
  }
  for (const r of FIXTURE.rules ?? []) t.rules[r.id] = r;
  for (const f of FIXTURE.foes ?? []) t.foes[f.id] = f;
  t.guards.push(...(FIXTURE.harmGuards ?? []));
});
afterAll(() => {
  const t = tables();
  for (const p of FIXTURE.pieces ?? []) {
    delete t.pieces[p.id];
    delete t.tokens[p.token];
  }
  for (const r of FIXTURE.rules ?? []) delete t.rules[r.id];
  for (const f of FIXTURE.foes ?? []) delete t.foes[f.id];
  t.guards.splice(t.guards.length - (FIXTURE.harmGuards ?? []).length);
});

const hpOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp;
const markOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.mark ?? null;
const ORIGIN = { caster: 'draughtsman', spell: '0,0', cast: 1 } as const;
const markOn = (lbl: string) => (ctx: Parameters<Parameters<typeof draft>[1]>[0]) =>
  applyMark(ctx, unitAtLabel(ctx.s, lbl), { deep: false, bound: null, origin: ORIGIN });

describe('D1: marks and hits pass the harm guards, modules contribute guards', () => {
  const BOARD = 'D r r r';

  test('a mark on a guarded unit is redirected to the guard target', () => {
    const r = draft(board(BOARD), markOn('B1'));
    expect(markOf(r.state, 'rat-1')).toBeNull();
    expect(markOf(r.state, 'rat-2')?.origin).toEqual(ORIGIN);
    expect(r.lines.filter((l) => l.includes('marked'))).toHaveLength(1);
  });

  test('a mark the guards pass is left alone', () => {
    const r = draft(board(BOARD), markOn('C1'));
    expect(markOf(r.state, 'rat-2')).not.toBeNull();
    expect(markOf(r.state, 'rat-1')).toBeNull();
  });

  test('a cancelled mark marks no one and logs unharmed', () => {
    const r = draft(board(BOARD), markOn('D1'));
    expect(markOf(r.state, 'rat-3')).toBeNull();
    expect(r.lines).toContain('Mark leaves rat at D1 unharmed');
  });

  test('a hit is redirected through a module guard', () => {
    const s = board(BOARD, { hp: { B1: 5, C1: 5 } });
    const r = draft(s, (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'test', [], { heading: null, at: null });
    });
    expect(hpOf(r.state, 'rat-1')).toBe(5);
    expect(hpOf(r.state, 'rat-2')).toBe(3);
  });
});

describe('D2: an ordinary foe on the behaviour registry', () => {
  const original = ENEMIES.dummy;
  beforeEach(() => {
    ENEMIES.dummy = { ...original, behaviour: 'bathhouses:splash' };
  });
  afterEach(() => {
    ENEMIES.dummy = original;
  });
  const foe = (s: BattleState): EnemyUnit => {
    const e = s.units.find((u): u is EnemyUnit => u.kind === 'enemy');
    if (!e) throw new Error('no foe');
    return e;
  };

  test('plans a behaviour intent with its telegraph, in words', () => {
    const s = board('S . . d');
    const i = foe(s).intent;
    expect(i).toEqual({
      kind: 'behaviour',
      id: 'bathhouses:splash',
      telegraph: { label: 'splash', tiles: [{ x: 0, y: 0 }], units: [] },
      order: 1,
    });
    expect(intentPhrase(s, foe(s))).toBe('will splash A1 (1st)');
    expect(label({ x: 0, y: 0 })).toBe('A1');
  });

  test('the board overlay draws its telegraph and its preview', () => {
    const o = overlayFor(board('S . . d'), IDLE);
    expect(o.steps?.map((d) => d.label)).toEqual(['splash']);
    expect(o.next?.shapes).toContainEqual({ kind: 'pulse', at: { x: 0, y: 0 } });
  });

  test('resolves on the telegraphed tile at the end of the turn', () => {
    const s = board('S . . d', { hp: { A1: 6 } });
    const r = act(s, { type: 'endTurn' });
    expect(r.lines.some((l) => l.includes('will splash A1'))).toBe(true);
    expect(hpOf(r.state, 'stoker')).toBe(4);
  });
});

describe('D3: a room objective in the kit goal language', () => {
  test('a unit-keyed `happens` goal is checked', () => {
    const s = board('D r r', { objective: { happens: 'marked', unit: 'rat-2' } });
    expect(objectiveMet(s, [])).toBe(false);
    const wrong = draft(s, markOn('B1')); // redirected to rat-2 by the fixture guard
    expect(objectiveMet(wrong.state, wrong.events)).toBe(true);
    const s2 = board('D r r', { objective: { happens: 'marked', unit: 'rat-1' } });
    const other = draft(s2, markOn('C1'));
    expect(objectiveMet(other.state, other.events)).toBe(false);
  });

  test('a `noneDowned` goal is checked', () => {
    const s = board('D r', { objective: { noneDowned: true }, hp: { A1: 1 } });
    expect(objectiveMet(s, [])).toBe(true);
    const r = draft(s, (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'A1'), 3, 'test', [], { heading: null, at: null });
    });
    expect(objectiveMet(r.state, r.events)).toBe(false);
  });

  test('a threshold room carries a kit goal into the battle', () => {
    const room: Pick<ThresholdSpec, 'name' | 'board' | 'goal'> = {
      name: 'test',
      board: 'P P . r',
      goal: { happens: 'marked', unit: 'rat-1' },
    };
    const s = thresholdStart(newProfile(), room).state;
    expect(s.objective).toEqual({ happens: 'marked', unit: 'rat-1' });
  });
});

describe('D7: foes do not end a walk on an `aiAvoid` piece', () => {
  const ends = (ascii: string) => {
    const s = board(ascii);
    const rat = s.units.find((u): u is EnemyUnit => u.kind === 'enemy');
    if (!rat) throw new Error('no rat');
    return candidatesOf(s, rat, true).map((c) => label(c.at));
  };

  test('a walk ending on the piece is dropped', () => {
    expect(ends('S . . r')).toContain('C1');
    expect(ends('S . {puddle} r')).not.toContain('C1');
  });

  test('a foe the piece exempts walks onto it', () => {
    expect(ends('S . {mat} r')).toContain('C1');
  });
});

describe('D8: a rule the board brings has its state from battle creation', () => {
  test('round 1 sees the battle-start positions', () => {
    const s = board('S . {stake} . r');
    expect(s.rules?.['bathhouses:snap']).toEqual({
      at: { stoker: '0,0', 'rat-1': '4,0' },
      seen: null,
    });
    const moved = act(s, { type: 'move', unit: 'stoker', to: { x: 1, y: 0 } }).state;
    const r = act(moved, { type: 'endTurn' });
    const own = r.state.rules?.['bathhouses:snap'] as { seen: Record<string, string> };
    expect(own.seen.stoker).toBe('0,0');
  });

  test('a board without the piece brings no state', () => {
    expect(board('S . . . r').rules?.['bathhouses:snap']).toBeUndefined();
  });
});
