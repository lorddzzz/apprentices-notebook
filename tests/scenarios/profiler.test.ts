import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  compileLattice,
  createBattle,
  deadCells,
  describeLog,
  type EventLog,
  type GameEvent,
  type GlyphDef,
  type GlyphLibrary,
  glyphSamples,
  innerFired,
  isLegal,
  legalAims,
  memberById,
  newProfile,
  newSave,
  type PlacedRune,
  type Profile,
  parseLattice,
  recordGlyphCasts,
  recordOf,
  recordTripCasts,
  type SaveData,
  versionKey,
} from '$engine';
import { playTrial } from '../../src/app/bench';
import { endBattle, recordBattleAction, setOut, startBattle } from '../../src/app/flow';
import { act, cast, withLattices } from './harness';

/**
 * Harm attribution (plan M1–M9): every cast's `trace` says which stretch of the log each node owns,
 * and the profiler turns the stretches of Glyph nodes into samples. These tests read the log.
 */

const c = (x: number, y: number) => ({ x, y });
const run = (x: number, rune: PlacedRune['rune']): PlacedRune => ({ at: c(x, 0), rune });

function glyph(
  id: string,
  kind: GlyphDef['kind'],
  cells: readonly PlacedRune[],
  entry = c(0, 0),
): GlyphDef {
  return {
    id,
    name: id,
    kind,
    cells,
    entry,
    exits: [],
    idiom: null,
    version: 1,
    params: [],
    extraExit: null,
  };
}

interface Setup {
  p: Profile;
  state: BattleState;
}

/** The Draughtsman on `lattice` (with `defs` in the library) on `ground`; Lab, so charges don't run out. */
function setup(
  lattice: string,
  defs: readonly GlyphDef[],
  ground: string,
  hp: Record<string, number> = {},
): Setup {
  const lib: GlyphLibrary = Object.fromEntries(defs.map((d) => [d.id, d]));
  const l = parseLattice(lattice);
  const base = newProfile();
  const p: Profile = {
    ...base,
    glyphs: [...defs],
    lattices: { ...base.lattices, draughtsman: [...l.runes] },
  };
  const spells = compileLattice(l, MEMBERS.draughtsman.affinity, lib).spells;
  const state = createBattle({
    title: 'test',
    seed: 1,
    board: ground,
    hp,
    lab: true,
    party: { draughtsman: { spells } },
  }).state;
  return { p, state };
}

/** The first cast's trace and the lines each of its spans owns. */
function spansOf(events: EventLog): { cell: string; lines: string[] }[] {
  const at = events.findIndex((e) => e.type === 'cast');
  const trace = events.find((e) => e.type === 'trace');
  if (at < 0 || trace?.type !== 'trace') throw new Error('no traced cast');
  return trace.spans.map((s) => ({
    cell: `${s.at.x},${s.at.y}${s.inner ? `/${s.inner.x},${s.inner.y}` : ''}`,
    lines: describeLog(events.slice(at + 1 + s.from, at + 1 + s.to)),
  }));
}

/** Casts right, then `more` turns of cast + end turn; every event, in order. */
function play(s: Setup, casts: number, aim: 'right' | 'down' = 'right'): GameEvent[] {
  const events: GameEvent[] = [];
  let state = s.state;
  for (let i = 0; i < casts; i++) {
    const r = cast(state, 'draughtsman', aim);
    events.push(...r.events);
    const e = act(r.state, { type: 'endTurn' });
    events.push(...e.events);
    state = e.state;
  }
  return events;
}

const spellGlyph = glyph('s', 'spell', [
  { at: c(0, 0), rune: 'bolt', dir: 'right' },
  run(1, 'ink'),
  run(2, 'onInked'),
  run(3, 'spark'),
]);

