import { expect, test } from 'vitest';
import { type GameEvent, parseLabel, tileAt } from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { decayStates } from '$engine/mix';
import { push } from '$engine/push';
import type { BattleState, Layer } from '$engine/types';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { board, unitAtLabel, withLattices } from '../harness';
import { castWith, tileAim, where } from './castHelper';

/** BH-F3: Vat, Seep and Steep margin lines (fourCombos) and capstones, each on a small ASCII board. */
const at = parseLabel;
type Notes = Parameters<typeof castWith>[2];
const stateAt = (s: BattleState, l: string) => tileAt(s, at(l)).state?.id ?? null;
const layerAt = (s: BattleState, l: string) => tileAt(s, at(l)).state;
const ratsAt = (s: BattleState) =>
  s.units.filter((u) => u.kind === 'enemy').map((u) => (u.hp > 0 ? where(s, u.id) : 'x'));
const events = (es: readonly GameEvent[], type: GameEvent['type']) =>
  es.filter((e) => e.type === type);
const dmg = (es: readonly GameEvent[]) =>
  es.map((e) => (e.type === 'damage' ? `${e.target.id}:${e.amount}` : '')).filter(Boolean);
const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;

// ── vat:unit ─────────────────────────────────────────────

function vatUnit(footnotes: Notes) {
  // The Vat's square is D3 E3 D4 E4 (aimed at D3); the caster above stands outside it.
  const s = withLattices(
    '. . . . . . . .\n. . . D . . . .\n. . . r . . . .\n. . . . r . . .\n. . . . . . . .\n. . . . . . . .',
    { draughtsman: 'Vat> Shove' },
  );
  const r = castWith(s, tileAim('D3'), footnotes);
  return {
    rats: ratsAt(r.state),
    clouds: ['D3', 'E3', 'D4', 'E4'].map((l) => stateAt(r.state, l)),
  };
}

test('vat:unit fourCombos: scatter or gather, then pour or fill', () => {
  const runs = fourCombos(
    'vat:unit',
    ['vat-unit-scatter', 'vat-unit-gather'],
    ['vat-unit-pour', 'vat-unit-fill'],
    ({ footnotes }) => vatUnit(footnotes),
  );
  const [scatterPour, scatterFill, gatherPour, gatherFill] = runs.map((r) => r.result);
  // scatter pushes the two units apart; gather pushes them together (each tile points sideways).
  expect(scatterFill?.rats).toEqual(['C3', 'F4']);
  expect(gatherFill?.rats).toEqual(['E3', 'D4']);
  // pour: the first unit takes the two empty tiles' shares as well, three pushes in all.
  expect(scatterPour?.rats).toEqual(['A3', 'F4']);
  expect(gatherPour?.rats).toEqual(['G3', 'D4']);
  expect(scatterPour?.clouds).toEqual([null, null, null, null]);
  // fill: every tile that is empty after the rest takes a cloud (a gathered knot keeps its tiles).
  expect(scatterFill?.clouds).toEqual(['cloud', 'cloud', 'cloud', 'cloud']);
  expect(gatherFill?.clouds).toEqual(['cloud', null, null, 'cloud']);
});

// ── vat:edge ─────────────────────────────────────────────

function vatEdge(footnotes: Notes) {
  // Shove: the Vat aimed at D3 on a 3-row board keeps D3 and E3; the other two tiles are off the edge.
  const shove = castWith(
    withLattices('. . . . . .\n. . D . . .\n. . . r r .', { draughtsman: 'Vat> Shove' }),
    tileAim('D3'),
    footnotes,
  );
  const held = shove.state.units.filter((u) => u.kind === 'enemy').map((u) => u.held);
  // Strike: a rat at E2 is reached only by a slid square; E3 is in the clipped one.
  const strike = castWith(
    withLattices('. . . . . .\n. . D . r .\n. . . . r .', { draughtsman: 'Vat> Strike' }),
    tileAim('D3'),
    footnotes,
  );
  return {
    rats: ratsAt(shove.state),
    held,
    line: events(shove.events, 'aimed')[0]?.line,
    dmg: dmg(strike.events),
  };
}

