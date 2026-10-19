import { describe, expect, test } from 'vitest';
import { IDIOMS } from '$data';
import { type BattleState, type GameEvent, parseLabel, runScenario, scenarioById } from '$engine';
import { type Ctx, emit, ref, withOrigin } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { type IdiomHit, idiomPre, idiomsIn, withIdioms } from '$engine/idioms';
import { applyMark } from '$engine/marks';
import { landKind } from '$engine/mix';
import { push } from '$engine/push';
import type { Origin } from '$engine/types';
import { flowFor, run, tile, unit } from '../scenarios/chemHarness';
import { board, unitAtLabel } from '../scenarios/harness';

/** Design §11: the nine idioms are log patterns, named once per fight and credited to a cast. */

const scene = (row2: string, opts: Parameters<typeof board>[1] = {}) =>
  board(`D . . . .\n${row2}\n. . . . .`, opts);
const named = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.type === 'named' && e.what === 'idiom' ? [e.id] : []));
/** Runs `fn` as one action: idioms are named after it, as `applyAction` does. */
const act = (s: BattleState, fn: (ctx: Ctx) => void) =>
  run(s, (ctx) => withIdioms(ctx, () => fn(ctx)));
const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 7 };
const at = (lbl: string) => parseLabel(lbl);
const hits = (log: readonly GameEvent[], s: BattleState): IdiomHit[] =>
  idiomsIn(log, idiomPre(s), s);

test('the nine idioms in the data match the engine', () => {
  expect(IDIOMS.map((i) => i.id)).toEqual([
    'cashingIn',
    'bonfire',
    'theWall',
    'lanternWalk',
    'debtCollection',
    'steamRoom',
    'longDrop',
    'peal',
    'redraft',
  ]);
});

describe('goldens', () => {
  test('cashing-in: Spark bursts a mark that was already there', () => {
    const r = act(scene('. . d! . .'), (ctx) =>
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(ctx.s)),
    );
    expect(named(r.events)).toEqual(['cashingIn']);
    expect(r.state.named).toContain('idiom:cashingIn');
  });

  test('cashing-in needs an old mark: marking and bursting in one action is not it', () => {
    const r = act(scene('. . d . .'), (ctx) => {
      applyMark(ctx, unitAtLabel(ctx.s, 'C2'), { deep: false, bound: null, origin: ORIGIN });
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(ctx.s));
    });
    expect(named(r.events)).toEqual([]);
  });

  test('bonfire: one fire along 4 tiles of oil', () => {
    const r = act(board('D . . . .\n . o o o o\n . . . . .'), (ctx) =>
      landKind(ctx, 'spark', tile('B2'), flowFor(ctx.s)),
    );
    expect(named(r.events)).toEqual(['bonfire']);
    const short = act(board('D . . . .\n . o o o .\n . . . . .'), (ctx) =>
      landKind(ctx, 'spark', tile('B2'), flowFor(ctx.s)),
    );
    expect(named(short.events)).toEqual([]);
  });

  test('the-wall: a slide over oil that ends in a crush, credited to the pushing cast', () => {
    const r = act(board('D r o o o {wall}'), (ctx) =>
      push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, ORIGIN),
    );
    const e = r.events.find((x) => x.type === 'named');
    expect(e).toMatchObject({ what: 'idiom', id: 'theWall', origin: ORIGIN });
  });

  test('steam-room: one compound made now covers 6 tiles', () => {
    const s = board('D . . . .\n . . . {pool} {pool}\n {pool} {pool} {pool} . .');
    const r = act(s, (ctx) => {
      landKind(ctx, 'oil', tile('B2'), flowFor(ctx.s));
      landKind(ctx, 'oil', tile('B2'), flowFor(ctx.s));
    });
    expect(named(r.events)).toContain('steamRoom');
  });

  test('long-drop: a foe pushed into a canal', () => {
    const r = act(board('D r w>'), (ctx) =>
      push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, ORIGIN),
    );
    expect(named(r.events)).toEqual(['longDrop']);
  });

  test('lantern-walk: a real Spark jar drifts twice and opens on a foe', () => {
    const def = scenarioById('lantern-walk');
    if (!def) throw new Error('missing Lantern Walk lesson');
    const result = runScenario(def);
    expect(result.events.filter((e) => e.type === 'drawn')).toHaveLength(2);
    expect(result.events.find((e) => e.type === 'jarOpened')).toMatchObject({
      at: at('D2'),
      by: { id: 'dummy-1' },
    });
    expect(named(result.events)).toEqual(['lanternWalk']);
    expect(result.events.find((e) => e.type === 'named' && e.id === 'lanternWalk')).toMatchObject({
      origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
    });
  });

  test('a party member falling is not a Long Drop', () => {
    const r = act(board('D . w>'), (ctx) =>
      push(ctx, unitAtLabel(ctx.s, 'A1'), 'right', 2, ORIGIN),
    );
    expect(named(r.events)).not.toContain('longDrop');
  });

  test('peal: one conduct burst across 3 tiles', () => {
    const r = act(board('D . . . .\n # # b d .\n . . . d .'), (ctx) =>
      landKind(ctx, 'spark', tile('A2'), flowFor(ctx.s)),
    );
    expect(named(r.events)).toContain('peal');
  });

  test('debt-collection: a mark bound by one apprentice is released by another', () => {
    const s = board('D S . . .\n . . r . .', { hp: { C2: 9 } });
    const marked = run(s, (ctx) =>
      applyMark(ctx, unitAtLabel(ctx.s, 'C2'), {
        deep: false,
        bound: { action: 'shove', event: 'hit', solvent: null, heading: 'down' },
        origin: ORIGIN, // set by the draughtsman
      }),
    ).state;
    const r = act(marked, (ctx) => {
      const stoker = unitAtLabel(ctx.s, 'B1');
      emit(ctx, {
        type: 'cast',
        caster: ref(stoker),
        spell: '0,0',
        aim: { kind: 'dir', dir: 'down' },
        aimText: 'down',
      });
      dealDamage(ctx, unitAtLabel(ctx.s, 'C2'), 1, 'test', [], { heading: null, at: at('B1') });
    });
    expect(named(r.events)).toEqual(['debtCollection']);
    // The binder collecting their own debt is not the idiom.
    const own = act(marked, (ctx) => {
      emit(ctx, {
        type: 'cast',
        caster: ref(unitAtLabel(ctx.s, 'A1')),
        spell: '0,0',
        aim: { kind: 'dir', dir: 'down' },
        aimText: 'down',
      });
      dealDamage(ctx, unitAtLabel(ctx.s, 'C2'), 1, 'test', [], { heading: null, at: at('A1') });
    });
    expect(named(own.events)).toEqual([]);
  });

  test('named once per fight', () => {
    const s = scene('. . d! . .');
    const first = act(s, (ctx) => landKind(ctx, 'spark', unit('dummy-1'), flowFor(ctx.s)));
    const again = act({ ...s, named: first.state.named }, (ctx) =>
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(ctx.s)),
    );
    expect(named(first.events)).toEqual(['cashingIn']);
    expect(named(again.events)).toEqual([]);
  });
});

