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
  fireLeaves,
  headingAt,
  markUnit,
  nameOnce,
  noteMet,
  runThunderheads,
  sparkLine,
  unmarkedBeside,
} from './bursts';
import { type Ctx, emit, ref, reserve, withLine, withOrigin } from './ctx';
import { dealDamage } from './damage';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, DIRS, type Dir, neighbors4, step } from './grid';
import { habitRule } from './habits';
import { cloudNet } from './networks';
import { strikePiece } from './pieces';
import { push } from './push';
import {
  blocksUnits,
  coordOf,
  findUnit,
  inBoard,
  isAlive,
  isCloud,
  isFire,
  isPlate,
  livingUnits,
  tileAt,
  unitAt,
} from './queries';
import { catchIfHot } from './solvents';
import { splashSpares } from './targets';
import type { Flow, Layer, Origin, Target, Unit } from './types';

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
  // `oil-slick-lane`: one more tile ahead along the spell's heading.
  const ahead = hasFootnote(ctx, 'oil-slick-lane') ? headingAt(ctx, flow, at) : null;
  if (ahead) neighbors.push(step(step(at, ahead), ahead));
  const seep = hasFootnote(ctx, 'oil-slick-seep'); // a blot becomes a stain, not a slick
  for (const n of neighbors.sort(byReadingOrder)) {
    if (!inBoard(s, n)) continue;
    const t = tileAt(s, n);
    if (blocksUnits(t) || (t.state && t.state.id !== 'blot')) continue;
    if (seep && t.state?.id === 'blot') {
      t.state = newLayer('stain', 'oil', flow);
      noteMet(ctx, 'stain');
      nameOnce(ctx, 'compound', 'stain');
      emit(ctx, { type: 'mixed', at: { ...n }, compound: 'stain' });
      continue;
    }
    emit(ctx, { type: 'landed', kind: 'oil', at: { ...n }, makes: 'slick' });
    t.state = newLayer('slick', 'oil', flow);
  }
}

/** `steam-cloud-wide`: every other plain cloud tile of the connected cloud thickens to a bank too. */
function thickenCloud(ctx: Ctx, at: Coord, flow: Flow | null): void {
  for (const c of cloudNet(ctx.s, at)) {
    if (c.x === at.x && c.y === at.y) continue;
    const t = tileAt(ctx.s, c);
    if (t.state?.id !== 'cloud') continue;
    t.state = newLayer('bank', 'steam', flow);
    if (hasFootnote(ctx, 'steam-cloud-long')) t.state.rounds += 1;
    emit(ctx, { type: 'mixed', at: { ...c }, compound: 'bank' });
  }
}

/** `brass-plate-twin`: a second wall on the free tile one ahead along the heading. */
function twinWall(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const heading = headingAt(ctx, flow, at);
  if (!heading) return;
  const n = step(at, heading);
  if (!inBoard(ctx.s, n)) return;
  const t = tileAt(ctx.s, n);
  if (t.state || blocksUnits(t) || unitAt(ctx.s, n)) return;
  emit(ctx, { type: 'landed', kind: 'brass', at: { ...n }, makes: 'wall' });
  t.state = wallLayer(ctx, flow);
  noteMet(ctx, 'wall');
}

/** A wall with its footnotes: `brass-plate-stand` never fades, `brass-plate-twin` breaks at one hit. */
function wallLayer(ctx: Ctx, flow: Flow | null): Layer {
  const layer = newLayer('wall', 'brass', flow);
  if (hasFootnote(ctx, 'brass-plate-stand')) layer.rounds = 0;
  if (hasFootnote(ctx, 'brass-plate-twin')) layer.hits = 1;
  return layer;
}

