import { describe, expect, test } from 'vitest';
import { ENEMIES, type KindId } from '$data';
import { MARGINALIA_HANDS } from '$data/districts/seam';
import { unitTraits } from '$engine/arrival';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts/kit';
import {
  FAMILIARS_FALL_EVENT,
  HAND_EVENT,
  handStep,
  MARGINALIA_STEPS,
  rowAround,
} from '$engine/districts/seam';
import type { GameEvent } from '$engine/events';
import { landKindFree } from '$engine/mix';
import { tileAt } from '$engine/queries';
import { awardsPage } from '$engine/standIn';
import type { BattleState, EnemyUnit, Unit } from '$engine/types';
import {
  act,
  board,
  draft,
  expectLog,
  expectLogIncludes,
  parseLabel,
  type Step,
} from '../scenarios/harness';

/** The Marginalia, the Seam's heart (SM P2, P3; SM-1). `G` is it. */

const endTurn = { type: 'endTurn' } as const;
const at = parseLabel;

const marginalia = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'marginalia');
  if (u?.kind !== 'enemy') throw new Error('no Marginalia');
  return u;
};
const labelOf = (s: BattleState): string => {
  const i = marginalia(s).intent;
  return i?.kind === 'step' ? i.telegraph.label : 'idle';
};
const unitOf = (s: BattleState, id: string): Unit => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const stateAt = (s: BattleState, lbl: string): string | null =>
  tileAt(s, at(lbl)).state?.id ?? null;

/** Plans and lands one hand now, as the script would on its round. */
function hand(s: BattleState, kind: KindId): Step {
  return draft(s, (ctx) => {
    const step = KIT.steps[handStep(kind)];
    const g = marginalia(ctx.s);
    const tg = step?.plan(ctx.s, g);
    if (!step || !tg) throw new Error(`hand ${kind} did not plan`);
    step.act(ctx, g, tg);
  });
}

const OPEN = `
. . . . . .
. . S . . .
. . . . . .
. . . . . G
`;

