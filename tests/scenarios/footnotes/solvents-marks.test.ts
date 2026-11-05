import { describe, expect, test } from 'vitest';
import { type InventionDef, SOLVENT_IDS, VARIANTS } from '$data';
import {
  type BattleState,
  type Coord,
  type Dir,
  libraryOf,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import { arrive } from '$engine/arrival';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { runInvention } from '$engine/inventions';
import { applyMark } from '$engine/marks';
import { enemyWalk } from '$engine/movement';
import { push } from '$engine/push';
import { roundEnd } from '$engine/turn';
import type { Bound, Origin, Target } from '$engine/types';
import { flowFor } from '../chemHarness';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, step } from './castHelper';

/**
 * FN-C9: Bind, Lift, Gallnut and Cinder (levels I, II, capstones). Each margin line has a
 * `fourCombos` scenario; each capstone is proved through the method or solvent it belongs to.
 */
const at = parseLabel;
const right = { kind: 'dir', dir: 'right' } as const;
const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });
const library = libraryOf([
  inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' }),
  inv('lift', 'lift', ['shove']),
  inv('stainer', 'repeat', ['strike'], { solvent: 'gallnut' }),
  inv('hearth', 'repeat', ['shove'], { solvent: 'cinder' }),
  inv('brand', 'repeat', ['strike'], { solvent: 'cinder' }),
]);
const opts = { inventions: library };

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const ut = (id: string): Target => ({ kind: 'unit', unit: id });
const markedIds = (s: BattleState) => s.units.filter((u) => u.mark).map((u) => u.id);
const count = (events: readonly { type: string }[], type: string) =>
  events.filter((e) => e.type === type).length;
const hit = (
  ctx: Ctx,
  id: string,
  amount: number,
  from: Coord | null,
  heading: Dir | null = null,
) => dealDamage(ctx, unit(ctx.s, id), amount, 'test', [], { heading, at: from });
const bound = (heading: Dir | null = null): Bound => ({
  action: 'shove',
  event: 'hit',
  solvent: null,
  heading,
});
const rd = (s: BattleState, fn: (ctx: Ctx) => void, ids: FootnoteIds) =>
  runDraft(s, fn, { footnotes: ids });
const board = (ascii: string, hp: Record<string, number> = {}, lattice = 'Bolt> inv:lift') =>
  withLattices(ascii, { draughtsman: lattice }, { ...opts, hp });
const castOn = (s: BattleState, ids: string[]) => castWith(s, right, withFootnotes(ids));
const bindOn = (ctx: Ctx, id: string) => runInvention(ctx, 'inv:recoil', ut(id), flowFor(ctx.s));

// ── Bind ────────────────────────────────────────────────

/**
 * Two bound rats and a deep one: a hit from the west with its own heading down (cast heading up)
 * shows the release heading; a killing hit shows the last word; a second Bind shows the layers.
 */
function bindMark(ids: string[]) {
  const s = withLattices(
    '. . . .\n. r . .\n. . r D\n. r . .',
    {},
    { ...opts, hp: { B2: 9, C3: 9, B4: 9 } },
  );
  const r = rd(
    s,
    (ctx) => {
      applyMark(ctx, unit(ctx.s, 'rat-1'), { deep: false, bound: bound('up'), origin: ORIGIN });
      hit(ctx, 'rat-1', 1, at('A2'), 'down');
      applyMark(ctx, unit(ctx.s, 'rat-2'), { deep: false, bound: bound('up'), origin: ORIGIN });
      hit(ctx, 'rat-2', 99, null);
    },
    withFootnotes(ids),
  );
  const push1 = r.events.find((e) => e.type === 'push');
  const layered = rd(
    s,
    (ctx) => {
      bindOn(ctx, 'rat-3');
      bindOn(ctx, 'rat-3');
      hit(ctx, 'rat-3', 1, at('A4'));
      hit(ctx, 'rat-3', 1, at('A4'));
    },
    withFootnotes(ids),
  );
  return {
    dir: push1?.type === 'push' ? push1.dir : null,
    lastWord: count(r.events, 'released') - 1,
    layers: count(layered.events, 'released'),
  };
}

