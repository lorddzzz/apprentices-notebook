import { expect, test } from 'vitest';
import type { GameEvent } from '$engine';
import { memberById, parseLabel, tileAt } from '$engine';
import { burstAt } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { openDuskJars, sealJar } from '$engine/jars';
import { enemyWalk, moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { driftWaiting } from '$engine/solvents';
import type { BattleState, Jar } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';
import { hpOf, where } from './castHelper';

/** CN-F3: Jar and Fuse margin lines (fourCombos) and capstones, built from direct jar draughts. */
const at = parseLabel;

const jarOf = (
  event: 'step' | 'dusk',
  rune: 'strike' | 'shove',
  heading: Jar['heading'] = null,
): Jar => ({
  owner: 'draughtsman',
  event,
  rest: { role: 'action', rune, at: { x: 0, y: 0 }, auras: [], next: null },
  heading,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});
const strike = (event: 'step' | 'dusk' = 'step') => jarOf(event, 'strike');

const opened = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'jarOpened');
const hasJar = (s: BattleState, l: string) => tileAt(s, at(l)).jar !== null;
const walker = (ctx: Ctx, l: string, to: string) => {
  const u = unitAtLabel(ctx.s, l);
  if (u.kind !== 'enemy') throw new Error('not a foe');
  enemyWalk(ctx, u, [at(to)]);
};
const run = (ascii: string, ids: readonly string[], fn: (ctx: Ctx, s: BattleState) => void) => {
  const s = board(ascii, { kits: { draughtsman: { habit: null } } }); // the habit keeps two jars
  return { s, r: runDraft(s, (ctx: Ctx) => fn(ctx, s), { footnotes: withFootnotes(ids) }) };
};
const draughtsman = (ctx: Ctx) => memberById(ctx.s, 'draughtsman');
const idsOf = (c: Combo) => [c.l1, c.l2];

// ── jar:unit ─────────────────────────────────────────────

function unitLine(combo: Combo) {
  const ids = idsOf(combo);
  // Your own step onto your jar.
  const own = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike());
    moveMember(ctx, draughtsman(ctx), at('B1'));
  });
  // A foe walks onto it.
  const foe = run('D . r', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike());
    walker(ctx, 'C1', 'B1');
  });
  // Sealed under a standing foe.
  const under = run('D r .', ids, (ctx) => sealJar(ctx, at('B1'), strike()));
  // Shoved onto a Shove jar sealed facing down; the shove came from the right.
  const pushed = run('D . . .\n. . r .', ids, (ctx) => {
    sealJar(ctx, at('B2'), jarOf('step', 'shove', 'down'));
    push(ctx, unitAtLabel(ctx.s, 'C2'), 'left', 1, null);
  });
  const ratEnd = (r: ReturnType<typeof run>) => r.r.state.units.find((u) => u.kind === 'enemy');
  // Shoved onto a slick run with the jar on its second tile.
  const slide = run('D . . .\n. o o r', ids, (ctx) => {
    sealJar(ctx, at('B2'), { ...strike(), rest: null });
    push(ctx, unitAtLabel(ctx.s, 'D2'), 'left', 1, null);
  });
  return {
    ownOpened: opened(own.r.events).length,
    foeOpened: opened(foe.r.events).length,
    underOpened: opened(under.r.events).length,
    pushedTo: ratEnd(pushed) ? where(pushed.r.state, ratEnd(pushed)?.id ?? '') : null,
    slideTo: where(slide.r.state, slide.s.units.find((u) => u.kind === 'enemy')?.id ?? ''),
  };
}