/** `oil-cloud-wide`: every other tile of the connected cloud turns to grease fog too. */
function greaseCloud(ctx: Ctx, at: Coord, flow: Flow | null): void {
  for (const c of cloudNet(ctx.s, at)) {
    if (c.x === at.x && c.y === at.y) continue;
    const t = tileAt(ctx.s, c);
    if (t.state?.id !== 'cloud') continue;
    t.state = newLayer('greaseFog', 'oil', flow);
    if (hasFootnote(ctx, 'oil-cloud-long')) t.state.rounds += 1;
    emit(ctx, { type: 'mixed', at: { ...c }, compound: 'greaseFog' });
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
        tile.state.dregs = true; // the blot it leaves when it clears
      }
      if (row.makes === 'greaseFog' && hasFootnote(ctx, 'oil-cloud-long')) tile.state.rounds += 1;
      if (row.makes === 'kettle' && hasFootnote(ctx, 'steam-kettle-long')) tile.state.rounds += 1;
      if (row.makes === 'bank' && hasFootnote(ctx, 'steam-cloud-long')) tile.state.rounds += 1;
      if (row.makes === 'wall') tile.state = wallLayer(ctx, flow);
      noteMet(ctx, row.makes);
      nameOnce(ctx, 'compound', row.makes);
      emit(ctx, { type: 'mixed', at: { ...at }, compound: row.makes });
      if (row.makes === 'pool') soakNeighbours(ctx, at, flow);
      if (row.makes === 'greaseFog' && hasFootnote(ctx, 'oil-cloud-wide'))
        greaseCloud(ctx, at, flow);
      if (row.makes === 'bank' && hasFootnote(ctx, 'steam-cloud-wide')) thickenCloud(ctx, at, flow);
      if (row.makes === 'wall' && hasFootnote(ctx, 'brass-plate-twin')) twinWall(ctx, at, flow);
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
  // `brass-mark-keep` leaves the mark under the shackle for a round less; `-long` adds one.
  const keep = kind === 'brass' && hasFootnote(ctx, 'brass-mark-keep');
  const long = kind === 'brass' && hasFootnote(ctx, 'brass-mark-long');
  if (!keep) u.mark = null;
  if (u.collar !== null) u.collar = false;
  u.shackle =
    TUNING.compoundRounds +
    (flow?.gifted && kind === 'brass' ? CHEMISTRY.giftRounds : 0) +
    (long ? 1 : 0) -
    (keep ? 1 : 0);
  noteMet(ctx, 'shackle');
  nameOnce(ctx, 'compound', 'shackle');
  emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'shackle' });
}

function washUnit(ctx: Ctx, kind: Plain, u: Unit, was: CompoundId): void {
  emit(ctx, { type: 'washed', at: { ...u.pos }, was, now: PLAIN[kind] });
}

/** A plain mark becomes a deep one (Ink on a mark, `ink-stain-deepen`, `ink-spread-deep`). */
export function deepen(ctx: Ctx, u: Unit): void {
  if (!u.mark || u.mark.deep) return;
  u.mark = { ...u.mark, deep: true };
  noteMet(ctx, 'deepMark');
  nameOnce(ctx, 'compound', 'deepMark');
  emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'deepMark' });
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
    // `ink-mark-overflow`: the ink runs over to a neighbour instead (no one beside: a deep mark).
    const over = hasFootnote(ctx, 'ink-mark-overflow') ? unmarkedBeside(ctx, u) : null;
    if (over)
      withLine(ctx, line('ink', 'mark'), () => markUnit(ctx, over, flow?.origin ?? null, flow));
    else withLine(ctx, line('ink', 'mark'), () => deepen(ctx, u));
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

