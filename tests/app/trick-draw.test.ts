import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { RIVALS, type RivalDef } from '$data/rivals';
import {
  type BattleState,
  type Coord,
  type EnemyUnit,
  type Jar,
  parseLabel,
  type RivalIntent,
  scenarioBattle,
  tileAt,
} from '$engine';
import { cloneData } from '$engine/clone';
import { describe as describeEvent } from '$engine/events';
import { trickTable } from '$engine/rivals/tricks';
import type { Telegraph, TrickDef } from '$engine/rivals/types';
import { IDLE } from '../../src/app/battleInput';
import {
  overlayFor,
  type StepDraw,
  type TrickDraw,
  trickDrawOf,
  trickDraws,
  trickSteps,
} from '../../src/app/overlay';
import { TRICK_SAMPLES, trickScene } from '../../src/ui/screens/galleryTricks';

/** RV-13: the `draw` descriptor to the trick banner's lines and the board's highlights. */

const at = (lbl: string): Coord => parseLabel(lbl);
const FIX = 'canals:drawFixture' as const;
const FIX_RIVAL = 'drawFixtureRival';

let telegraph: Telegraph = { label: 'fixture', tiles: [], units: [] };
const FIXTURE: TrickDef = {
  id: FIX,
  name: 'the fixture trick',
  init: () => null,
  action: { plan: () => [], resolve: (_c, _u, _i, own) => own },
  mark: { timing: 'beforeActions', plan: () => null, resolve: (_c, _u, _m, own) => own },
  draw: () => telegraph,
  describe: (shown) => ('lock' in shown ? 'does the action' : 'does the mark'),
};

const rivals = RIVALS as Record<string, RivalDef>;
beforeAll(() => {
  trickTable()[FIX] = FIXTURE;
  const base = RIVALS.lamplighter;
  if (!base) throw new Error('no Lamplighter');
  rivals[FIX_RIVAL] = { ...base, id: FIX_RIVAL as RivalDef['id'], trick: FIX };
});
afterAll(() => {
  delete trickTable()[FIX];
  delete rivals[FIX_RIVAL];
});

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

const trickIntent = (order = 1): RivalIntent & { kind: 'trick' } => ({
  kind: 'trick',
  trick: FIX,
  lock: null,
  data: null,
  fallback: null,
  order,
});

/** A board with the rival switched to the fixture trick, an action pinned and/or a mark shown. */
function staged(
  board: string,
  opts: { intent?: RivalIntent; mark?: Coord[]; objects?: { id: number; at: Coord | null }[] },
): BattleState {
  const s = cloneData(scenarioBattle({ board, pins: opts.intent ? { A1: opts.intent } : {} }));
  const e = rivalOf(s);
  if (!e.rival) throw new Error('no rival');
  e.rival.rival = FIX_RIVAL as RivalDef['id'];
  e.rival.trick = null;
  e.rival.objects = (opts.objects ?? []).map((o) => ({
    id: o.id,
    trick: FIX,
    owner: e.id,
    at: o.at,
    data: null,
  }));
  e.rival.mark = opts.mark ? { data: null, tiles: opts.mark } : null;
  if (opts.intent) e.intent = opts.intent;
  return s;
}

const BOARD = 'L . . .\n. D . S\n. . . .';

describe('the draw descriptor to a TrickDraw (pure)', () => {
  test('tiles, unit places, object places, n/m and countdown, with words for where', () => {
    const s = staged(BOARD, { objects: [{ id: 5, at: at('D3') }] });
    const d = trickDrawOf(
      s,
      rivalOf(s),
      'mark',
      {
        label: 'tune',
        tiles: [at('C1'), at('C1'), at('B3')],
        units: ['draughtsman', 'nobody'],
        objects: [{ kind: 'trick', id: 5 }],
        sequence: [2, 4],
        countdown: 1,
      },
      'plays a note',
      null,
    );
    expect(d).toMatchObject({
      unit: rivalOf(s).id,
      slot: 'mark',
      label: 'tune',
      text: 'plays a note',
      order: null,
      from: at('A1'),
      tiles: [at('C1'), at('B3')],
      units: [at('B2')],
      objects: [{ ref: { kind: 'trick', id: 5 }, at: at('D3') }],
      sequence: [2, 4],
      countdown: 1,
    });
    expect(d.where).toBe('C1, B3, D3, Draughtsman');
  });

  test('an object off the board has no place; a long list is cut', () => {
    const s = staged(BOARD, { objects: [{ id: 1, at: null }] });
    const d = trickDrawOf(
      s,
      rivalOf(s),
      'action',
      {
        label: 'x',
        tiles: ['A1', 'B1', 'C1', 'D1', 'A3', 'B3'].map(at),
        units: [],
        objects: [{ kind: 'trick', id: 1 }],
      },
      '',
      1,
    );
    expect(d.objects).toEqual([{ ref: { kind: 'trick', id: 1 }, at: null }]);
    expect(d.where).toBe('A1, B1, C1, D1 and 2 more');
  });
});