test('jar:unit fourCombos: kin or standing, then pushed heading or slide stop', () => {
  const runs = fourCombos(
    'jar:unit',
    ['jar-unit-kin', 'jar-unit-standing'],
    ['jar-unit-pushed', 'jar-unit-slide'],
    unitLine,
  );
  const [kinPush, kinSlide, standPush, standSlide] = runs.map((x) => x.result);
  for (const r of [kinPush, kinSlide]) {
    expect(r?.ownOpened).toBe(0); // shut under its owner
    expect(r?.foeOpened).toBe(1); // a foe still opens it
    expect(r?.underOpened).toBe(0);
  }
  for (const r of [standPush, standSlide]) {
    expect(r?.ownOpened).toBe(1);
    expect(r?.foeOpened).toBe(1);
    expect(r?.underOpened).toBe(1); // opens at once under the foe
  }
  // Pushed: the Shove takes the push's heading (left, onto A2), not the seal's (down, off the board edge: stays).
  for (const r of [kinPush, standPush]) expect(r?.pushedTo).toBe('A2');
  for (const r of [kinSlide, standSlide]) expect(r?.pushedTo).not.toBe('A2');
  // Slide: it stops on the jar (B2) instead of sliding on to A2.
  for (const r of [kinSlide, standSlide]) expect(r?.slideTo).toBe('B2');
  for (const r of [kinPush, standPush]) expect(r?.slideTo).toBe('A2');
});

// ── jar:jar ──────────────────────────────────────────────

function jarLine(combo: Combo) {
  const ids = idsOf(combo);
  const second = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike());
    sealJar(ctx, at('C1'), strike());
  });
  const mixed = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike());
    sealJar(ctx, at('C1'), strike('dusk'));
  });
  const same = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike());
    sealJar(ctx, at('B1'), strike());
  });
  const facts = (x: ReturnType<typeof run>) => ({
    b1: hasJar(x.r.state, 'B1'),
    c1: hasJar(x.r.state, 'C1'),
    opened: opened(x.r.events).length,
    crumbled: x.r.events.filter((e) => e.type === 'jarCrumbles').length,
  });
  return { second: facts(second), mixed: facts(mixed), same: facts(same) };
}

test('jar:jar fourCombos: spill or keep, then share or stack', () => {
  const runs = fourCombos(
    'jar:jar',
    ['jar-jar-spill', 'jar-jar-keep'],
    ['jar-jar-share', 'jar-jar-stack'],
    jarLine,
  );
  const [spillShare, spillStack, keepShare, keepStack] = runs.map((x) => x.result);
  // A second jar at the limit: spill opens the old one, keep fizzles the new one.
  for (const r of [spillShare, spillStack]) {
    expect(r?.second).toEqual({ b1: false, c1: true, opened: 1, crumbled: 0 });
  }
  for (const r of [keepShare, keepStack]) {
    expect(r?.second).toEqual({ b1: true, c1: false, opened: 0, crumbled: 1 });
  }
  // Share: a Fuse beside a Jar leaves both; otherwise the shared limit bites as before.
  for (const r of [spillShare, keepShare]) {
    expect(r?.mixed).toMatchObject({ b1: true, c1: true, opened: 0 });
  }
  expect(spillStack?.mixed).toMatchObject({ b1: false, c1: true, opened: 1 });
  expect(keepStack?.mixed).toMatchObject({ b1: true, c1: false, opened: 0 });
  // Stack: sealing onto your own jar opens it first, whatever level I says; otherwise it crumbles
  // (and spill opens that crumble too).
  expect(spillStack?.same).toMatchObject({ b1: true, opened: 1 });
  expect(keepStack?.same).toMatchObject({ b1: true, opened: 1, crumbled: 0 });
  expect(spillShare?.same).toMatchObject({ b1: true, opened: 1 });
  expect(keepShare?.same).toMatchObject({ b1: true, opened: 0, crumbled: 1 });
});

// ── fuse:unit ────────────────────────────────────────────

function fuseUnitLine(combo: Combo) {
  const ids = idsOf(combo);
  // Sealed under a foe, which then walks on; dusk comes.
  const follow = run('D . r .', ids, (ctx) => {
    sealJar(ctx, at('C1'), strike('dusk'));
    walker(ctx, 'C1', 'D1');
    openDuskJars(ctx);
  });
  const followLate = run('D . r .', ids, (ctx) => {
    sealJar(ctx, at('C1'), strike('dusk'));
    walker(ctx, 'C1', 'D1');
    openDuskJars(ctx);
    openDuskJars(ctx);
  });
  const dusks = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike('dusk'));
    openDuskJars(ctx);
  });
  const twice = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike('dusk'));
    openDuskJars(ctx);
    openDuskJars(ctx);
  });
  const fire = run('D o . .', ids, (ctx) => {
    sealJar(ctx, at('B1'), strike('dusk'));
    burstAt(ctx, at('B1'), 'tile', null);
  });
  const standing = run('D . . .', ids, (ctx) => {
    sealJar(ctx, at('A1'), strike('dusk'));
    openDuskJars(ctx);
  });
  const openAt = (x: ReturnType<typeof run>) => {
    const e = opened(x.r.events)[0];
    return e && 'at' in e ? `${String.fromCharCode(65 + e.at.x)}${e.at.y + 1}` : null;
  };
  return {
    followAt: openAt(follow) ?? openAt(followLate),
    ratHurt: hpOf(follow.r.state, 'rat-1') !== hpOf(follow.s, 'rat-1'),
    oneDusk: opened(dusks.r.events).length,
    twoDusks: opened(twice.r.events).length,
    fireOpened: opened(fire.r.events).length,
    standingOpened: opened(standing.r.events).length,
  };
}