describe('the Marginalia', () => {
  test('is a one-tile, anchored heart with five hands in cycle order; not a stand-in', () => {
    const def = ENEMIES.marginalia;
    expect(def.token).toBe('G');
    expect(def.move).toBe(0);
    expect(def.boss).toBe(true);
    expect(def.script?.steps).toEqual(MARGINALIA_STEPS);
    expect(MARGINALIA_HANDS).toEqual(['ink', 'oil', 'steam', 'brass', 'spark']);
    expect(awardsPage({ def: 'marginalia' })).toBe(true);
    expect(unitTraits(marginalia(board(OPEN)))).toContain('anchored');
  });

  test('the pattern: a row of three on the nearest apprentice, clipped to the board', () => {
    const s = board(OPEN);
    expect(rowAround(s, at('C2'))).toEqual([at('B2'), at('C2'), at('D2')]);
    expect(rowAround(s, at('A1'))).toEqual([at('A1'), at('B1')]);
    // The nearest apprentice is the centre; a tie goes to reading order (the second board).
    const two = board(`
. . . . . .
. D . . . .
. . . S . .
. . . . . G
`);
    const tg = marginalia(two).intent;
    expect(tg?.kind === 'step' ? tg.telegraph.tiles : []).toEqual([at('C3'), at('D3'), at('E3')]);
    const tie = board(`
. . . . .
. D . S .
. . . . .
. . G . .
`);
    const tt = marginalia(tie).intent;
    expect(tt?.kind === 'step' ? tt.telegraph.tiles : []).toEqual([at('A2'), at('B2'), at('C2')]);
  });

  describe('each hand lands as a cast of its kind', () => {
    test('ink: marks the unit, blots the empty tiles', () => {
      const r = hand(board(OPEN), 'ink');
      expectLog(r.events, [
        'the Marginalia writes Ink on B2–D2',
        'ink lands at B2 as blot',
        'Stoker is marked',
        'ink lands at D2 as blot',
      ]);
      expect(unitOf(r.state, 'stoker').mark).not.toBeNull();
      expect([stateAt(r.state, 'B2'), stateAt(r.state, 'D2')]).toEqual(['blot', 'blot']);
    });

    test('oil: a slick on each tile, under the unit too', () => {
      const r = hand(board(OPEN), 'oil');
      expect(['B2', 'C2', 'D2'].map((l) => stateAt(r.state, l))).toEqual([
        'slick',
        'slick',
        'slick',
      ]);
    });

    test('steam: a cloud on each tile', () => {
      const r = hand(board(OPEN), 'steam');
      expect(['B2', 'C2', 'D2'].map((l) => stateAt(r.state, l))).toEqual([
        'cloud',
        'cloud',
        'cloud',
      ]);
    });

    test('brass: collars the unit, plates the empty tiles', () => {
      const r = hand(board(OPEN), 'brass');
      expect(unitOf(r.state, 'stoker').collar).not.toBe(false);
      expect([stateAt(r.state, 'B2'), stateAt(r.state, 'C2'), stateAt(r.state, 'D2')]).toEqual([
        'plate',
        null,
        'plate',
      ]);
    });

    test('spark: 1 to the unit, and nothing to burst on bare floor', () => {
      const r = hand(board(OPEN), 'spark');
      expectLogIncludes(r.events, [
        'Spark hits nothing',
        'Spark hits Stoker for 1',
        'Spark hits nothing',
      ]);
      expect(unitOf(r.state, 'stoker').hp).toBe(unitOf(board(OPEN), 'stoker').hp - 1);
    });

    test.each([...MARGINALIA_HANDS])(
      '%s: the same events as a free cast on those tiles',
      (kind) => {
        const s = board(OPEN);
        const handLog = hand(s, kind).events.filter((e) => e.type !== HAND_EVENT);
        const free = draft(s, (ctx) => {
          for (const c of rowAround(ctx.s, at('C2')))
            landKindFree(ctx, kind, { kind: 'tile', at: c });
        }).events;
        expect(handLog).toEqual(free);
      },
    );

    test('a hand has no origin, so it never hears a district (P5)', () => {
      const r = hand(board(OPEN), 'spark');
      const hit = r.events.find((e) => e.type === 'damage');
      expect(hit?.origin ?? null).toBeNull();
    });
  });

  test('the cycle repeats: ink, oil, steam, brass, spark, then ink again', () => {
    let s = board(OPEN, { hp: { C2: 99 } });
    const seen: string[] = [];
    for (let i = 0; i < 11; i++) {
      seen.push(labelOf(s));
      s = act(s, endTurn).state;
    }
    expect(seen).toEqual([...MARGINALIA_HANDS, ...MARGINALIA_HANDS, 'ink']);
  });

  test('telegraphs a round ahead with a describe line, then lands', () => {
    const r = act(board(OPEN), endTurn);
    expectLogIncludes(r.events, ['the Marginalia writes Ink on B2–D2']);
    expectLogIncludes(r.events, ['marginalia at F4 will write Oil on B2–D2']);
  });

  test('a hand mixes with an earlier one: oil on its own blots is stain', () => {
    let s = act(board(OPEN), endTurn).state; // ink
    const r = act(s, endTurn); // oil
    expectLogIncludes(r.events, [
      'the Marginalia writes Oil on B2–D2',
      'B2: stain',
      'oil lands at C2 as slick',
      'D2: stain',
    ]);
    s = r.state;
    expect(stateAt(s, 'B2')).toBe('stain');
  });

  test('standing through a whole cycle is deadly: kettles and a shackle burst', () => {
    let s = board(OPEN);
    let last: GameEvent[] = [];
    for (let i = 0; i < 5; i++) {
      const r = act(s, endTurn);
      last = [...r.events];
      s = r.state;
    }
    expectLogIncludes(last, ['the Marginalia strikes Spark on B2–D2']);
    expect(unitOf(s, 'stoker').hp).toBe(0);
  });

  test('the spark hand bursts a cloud with three units in it: Storm on all three', () => {
    const s = board(
      `
. . . . . .
. f~ S~ r~ . .
. . . . . .
. . . . . G
`,
      { hp: { B2: 9, C2: 20, D2: 9 } },
    );
    const r = hand(s, 'spark');
    expectLogIncludes(r.events, [
      'the Marginalia strikes Spark on B2–D2',
      'Spark hits familiar at B2 for 1',
      'storm bursts at B2, hitting familiar at B2, Stoker, rat at D2',
      'Storm hits familiar at B2 for 2',
      'Storm hits Stoker for 2',
      'Storm hits rat at D2 for 2',
    ]);
    // Like a three-target cast, each tile's spark bursts the cloud again (no network dedupe).
    const storms = r.events.filter((e) => e.type === 'damage' && e.source === 'Storm');
    expect(storms).toHaveLength(9);
  });

  test('self-harm: its own hand lands on its tile', () => {
    const s = board(`
. . . . .
. G S . .
. . . . .
`);
    const hp = marginalia(s).hp;
    const spark = hand(s, 'spark');
    expectLogIncludes(spark.events, ['Spark hits marginalia at B2 for 1']);
    expect(marginalia(spark.state).hp).toBe(hp - 1);
    const ink = hand(s, 'ink');
    expect(marginalia(ink.state).mark).not.toBeNull();
  });

  test('its familiars fall with it, and the room is won', () => {
    const s = board(`
S . f . .
. . . . f
. . G . .
`);
    const r = draft(s, (ctx) => dealDamage(ctx, marginalia(ctx.s), 99, 'Strike'));
    expect(r.events.some((e) => e.type === FAMILIARS_FALL_EVENT)).toBe(true);
    expectLogIncludes(r.events, ["the Marginalia's familiars fall with it (2)"]);
    expect(r.state.units.filter((u) => u.kind === 'enemy' && u.hp > 0)).toEqual([]);
    expect(r.events.filter((e) => e.type === 'died')).toHaveLength(3);
  });

  test('a dead Marginalia lands no hand', () => {
    const s = draft(board(OPEN), (ctx) => dealDamage(ctx, marginalia(ctx.s), 99, 'Strike')).state;
    expect(s.units.some((u) => u.kind === 'enemy' && u.hp > 0)).toBe(false);
  });

  test('deterministic replay: the same board plays the same log twice', () => {
    const run = (): string[] => {
      let s = board(OPEN, { hp: { C2: 99 } });
      const out: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = act(s, endTurn);
        out.push(...r.events.map((e) => JSON.stringify(e)));
        s = r.state;
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
