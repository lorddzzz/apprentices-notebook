import { expect, test } from 'vitest';
import { type InventionDef, LINES, METHOD_IDS, RUNE_IDS, SOLVENT_IDS } from '$data';
import {
  applyAction,
  compileLattice,
  createBattle,
  createRng,
  inkUsed,
  inventionIssue,
  isSilent,
  legalAims,
  libraryOf,
  parseLattice,
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
        if (action.type === 'cast')
          expect(result.events.length).toBeLessThanOrEqual(CAST_EVENT_CAP + 4);
        const want = viewOf(result.state);
        const projected = result.events.reduce(
          (v, e) => (isSilent(e) ? v : projectWith(v, e, want)),
          before,
        );
        expect(visible(projected)).toEqual(visible(want));
        state = result.state;
      }
    }
  });
}
