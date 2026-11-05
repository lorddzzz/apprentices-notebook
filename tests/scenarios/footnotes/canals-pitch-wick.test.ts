import { expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { type GameEvent, libraryOf, parseLabel, tileAt } from '$engine';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { sealJar } from '$engine/jars';
import { enemyWalk } from '$engine/movement';
import { runScheduled } from '$engine/schedule';
import { driftWaiting } from '$engine/solvents';
import type { BattleState, Jar } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { board, unitAtLabel, withLattices } from '../harness';
import { castWith, hpOf, step, tileAim } from './castHelper';

/** CN-F4: Pitch and Wick margin lines (fourCombos), their capstones, and Afterglow's second capstone. */
const at = parseLabel;

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  solvent: InventionDef['solvent'],
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent });
const lib = libraryOf([
  inv('after-pitch', 'repeat', ['strike'], 'pitch'),
  inv('zap-wick', 'conduct', ['strike'], 'wick'),
]);
const withWait = (ascii: string, lattice: string, hp: Record<string, number> = {}) =>
  withLattices(ascii, { draughtsman: lattice }, { inventions: lib, hp });
const endTurn = (s: BattleState, fn: FootnoteIds) => step(s, { type: 'endTurn' }, fn);
const drift = (s: BattleState, fn: FootnoteIds) =>
  runDraft(s, (ctx: Ctx) => driftWaiting(ctx), { footnotes: fn });
const hitTiles = (events: readonly GameEvent[]) =>
  events.flatMap((e) => (e.type === 'damage' ? [`${e.target.at.x},${e.target.at.y}`] : []));
const round = (events: readonly GameEvent[]) => events.findIndex((e) => e.type === 'round');
const target = (s: BattleState) => s.scheduled[0]?.target;
const where = (s: BattleState) => {
  const t = target(s);
  return t?.kind === 'tile' ? `tile ${t.at.x},${t.at.y}` : t ? `unit ${t.unit}` : 'none';
};

// ── pitch:water ──────────────────────────────────────────

/** A Pitch Afterimage waits at C1 on a lane B1-F1; foes stand on B1 and D1 (the catch scenario). */
function driftLine(combo: Combo) {
  const lane = '. w> w> w> w> w> .\n. . D . . . .';
  const plain = withWait(lane, 'Touch> inv:after-pitch');
  const waiting = castWith(plain, tileAim('C1'), combo.footnotes).state;
  const clear = where(drift(waiting, combo.footnotes).state);

  const foes = withWait('. dw> w> dw> w> w> .\n. . D . . . .', 'Touch> inv:after-pitch');
  const caught = where(
    drift(castWith(foes, tileAim('C1'), combo.footnotes).state, combo.footnotes).state,
  );

  // A slick on C1 under the wait.
  const slick = withWait('. w> ow> w> w> w> .\n. . D . . . .', 'Touch> inv:after-pitch');
  const drifted = drift(castWith(slick, tileAim('C1'), combo.footnotes).state, combo.footnotes);
  const slickAt = ['B1', 'C1', 'D1', 'E1'].find(
    (l) => tileAt(drifted.state, at(l)).state?.id === 'slick',
  );
  return { clear, caught, slickAt, ids: foes.units.map((u) => u.id) };
}
const unitIdAt = (ascii: string, l: string, ids: string[]) =>
  ids.find((id) => unitAtLabel(withWait(ascii, 'Touch> inv:after-pitch'), l).id === id);

test('pitch:water fourCombos: far or upstream, then catch or wash', () => {
  const runs = fourCombos(
    'pitch:water',
    ['pitch-water-far', 'pitch-water-upstream'],
    ['pitch-water-catch', 'pitch-water-wash'],
    driftLine,
  );
  const [farCatch, farWash, upCatch, upWash] = runs.map((r) => r.result);
  const foeAt = (l: string) =>
    `unit ${unitIdAt('. dw> w> dw> w> w> .\n. . D . . . .', l, farCatch?.ids ?? [])}`;
  // Far: two tiles (C1 to E1); upstream: one tile back (B1).
  expect(farWash?.clear).toBe('tile 4,0');
  expect(upWash?.clear).toBe('tile 1,0');
  expect(farCatch?.clear).toBe('tile 4,0'); // no unit on the way: it floats the full two
  // Catch: fixes on the first unit; a far wait stops at D1 (the first of its two tiles).
  expect(farCatch?.caught).toBe(foeAt('D1'));
  expect(upCatch?.caught).toBe(foeAt('B1'));
  // Wash: without a unit to catch, the wait floats on to its full reach.
  expect(farWash?.caught).toBe('tile 4,0');
  expect(upWash?.caught).toBe('tile 1,0');
  // The slick under the wait goes along only with wash, to wherever the wait lands.
  expect(farWash?.slickAt).toBe('E1');
  expect(upWash?.slickAt).toBe('B1');
  expect(farCatch?.slickAt).toBe('C1');
  expect(upCatch?.slickAt).toBe('C1');
});

