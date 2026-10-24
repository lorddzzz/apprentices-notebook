import {
  type AuraRuneId,
  CHEMISTRY,
  type CompoundId,
  type KindId,
  type LineId,
  type Meets,
  MIXES,
  type StateId,
  TUNING,
} from '$data';
import {
  burst,
  headingAt,
  markUnit,
  nameOnce,
  noteMet,
  runThunderheads,
  sparkLine,
} from './bursts';
import { type Ctx, emit, ref, reserve, withLine, withOrigin } from './ctx';
import { dealDamage } from './damage';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, neighbors4 } from './grid';
import { habitRule } from './habits';
import { strikePiece } from './pieces';
import {
  blocksUnits,
  coordOf,
  findUnit,
  inBoard,
  isAlive,
  isFire,
  livingUnits,
  tileAt,
  unitAt,
} from './queries';
import { catchIfHot } from './solvents';
import type { Flow, Layer, Target, Unit } from './types';

/**
 * Mixing (design §4.1–4.2, P13–P17). A kind lands on the unit layer (Ink and Brass, if a unit
 * stands there) or the tile layer, and mixes with what is there by `MIXES`. A kind landing on a
 * compound washes it out (P16). `flow` is null for a foe's spit (no origin, no auras, no Lay).
 */

type Plain = Exclude<KindId, 'spark'>;
type Layered = StateId | CompoundId;

const PLAIN: Readonly<Record<Plain, StateId>> = {
  ink: 'blot',
  oil: 'slick',
  steam: 'cloud',
  brass: 'plate',
};
const PLAIN_STATES: ReadonlySet<Layered> = new Set(['blot', 'slick', 'cloud', 'plate', 'fire']);
/** Layers that stand up like a plate: no unit may share the tile. */
const STANDS_UP: ReadonlySet<Layered> = new Set(['plate', 'skidPlate', 'kettle', 'wall']);
const isCompound = (id: Layered): id is CompoundId => !PLAIN_STATES.has(id);

/** "ink:slick": what a kind does on what it meets. */
const line = (kind: KindId, meets: Meets): LineId => `${kind}:${meets}`;
/** The default for every compound a kind lands on (P16): one line per kind. */
const washLine = (kind: Plain): LineId => `${kind}:compound`;

// ── Layers ──────────────────────────────────────────────

/** A fresh layer with its P17 duration; flags from the step's auras and Lay (design §5.2). */
function newLayer(id: Layered, kind: Plain, flow: Flow | null): Layer {
  let rounds = 0;
  let hits: number | undefined;
  switch (id) {
    case 'blot':
    case 'slick':
      break;
    case 'cloud':
      rounds = TUNING.cloudRounds;
      break;
    case 'plate':
      rounds = TUNING.plateRounds;
      hits = CHEMISTRY.plateHits;
      break;
    case 'fire':
      rounds = TUNING.fireRounds;
      break;
    case 'bank':
      rounds = TUNING.compoundRounds + CHEMISTRY.bankExtraRounds;
      break;
    case 'wall':
      rounds = TUNING.compoundRounds;
      hits = CHEMISTRY.wallHits;
      break;
    case 'skidPlate':
    case 'kettle':
      rounds = TUNING.compoundRounds;
      hits = CHEMISTRY.plateHits;
      break;
    default:
      rounds = TUNING.compoundRounds;
  }
  const layer: Layer = { id, rounds, origin: flow?.origin ?? null };
  if (hits !== undefined) layer.hits = hits;
  if (flow?.gifted && (kind === 'steam' || kind === 'brass') && rounds > 0) {
    layer.rounds += CHEMISTRY.giftRounds;
  }
  if (flow && isCompound(id)) {
    const plus = (a: AuraRuneId): number => (flow.giftedAuras?.includes(a) ? 1 : 0);
    if (flow.auras.includes('afterglow')) {
      layer.afterglow = true;
      if (layer.rounds > 0) layer.rounds += plus('afterglow'); // gifted: one more round again
    }
    if (flow.auras.includes('steep')) {
      layer.steep = true;
      if (plus('steep')) layer.steepWide = true;
    }
  }
  if (flow?.lay && layer.rounds > 0) {
    layer.rounds = 0;
    layer.set = true;
  }
  return layer;
}

function targetCoord(ctx: Ctx, t: Target): Coord | null {
  if (t.kind === 'tile') return inBoard(ctx.s, t.at) ? t.at : null;
  const u = findUnit(ctx.s, t.unit);
  return u && isAlive(u) ? u.pos : null;
}