test('fuse:unit fourCombos: follow or late, then fire or spare', () => {
  const runs = fourCombos(
    'fuse:unit',
    ['fuse-unit-follow', 'fuse-unit-late'],
    ['fuse-unit-fire', 'fuse-unit-spare'],
    fuseUnitLine,
  );
  const [followFire, followSpare, lateFire, lateSpare] = runs.map((x) => x.result);
  // Follow goes with the foe to D1; late leaves it where it was sealed (C1).
  for (const r of [followFire, followSpare]) {
    expect(r?.followAt).toBe('D1');
    expect(r?.ratHurt).toBe(true);
    expect(r?.oneDusk).toBe(1);
  }
  for (const r of [lateFire, lateSpare]) {
    expect(r?.followAt).toBe('C1');
    expect(r?.oneDusk).toBe(0); // waits a dusk
    expect(r?.twoDusks).toBe(1);
  }
  // Fire opens it early; spare waits while its owner stands on it, otherwise the same.
  for (const r of [followFire, lateFire]) expect(r?.fireOpened).toBe(1);
  for (const r of [followSpare, lateSpare]) expect(r?.fireOpened).toBe(0);
  expect(followFire?.standingOpened).toBe(1);
  expect(lateFire?.standingOpened).toBe(0); // late waits its first dusk
  expect(followSpare?.standingOpened).toBe(0);
  // late + spare: the Fuse is still late on a bare tile, and spare still holds it.
  expect(lateSpare?.standingOpened).toBe(0);
});

// ── fuse:water ───────────────────────────────────────────

const LANE = '. . . .\nw> w> w> w>\nD . . .';
function waterLine(combo: Combo) {
  const ids = idsOf(combo);
  const jarAfter = (round: number) => {
    const x = run(LANE, ids, (ctx) => {
      ctx.s.round = round;
      sealJar(ctx, at('A2'), strike('dusk'));
      driftWaiting(ctx);
    });
    return ['A2', 'B2', 'C2', 'D2'].find((l) => hasJar(x.r.state, l)) ?? null;
  };
  // A foe on B2, a Fuse of Shove facing down floats from A2, then dusk.
  const meet = run(`${'. . . .\nw> rw> w> w>\nD . . .'}`, ids, (ctx) => {
    ctx.s.round = 2;
    sealJar(ctx, at('A2'), jarOf('dusk', 'shove', 'down'));
    driftWaiting(ctx);
    openDuskJars(ctx);
  });
  return {
    oddRound: jarAfter(1),
    evenRound: jarAfter(2),
    // Down is onto land; right is into the lane, where the foe drops.
    shoved:
      meet.r.events.find((e) => e.type === 'push')?.dir ??
      (meet.r.events.some((e) => e.type === 'dropped') ? 'right' : null),
  };
}

test('fuse:water fourCombos: slow or swift, then wake or heading', () => {
  const runs = fourCombos(
    'fuse:water',
    ['fuse-water-slow', 'fuse-water-swift'],
    ['fuse-water-wake', 'fuse-water-heading'],
    waterLine,
  );
  const [slowWake, slowHeading, swiftWake, swiftHeading] = runs.map((x) => x.result);
  for (const r of [slowWake, slowHeading]) {
    expect(r?.oddRound).toBe('A2'); // floats every other round
    expect(r?.evenRound).toBe('B2');
  }
  for (const r of [swiftWake, swiftHeading]) {
    expect(r?.oddRound).toBe('C2'); // two tiles
    expect(r?.evenRound).toBe('C2');
  }
  // The foe sits on B2 and the Shove jar faces down (to B3... the lane's row 3 is free).
  expect(slowWake?.shoved).toBe('down'); // wake: opens on it at once, the seal's heading
  expect(swiftWake?.shoved).toBe('down'); // swift stops on the first unit
  expect(slowHeading?.shoved).toBe('right'); // opens at dusk, facing the water
  expect(swiftHeading?.shoved).toBeNull(); // floated past, opened on an empty tile
});