describe('patterns without a live path yet', () => {
  const s = board('D r . .');
  const a = ref(unitAtLabel(s, 'A1'));
  const b = ref(unitAtLabel(s, 'B1'));
  const burst = (tiles: string[]): GameEvent => ({
    type: 'burst',
    burst: 'fire',
    at: at(tiles[0] ?? 'A1'),
    tiles: tiles.map(at),
    units: [],
  });

  test('redraft: a Swap lands something where a later burst goes off', () => {
    const log: GameEvent[] = [{ type: 'swapped', a, b, origin: ORIGIN }, burst(['A1'])];
    expect(hits(log, s)).toEqual([{ id: 'redraft', origin: ORIGIN }]);
    expect(hits([burst(['A1']), { type: 'swapped', a, b }], s)).toEqual([]);
    expect(hits([{ type: 'swapped', a, b }, burst(['D1'])], s)).toEqual([]);
  });

  test('redraft: a Draw counts too', () => {
    const log: GameEvent[] = [
      { type: 'drawn', from: at('A1'), to: at('C1'), what: 'oil' },
      burst(['C1', 'D1']),
    ];
    expect(hits(log, s).map((h) => h.id)).toEqual(['redraft']);
  });

  test('lantern-walk: opening a jar without a Spark jar on water is insufficient', () => {
    const open: GameEvent = { type: 'jarOpened', at: at('C1'), by: b };
    expect(hits([open], s)).toEqual([]);
  });
});

describe('credit', () => {
  test('an idiom is credited to the origin of the event that made it', () => {
    const r = act(scene('. . d! . .'), (ctx) =>
      withOrigin(ctx, ORIGIN, () => landKind(ctx, 'spark', unit('dummy-1'), flowFor(ctx.s))),
    );
    expect(r.events.find((e) => e.type === 'named' && e.what === 'idiom')).toMatchObject({
      origin: ORIGIN,
    });
  });
});