test('vat:edge fourCombos: slide or press, then pin or rebound', () => {
  const runs = fourCombos(
    'vat:edge',
    ['vat-edge-slide', 'vat-edge-press'],
    ['vat-edge-pin', 'vat-edge-rebound'],
    ({ footnotes }) => vatEdge(footnotes),
  );
  const [slidePin, slideRebound, pressPin, pressRebound] = runs.map((r) => r.result);
  // slide keeps four tiles: the rat at E2 is reached (the clipped square would miss it).
  for (const r of [slidePin, slideRebound]) {
    expect(r?.dmg).toEqual(['rat-1:2', 'rat-2:2']);
    expect(r?.line).toBe('vat:edge');
  }
  // press: the clipped square hits E3 alone, two steps stronger (2 + 2).
  for (const r of [pressPin, pressRebound]) expect(r?.dmg).toEqual(['rat-2:4']);
  // pin: both rats shoved at the bottom edge are held; rebound: they bounce a tile back up.
  expect(pressPin?.rats).toEqual(['D3', 'E3']);
  expect(pressPin?.held).toEqual([1, 1]);
  expect(pressRebound?.rats).toEqual(['D2', 'E2']);
  expect(pressRebound?.held).toEqual([0, 0]);
});

// ── seep:edge ────────────────────────────────────────────

function seepEdge(footnotes: Notes) {
  const opts = { hp: { B1: 9, D1: 9, A2: 9 } };
  // The target B1 is on the top edge: one neighbour is lost; A2 is its nearest diagonal, D1 lies
  // one tile past C1 along the edge.
  const corner = castWith(
    withLattices('D r . r\nr . . .', { draughtsman: 'Bolt> Seep Strike' }, opts),
    { kind: 'dir', dir: 'right' },
    footnotes,
  );
  // A plate beside the target at the edge: with `wall` two neighbours are lost.
  const walled = castWith(
    withLattices('D r =\n. . .', { draughtsman: 'Bolt> Seep Strike' }, { hp: { B1: 9 } }),
    { kind: 'dir', dir: 'right' },
    footnotes,
  );
  return {
    corner: dmg(corner.events).filter((d) => d.startsWith('rat')),
    walled: dmg(walled.events).filter((d) => d.startsWith('rat')),
    missLine: events(corner.events, 'miss').map((e) => e.line),
  };
}

test('seep:edge fourCombos: back or turn, then wall or along', () => {
  const runs = fourCombos(
    'seep:edge',
    ['seep-edge-back', 'seep-edge-turn'],
    ['seep-edge-wall', 'seep-edge-along'],
    ({ footnotes }) => seepEdge(footnotes),
  );
  const [backWall, backAlong, turnWall, turnAlong] = runs.map((r) => r.result);
  // back: the rest acts again on the target for each lost neighbour (the wall counts as lost).
  expect(backWall?.corner).toEqual(['rat-1:2', 'rat-1:2']);
  expect(backWall?.walled).toEqual(['rat-1:2', 'rat-1:2', 'rat-1:2']);
  expect(backAlong?.walled).toEqual(['rat-1:2', 'rat-1:2']);
  // along: the rim is swept (D1, past C1); turn: the nearest diagonal (A2) takes the lost one.
  expect(backAlong?.corner).toEqual(['rat-1:2', 'rat-2:2', 'rat-1:2']);
  expect(turnWall?.corner).toEqual(['rat-1:2', 'rat-3:2']);
  expect(turnAlong?.corner).toEqual(['rat-1:2', 'rat-2:2', 'rat-3:2']);
  for (const r of runs) expect(r.result.missLine).toEqual(['seep:edge']);
});