test('pitch:water without footnotes: one tile downstream, the slick stays', () => {
  const s = withWait('. w> ow> w> w> w> .\n. . D . . . .', 'Touch> inv:after-pitch');
  const waiting = castWith(s, tileAim('C1'), {}).state;
  const out = drift(waiting, {});
  expect(where(out.state)).toBe('tile 3,0');
  expect(tileAt(out.state, at('C1')).state?.id).toBe('slick');
});

test('pitch-cap-wake: the wait also strikes the tile it drifted from', () => {
  // Foes wedged on D1 and E1 (F1 is land). The wait is cast on D1 and floats to E1 at dusk.
  const s = withWait('. w> w> dw> dw> d .\n. . . D . . .', 'Touch> inv:after-pitch', {
    D1: 9,
    E1: 9,
  });
  const plain = endTurn(castWith(s, tileAim('D1'), {}).state, {});
  const wake = withFootnotes(['pitch-cap-wake']);
  const woken = endTurn(castWith(s, tileAim('D1'), wake).state, wake);
  expect(hpOf(plain.state, unitAtLabel(s, 'D1').id)).toBe(7);
  expect(hpOf(plain.state, unitAtLabel(s, 'E1').id)).toBe(7);
  expect(hpOf(woken.state, unitAtLabel(s, 'D1').id)).toBe(5);
  expect(hpOf(woken.state, unitAtLabel(s, 'E1').id)).toBe(7);
});

test('pitch-cap-shore: a wait stopped by land wakes at once, at dusk', () => {
  const s = withWait('. w> w> dw> . . .\n. . . D . . .', 'Touch> inv:after-pitch', { D1: 9 });
  const foe = unitAtLabel(s, 'D1').id;
  const none = drift(castWith(s, tileAim('D1'), {}).state, {});
  expect(none.state.scheduled).toHaveLength(1);
  expect(hpOf(none.state, foe)).toBe(7);
  const shore = withFootnotes(['pitch-cap-shore']);
  const woken = drift(castWith(s, tileAim('D1'), shore).state, shore);
  expect(woken.state.scheduled).toHaveLength(0);
  expect(hpOf(woken.state, foe)).toBe(5);
  // A wait that floats freely is not stopped.
  const free = withWait('. w> w> w> w> . .\n. . D . . . .', 'Touch> inv:after-pitch');
  expect(drift(castWith(free, tileAim('C1'), shore).state, shore).state.scheduled).toHaveLength(1);
});

// ── wick:unit ────────────────────────────────────────────

/** Damage tiles per phase after a Wick cast on C1: dusk of each round, then the next turn's start. */
function timeline(fn: FootnoteIds, rounds: number, ascii = 'D . d = . d .') {
  let s = castWith(
    withWait(ascii, 'Bolt> inv:zap-wick', { C1: 30, F1: 30 }),
    { kind: 'dir', dir: 'right' },
    fn,
  ).state;
  const out: { dusk: string[]; turn: string[] }[] = [];
  for (let i = 0; i < rounds; i++) {
    const r = endTurn(s, fn);
    s = r.state;
    const cut = round(r.events);
    out.push({ dusk: hitTiles(r.events.slice(0, cut)), turn: hitTiles(r.events.slice(cut)) });
  }
  return out;
}
const C1 = '2,0';
const jarOf = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});

function wickLine(combo: Combo) {
  const fn = combo.footnotes;
  // The Wick waits a round, two, or falls due at dusk.
  const t = timeline(fn, 3);
  const phase = t.map((p) => `${p.dusk.length}/${p.turn.length}`).join(' ');
  // A jar of yours sealed under the foe on the Wick's tile.
  const s0 = withWait('D . d = . d .', 'Bolt> inv:zap-wick', { C1: 30, F1: 30 });
  const sealed = runDraft(s0, (ctx: Ctx) => sealJar(ctx, at('C1'), jarOf()), {
    footnotes: fn,
  }).state;
  let s = castWith(sealed, { kind: 'dir', dir: 'right' }, fn).state;
  let opened = 0;
  for (let i = 0; i < 3; i++) {
    const r = endTurn(s, fn);
    s = r.state;
    opened += r.events.filter((e) => e.type === 'jarOpened').length;
  }
  // The caster falls before it wakes.
  const wait = castWith(
    withWait('D . d = . d .', 'Bolt> inv:zap-wick', { C1: 30, F1: 30 }),
    { kind: 'dir', dir: 'right' },
    fn,
  ).state;
  const foe = unitAtLabel(wait, 'C1').id;
  const fallen = runDraft(
    wait,
    (ctx: Ctx) => {
      const owner = ctx.s.units.find((u) => u.id === 'draughtsman');
      if (owner) owner.hp = 0;
      runScheduled(ctx, 'ownerTurn');
      runScheduled(ctx, 'ownerTurn');
      runScheduled(ctx, 'roundEnd');
    },
    { footnotes: fn },
  );
  return { phase, opened, proxyHit: 30 - (hpOf(fallen.state, foe) ?? 30) > 0 };
}