describe('spans: each node owns its own stretch of the log (M2)', () => {
  test('a plain spell: the Bolt, then each rune its own effect, never its children', () => {
    const s = withLattices('D . d . .', { draughtsman: 'Bolt> Ink OnInked Spark' });
    const spans = spansOf(cast(s, 'draughtsman', 'right').events);
    expect(spans).toEqual([
      { cell: '0,0', lines: ['Bolt hits dummy at C1 for 2'] },
      { cell: '1,0', lines: ['dummy at C1 is inked', 'ink pools at B1, D1'] },
      { cell: '2,0', lines: ['On Inked: a target is inked'] },
      {
        cell: '3,0',
        lines: [
          'Spark hits dummy at C1 for 2 (inked +1)',
          'the ink on dummy at C1 detonates',
          'Detonation hits dummy at C1 for 2',
        ],
      },
    ]);
  });

  test('a Spell Glyph: the same stretches, named by socket and local cell', () => {
    const { state } = setup('G:s> . . .', [spellGlyph], 'D . d . .');
    const events = cast(state, 'draughtsman', 'right').events;
    const spans = spansOf(events);
    expect(spans.map((x) => x.cell)).toEqual(['0,0/0,0', '0,0/1,0', '0,0/2,0', '0,0/3,0']);
    expect(spans.map((x) => x.lines.length)).toEqual([1, 2, 1, 3]);
    const trace = events.find((e) => e.type === 'trace');
    expect(trace?.type === 'trace' ? trace.spans.every((x) => x.glyph === 's') : false).toBe(true);
  });

  test('a rune that logs nothing owns an empty stretch, and On Kill owns one per victim', () => {
    const s = withLattices(
      'D . r . .\n. . . . .\n. . r . .',
      { draughtsman: 'Splash> OnKill Spark' },
      { hp: { C1: 1, C3: 1 } },
    );
    const events = cast(s, 'draughtsman', { kind: 'tile', at: { x: 2, y: 1 } }).events;
    const spans = spansOf(events);
    expect(spans[0]?.cell).toBe('0,0');
    const triggers = spans.filter((x) => x.cell === '1,0');
    expect(triggers).toHaveLength(2);
    expect(triggers.map((x) => x.lines)).toEqual([
      ['On Kill: bursts from C1'],
      ['On Kill: bursts from C3'],
    ]);
    expect(spans.filter((x) => x.cell === '2,0')).toHaveLength(2);
  });

  test('every effect event of a cast belongs to exactly one span', () => {
    const cases: [string, string][] = [
      ['D . d . .', 'Bolt> Ink OnInked Spark'],
      ['D . do . .\n. . . . .', 'Bolt> Oil Spark OnIgnite Ink'],
      ['D . r . .\n. . . . .\n. . r . .', 'Bolt> Fork Oil Spark'],
      ['D . d~ . .', 'Bolt> Oil Spark'],
    ];
    for (const [ground, lattice] of cases) {
      const s = withLattices(ground, { draughtsman: lattice });
      const events = cast(s, 'draughtsman', 'right').events;
      const at = events.findIndex((e) => e.type === 'cast');
      const trace = events.find((e) => e.type === 'trace');
      if (trace?.type !== 'trace') throw new Error('no trace');
      const end = events.indexOf(trace);
      const owned = new Array<number>(end - at - 1).fill(0);
      for (const sp of trace.spans) {
        for (let i = sp.from; i < sp.to; i++) owned[i] = (owned[i] ?? 0) + 1;
      }
      expect(owned.every((n) => n === 1)).toBe(true);
    }
  });

  test('On Ignite: the stretch of the retargeted rune is its own', () => {
    const s = withLattices('D . do . .\n. . . . .', {
      draughtsman: 'Bolt> Oil Spark OnIgnite Spark',
    });
    const spans = spansOf(cast(s, 'draughtsman', 'right').events);
    expect(spans.map((x) => x.cell)).toEqual(['0,0', '1,0', '2,0', '3,0', '4,0']);
    expect(spans[2]?.lines.some((l) => l.includes('ignite') || l.includes('fire'))).toBe(true);
    expect(spans[3]?.lines).toEqual(['On Ignite: the flow follows the fire']);
  });
});