describe('Bind', () => {
  test('bind:mark fourCombos: recoil or fixed, then last word or layered', () => {
    const facts = fourCombos(
      'bind:mark',
      ['bind-mark-recoil', 'bind-mark-fixed'],
      ['bind-mark-lastword', 'bind-mark-layered'],
      ({ l1, l2 }) => bindMark([l1, l2]),
    ).map((r) => r.result);
    expect(facts).toEqual([
      { dir: 'right', lastWord: 1, layers: 1 }, // recoil + last word
      { dir: 'right', lastWord: 0, layers: 2 }, // recoil + layered
      { dir: 'up', lastWord: 1, layers: 1 }, // fixed + last word
      { dir: 'up', lastWord: 0, layers: 2 }, // fixed + layered
    ]);
    expect(bindMark([])).toEqual({ dir: 'down', lastWord: 0, layers: 1 });
  });

  test('bind-mark-layered: the second action is released by the next hit, then the mark is gone', () => {
    const s = withLattices('. . . .\n. r . .\n. . . D', {}, opts);
    const r = rd(
      s,
      (ctx) => {
        bindOn(ctx, 'rat-1');
        bindOn(ctx, 'rat-1');
      },
      withFootnotes(['bind-mark-layered']),
    );
    const mark = unit(r.state, 'rat-1').mark;
    expect(mark?.deep).toBe(true);
    expect(mark?.layer?.action).toBe('shove');
  });

  /** An ally, two rats and an empty cloud tile; rat-3 stands below it, ready to walk in. */
  const CLOUD = 'D~ r~ r~ ~ .\n. . . r .';
  function bindCloud(ids: string[]) {
    const s = withLattices(CLOUD, {}, { ...opts, hp: { B1: 9, C1: 9 } });
    const out = { cast: [] as string[], dusk: [] as string[], haunted: false, released: 0 };
    const r = rd(
      s,
      (ctx) => {
        bindOn(ctx, 'rat-1');
        out.cast = markedIds(ctx.s);
        roundEnd(ctx);
        out.dusk = markedIds(ctx.s);
        arrive(ctx, 'rat-3', [at('D1')], { cause: 'push', origin: null, landing: true });
        out.haunted = !!unit(ctx.s, 'rat-3').mark?.bound;
        const from = ctx.log.length;
        hit(ctx, 'rat-1', 1, at('B2'));
        out.released = count(ctx.log.slice(from), 'released');
      },
      withFootnotes(ids),
    );
    return { ...out, events: r.events };
  }
  const brief = ({ events: _e, ...rest }: ReturnType<typeof bindCloud>) => rest;

  test('bind:cloud fourCombos: kin or late, then chorus or haunt', () => {
    const facts = fourCombos(
      'bind:cloud',
      ['bind-cloud-kin', 'bind-cloud-late'],
      ['bind-cloud-chorus', 'bind-cloud-haunt'],
      ({ l1, l2 }) => brief(bindCloud([l1, l2])),
    ).map((r) => r.result);
    expect(facts).toEqual([
      // kin + chorus: the ally is skipped; both rats go off together
      {
        cast: ['rat-1', 'rat-2'],
        dusk: ['rat-1', 'rat-2'],
        haunted: false,
        released: 2,
      },
      // kin + haunt: the cloud holds it, but rat-3 is a rat: marked on entry
      {
        cast: ['rat-1', 'rat-2'],
        dusk: ['rat-1', 'rat-2'],
        haunted: true,
        released: 1,
      },
      // late + chorus: nothing spreads until dusk; then all three copies release
      { cast: ['rat-1'], dusk: ['draughtsman', 'rat-1', 'rat-2'], haunted: false, released: 3 },
      // late + haunt
      {
        cast: ['rat-1'],
        dusk: ['draughtsman', 'rat-1', 'rat-2'],
        haunted: true,
        released: 1,
      },
    ]);
  });

  test('bind-cap-rearm: a released mark leaves the bearer with a plain mark', () => {
    const s = withLattices('. . . .\n. r . .\n. . . D', {}, { ...opts, hp: { B2: 9 } });
    const run = (ids: string[]) =>
      rd(
        s,
        (ctx) => {
          bindOn(ctx, 'rat-1');
          hit(ctx, 'rat-1', 1, at('A2'));
        },
        withFootnotes(ids),
      );
    expect(unit(run([]).state, 'rat-1').mark).toBeNull();
    const rearmed = unit(run(['bind-cap-rearm']).state, 'rat-1').mark;
    expect(rearmed).toMatchObject({ deep: false, bound: null });
  });

  test('bind-cap-snare: Bind on an empty tile binds the blot for the first unit to step on it', () => {
    const s = withLattices('D . . .\n. r . .', {}, { ...opts, hp: { B2: 9 } });
    const run = (ids: string[]) =>
      rd(
        s,
        (ctx) => {
          bindOn(ctx, 'rat-1'); // marks the rat on B2
          runInvention(ctx, 'inv:recoil', { kind: 'tile', at: at('C1') }, flowFor(ctx.s));
          arrive(ctx, 'rat-1', [at('C1')], { cause: 'push', origin: null, landing: true });
        },
        withFootnotes(ids),
      );
    const plain = run([]);
    expect(tileAt(plain.state, at('C1')).state?.id).toBe('blot');
    expect(tileAt(plain.state, at('C1')).state?.haunt).toBeUndefined();
    // A rat that already holds a mark does not take the snare: it waits for the next unit.
    const snared = run(['bind-cap-snare']);
    expect(tileAt(snared.state, at('C1')).state?.haunt?.bound.action).toBe('shove');
    const fresh = withLattices('D . . .\n. . . r', {}, { ...opts, hp: { D2: 9 } });
    const walk = (ids: string[]) =>
      rd(
        fresh,
        (ctx) => {
          runInvention(ctx, 'inv:recoil', { kind: 'tile', at: at('C1') }, flowFor(ctx.s));
          arrive(ctx, 'rat-1', [at('C1')], { cause: 'walk', origin: null, landing: true });
        },
        withFootnotes(ids),
      );
    expect(unit(walk([]).state, 'rat-1').mark).toBeNull();
    const caught = walk(['bind-cap-snare']);
    expect(unit(caught.state, 'rat-1').mark?.bound?.action).toBe('shove');
    expect(tileAt(caught.state, at('C1')).state?.haunt).toBeUndefined(); // the first unit only
  });
});