describe('the draw to board highlights (pure)', () => {
  const base: TrickDraw = {
    unit: 'u',
    slot: 'action',
    label: 'writ',
    text: '',
    where: '',
    from: at('A1'),
    order: 2,
    tiles: [at('B1')],
    units: [at('B2')],
    objects: [{ ref: { kind: 'trick', id: 1 }, at: at('C3') }],
    sequence: null,
    countdown: null,
    emphasis: 'normal',
  };

  test('tiles, units and trick objects become a step with the order, sequence and countdown', () => {
    const steps = trickSteps([{ ...base, sequence: [1, 3], countdown: 2 }]);
    expect(steps).toEqual<StepDraw[]>([
      {
        from: at('A1'),
        label: 'writ',
        tiles: [at('B1')],
        units: [at('B2')],
        objects: [at('C3')],
        order: 2,
        sequence: [1, 3],
        countdown: 2,
        emphasis: 'normal',
        trick: 'action',
      },
    ]);
  });

  test('a mark has no order badge; it is always drawn, even with nothing on the board', () => {
    const steps = trickSteps([
      { ...base, slot: 'mark', order: null, tiles: [], units: [], objects: [] },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ trick: 'mark', order: 0, tiles: [] });
  });

  test('an action with nothing to show gives no step (the banner still has it)', () => {
    expect(trickSteps([{ ...base, tiles: [], units: [], objects: [] }])).toEqual([]);
  });

  test("a jar is the wick's own drawing: its tile and the unit on it are left out", () => {
    const steps = trickSteps([
      {
        ...base,
        tiles: [at('B1')],
        units: [at('B1')],
        objects: [{ ref: { kind: 'jar', id: 1 }, at: at('B1') }],
      },
    ]);
    expect(steps).toEqual([]);
  });
});

describe('trickDraws reads a living rival through his trick', () => {
  test('the action trick from his intent and the mark he shows, each by the trick draw', () => {
    telegraph = { label: 'fixture', tiles: [at('C1')], units: [], countdown: 3 };
    const s = staged(BOARD, { intent: trickIntent(2), mark: [at('B3')] });
    const draws = trickDraws(s);
    expect(draws.map((d) => [d.slot, d.text, d.order])).toEqual([
      ['action', 'does the action', 2],
      ['mark', 'does the mark', null],
    ]);
    expect(draws[0]).toMatchObject({ tiles: [at('C1')], countdown: 3 });
    // The overlay carries both: the board's steps and the banner's lines.
    const o = overlayFor(s, IDLE);
    expect(o.tricks).toHaveLength(2);
    expect(o.steps?.filter((st) => st.trick).map((st) => st.trick)).toEqual(['action', 'mark']);
  });

  test('a dead rival, or none, draws nothing; emphasis follows the focus', () => {
    telegraph = { label: 'fixture', tiles: [at('C1')], units: [] };
    const s = staged(BOARD, { mark: [at('B3')] });
    expect(trickDraws(s, { kind: 'enemy', id: rivalOf(s).id })[0]?.emphasis).toBe('strong');
    expect(trickDraws(s, { kind: 'enemy', id: 'someone' })[0]?.emphasis).toBe('dim');
    const dead = cloneData(s);
    rivalOf(dead).hp = 0;
    expect(trickDraws(dead)).toEqual([]);
    expect(trickDraws(scenarioBattle({ board: 'D . .' }))).toEqual([]);
  });
});