// ── seep:member ──────────────────────────────────────────

function seepMember(footnotes: Notes) {
  // Strike: caster A1, target B1, your ally S beside it at C1, and a rat D1 past the ally.
  const strike = castWith(
    withLattices(
      'D r S r\n. . . .',
      { draughtsman: 'Bolt> Seep Strike' },
      { hp: { B1: 9, D1: 9, A1: 9, C1: 9 } },
    ),
    { kind: 'dir', dir: 'right' },
    footnotes,
  );
  // Shove: the target B3 is pushed down; your ally at C3 is pushed down too, or away (right).
  const shove = castWith(
    withLattices('. D . . . .\n. . . . . .\n. r S . . .\n. . . . . .\n. . . . . .', {
      draughtsman: 'Bolt> Seep Shove',
    }),
    { kind: 'dir', dir: 'down' },
    footnotes,
  );
  const lines = (es: readonly GameEvent[]) =>
    es
      .filter((e) => e.type === 'damage' && e.target.id !== 'rat-1')
      .map((e) => `${e.type === 'damage' ? e.target.id : ''}:${e.line}`);
  return {
    hp: [hp(strike.state, 'draughtsman'), hp(strike.state, 'stoker')],
    rat2: hp(strike.state, 'rat-2'),
    lines: lines(strike.events),
    shield: [unitAtLabel(strike.state, 'C1').shield, unitAtLabel(strike.state, 'A1').shield],
    stoker: where(shove.state, 'stoker'),
  };
}

test('seep:member fourCombos: spare-self or pass, then away or guard', () => {
  const runs = fourCombos(
    'seep:member',
    ['seep-member-spare-self', 'seep-member-pass'],
    ['seep-member-away', 'seep-member-guard'],
    ({ footnotes }) => seepMember(footnotes),
  );
  const [sparePush, spareGuard, passAway, passGuard] = runs.map((r) => r.result);
  // spare-self: you are untouched, your ally still takes the rest, under seep:member.
  expect(sparePush?.hp).toEqual([9, 7]);
  expect(sparePush?.lines).toEqual(['stoker:seep:member']);
  // pass: the ally relays it to D1 (rat-2); you are hit too.
  expect(passAway?.rat2).toBe(7);
  expect(passAway?.hp).toEqual([7, 7]);
  expect(passAway?.lines).toEqual([
    'draughtsman:seep:member',
    'stoker:seep:member',
    'rat-2:undefined',
  ]);
  // away: the ally is pushed away from the target (right), not down the heading.
  expect(sparePush?.stoker).toBe('D3');
  expect(passAway?.stoker).toBe('D3');
  // guard: the party beside the target is shielded instead of struck or pushed.
  expect(spareGuard?.hp).toEqual([9, 9]);
  expect(spareGuard?.shield).toEqual([2, 0]);
  expect(passGuard?.shield).toEqual([2, 2]);
  expect(spareGuard?.stoker).toBe('C3');
});

// ── steep:spread and steep:plate ─────────────────────────

/** Runs the round end on `ascii` after `setup` has laid steeped layers. */
function roundEnd(ascii: string, setup: (ctx: Ctx) => void, footnotes: Notes) {
  const s = board(ascii);
  return runDraft(
    s,
    (ctx: Ctx) => {
      setup(ctx);
      decayStates(ctx);
    },
    { footnotes },
  );
}
const steep = (ctx: Ctx, l: string, layer: Partial<Layer> & Pick<Layer, 'id'>) => {
  tileAt(ctx.s, at(l)).state = { rounds: 3, origin: null, steep: true, ...layer };
};