// ── capstones ────────────────────────────────────────────

test('jar-cap-ring: a foe opening your jar also strikes the first unit beside it', () => {
  const go = (ids: string[]) =>
    run('. . r .\nD r . .', ids, (ctx) => {
      sealJar(ctx, at('B1'), strike());
      walker(ctx, 'C1', 'B1');
    });
  const bare = go([]);
  const ring = go(['jar-cap-ring']);
  expect(hpOf(bare.r.state, 'rat-2')).toBe(hpOf(bare.s, 'rat-2'));
  expect(hpOf(ring.r.state, 'rat-2')).toBeLessThan(hpOf(ring.s, 'rat-2') ?? 0);
  expect(hpOf(ring.r.state, 'rat-1')).toBeLessThan(hpOf(ring.s, 'rat-1') ?? 0); // the opener too
});

test('jar-cap-reseal: the jar seals again once, and opens a second time, no third', () => {
  const go = (ids: string[]) =>
    run('. . r r\nD . . .', ids, (ctx) => {
      sealJar(ctx, at('B1'), strike());
      walker(ctx, 'C1', 'B1');
      walker(ctx, 'D1', 'C1');
      walker(ctx, 'C1', 'B1');
    });
  expect(hasJar(go([]).r.state, 'B1')).toBe(false);
  expect(opened(go([]).r.events)).toHaveLength(1);
  const ring = go(['jar-cap-reseal']);
  expect(opened(ring.r.events)).toHaveLength(2);
  expect(hasJar(ring.r.state, 'B1')).toBe(false); // the reseal is once only
  // Right after the first opening the jar waits again.
  const first = run('. . r .\nD . . .', ['jar-cap-reseal'], (ctx) => {
    sealJar(ctx, at('B1'), strike());
    walker(ctx, 'C1', 'B1');
  });
  expect(hasJar(first.r.state, 'B1')).toBe(true);
});

test('fuse-cap-chain: an opening Fuse sets off the jars beside it', () => {
  const go = (ids: string[]) =>
    run('D . . .', ids, (ctx) => {
      sealJar(ctx, at('B1'), strike('dusk'));
      const other: Jar = { ...strike('step'), id: 90, seq: 90 };
      tileAt(ctx.s, at('C1')).jar = other;
      tileAt(ctx.s, at('D1')).jar = { ...strike('step'), id: 91, seq: 91 };
      openDuskJars(ctx);
    });
  const bare = go([]);
  expect(opened(bare.r.events)).toHaveLength(1);
  const chain = go(['fuse-cap-chain']);
  expect(opened(chain.r.events)).toHaveLength(2); // C1 beside it; D1 is not
  expect(hasJar(chain.r.state, 'C1')).toBe(false);
  expect(hasJar(chain.r.state, 'D1')).toBe(true);
});

test('fuse-cap-reach: a Fuse opening on an empty tile also acts on the nearest unit within 2', () => {
  const go = (ids: string[], board2: string) =>
    run(board2, ids, (ctx) => {
      sealJar(ctx, at('B1'), strike('dusk'));
      openDuskJars(ctx);
    });
  const bare = go([], 'D . r .');
  expect(hpOf(bare.r.state, 'rat-1')).toBe(hpOf(bare.s, 'rat-1'));
  const near = go(['fuse-cap-reach'], 'D . r .');
  expect(hpOf(near.r.state, 'rat-1')).toBeLessThan(hpOf(near.s, 'rat-1') ?? 0);
  const far = go(['fuse-cap-reach'], 'D . . . r');
  // The foe three tiles off is out of reach.
  expect(hpOf(far.r.state, 'rat-1')).toBe(hpOf(far.s, 'rat-1'));
});