/** Ink and Brass land on the unit standing on the target, else the tile (P14). */
function unitOn(ctx: Ctx, t: Target, at: Coord): Unit | null {
  if (t.kind === 'unit') {
    const u = findUnit(ctx.s, t.unit);
    return u && isAlive(u) ? u : null;
  }
  return unitAt(ctx.s, at);
}

// ── Tiles ───────────────────────────────────────────────

/** A Pool soaks its 4 neighbours too: empty or blotted tiles there become slicks. */
function soakNeighbours(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const s = ctx.s;
  const neighbors = neighbors4(at);
  if (hasFootnote(ctx, 'oil-slick-corners')) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) neighbors.push({ x: at.x + x, y: at.y + y });
  }
  for (const n of neighbors.sort(byReadingOrder)) {
    if (!inBoard(s, n)) continue;
    const t = tileAt(s, n);
    if (blocksUnits(t) || (t.state && t.state.id !== 'blot')) continue;
    emit(ctx, { type: 'landed', kind: 'oil', at: { ...n }, makes: 'slick' });
    t.state = newLayer('slick', 'oil', flow);
  }
}

function land(ctx: Ctx, kind: Plain, at: Coord, id: Layered, flow: Flow | null, unit?: Unit): void {
  emit(ctx, {
    type: 'landed',
    kind,
    at: { ...at },
    ...(unit ? { unit: ref(unit) } : {}),
    makes: id,
  });
  tileAt(ctx.s, at).state = newLayer(id, kind, flow);
  noteMet(ctx, id);
}

function landOnTile(ctx: Ctx, kind: Plain, at: Coord, flow: Flow | null): void {
  const s = ctx.s;
  const tile = tileAt(s, at);
  const want = PLAIN[kind];
  if (kind === 'brass' && (tile.terrain.gate || tile.terrain.grate)) {
    emit(ctx, { type: 'miss', source: 'Brass' });
    return;
  }
  const cur = tile.state;
  if (!cur) {
    land(ctx, kind, at, want, flow);
    return;
  }
  const row = MIXES.find((m) => m.kind === kind && m.on === cur.id);
  if (row) {
    withLine(ctx, line(kind, cur.id), () => {
      reserve(ctx, 2); // `named` (first time) and `mixed`
      tile.state = newLayer(row.makes, kind, flow);
      if (row.makes === 'pool' && hasFootnote(ctx, 'oil-slick-short') && tile.state.rounds > 0) {
        tile.state.rounds -= 1;
      }
      noteMet(ctx, row.makes);
      nameOnce(ctx, 'compound', row.makes);
      emit(ctx, { type: 'mixed', at: { ...at }, compound: row.makes });
      if (row.makes === 'pool') soakNeighbours(ctx, at, flow);
    });
    return;
  }
  if (isCompound(cur.id)) {
    const was = cur.id;
    withLine(ctx, washLine(kind), () => {
      emit(ctx, { type: 'washed', at: { ...at }, was, now: want });
      tile.state = newLayer(want, kind, flow);
      noteMet(ctx, want);
    });
    return;
  }
  // A plain state with no row: Ink slides off a blot or a plate; Brass replaces a blot; Oil
  // feeds a fire and the others put it out.
  if (kind === 'ink' && cur.id !== 'fire') {
    withLine(ctx, line(kind, cur.id), () => emit(ctx, { type: 'miss', source: 'Ink' }));
    return;
  }
  withLine(ctx, line(kind, cur.id), () => {
    if (kind === 'oil' && cur.id === 'fire') {
      emit(ctx, { type: 'landed', kind, at: { ...at }, makes: 'fire' });
      cur.rounds = TUNING.fireRounds;
    } else {
      land(ctx, kind, at, want, flow);
    }
  });
}

// ── Units ───────────────────────────────────────────────

/** Shackle replaces the mark and the collar; a born brass collar (null) stays. */
function shackle(ctx: Ctx, kind: Plain, u: Unit, flow: Flow | null): void {
  u.mark = null;
  if (u.collar !== null) u.collar = false;
  u.shackle = TUNING.compoundRounds + (flow?.gifted && kind === 'brass' ? CHEMISTRY.giftRounds : 0);
  noteMet(ctx, 'shackle');
  nameOnce(ctx, 'compound', 'shackle');
  emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'shackle' });
}

function washUnit(ctx: Ctx, kind: Plain, u: Unit, was: CompoundId): void {
  emit(ctx, { type: 'washed', at: { ...u.pos }, was, now: PLAIN[kind] });
}