describe('Glyph samples (M3–M6, M9)', () => {
  test('a Spell Glyph is credited with the Bolt and the detonation', () => {
    const { p, state } = setup('G:s> . . .', [spellGlyph], 'D . d . .');
    const events = cast(state, 'draughtsman', 'right').events;
    const samples = glyphSamples(events, p);
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      glyph: 's',
      version: 1,
      // Bolt 2 + Spark 2 + Detonation 2; cost = 2 + 1 + 2 + 1 − floor(4 / 3)
      sample: { harm: 6, cost: 5, meaningful: true },
      fired: ['0,0', '1,0', '2,0', '3,0'],
    });
  });

  test('the same runes as a Payload behind a plain Bolt are not credited with the Bolt', () => {
    const payload = glyph('p', 'payload', [run(0, 'ink'), run(1, 'onInked'), run(2, 'spark')]);
    const { p, state } = setup('Bolt> G:p> . .', [payload], 'D . d . .');
    const events = cast(state, 'draughtsman', 'right').events;
    expect(describeLog(events)[1]).toBe('Bolt hits dummy at C1 for 2');
    const [only, ...rest] = glyphSamples(events, p);
    expect(rest).toEqual([]);
    expect(only?.sample).toEqual({ harm: 4, cost: 3, meaningful: true }); // Spark 2 + Detonation 2
  });

  test('an On Kill payload that runs for two victims is one sample with both runs', () => {
    const payload = glyph('k', 'payload', [run(0, 'onKill'), run(1, 'spark')]);
    const { p, state } = setup('Splash> G:k> . .', [payload], 'D . r . .\n. . d . .\n. . r . .', {
      C1: 1,
      C3: 1,
    });
    const events = cast(state, 'draughtsman', { kind: 'tile', at: { x: 2, y: 1 } }).events;
    expect(describeLog(events).filter((l) => l.startsWith('Spark hits dummy'))).toHaveLength(2);
    const samples = glyphSamples(events, p);
    expect(samples).toHaveLength(1);
    // Two Sparks of 1 on the dummy; the Splash and the two kills are the host's
    expect(samples[0]?.sample).toEqual({ harm: 2, cost: 3, meaningful: true });
  });

  test('a gate that fails before a payload gives no sample, and one that opens does', () => {
    const payload = glyph('p', 'payload', [run(0, 'spark')]);
    const shut = setup('Bolt> OnInked G:p> .', [payload], 'D . d . .');
    expect(glyphSamples(cast(shut.state, 'draughtsman', 'right').events, shut.p)).toEqual([]);
    const open = setup('Bolt> Ink OnInked G:p>', [payload], 'D . d . .');
    expect(glyphSamples(cast(open.state, 'draughtsman', 'right').events, open.p)).toHaveLength(1);
  });

  test('a payload whose own trigger fails is a sample that did nothing', () => {
    const payload = glyph('p', 'payload', [run(0, 'oil'), run(1, 'onInked'), run(2, 'spark')]);
    const { p, state } = setup('Bolt> G:p> . .', [payload], 'D . d . .');
    const [only] = glyphSamples(cast(state, 'draughtsman', 'right').events, p);
    // Oil lands (a tile change counts as meaningful), so look at harm and the cells instead
    expect(only?.sample.harm).toBe(0);
    expect(only?.fired).toEqual(['0,0', '1,0']);
  });

  test('echoes give no sample and no harm', () => {
    const s = glyph('s', 'spell', [{ at: c(0, 0), rune: 'bolt', dir: 'right' }, run(1, 'spark')]);
    const { p, state } = setup('Echo . . .\nG:s> . . .', [s], 'D . d . .', { C1: 99 });
    // The Echo is above the socket at A1; the socket is A2 (the Draughtsman sits at A1 on the board).
    const events = play({ p, state }, 1);
    expect(events.filter((e) => e.type === 'cast' && e.echo)).toHaveLength(1);
    expect(events.filter((e) => e.type === 'trace')).toHaveLength(1);
    const samples = glyphSamples(events, p);
    expect(samples).toHaveLength(1);
    // Outer Echo costs 1 ink like any outer aura (M9)
    expect(samples.every((x) => x.sample.cost === 3 + 1)).toBe(true);
  });

  test('burn-step damage next round is not counted', () => {
    const s = glyph('s', 'spell', [{ at: c(0, 0), rune: 'bolt', dir: 'right' }, run(1, 'spark')]);
    const { p, state } = setup('G:s> . . .', [s], 'D . do . .', { C1: 99 });
    const events = play({ p, state }, 1);
    const fire = describeLog(events).filter((l) => l.startsWith('Fire hits dummy'));
    expect(fire.length).toBeGreaterThan(0);
    const [only] = glyphSamples(events, p);
    const castLines = describeLog(
      events.slice(
        0,
        events.findIndex((e) => e.type === 'phase'),
      ),
    );
    const harm = castLines
      .filter((l) => / hits dummy at C1 for \d+/.test(l))
      .map((l) => Number(/for (\d+)/.exec(l)?.[1]))
      .reduce((a, b) => a + b, 0);
    expect(only?.sample.harm).toBe(harm);
  });

  test('two sockets of one Glyph in one cast are two samples', () => {
    const payload = glyph('p', 'payload', [run(0, 'spark')]);
    const { p, state } = setup('Bolt> G:p> G:p> .', [payload], 'D . d . .', { C1: 99 });
    const events = cast(state, 'draughtsman', 'right').events;
    const samples = glyphSamples(events, p);
    expect(samples.map((x) => x.glyph)).toEqual(['p', 'p']);
    expect(samples.map((x) => x.sample.harm)).toEqual([1, 1]);
  });

  test('an outer Amplify adds 1 to that sample’s cost (and 1 to its Spark)', () => {
    const payload = glyph('p', 'payload', [run(0, 'spark')]);
    const plain = setup('Bolt> G:p> . .', [payload], 'D . d . .', { C1: 99 });
    const amped = setup('. Amp . .\nBolt> G:p> . .', [payload], 'D . d . .', { C1: 99 });
    const [a] = glyphSamples(cast(plain.state, 'draughtsman', 'right').events, plain.p);
    const [b] = glyphSamples(cast(amped.state, 'draughtsman', 'right').events, amped.p);
    expect(a?.sample).toEqual({ harm: 1, cost: 1, meaningful: true });
    expect(b?.sample).toEqual({ harm: 2, cost: 2, meaningful: true });
  });

  test('fired lists walked shape cells and inner auras beside a fired cell', () => {
    // Bend down from the entry, then Ink, Spark; an inner Amplify touches the Ink
    const payload = glyph('p', 'payload', [
      { at: c(0, 0), rune: 'bend', dir: 'down' },
      { at: c(0, 1), rune: 'ink' },
      { at: c(0, 2), rune: 'spark' },
      { at: c(1, 1), rune: 'amplify' },
      { at: c(1, 2), rune: 'echo' },
    ]);
    const { p, state } = setup('Bolt> G:p> . .', [payload], 'D . d . .', { C1: 99 });
    const [only] = glyphSamples(cast(state, 'draughtsman', 'right').events, p);
    // Bend (0,0) is walked; both auras touch a fired cell
    expect([...(only?.fired ?? [])].sort()).toEqual(['0,0', '0,1', '0,2', '1,1', '1,2']);
  });

  test('innerFired is the local cells of one Glyph that fired in a log', () => {
    const { state } = setup('G:s> . . .', [spellGlyph], 'D . d . .');
    const events = cast(state, 'draughtsman', 'right').events;
    expect(innerFired(events, 's')).toEqual(['0,0', '1,0', '2,0', '3,0']);
    expect(innerFired(events, 'other')).toEqual([]);
  });
});