test('wick:unit fourCombos: long or dusk, then jar or proxy', () => {
  const runs = fourCombos(
    'wick:unit',
    ['wick-unit-long', 'wick-unit-dusk'],
    ['wick-unit-jar', 'wick-unit-proxy'],
    wickLine,
  );
  const [longJar, longProxy, duskJar, duskProxy] = runs.map((r) => r.result);
  // Phases are dusk/turn-start hit counts for rounds 1-3: long wakes at the start of round 3's
  // turn (the second endTurn); dusk falls due at the first dusk.
  for (const r of [longJar, longProxy]) expect(r?.phase).toBe('0/0 0/1 0/0');
  for (const r of [duskJar, duskProxy]) expect(r?.phase).toBe('1/0 0/0 0/0');
  // The jar opens only with the jar variant.
  for (const r of [longJar, duskJar]) expect(r?.opened).toBe(1);
  for (const r of [longProxy, duskProxy]) expect(r?.opened).toBe(0);
  // A fallen caster's Wick lapses except with the proxy.
  for (const r of [longJar, duskJar]) expect(r?.proxyHit).toBe(false);
  for (const r of [longProxy, duskProxy]) expect(r?.proxyHit).toBe(true);
});

test('wick:unit without footnotes: acts at the start of your next turn', () => {
  const t = timeline({}, 2);
  expect(t.map((p) => `${p.dusk.length}/${p.turn.length}`)).toEqual(['0/1', '0/0']);
  expect(t[0]?.turn).toEqual([C1]);
});

test('wick-cap-twice: wakes, then acts once more at dusk of that round', () => {
  const fn = withFootnotes(['wick-cap-twice']);
  const t = timeline(fn, 3);
  expect(t.map((p) => `${p.dusk.length}/${p.turn.length}`)).toEqual(['0/1', '1/0', '0/0']);
  // With dusk: it falls due at dusk and acts again at once, the same dusk.
  const both = withFootnotes(['wick-cap-twice', 'wick-unit-dusk']);
  expect(timeline(both, 2).map((p) => `${p.dusk.length}/${p.turn.length}`)).toEqual(['2/0', '0/0']);
});

test('wick-cap-trip: a foe stepping beside the target wakes the Wick at once', () => {
  const walk = (fn: FootnoteIds) => {
    const s = withWait('D . d = . d .\n. r . . . . .', 'Bolt> inv:zap-wick', { C1: 30, F1: 30 });
    const waiting = castWith(s, { kind: 'dir', dir: 'right' }, fn).state;
    const r = runDraft(
      waiting,
      (ctx: Ctx) => {
        const u = unitAtLabel(ctx.s, 'B2');
        if (u.kind !== 'enemy') throw new Error('not a foe');
        enemyWalk(ctx, u, [at('B1')]);
      },
      { footnotes: fn },
    );
    return { hits: hitTiles(r.events), left: r.state.scheduled.length };
  };
  expect(walk({})).toEqual({ hits: [], left: 1 });
  expect(walk(withFootnotes(['wick-cap-trip']))).toEqual({ hits: [C1], left: 0 });
});

// ── Afterglow's second capstone ──────────────────────────

test('afterglow-cap-plain: a touching path lands a plain cloud or plate one round longer', () => {
  const rounds = (lattice: string, fn: FootnoteIds) => {
    const s = withLattices('D . . .\nd . . .', { draughtsman: lattice });
    const r = castWith(s, { kind: 'dir', dir: 'right' }, fn).state;
    return tileAt(r, at('D1')).state?.rounds ?? -1;
  };
  const cap = withFootnotes(['afterglow-cap-plain']);
  for (const [name, own, touched] of [
    ['cloud', 'Bolt> Steam', '. Afterglow\nBolt> Steam'],
    ['plate', 'Bolt> Brass', '. Afterglow\nBolt> Brass'],
  ] as const) {
    const base = rounds(own, {});
    expect(rounds(touched, {}), name).toBe(base); // Afterglow alone does nothing to a plain state
    expect(rounds(touched, cap), name).toBe(base + 1);
    expect(rounds(own, cap), name).toBe(base); // no Afterglow on the path
  }
  // A slick has no rounds to lengthen.
  expect(rounds('. Afterglow\nBolt> Oil', cap)).toBe(rounds('Bolt> Oil', {}));
});

test('afterglow-diagonal (FN-11) is untouched: the id still ships', () => {
  expect(withFootnotes(['afterglow-diagonal'])).toBeDefined();
  expect(board('D . .')).toBeDefined();
});