describe('the long wick still draws as before', () => {
  const wickBoard = '. . . .\n. . . L\nD . . .';
  function wicked(): BattleState {
    const s = cloneData(
      scenarioBattle({
        board: wickBoard,
        pins: {
          D2: {
            kind: 'trick',
            trick: 'canals:longWick',
            lock: { kind: 'jar', id: 1 },
            data: {},
            fallback: null,
            order: 1,
          },
        },
      }),
    );
    const jar: Jar = {
      owner: rivalOf(s).id,
      event: 'step',
      rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
      heading: null,
      origin: { caster: rivalOf(s).id, spell: 'lantern', cast: 0 },
      id: 1,
      seq: 1,
    };
    tileAt(s, at('A3')).jar = jar;
    s.nextJar = 2;
    return s;
  }

  test('the fuse line and jar pill are unchanged; the banner names it; no extra tiles on the jar', () => {
    const o = overlayFor(wicked(), IDLE);
    expect(o.rivals?.[0]).toMatchObject({ label: 'long wick', wick: { to: at('A3') } });
    expect(o.tricks).toHaveLength(1);
    expect(o.tricks?.[0]).toMatchObject({
      slot: 'action',
      label: 'the long wick',
      text: 'opens his jar from afar',
      order: 1,
    });
    expect(o.tricks?.[0]?.where).toContain('A3');
    // The apprentice stands on the jar's tile: left to the wick's own ring.
    expect(o.steps?.some((st) => st.trick)).toBe(false);
  });
});

describe('trick events have log lines', () => {
  const ref = { id: 'r', name: 'Lamplighter', at: at('A1'), member: false };
  const e = (type: string, data: Record<string, unknown>) =>
    describeEvent({ type, unit: ref, at: ref.at, data } as never);

  test('each hook event reads as a line', () => {
    expect(e('canals:trickResists', { what: 'push' })).toBe(
      'Lamplighter at A1 cannot be pushed (his trick)',
    );
    expect(e('canals:trickResists', { what: 'fall' })).toContain('will not fall');
    expect(e('canals:trickMark', { timing: 'afterActions', tiles: [{ x: 0, y: 0 }] })).toBe(
      'Lamplighter at A1 marks a tile for after the enemy actions',
    );
    expect(e('canals:trickMark', { timing: 'beforeActions', tiles: [1, 2] })).toBe(
      'Lamplighter at A1 marks 2 tiles for before the enemy actions',
    );
    expect(e('canals:trickMarkUsed', {})).toBe("Lamplighter at A1's mark takes effect");
    expect(e('canals:trickObject', { id: 1, at: { x: 2, y: 3 } })).toBe(
      'Lamplighter at A1 sets something down at C4',
    );
    expect(e('canals:trickObject', { id: 1, at: null })).toContain('sets something aside');
    expect(e('canals:trickObjectGone', { id: 1, why: 'erased' })).toBe(
      "Lamplighter at A1's object is erased",
    );
  });
});

describe('the gallery shows five fixture tricks', () => {
  test('each draws a banner line and board marks over a real room', () => {
    expect(TRICK_SAMPLES).toHaveLength(5);
    for (const sample of TRICK_SAMPLES) {
      const scene = trickScene(sample);
      expect(scene.draws).toHaveLength(1);
      expect(scene.overlay.tricks).toBe(scene.draws);
      expect(scene.overlay.steps?.length).toBe(1);
      expect(scene.draws[0]?.text).not.toBe('');
    }
  });

  test('the clock has a countdown, the tune an n/m, the register circles two apprentices', () => {
    const by = (id: string) =>
      trickScene(TRICK_SAMPLES.find((t) => t.id === id) ?? fail(id)).draws[0];
    expect(by('clock')).toMatchObject({ countdown: 2, objects: [{ at: at('E5') }] });
    expect(by('tune')).toMatchObject({ sequence: [2, 4], objects: [{ at: null }] });
    expect(by('register')?.units).toEqual([at('B2'), at('E2')]);
    expect(by('steam')?.tiles).toEqual([at('A6')]);
    expect(by('way')?.tiles).toHaveLength(3);
  });
});

function fail(id: string): never {
  throw new Error(`no sample ${id}`);
}