/** `brass-cap-net`: a unit caught by a plate you cast is collared (once, owned by the caster). */
export function netCollar(ctx: Ctx, u: Unit, origin: Origin | null): void {
  if (u.collar !== false) return;
  u.collar = origin;
  noteMet(ctx, 'collar');
  emit(ctx, { type: 'collared', unit: ref(u) });
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
  const caster = flow ? findUnit(ctx.s, flow.caster) : null;
  if (unit && !(caster && splashSpares(ctx, flow, caster, unit))) {
    dealDamage(ctx, unit, TUNING.sparkDamage, 'Spark', [], {
      heading: headingAt(ctx, flow, at),
      at: caster ? { ...caster.pos } : null,
    });
    if (isAlive(unit)) burstHappened = burst(ctx, at, 'unit', flow);
  }
  burstHappened = burst(ctx, at, 'tile', flow) || burstHappened;
  if (!unit && !burstHappened && !struck) {
    // `spark-cap-arc`: a Spark with nothing to burst arcs to the nearest unit within 2 for 1.
    const near = hasFootnote(ctx, 'spark-cap-arc')
      ? livingUnits(ctx.s)
          .filter((u) => u.id !== flow?.caster)
          .map((u) => ({ u, d: Math.abs(u.pos.x - at.x) + Math.abs(u.pos.y - at.y) }))
          .filter((x) => x.d <= 2)
          .sort((a, b) => a.d - b.d || byReadingOrder(a.u.pos, b.u.pos))[0]
      : undefined;
    if (near) {
      dealDamage(ctx, near.u, CHEMISTRY.arcDamage, 'Arc', [], {
        heading: null,
        at: { ...at },
      });
    } else emit(ctx, { type: 'miss', source: 'Spark' });
  }
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
  // `steam-cap-scald`: a cloud landed on a unit's tile scalds that unit at round end.
  if (kind === 'steam' && hasFootnote(ctx, 'steam-cap-scald')) {
    const layer = tileAt(ctx.s, at).state;
    if (layer && isCloud(tileAt(ctx.s, at)) && unitAt(ctx.s, at)) layer.scalds = true;
  }
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
    let walled = false;
    let crowded = false;
    for (let step = 0; step < (layer.steepWide ? 2 : 1); step++) {
      const next: Coord[] = [];
      for (const c of ring) {
        for (const n of neighbors4(c).sort(byReadingOrder)) {
          if (!inBoard(s, n)) continue;
          const t = tileAt(s, n);
          if (blocksUnits(t)) {
            walled = true;
            continue;
          }
          if (t.state) continue;
          if (STANDS_UP.has(layer.id) && unitAt(s, n)) {
            crowded = true;
            continue;
          }
          t.state = structuredClone(layer);
          to.push(n);
          next.push(n);
        }
      }
      ring = next;
    }
    withOrigin(ctx, layer.origin, () => {
      if (to.length)
        withLine(ctx, 'steep:spread', () => emit(ctx, { type: 'spreadState', from, to }));
      if (walled) withLine(ctx, 'steep:plate', () => emit(ctx, { type: 'miss', source: 'Steep' }));
      if (crowded) withLine(ctx, 'steep:unit', () => emit(ctx, { type: 'miss', source: 'Steep' }));
    });
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
  const burnt: Coord[] = []; // fire that left something behind (spark-slick-smoke, -soot)
  const dregs: Coord[] = []; // a short pool's blot (oil-slick-short)
  const dripped: Coord[] = []; // grease fog's slick (oil-cloud-drip)
  s.tiles.forEach((t, i) => {
    const l = t.state;
    if (!l || l.rounds === 0 || l.set) return;
    if (l.afterglow) {
      delete l.afterglow;
      return;
    }
    l.rounds--;
    if (l.rounds > 0) return;
    if (l.id === 'pool' && l.dregs) {
      t.state = { id: 'blot', rounds: 0, origin: l.origin };
      dregs.push(coordOf(s, i));
      return;
    }
    if (l.id === 'greaseFog' && hasFootnote(ctx, 'oil-cloud-drip')) {
      t.state = { id: 'slick', rounds: 0, origin: l.origin };
      dripped.push(coordOf(s, i));
      return;
    }
    t.state = l.id === 'fire' ? fireLeaves(ctx, l) : null;
    (t.state ? burnt : faded).push(coordOf(s, i));
  });
  for (const u of livingUnits(s)) {
    if (u.shackle === 0) continue;
    u.shackle--;
    if (u.shackle === 0) faded.push({ ...u.pos });
  }
  if (burnt.length) {
    withLine(ctx, sparkLine('slick'), () => emit(ctx, { type: 'stateFades', tiles: burnt }));
  }
  if (dregs.length) {
    withLine(ctx, line('oil', 'slick'), () => emit(ctx, { type: 'stateFades', tiles: dregs }));
  }
  if (dripped.length) {
    withLine(ctx, line('oil', 'cloud'), () => {
      emit(ctx, { type: 'stateFades', tiles: dripped });
      for (const at of dripped) emit(ctx, { type: 'landed', kind: 'oil', at, makes: 'slick' });
    });
  }
  if (faded.length) emit(ctx, { type: 'stateFades', tiles: faded });
}