function inkOnUnit(ctx: Ctx, u: Unit, flow: Flow | null): void {
  if (u.shackle > 0) {
    withLine(ctx, washLine('ink'), () => {
      u.shackle = 0;
      washUnit(ctx, 'ink', u, 'shackle');
      markUnit(ctx, u, flow?.origin ?? null, flow);
    });
  } else if (u.collar !== false) {
    withLine(ctx, line('ink', 'collar'), () => shackle(ctx, 'ink', u, flow));
  } else if (u.mark?.deep) {
    withLine(ctx, washLine('ink'), () => {
      u.mark = { ...u.mark, deep: false } as NonNullable<Unit['mark']>;
      washUnit(ctx, 'ink', u, 'deepMark');
    });
  } else if (u.mark) {
    withLine(ctx, line('ink', 'mark'), () => {
      u.mark = { ...u.mark, deep: true } as NonNullable<Unit['mark']>;
      noteMet(ctx, 'deepMark');
      nameOnce(ctx, 'compound', 'deepMark');
      emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'deepMark' });
    });
  } else {
    markUnit(ctx, u, flow?.origin ?? null, flow);
  }
}

function brassOnUnit(ctx: Ctx, u: Unit, flow: Flow | null): void {
  if (u.shackle > 0) {
    withLine(ctx, washLine('brass'), () => {
      u.shackle = 0;
      washUnit(ctx, 'brass', u, 'shackle');
      collar(ctx, u, flow);
    });
  } else if (u.mark) {
    withLine(ctx, line('brass', 'mark'), () => shackle(ctx, 'brass', u, flow));
  } else if (u.collar === false) {
    collar(ctx, u, flow);
  }
}

function collar(ctx: Ctx, u: Unit, flow: Flow | null): void {
  u.collar = flow ? flow.origin : null;
  noteMet(ctx, 'collar');
  emit(ctx, { type: 'collared', unit: ref(u) });
}

// ── Spark ───────────────────────────────────────────────

/** Spark: 1 damage to the unit, then it bursts the unit layer, then the tile layer (P14). */
function sparkLand(ctx: Ctx, t: Target, flow: Flow | null): void {
  const at = targetCoord(ctx, t);
  if (!at) return;
  const unit = unitOn(ctx, t, at);
  const struck = strikePiece(ctx, at, 'spark');
  let burstHappened = false;
  if (unit) {
    const caster = flow ? findUnit(ctx.s, flow.caster) : null;
    dealDamage(ctx, unit, TUNING.sparkDamage, 'Spark', [], {
      heading: headingAt(ctx, flow, at),
      at: caster ? { ...caster.pos } : null,
    });
    if (isAlive(unit)) burstHappened = burst(ctx, at, 'unit', flow);
  }
  burstHappened = burst(ctx, at, 'tile', flow) || burstHappened;
  if (!unit && !burstHappened && !struck) emit(ctx, { type: 'miss', source: 'Spark' });
}

// ── Entry points ────────────────────────────────────────

/** Lands a kind on a target and mixes it with what's there (E2, design §4.1–4.2, P13–P16). */
export function landKind(ctx: Ctx, kind: KindId, t: Target, flow: Flow): void {
  landKindWith(ctx, kind, t, flow);
}

/** The same for a foe's kind (a spit of ink): no cast, so no origin, auras, Lay or gift. */
export function landKindFree(ctx: Ctx, kind: KindId, t: Target): void {
  landKindWith(ctx, kind, t, null);
}

function landKindWith(ctx: Ctx, kind: KindId, t: Target, flow: Flow | null): void {
  if (kind === 'spark') {
    sparkLand(ctx, t, flow);
    return;
  }
  const at = targetCoord(ctx, t);
  if (!at) return;
  const unit = kind === 'ink' || kind === 'brass' ? unitOn(ctx, t, at) : null;
  if (unit) {
    if (kind === 'ink') inkOnUnit(ctx, unit, flow);
    else brassOnUnit(ctx, unit, flow);
    return;
  }
  landOnTile(ctx, kind, at, flow);
  if (kind === 'oil') catchIfHot(ctx, at, flow);
}

// ── The round ───────────────────────────────────────────