describe('records over a fight (M7, M13)', () => {
  const payload = glyph('p', 'payload', [run(0, 'oil'), run(1, 'onInked'), run(2, 'spark')]);

  test('five casts: the Spark never ran, so it is dead; the Oil and the gate are not', () => {
    const { p, state } = setup('Bolt> G:p> . .', [payload], 'D . d . .', { C1: 99 });
    const events = play({ p, state }, 5);
    const after = recordGlyphCasts(p, events);
    const record = recordOf(after, 'p', 1);
    expect(record.casts).toBe(5);
    expect(record.fired).toEqual({ '0,0': 5, '1,0': 5 });
    expect(deadCells(payload, record)).toEqual([c(2, 0)]);
    expect(after.glyphs).toBe(p.glyphs);
    expect(Object.keys(after.glyphRecords)).toEqual([versionKey('p', 1)]);
  });

  test('four casts: not enough to call a cell dead', () => {
    const { p, state } = setup('Bolt> G:p> . .', [payload], 'D . d . .', { C1: 99 });
    const record = recordOf(recordGlyphCasts(p, play({ p, state }, 4)), 'p', 1);
    expect(record.casts).toBe(4);
    expect(deadCells(payload, record)).toEqual([]);
  });
});

describe('records are written by a trip battle only', () => {
  const inked = glyph('s', 'spell', [{ at: c(0, 0), rune: 'bolt', dir: 'right' }, run(1, 'ink')]);

  /** A fresh trip with the Draughtsman's lattice holding the Glyph; 9 perfect samples already on record. */
  function start(seeded: boolean): SaveData {
    const save = newSave(7);
    const l = parseLattice('. . . . .\nG:s> . . . .\nx . . . x');
    const perfect = { harm: 3, cost: 1, meaningful: true };
    const profile: Profile = {
      ...save.profile,
      glyphs: [inked],
      lattices: { ...save.profile.lattices, draughtsman: [...l.runes] },
      glyphRecords: seeded
        ? {
            's@1': {
              casts: 9,
              harm: 27,
              meaningful: 9,
              recent: Array.from({ length: 9 }, () => perfect),
              best: { economy: 0, reliability: 0 },
              fired: { '0,0': 9, '1,0': 9 },
            },
          }
        : {},
    };
    return setOut({ ...save, profile });
  }

  /** The Draughtsman's Glyph casts, one meaningful cast a round, up to `max`. */
  function fight(save: SaveData, max: number): { save: SaveData; state: BattleState } {
    let s = save;
    let state = startBattle(s).state;
    let n = 0;
    for (let round = 0; round < 8 && state.phase === 'player' && n < max; round++) {
      const spell = memberById(state, 'draughtsman').spells[0];
      if (!spell) throw new Error('no spell');
      for (const aim of legalAims(state, 'draughtsman', spell.key)) {
        const action: Action = { type: 'cast', unit: 'draughtsman', spell: spell.key, aim };
        if (isLegal(state, action) !== null) continue;
        const r = applyAction(state, action);
        if (!r.events.some((e) => e.type === 'trace' && e.meaningful)) continue;
        s = recordBattleAction(s, action);
        state = r.state;
        n += 1;
        break;
      }
      if (state.phase !== 'player' || n >= max) break;
      const end: Action = { type: 'endTurn' };
      s = recordBattleAction(s, end);
      state = applyAction(state, end).state;
    }
    return { save: s, state };
  }

  test('a won fight writes the version’s record from the replay, and a tier-up shows', () => {
    const { save, state } = fight(start(true), 1);
    const end = endBattle(save, { ...state, phase: 'won' });
    const record = recordOf(end.save.profile, 's', 1);
    expect(record.casts).toBe(10);
    expect(record.recent).toHaveLength(10);
    expect(record.best.reliability).toBe(3);
    expect(end.save.profile.glyphRecords).toEqual(
      recordTripCasts(save.profile, save.trip as NonNullable<typeof save.trip>).glyphRecords,
    );
    const ups = end.save.trip?.stats.elegance ?? [];
    expect(ups).toContainEqual({
      glyph: 's',
      name: 's',
      version: 1,
      metric: 'reliability',
      tier: 3,
    });
  });

  test('a wipe records too', () => {
    const { save, state } = fight(start(false), 2);
    const lost = {
      ...state,
      phase: 'lost' as const,
      units: state.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
    };
    const end = endBattle(save, lost);
    expect(end.outcome).toBe('wiped');
    expect(recordOf(end.save.profile, 's', 1).casts).toBe(2);
  });

  test('a fight with no Glyph casts leaves the records as they were', () => {
    const save = start(true);
    const end = endBattle(save, { ...startBattle(save).state, phase: 'won' });
    expect(end.save.profile.glyphRecords).toEqual(save.profile.glyphRecords);
  });

  test('a Lab battle and a Bench trial trace Glyph casts but write nothing', () => {
    const save = start(true);
    const { state } = setup('G:s> . . .', [inked], 'D . d . .');
    const lab = cast(state, 'draughtsman', 'right');
    expect(glyphSamples(lab.events, save.profile)).toHaveLength(1); // traced, but nothing stores it
    expect(() => endBattle({ ...save, trip: null }, lab.state)).toThrow();
    playTrial({ left: 'bolt', right: 'ink', solvent: 'pitch' });
    expect(save.profile.glyphRecords['s@1']?.casts).toBe(9);
  });
});