function steepSpread(footnotes: Notes) {
  // A steeped grease fog at C1: B1 empty, D1 a slick, C2 a plain cloud.
  const r = roundEnd(
    '. . . . .\n. . . . .',
    (ctx) => {
      steep(ctx, 'C1', { id: 'greaseFog', rounds: 3 });
      tileAt(ctx.s, at('D1')).state = { id: 'slick', rounds: 0, origin: null };
      tileAt(ctx.s, at('C2')).state = { id: 'cloud', rounds: 2, origin: null };
    },
    footnotes,
  );
  const ally = roundEnd(
    '. S . . .\n. . . . .',
    (ctx) => steep(ctx, 'C1', { id: 'cloud', rounds: 3 }),
    footnotes,
  );
  return {
    b1: layerAt(r.state, 'B1') && [
      stateAt(r.state, 'B1'),
      layerAt(r.state, 'B1')?.rounds,
      !!layerAt(r.state, 'B1')?.steep,
    ],
    d1: stateAt(r.state, 'D1'),
    c2: stateAt(r.state, 'C2'),
    onAlly: stateAt(ally.state, 'B1'),
  };
}

test('steep:spread fourCombos: thin or once, then mix or spare', () => {
  const runs = fourCombos(
    'steep:spread',
    ['steep-spread-thin', 'steep-spread-once'],
    ['steep-spread-mix', 'steep-spread-spare'],
    ({ footnotes }) => steepSpread(footnotes),
  );
  const [thinMix, thinSpare, onceMix, onceSpare] = runs.map((r) => r.result);
  // thin: the copy has a round fewer (3 - 1, then the round's tick); once: it is not steeped.
  expect(thinMix?.b1).toEqual(['greaseFog', 1, true]);
  expect(onceMix?.b1).toEqual(['greaseFog', 2, false]);
  // mix: the slick and the plain cloud beside it become grease fog; otherwise they are left alone.
  for (const r of [thinMix, onceMix]) expect([r?.d1, r?.c2]).toEqual(['greaseFog', 'greaseFog']);
  for (const r of [thinSpare, onceSpare]) expect([r?.d1, r?.c2]).toEqual(['slick', 'cloud']);
  // spare: it flows around your ally; otherwise it settles on the tile.
  for (const r of [thinSpare, onceSpare]) expect(r?.onAlly).toBeNull();
  for (const r of [thinMix, onceMix]) expect(r?.onAlly).toBe('cloud');
});

function steepPlate(footnotes: Notes) {
  // A steeped cloud at C1 pressing on a rune plate at D1 (E1 beyond), and on a gate at C2 (C3 beyond).
  const r = roundEnd(
    '. . . # .\n. . . . .\n. . . . .',
    (ctx) => steep(ctx, 'C1', { id: 'cloud', rounds: 3 }),
    footnotes,
  );
  const gate = roundEnd(
    '. . . . .\n. . g . .\n. . . . .',
    (ctx) => steep(ctx, 'C1', { id: 'cloud', rounds: 3 }),
    footnotes,
  );
  return {
    beyondPlate: [stateAt(r.state, 'E1'), layerAt(r.state, 'E1')?.rounds ?? null],
    plateHits: layerAt(r.state, 'D1')?.hits ?? null,
    source: layerAt(r.state, 'C1')?.rounds,
    beyondGate: stateAt(gate.state, 'C3'),
    missed: events(r.events, 'miss').map((e) => e.line),
  };
}

test('steep:plate fourCombos: under or pool, then wear or seep', () => {
  const runs = fourCombos(
    'steep:plate',
    ['steep-plate-under', 'steep-plate-pool'],
    ['steep-plate-wear', 'steep-plate-seep'],
    ({ footnotes }) => steepPlate(footnotes),
  );
  const [underWear, underSeep, poolWear, poolSeep] = runs.map((r) => r.result);
  // under: a spread stopped by a gate passes under it to the tile beyond.
  for (const r of [underWear, underSeep]) expect(r?.beyondGate).toBe('cloud');
  expect(poolWear?.beyondGate).toBeNull();
  expect(poolSeep?.beyondGate).toBe('cloud'); // seep leaks a thin cloud past any blocker
  // pool: the stopped source gains a round (3, then the round's tick: 3 instead of 2).
  for (const r of [poolWear, poolSeep]) expect(r?.source).toBe(3);
  for (const r of [underWear, underSeep]) expect(r?.source).toBe(2);
  // wear: the plate (one hit left) is worn away; seep: a thin cloud leaks past it instead.
  for (const r of [underWear, poolWear]) expect(r?.plateHits).toBeNull();
  for (const r of [underSeep, poolSeep]) expect(r?.plateHits).toBe(1);
  for (const r of [underSeep, poolSeep]) expect(r?.beyondPlate).toEqual(['cloud', 1]);
  for (const r of [underWear, poolWear]) expect(r?.beyondPlate).toEqual([null, null]);
  for (const r of runs) expect(r.result.missed).toContain('steep:plate');
});