/** Steep: each steeped compound copies itself onto empty neighbours every round it lasts. */
function spreadSteep(ctx: Ctx): void {
  const s = ctx.s;
  const sources: number[] = [];
  s.tiles.forEach((t, i) => {
    if (t.state?.steep && t.state.rounds > 0) sources.push(i);
  });
  for (const i of sources) {
    const from = coordOf(s, i);
    const layer = tileAt(s, from).state;
    if (!layer) continue;
    const to: Coord[] = [];
    // One tile a round; two when the caster is gifted in Steep (design §9).
    let ring: Coord[] = [from];
    for (let step = 0; step < (layer.steepWide ? 2 : 1); step++) {
      const next: Coord[] = [];
      for (const c of ring) {
        for (const n of neighbors4(c).sort(byReadingOrder)) {
          if (!inBoard(s, n)) continue;
          const t = tileAt(s, n);
          if (t.state || blocksUnits(t)) continue;
          if (STANDS_UP.has(layer.id) && unitAt(s, n)) continue;
          t.state = structuredClone(layer);
          to.push(n);
          next.push(n);
        }
      }
      ring = next;
    }
    if (to.length)
      withOrigin(ctx, layer.origin, () => emit(ctx, { type: 'spreadState', from, to }));
  }
}

/**
 * Round end: Steep spreads, then every lingering layer ticks down (Afterglow's flag buys one
 * round, once) and fades at 0; Shackles wear off (P17). Layout plates and Lay'd layers have 0.
 */
export function decayStates(ctx: Ctx): void {
  const s = ctx.s;
  spreadSteep(ctx);
  const faded: Coord[] = [];
  s.tiles.forEach((t, i) => {
    const l = t.state;
    if (!l || l.rounds === 0 || l.set) return;
    if (l.afterglow) {
      delete l.afterglow;
      return;
    }
    l.rounds--;
    if (l.rounds > 0) return;
    t.state = null;
    faded.push(coordOf(s, i));
  });
  for (const u of livingUnits(s)) {
    if (u.shackle === 0) continue;
    u.shackle--;
    if (u.shackle === 0) faded.push({ ...u.pos });
  }
  if (faded.length) emit(ctx, { type: 'stateFades', tiles: faded });
}

/** The tiles holding `id`, in reading order. */
function tilesWith(ctx: Ctx, id: Layered): { at: Coord; layer: Layer }[] {
  const out: { at: Coord; layer: Layer }[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.state?.id === id) out.push({ at: coordOf(ctx.s, i), layer: t.state });
  });
  return out;
}

/** A steam-warded unit's brand mark is that habit's fine print (AH P14: steam spares, ink marks). */
const brandLine = (u: Unit): LineId =>
  habitRule(u).wards?.includes('steam') ? 'steamproof:brandCloud' : line('ink', 'brandCloud');

/**
 * Round end, before `decayStates`: Thunderheads storm again, a Brand cloud marks whoever stands
 * in it, a Kettle scalds each unit beside it, and fire burns whoever stands in it. E6 calls it.
 */
export function roundEndChemistry(ctx: Ctx): void {
  const s = ctx.s;
  runThunderheads(ctx);
  for (const { at, layer } of tilesWith(ctx, 'brandCloud')) {
    const u = unitAt(s, at);
    if (!u || u.mark) continue;
    withOrigin(ctx, layer.origin, () =>
      withLine(ctx, brandLine(u), () => markUnit(ctx, u, layer.origin)),
    );
  }
  for (const { at, layer } of tilesWith(ctx, 'kettle')) {
    const near = neighbors4(at)
      .filter((n) => inBoard(s, n))
      .flatMap((n) => unitAt(s, n) ?? []);
    withOrigin(ctx, layer.origin, () =>
      withLine(ctx, line('steam', 'kettle'), () => {
        for (const u of near) {
          dealDamage(ctx, u, CHEMISTRY.kettleHeat, 'Kettle', [], {
            heading: null,
            at,
            harm: 'steam',
          });
        }
      }),
    );
  }
  const burning = livingUnits(s)
    .filter((u) => isFire(tileAt(s, u.pos)))
    .sort((a, b) => byReadingOrder(a.pos, b.pos));
  for (const u of burning) {
    const origin = tileAt(s, u.pos).state?.origin ?? null;
    withOrigin(ctx, origin, () =>
      withLine(ctx, sparkLine('slick'), () => {
        dealDamage(ctx, u, TUNING.fireDamage, 'Fire', [], { heading: null, at: { ...u.pos } });
      }),
    );
  }
}

/** A stain marks an unmarked unit that ends its move on it. E3's movement calls it after a move. */
export function stainMarks(ctx: Ctx, unit: Unit): void {
  const layer = tileAt(ctx.s, unit.pos).state;
  if (layer?.id !== 'stain' || unit.mark || !isAlive(unit)) return;
  withOrigin(ctx, layer.origin, () =>
    withLine(ctx, line('ink', 'stain'), () => markUnit(ctx, unit, layer.origin)),
  );
}