// ── Lift ────────────────────────────────────────────────

describe('Lift', () => {
  /** A marked rat, a gap, then a cloud pair; a rat and a cloud pair below the target. */
  const LIFT = 'D r! . r~ r~\n. r~ r~ . .';
  /** A marked receiver right beside the marked target. */
  const NEXT = 'D r! r! . .';
  function liftLine(ids: string[]) {
    const a = castOn(board(LIFT), ids).state;
    const b = castOn(board(NEXT), ids).state;
    return {
      to: markedIds(a),
      deep: markedIds(b).map((id) => `${id}:${unit(b, id).mark?.deep ? 'deep' : 'plain'}`),
    };
  }

  test('lift:unit fourCombos: far or aside, then spread or deepen', () => {
    const facts = fourCombos(
      'lift:unit',
      ['lift-unit-far', 'lift-unit-aside'],
      ['lift-unit-spread', 'lift-unit-deepen'],
      ({ l1, l2 }) => liftLine([l1, l2]),
    ).map((r) => r.result);
    expect(facts).toEqual([
      { to: ['rat-2', 'rat-3'], deep: ['rat-1:plain', 'rat-2:plain'] }, // far + spread
      { to: ['rat-2'], deep: ['rat-2:deep'] }, // far + deepen
      { to: ['rat-4', 'rat-5'], deep: ['rat-1:plain', 'rat-2:plain'] }, // aside + spread
      { to: ['rat-4'], deep: ['rat-2:deep'] }, // aside + deepen
    ]);
    expect(liftLine([])).toEqual({ to: ['rat-1'], deep: ['rat-1:plain', 'rat-2:plain'] });
  });

  test('lift-cap-trade: when the receiver is marked the two marks trade places', () => {
    const run = (ids: string[]) => castOn(board('D r!! r! . .'), ids).state;
    const deepOf = (s: BattleState, id: string) => unit(s, id).mark?.deep;
    expect([deepOf(run([]), 'rat-1'), deepOf(run([]), 'rat-2')]).toEqual([true, false]);
    const traded = run(['lift-cap-trade']);
    expect([deepOf(traded, 'rat-1'), deepOf(traded, 'rat-2')]).toEqual([false, true]);
  });

  test('lift-cap-drop: with no unit to take it, the mark is left on the tile as a blot', () => {
    const run = (ids: string[]) => castOn(board('D r! . . .'), ids);
    const plain = run([]);
    expect(unit(plain.state, 'rat-1').mark).not.toBeNull();
    expect(tileAt(plain.state, at('C1')).state).toBeNull();
    const dropped = run(['lift-cap-drop']);
    expect(unit(dropped.state, 'rat-1').mark).toBeNull();
    expect(tileAt(dropped.state, at('C1')).state?.id).toBe('blot');
    expect(dropped.events.some((e) => e.type === 'landed' && e.kind === 'ink')).toBe(true);
  });
});