/** `oil-cloud-slip`: a unit that walked and rests in grease fog slides one tile on. */
export function slipInFog(ctx: Ctx, unit: Unit, dir: Dir | null): void {
  if (!dir || !isAlive(unit) || !hasFootnote(ctx, 'oil-cloud-slip')) return;
  if (tileAt(ctx.s, unit.pos).state?.id !== 'greaseFog') return;
  withLine(ctx, line('oil', 'cloud'), () => push(ctx, unit, dir, 1, null));
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
    // `steam-kettle-corners`: the diagonals are scalded too.
    const reach = hasFootnote(ctx, 'steam-kettle-corners')
      ? [
          ...neighbors4(at),
          ...[-1, 1].flatMap((x) => [-1, 1].map((y) => ({ x: at.x + x, y: at.y + y }))),
        ]
      : neighbors4(at);
    const near = reach.filter((n) => inBoard(s, n)).flatMap((n) => unitAt(s, n) ?? []);
    withOrigin(ctx, layer.origin, () =>
      withLine(ctx, line('steam', 'kettle'), () => {
        for (const u of near) {
          dealDamage(ctx, u, CHEMISTRY.kettleHeat, 'Kettle', [], {
            heading: null,
            at,
            harm: 'steam',
          });
        }
        // `steam-kettle-breath`: a cloud on the first empty tile beside it.
        const room = hasFootnote(ctx, 'steam-kettle-breath')
          ? neighbors4(at)
              .sort(byReadingOrder)
              .find((n) => inBoard(s, n) && !tileAt(s, n).state && !blocksUnits(tileAt(s, n)))
          : undefined;
        if (room) {
          emit(ctx, { type: 'landed', kind: 'steam', at: { ...room }, makes: 'cloud' });
          tileAt(s, room).state = { ...newLayer('cloud', 'steam', null), origin: layer.origin };
        }
      }),
    );
  }
  // `brass-cap-magnet`: a collared unit two tiles from a plate is pulled one tile toward it.
  if (hasFootnote(ctx, 'brass-cap-magnet')) {
    const collared = livingUnits(s)
      .filter((u) => u.collar !== false)
      .sort((a, b) => byReadingOrder(a.pos, b.pos));
    for (const u of collared) {
      const dir = DIRS.find((d) => {
        const two = step(step(u.pos, d), d);
        return inBoard(s, two) && isPlate(tileAt(s, two));
      });
      if (dir && u.hp > 0) {
        withLine(ctx, line('brass', 'plate'), () =>
          push(ctx, u, dir, 1, u.collar || null, { as: 'pull', crush: false }),
        );
      }
    }
  }
  // `steam-cap-scald`: the cloud scalds the unit standing in it for 1.
  s.tiles.forEach((t, i) => {
    if (!t.state?.scalds) return;
    const at = coordOf(s, i);
    const u = unitAt(s, at);
    if (!u || habitRule(u).wards?.includes('steam')) return;
    const layer = t.state;
    withOrigin(ctx, layer.origin, () =>
      withLine(ctx, line('steam', 'cloud'), () =>
        dealDamage(ctx, u, 1, 'Scald', [], { heading: null, at, harm: 'steam' }),
      ),
    );
  });
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
  if (layer?.id !== 'stain' || !isAlive(unit)) return;
  if (unit.mark) {
    if (!hasFootnote(ctx, 'ink-stain-deepen') || unit.mark.deep) return;
    withOrigin(ctx, layer.origin, () =>
      withLine(ctx, line('ink', 'stain'), () => deepen(ctx, unit)),
    );
    return;
  }
  withOrigin(ctx, layer.origin, () =>
    withLine(ctx, line('ink', 'stain'), () => markUnit(ctx, unit, layer.origin)),
  );
}
