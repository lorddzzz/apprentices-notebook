import { expect, test } from 'vitest';
import {
  type BasicActionId,
  HABIT_IDS,
  type HabitId,
  type InventionDef,
  LINES,
  METHOD_IDS,
  RUNE_IDS,
  SOLVENT_IDS,
} from '$data';
import {
  type Action,
  applyAction,
  basicDirs,
  castableSpells,
  compileLattice,
  createBattle,
  createRng,
  inkUsed,
  inventionIssue,
  isSilent,
  legalAims,
  legalMoves,
  libraryOf,
  memberById,
  parseLattice,
  spellsFor,
  validateLattice,
  witnessedIn,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';

/** Compare the visible state; durations and mark lineage numbers are engine bookkeeping. */
function visible(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive
        ? {
            id: u.id,
            pos: u.pos,
            hp: u.hp,
            alive: u.alive,
            shield: u.shield,
            mark: u.mark,
            bound: u.bound,
            collar: u.collar,
            born: u.born,
            shackle: u.shackle > 0,
            held: u.held > 0,
            stunned: u.stunned,
            intent: u.intent,
          }
        : { id: u.id, hp: u.hp, alive: u.alive },
    ),
    tiles: v.tiles.map((t) => ({
      state: t.state,
      hits: t.hits,
      jar: t.jar,
      gate: t.gate,
      vent: t.vent,
    })),
    round: v.round,
    phase: v.phase,
  };
}

// Each method × solvent occurs at least once; the seed randomises parts, source, chemistry and aim.
for (let seed = 1; seed <= METHOD_IDS.length * SOLVENT_IDS.length * 2; seed++) {
  test(`seeded valid lattice ${seed}`, () => {
    const rng = createRng(seed);
    const pick = <T>(xs: readonly T[]): T => {
      const x = xs[rng.int(0, xs.length - 1)];
      if (x === undefined) throw new Error('empty generator choice');
      return x;
    };
    const method = METHOD_IDS[(seed - 1) % METHOD_IDS.length] ?? 'conduct';
    const solvent =
      SOLVENT_IDS[Math.floor((seed - 1) / METHOD_IDS.length) % SOLVENT_IDS.length] ?? 'gallnut';
    const repeat: InventionDef = {
      id: 'inv:echo',
      name: 'Echo',
      method: 'repeat',
      parts: ['shove'],
      solvent: null,
    };
    const def: InventionDef = {
      id: 'inv:fuzz',
      name: 'Fuzz',
      method,
      solvent,
      parts:
        method === 'bind'
          ? ['ink', pick(['shove', 'strike', 'guard'] as const)]
          : method === 'margin'
            ? ['inv:echo']
            : method === 'lift'
              ? ['shove']
              : [pick(['shove', 'strike', 'guard', 'erase'] as const)],
      ...(method === 'bind' ? { event: pick(['hit', 'enters', 'pushed', 'dies'] as const) } : {}),
    };
    const inventions = libraryOf([repeat, def]);
    expect(
      inventionIssue(def, {
        runes: RUNE_IDS,
        methods: METHOD_IDS,
        events: ['hit', 'enters', 'pushed', 'dies'],
        inventions,
      }),
    ).toBeNull();
    const source = pick(['Bolt>', 'Splash>', 'Touch>', 'Vat>']);
    const kind = pick(['Ink', 'Oil', 'Steam', 'Brass', 'Spark']);
    const seal = pick(['.', 'Jar', 'Fuse']);
    const tail = pick(['Strike', 'Shove', 'Spark', 'Guard']);
    // The Margin aura touches the ordinary action on the row below.
    const lattice = parseLattice(
      method === 'margin'
        ? `. . inv:fuzz . .\n${source} ${kind} ${tail} . .`
        : `${source} ${kind} ${seal === '.' ? 'inv:fuzz' : seal} ${seal === '.' ? tail : 'inv:fuzz'} ${seal === '.' ? '.' : tail}`,
    );
    const capacity = 24;
    expect(validateLattice(lattice, capacity, {}, inventions)).toEqual([]);
    expect(inkUsed(lattice, {}, inventions)).toBeLessThanOrEqual(capacity);
    const spells = compileLattice(lattice, {}, inventions).spells;
    expect(spells).toHaveLength(1);
    const terrain = pick([
      'i',
      'o',
      '~',
      '=',
      '{stain}',
      '{brand}',
      '{pool}',
      '{fog}',
      '{skid}',
      '{bank}',
      '{kettle}',
      '{wall}',
    ]);
    let state = createBattle({
      title: `fuzz ${seed}`,
      board: `D . r! . .\n. ${terrain} r& . .\n. = = . .\nS . . . .`,
      seed,
      inventions,
      party: { draughtsman: { spells } },
    }).state;
    const rows = new Set(LINES.map((l) => l.id));
    for (let round = 0; round < 3 && state.phase === 'player'; round++) {
      const spell = spells[0];
      if (!spell) throw new Error('missing generated spell');
      const aims = legalAims(state, 'draughtsman', spell.key);
      const aim = aims.length ? pick(aims) : null;
      const actions = [
        ...(round === 0 && aim
          ? [{ type: 'cast' as const, unit: 'draughtsman', spell: spell.key, aim }]
          : []),
        { type: 'endTurn' as const },
      ];
      for (const action of actions) {
        if (state.phase !== 'player') break;
        const before = viewOf(state);
        const result = applyAction(state, action);
        for (const id of witnessedIn(result.events)) expect(rows.has(id), id).toBe(true);
        // The cap's events, then at most `fizzles`, the trace and the battle's end (P11).
        if (action.type === 'cast')
          expect(result.events.length).toBeLessThanOrEqual(CAST_EVENT_CAP + 3);
        const want = viewOf(result.state);
        const projected = result.events.reduce(
          (v, e) => (isSilent(e) ? v : projectWith(v, e)),
          before,
        );
        expect(visible(projected)).toEqual(visible(want));
        state = result.state;
      }
    }
  });
}

