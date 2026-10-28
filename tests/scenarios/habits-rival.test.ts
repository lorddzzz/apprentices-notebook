import { afterEach, describe, expect, test } from 'vitest';
import { ENEMIES, type HabitId } from '$data';
import { type BattleState, type GameEvent, type Jar, parseLabel, tileAt, unitAt } from '$engine';
import { burstAt } from '$engine/bursts';
import { dealDamage } from '$engine/damage';
import { habitOf, habitRule } from '$engine/habits';
import { enemyWalk } from '$engine/movement';
import { board, draft } from './harness';

/**
 * A rival's trick is the same data field an apprentice's habit is (actions-habits plan §1, last
 * bullet): `EnemyDef.trick` names a habit id and the engine reads it through `habitOf`. These
 * tests give a foe a trick and check the rule fires for it; and call the hook BH's boil-over will
 * use (`dealDamage` with `harm: 'steam'`) directly.
 */

const at = parseLabel;
const rat = ENEMIES.rat;
const dummy = ENEMIES.dummy;
const saved = { rat: rat.trick, dummy: dummy.trick };
afterEach(() => {
  rat.trick = saved.rat;
  dummy.trick = saved.dummy;
});
const giveTrick = (def: typeof rat, trick: HabitId): void => {
  def.trick = trick;
};

const dusk = (owner: string): Jar => ({
  owner,
  event: 'dusk',
  rest: null,
  heading: null,
  origin: { caster: owner, spell: 'x', cast: 0 },
});
const damageTo = (events: readonly GameEvent[], id: string) =>
  events.filter((e) => e.type === 'damage' && e.target.id === id);
const unharmed = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'unharmed');
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

describe('rival-trick: a foe with `trick` carries a habit through habitOf', () => {
  test('the trick is read as the foe habit, and the rule follows it', () => {
    const s = board('D . r');
    expect(habitOf(unit(s, 'rat-1'))).toBeNull();
    expect(habitRule(unit(s, 'rat-1'))).toEqual({});
    giveTrick(rat, 'steamproof');
    expect(habitOf(unit(s, 'rat-1'))).toBe('steamproof');
    expect(habitRule(unit(s, 'rat-1')).wards).toEqual(['steam']);
  });

  test('steamproof trick: a Storm skips the foe, and the control foe is hurt', () => {
    giveTrick(rat, 'steamproof');
    const r = draft(board('r~ d~'), (ctx) => burstAt(ctx, at('B1'), 'tile', null));
    expect(damageTo(r.events, 'rat-1')).toEqual([]);
    expect(unharmed(r.events)).toEqual([
      expect.objectContaining({ habit: 'steamproof', harm: 'steam', source: 'Storm' }),
    ]);
    expect(damageTo(r.events, 'dummy-1').length).toBeGreaterThan(0);
  });

  test('steamproof trick: fire still hurts it (Flashover is fire)', () => {
    giveTrick(rat, 'steamproof');
    const r = draft(board('r{fog} d{fog}'), (ctx) => burstAt(ctx, at('B1'), 'tile', null));
    expect(damageTo(r.events, 'rat-1').length).toBeGreaterThan(0);
    expect(unharmed(r.events)).toEqual([]);
  });

  test('fuseOnStep trick: its own dusk jar opens when it walks onto it; another foe does not', () => {
    giveTrick(rat, 'fuseOnStep');
    const s = structuredClone(board('r . . d'));
    tileAt(s, at('B1')).jar = dusk('rat-1');
    const own = draft(s, (ctx) => {
      const u = unitAt(ctx.s, at('A1'));
      if (u?.kind !== 'enemy') throw new Error('no rat');
      enemyWalk(ctx, u, [at('B1')]);
    });
    expect(own.events.filter((e) => e.type === 'jarOpened')).toEqual([
      expect.objectContaining({ habit: 'fuseOnStep' }),
    ]);

    // The dummy (no trick) walking onto the same jar owned by the rat does nothing.
    const s2 = structuredClone(board('r . . d'));
    tileAt(s2, at('C1')).jar = dusk('rat-1');
    const other = draft(s2, (ctx) => {
      const u = unitAt(ctx.s, at('D1'));
      if (u?.kind !== 'enemy') throw new Error('no dummy');
      enemyWalk(ctx, u, [at('C1')]);
    });
    expect(other.events.some((e) => e.type === 'jarOpened')).toBe(false);
  });

  test('without the trick the same walk leaves the jar for dusk', () => {
    const s = structuredClone(board('r . . d'));
    tileAt(s, at('B1')).jar = dusk('rat-1');
    const r = draft(s, (ctx) => {
      const u = unitAt(ctx.s, at('A1'));
      if (u?.kind !== 'enemy') throw new Error('no rat');
      enemyWalk(ctx, u, [at('B1')]);
    });
    expect(r.events.some((e) => e.type === 'jarOpened')).toBe(false);
  });
});

describe('steamproof-boil-over-hook: the call BH makes (dealDamage with harm: steam)', () => {
  const boilOver = (s: BattleState, who: string) =>
    draft(s, (ctx) =>
      dealDamage(ctx, unit(ctx.s, who), 3, 'Boil-over', [], {
        heading: null,
        at: at('A1'),
        harm: 'steam',
      }),
    );

  test('a towel-bearer is unharmed, the ward is tagged, and nothing is a hit', () => {
    const s = board('D . r', { kits: { draughtsman: { habit: 'steamproof' } } });
    const hp = unit(s, 'draughtsman').hp;
    const r = boilOver(s, 'draughtsman');
    expect(unit(r.state, 'draughtsman').hp).toBe(hp);
    expect(r.events).toEqual([
      expect.objectContaining({
        type: 'unharmed',
        source: 'Boil-over',
        harm: 'steam',
        habit: 'steamproof',
      }),
    ]);
    expect(r.lines).toEqual(['Boil-over leaves Draughtsman unharmed']);
  });

  test('anyone without the ward takes it', () => {
    const s = board('D . r');
    const hp = unit(s, 'draughtsman').hp;
    const r = boilOver(s, 'draughtsman');
    expect(unit(r.state, 'draughtsman').hp).toBe(hp - 3);
    expect(unharmed(r.events)).toEqual([]);
  });

  test('an untagged hit is never warded (only declared steam is)', () => {
    const s = board('D . r', { kits: { draughtsman: { habit: 'steamproof' } } });
    const hp = unit(s, 'draughtsman').hp;
    const r = draft(s, (ctx) => {
      dealDamage(ctx, unit(ctx.s, 'draughtsman'), 3, 'Spark');
    });
    expect(unit(r.state, 'draughtsman').hp).toBe(hp - 3);
  });

  test('a warded hit leaves the shield alone', () => {
    // Rigged on a copy: the projection guard replays the battle's own start from the log.
    const s = structuredClone(board('D . r', { kits: { draughtsman: { habit: 'steamproof' } } }));
    unit(s, 'draughtsman').shield = 2;
    const r = boilOver(s, 'draughtsman');
    expect(unit(r.state, 'draughtsman').shield).toBe(2);
    expect(r.events.some((e) => e.type === 'shieldAbsorbs')).toBe(false);
  });
});