// ── capstones ────────────────────────────────────────────

test('capstones: vat room and crowd, seep chain and cloud, steep carry', () => {
  const room = (ids: string[]) => {
    const s = withLattices(
      '. . . . . . .\n. . . D . . .\n. . r ~ ~ r .\n. . . ~ ~ . .\n. . . . . . .',
      { draughtsman: 'Vat> Strike' },
      { hp: { C3: 9, F3: 9 } },
    );
    return dmg(castWith(s, tileAim('D3'), withFootnotes(ids)).events);
  };
  const crowd = (ids: string[]) => {
    const s = withLattices(
      '. . . . . . .\n. . . D . . .\n. . . r . . .\n. . . . r . .',
      { draughtsman: 'Vat> Strike' },
      { hp: { D3: 9, E4: 9 } },
    );
    return dmg(castWith(s, tileAim('D3'), withFootnotes(ids)).events);
  };
  const chain = (ids: string[]) => {
    const s = withLattices(
      'D r r r\n. . . .',
      { draughtsman: 'Bolt> Seep Strike' },
      { hp: { B1: 9, D1: 9 } },
    );
    return dmg(castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(ids)).events);
  };
  const cloud = (ids: string[]) => {
    const s = withLattices(
      'D r~ . .\n. . r .\n. . . .',
      { draughtsman: 'Bolt> Seep Strike' },
      { hp: { B1: 9, C2: 9 } },
    );
    return dmg(castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(ids)).events);
  };
  const carry = (ids: string[]) => {
    const s = board('. . . . .\nr . . . .');
    const r = runDraft(
      s,
      (ctx: Ctx) => {
        steep(ctx, 'A2', { id: 'cloud', rounds: 3 });
        push(ctx, unitAtLabel(ctx.s, 'A2'), 'right', 1, null);
      },
      { footnotes: withFootnotes(ids) },
    );
    return [stateAt(r.state, 'A2'), stateAt(r.state, 'B2'), !!layerAt(r.state, 'B2')?.steep];
  };
  expect(room([])).toEqual([]);
  expect(room(['vat-cap-room'])).toEqual(['draughtsman:1', 'rat-1:1', 'rat-2:1']); // the ring: one step weaker
  expect(crowd([])).toEqual(['rat-1:2', 'rat-2:2']);
  expect(crowd(['vat-cap-crowd'])).toEqual(['rat-1:2', 'rat-2:2', 'rat-1:1', 'rat-2:1']);
  expect(chain([])).toEqual(['rat-1:2', 'draughtsman:2', 'rat-2:2']);
  expect(chain(['seep-cap-chain'])).toEqual(['rat-1:2', 'draughtsman:2', 'rat-2:2', 'rat-3:2']);
  expect(cloud([])).toEqual(['rat-1:2', 'draughtsman:2']);
  expect(cloud(['seep-cap-cloud'])).toEqual(['rat-1:2', 'draughtsman:2', 'rat-2:2']);
  expect(carry([])).toEqual(['cloud', null, false]);
  expect(carry(['steep-cap-carry'])).toEqual(['cloud', 'cloud', true]);
});