// Every basic action and every habit (AH): a seeded walk of legal moves, basic actions and casts
// must project to the same state the engine reaches, with no cast past the event cap.
const BASICS: readonly BasicActionId[] = ['shove', 'pull', 'hop', 'swap'];
const KIT_HABITS: readonly (HabitId | null)[] = [null, ...HABIT_IDS];
const WALK_PAGES = [
  'Bolt> Oil Spark',
  'Touch> Hold Strike',
  'Bolt> Ink Erase',
  'Splash> Steam',
  'Touch> Spark',
  'Bolt> Jar Fuse',
];
const walked = new Set<string>();
for (let seed = 1; seed <= BASICS.length * KIT_HABITS.length; seed++) {
  const action = BASICS[(seed - 1) % BASICS.length] ?? 'shove';
  const habit = KIT_HABITS[Math.floor((seed - 1) / BASICS.length) % KIT_HABITS.length] ?? null;
  test(`seeded basic-action walk ${seed}: ${action}, ${habit ?? 'no habit'}`, () => {
    const rng = createRng(seed * 7919);
    const pick = <T>(xs: readonly T[]): T => {
      const x = xs[rng.int(0, xs.length - 1)];
      if (x === undefined) throw new Error('empty walk choice');
      return x;
    };
    const spellsOf = (who: 'draughtsman' | 'stoker') =>
      spellsFor(who, parseLattice(pick(WALK_PAGES)), {});
    let state = createBattle({
      title: `walk ${seed}`,
      board: 'D . r . S\n. w> r o .\n= . ~ . {pool}\nb . i . r\n. . . . .',
      seed,
      party: {
        draughtsman: { spells: spellsOf('draughtsman'), action, habit },
        stoker: {
          spells: spellsOf('stoker'),
          action: pick(BASICS),
          habit: pick(KIT_HABITS),
        },
      },
    }).state;
    const rows = new Set(LINES.map((l) => l.id));
    for (let n = 0; n < 24 && state.phase === 'player'; n++) {
      const options: Action[] = [{ type: 'endTurn' }];
      for (const id of ['draughtsman', 'stoker'] as const) {
        const m = memberById(state, id);
        if (m.hp <= 0) continue;
        for (const to of legalMoves(state, id)) options.push({ type: 'move', unit: id, to });
        // `basicDirs` answers for the board alone: a spent turn is the caller's gate.
        for (const dir of m.acted ? [] : basicDirs(state, id)) {
          options.push({ type: m.action, unit: id, dir } as Action);
        }
        for (const { spell, usable } of castableSpells(state, id)) {
          if (!usable) continue;
          for (const aim of legalAims(state, id, spell.key)) {
            options.push({ type: 'cast', unit: id, spell: spell.key, aim });
          }
        }
      }
      // Most steps act; an end of turn now and then keeps the rounds turning.
      const action = rng.int(0, 5) === 0 ? { type: 'endTurn' as const } : pick(options);
      const before = viewOf(state);
      const result = applyAction(state, action);
      walked.add(action.type);
      for (const id of witnessedIn(result.events)) expect(rows.has(id), id).toBe(true);
      if (action.type !== 'endTurn' && action.type !== 'move')
        expect(result.events.length).toBeLessThanOrEqual(CAST_EVENT_CAP + 3);
      const projected = result.events.reduce(
        (v, e) => (isSilent(e) ? v : projectWith(v, e)),
        before,
      );
      expect(visible(projected), `${action.type} #${n}`).toEqual(visible(viewOf(result.state)));
      state = result.state;
    }
  });
}

test('the basic-action walks played every basic action', () => {
  for (const a of BASICS) expect(walked.has(a), a).toBe(true);
});
