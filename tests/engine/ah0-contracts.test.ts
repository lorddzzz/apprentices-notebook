import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  HABIT_IDS,
  HABITS,
  type HabitId,
  LINES,
  type LineSubject,
  METHOD_IDS,
  type RecruitHabitId,
  RUNE_IDS,
  SOLVENT_IDS,
} from '$data';
import { RECRUIT_HABITS } from '$data/recruits';
import {
  awardFootnotePoints,
  BASIC_ACTIONS,
  basicDirs,
  findUnit,
  guardHarm,
  type HarmGuard,
  habitOf,
  habitRule,
  NO_RULE,
  newProfile,
  parseLabel,
  reachOver,
  ruleOf,
  type Unit,
} from '$engine';
import { emit, withHabit } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { jarLimit } from '$engine/leans';
import { board, draft } from '../scenarios/harness';

const unitIn = (s: ReturnType<typeof board>, id: string): Unit => {
  const u = findUnit(s, id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};

describe('AH-W0 contracts: habits', () => {
  it('has a row for the pair and every recruit habit, keyed by its own id', () => {
    expectTypeOf<RecruitHabitId>().toMatchTypeOf<HabitId>();
    for (const h of Object.values(RECRUIT_HABITS)) expect(HABITS[h].id).toBe(h);
    expect(HABIT_IDS).toHaveLength(9);
    for (const h of HABIT_IDS) expect(HABITS[h].id).toBe(h);
    expect(HABIT_IDS).not.toContain('mender'); // reserved for EN
  });

  it('gives each habit exactly one rule field (P9)', () => {
    for (const h of HABIT_IDS) expect(Object.keys(HABITS[h].rule), h).toHaveLength(1);
    expect(HABITS.twoJars.rule).toEqual({ jarLimit: 2 });
    expect(HABITS.forkAhead.rule).toEqual({ forkAhead: true });
  });

  it('reads a member habit from its lean and a foe without a trick as none', () => {
    const s = board('D S r');
    expect(habitOf(unitIn(s, 'stoker'))).toBe('forkAhead');
    expect(habitRule(unitIn(s, 'stoker')).forkAhead).toBe(true);
    expect(habitOf(unitIn(s, 'rat-1'))).toBeNull();
    expect(habitRule(unitIn(s, 'rat-1'))).toBe(NO_RULE);
    expect(ruleOf(null)).toBe(NO_RULE);
  });

  it('jarLimit reads through the rule, and harness kits move habits (Lab kits)', () => {
    const plain = board('D S');
    expect(jarLimit(unitIn(plain, 'draughtsman'))).toBe(2);
    expect(jarLimit(unitIn(plain, 'stoker'))).toBe(1);
    const swapped = board('D S', {
      kits: { draughtsman: { habit: null }, stoker: { habit: 'twoJars', action: 'shove' } },
    });
    expect(jarLimit(unitIn(swapped, 'draughtsman'))).toBe(1);
    expect(jarLimit(unitIn(swapped, 'stoker'))).toBe(2);
    expect(habitOf(unitIn(swapped, 'stoker'))).toBe('twoJars');
  });

  it('withHabit tags the headline events', () => {
    const s = board('D S');
    const r = draft(s, (ctx) =>
      withHabit(ctx, 'holdTwo', () => emit(ctx, { type: 'miss', source: 'Hold' })),
    );
    expect(r.events[0]?.habit).toBe('holdTwo');
  });
});

describe('AH-W0 contracts: fine print', () => {
  const subjects = new Set<string>([...HABIT_IDS, 'pull', 'hop']);

  it('no habit or action subject collides with a rune, method or solvent', () => {
    const others = new Set<string>([...RUNE_IDS, ...METHOD_IDS, ...SOLVENT_IDS]);
    for (const s of subjects) expect(others.has(s), s).toBe(false);
  });

  it('AH rows are written, pending until fired, and name a habit or an action', () => {
    const ah = LINES.filter((l) => subjects.has(l.subject));
    expect(ah.length).toBeGreaterThanOrEqual(18);
    for (const l of ah) {
      expect(l.pending, l.id).toBe(true);
      expect(l.text.length, l.id).toBeGreaterThan(10);
    }
    expectTypeOf<'pull' | 'hop' | HabitId>().toMatchTypeOf<LineSubject>();
  });

  it('habit and action lines earn no footnote points', () => {
    const p = newProfile();
    const lines = LINES.filter((l) => subjects.has(l.subject)).map((l) => l.id);
    expect(awardFootnotePoints(p, lines).footnotes).toEqual(p.footnotes);
  });
});

describe('AH-W0 contracts: basic actions and harm', () => {
  it('registers Shove and stubs the other three', () => {
    const s = board('D S r');
    expect(basicDirs(s, 'stoker')).toEqual(['right', 'left']);
    for (const a of ['pull', 'hop', 'swap'] as const) {
      expect(BASIC_ACTIONS[a].dirs(s, 'stoker')).toEqual([]);
      expect(() => draft(s, (ctx) => BASIC_ACTIONS[a].apply(ctx, 'stoker', 'right'))).toThrow(
        /AH-1/,
      );
    }
  });

  it('reachOver passes over a unit, not over a plate or off the board (P3)', () => {
    const s = board('D r . = .');
    expect(reachOver(s, parseLabel('A1'), 'right')).toBe(true); // over the rat
    expect(reachOver(s, parseLabel('C1'), 'right')).toBe(false); // over the plate
    expect(reachOver(s, parseLabel('A1'), 'left')).toBe(false);
  });

  it('with no guards a hit passes; a guard can cancel it as `unharmed`', () => {
    const s = board('D S');
    const ward: HarmGuard = {
      id: 'test:ward',
      kinds: ['hit'],
      run: (_ctx, h) =>
        h.kind === 'hit' && h.harm === 'steam'
          ? { kind: 'cancel', habit: 'steamproof' }
          : { kind: 'pass' },
    };
    draft(s, (ctx) => {
      const hit = { kind: 'hit', unit: 'stoker', amount: 2, source: 'Storm' } as const;
      expect(guardHarm(ctx, { ...hit, harm: 'steam' })).toEqual({ kind: 'pass' });
      expect(guardHarm(ctx, { ...hit, harm: 'steam' }, [ward]).kind).toBe('cancel');
      expect(guardHarm(ctx, { ...hit, harm: null }, [ward]).kind).toBe('pass');
    });
    // A steam-tagged hit with no guard registered hurts as before.
    const r = draft(s, (ctx) =>
      dealDamage(ctx, unitIn(ctx.s, 'stoker'), 2, 'Storm', [], {
        heading: null,
        at: null,
        harm: 'steam',
      }),
    );
    expect(r.lines).toEqual(['Storm hits Stoker for 2']);
  });
});