// ── Gallnut ─────────────────────────────────────────────

describe('Gallnut', () => {
  const STAINER = 'Bolt> inv:stainer';
  /** A dummy on a blot-free tile, a slick beyond: cast, dusk (the repeat), then a push over the oil. */
  function gallnutLine(ids: string[]) {
    const s = board('D d o . .', { B1: 9 }, STAINER);
    const cast = castOn(s, ids);
    const dusk = step(cast.state, { type: 'endTurn' }, withFootnotes(ids));
    const pushed = rd(
      dusk.state,
      (ctx) => push(ctx, unit(ctx.s, 'dummy-1'), 'right', 1, null),
      withFootnotes(ids),
    );
    // A second board: the mark is spent between the passes.
    const spent = castOn(board('D d . .', { B1: 9 }, STAINER), ids).state;
    const gone = rd(
      spent,
      (ctx) => {
        unit(ctx.s, 'dummy-1').mark = null;
      },
      {},
    ).state;
    const second = step(gone, { type: 'endTurn' }, withFootnotes(ids)).state;
    return {
      deep: unit(dusk.state, 'dummy-1').mark?.deep ?? null,
      blot: tileAt(cast.state, at('B1')).state?.id ?? null,
      at: pushed.state.units.find((u) => u.id === 'dummy-1')?.pos.x,
      again: !!unit(second, 'dummy-1').mark,
    };
  }

  test('gallnut:unit fourCombos: deepen or blot, then every pass or heavy', () => {
    const facts = fourCombos(
      'gallnut:unit',
      ['gallnut-unit-deep', 'gallnut-unit-blot'],
      ['gallnut-unit-every', 'gallnut-unit-heavy'],
      ({ l1, l2 }) => gallnutLine([l1, l2]),
    ).map((r) => r.result);
    expect(facts).toEqual([
      { deep: true, blot: null, at: 3, again: true }, // deepen + every: the second pass deepens
      { deep: false, blot: null, at: 2, again: false }, // deepen + heavy: stays put on oil
      { deep: false, blot: 'blot', at: 3, again: true }, // blot + every
      { deep: false, blot: 'blot', at: 2, again: false }, // blot + heavy
    ]);
    expect(gallnutLine([])).toMatchObject({ deep: false, blot: null, at: 3, again: false });
  });

  test('gallnut-cap-bloom: the connected cloud the unit stands in becomes a brand cloud', () => {
    const run = (ids: string[]) => castOn(board('D r~ r~ ~ .', { B1: 9 }, STAINER), ids).state;
    const ids = (s: BattleState) => ['B1', 'C1', 'D1'].map((l) => tileAt(s, at(l)).state?.id);
    expect(ids(run([]))).toEqual(['cloud', 'cloud', 'cloud']);
    expect(ids(run(['gallnut-cap-bloom']))).toEqual(['brandCloud', 'brandCloud', 'brandCloud']);
  });

  test('gallnut-cap-stain: the slick under the unit becomes a stain', () => {
    const run = (ids: string[]) => castOn(board('D ro . .', { B1: 9 }, STAINER), ids).state;
    expect(tileAt(run([]), at('B1')).state?.id).toBe('slick');
    expect(tileAt(run(['gallnut-cap-stain']), at('B1')).state?.id).toBe('stain');
  });
});

// ── Cinder ──────────────────────────────────────────────

describe('Cinder', () => {
  const HEARTH = 'Bolt> inv:hearth';
  const hotAt = (s: BattleState, l: string) => tileAt(s, at(l)).hot;
  /** A rat shoved off a hot tile; a rat then walks back over both; a dummy sits in a hot cloud. */
  function cinderLine(ids: string[]) {
    const cast = castOn(board('D r . . .\n. . . . .', { B1: 9 }, HEARTH), ids).state;
    const trail = rd(
      cast,
      (ctx) => {
        const rat = unit(ctx.s, 'rat-1');
        if (rat.kind === 'enemy') enemyWalk(ctx, rat, [at('B1')]);
      },
      withFootnotes(ids),
    );
    const steam = castOn(board('D d~ . .', { B1: 9 }, 'Bolt> inv:brand'), ids).state;
    const dusk = step(steam, { type: 'endTurn' }, withFootnotes(ids));
    const scald = dusk.events.filter(
      (e) => e.type === 'damage' && e.source === 'Scald' && e.line === 'cinder:slick',
    );
    return {
      hot: [hotAt(cast, 'B1'), hotAt(cast, 'C1')],
      caught: tileAt(trail.state, at('B1')).state?.id,
      scalded: scald.length,
    };
  }

  test('cinder:slick fourCombos: long or follow, then trails or steam', () => {
    const facts = fourCombos(
      'cinder:slick',
      ['cinder-slick-long', 'cinder-slick-follow'],
      ['cinder-slick-trails', 'cinder-slick-steam'],
      ({ l1, l2 }) => cinderLine([l1, l2]),
    ).map((r) => r.result);
    expect(facts).toEqual([
      { hot: [3, 0], caught: 'fire', scalded: 0 }, // long + trails
      { hot: [3, 0], caught: 'slick', scalded: 1 }, // long + steam
      { hot: [2, 2], caught: 'fire', scalded: 0 }, // follow + trails
      { hot: [2, 2], caught: 'slick', scalded: 1 }, // follow + steam
    ]);
    expect(cinderLine([])).toEqual({ hot: [2, 0], caught: 'slick', scalded: 0 });
  });

  test('cinder-cap-spread: a hot tile that catches heats the tiles beside it', () => {
    const run = (ids: string[]) =>
      castOn(board('D ro . . .\n. . . . .', { B1: 9 }, HEARTH), ids).state;
    expect(tileAt(run([]), at('B1')).state?.id).toBe('fire');
    expect([hotAt(run([]), 'B2'), hotAt(run([]), 'A1')]).toEqual([0, 0]);
    const spread = run(['cinder-cap-spread']);
    expect([hotAt(spread, 'B2'), hotAt(spread, 'A1'), hotAt(spread, 'C1')]).toEqual([2, 2, 2]);
    expect(hotAt(spread, 'C2')).toBe(0); // they do not chain
  });

  test('cinder-cap-brass: the whole connected brass is hot; the unit on it at dusk takes 1', () => {
    const brass = (ids: string[]) => {
      const cast = castOn(board('D d& = . .', { B1: 9 }, 'Bolt> inv:brand'), ids).state;
      return { cast, dusk: step(cast, { type: 'endTurn' }, withFootnotes(ids)) };
    };
    const scorch = (r: ReturnType<typeof brass>) =>
      r.dusk.events.filter((e) => e.type === 'damage' && e.source === 'Hot brass').length;
    expect(tileAt(brass([]).cast, at('C1')).brassHot).toBeUndefined();
    expect(scorch(brass([]))).toBe(0);
    const hot = brass(['cinder-cap-brass']);
    expect(tileAt(hot.cast, at('C1')).brassHot).toBe(2);
    expect(scorch(hot)).toBe(1);
  });
});

test('every FN-C9 variant is registered on a Bind, Lift, Gallnut or Cinder slot', () => {
  const mine = VARIANTS.filter((v) => ['bind', 'lift', 'gallnut', 'cinder'].includes(v.subject));
  expect(mine).toHaveLength(28);
  expect(SOLVENT_IDS).toContain('gallnut');
});
