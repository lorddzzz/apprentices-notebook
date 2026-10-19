import {
  BURSTS,
  type BurstId,
  type BurstRow,
  CHEMISTRY,
  type LineId,
  type Meets,
  TUNING,
} from '$data';
import { type Ctx, emit, ref, withLine } from './ctx';
import { burnGates } from './current';
import { dealDamage } from './damage';
import { byReadingOrder, type Coord, type Dir, step } from './grid';
import { applyMark, spendMark } from './marks';
import { brassNet, cloudNet, oilNet } from './networks';
import { push } from './push';
import { blocksUnits, inBoard, isCloud, livingUnits, tileAt, unitAt } from './queries';
import { SOLVENT_RULES } from './solvents';
import type { Flow, Layer, Mark, Origin, Unit } from './types';

/**
 * Spark bursts what it lands on (design §4.3, P18, P19). `burstAt` is the contract entry; the
 * helpers here (named results, marking, reach) are shared with `mix.ts`.
 */

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const manyOf = (units: readonly Unit[]): Unit[] =>
  [...units].sort((a, b) => byReadingOrder(a.pos, b.pos));

/** The line a burst fires: Spark meeting what it burst. */
export const sparkLine = (meets: Meets): LineId => `spark:${meets}`;

// ── Shared helpers ──────────────────────────────────────

/** Silent `named` event the first time a compound or burst happens in a battle (D7). */
export function nameOnce(ctx: Ctx, what: 'compound' | 'burst', id: string): void {
  const full = `${what}:${id}`;
  if (ctx.s.named.includes(full)) return;
  ctx.s.named.push(full);
  emit(ctx, { type: 'named', what, id });
}

/** Records something the party has met this battle (the Bench palette, P37). */
export function noteMet(ctx: Ctx, m: Meets): void {
  if (!ctx.s.met.includes(m)) ctx.s.met.push(m);
}

/** Extra tiles a burst reaches: Coil on the step's touching auras (design §5.2). */
export const reachOf = (flow: Flow | null): number =>
  (flow?.auras.includes('coil') ? CHEMISTRY.coilReach : 0) +
  (flow?.solvent ? (SOLVENT_RULES[flow.solvent]?.reach ?? 0) : 0);

/** The heading of the target standing on `at` (a unit's, else the tile's), or null. */
export function headingAt(ctx: Ctx, flow: Flow | null, at: Coord): Dir | null {
  if (!flow) return null;
  const u = unitAt(ctx.s, at);
  return (
    (u ? flow.headings.get(`u:${u.id}`) : undefined) ??
    flow.headings.get(`t:${at.x},${at.y}`) ??
    null
  );
}

/**
 * Puts a plain mark on a unit (it spreads through a cloud it stands in; see `marks.ts`).
 */
export function markUnit(ctx: Ctx, unit: Unit, origin: Origin | null, flow?: Flow | null): void {
  const wax = flow?.solvent ? SOLVENT_RULES[flow.solvent]?.noSpread : false;
  applyMark(ctx, unit, {
    deep: false,
    bound: null,
    origin,
    ...(wax ? { wax: true as const } : {}),
  });
  noteMet(ctx, 'mark');
}

/** Living units within `dist` (Manhattan) of any of `tiles`, in reading order. */
export function unitsNear(ctx: Ctx, tiles: readonly Coord[], dist: number): Unit[] {
  return manyOf(livingUnits(ctx.s).filter((u) => tiles.some((t) => manhattan(t, u.pos) <= dist)));
}

const rowFor = (on: BurstRow['on']): BurstRow => {
  const r = BURSTS.find((b) => b.on === on);
  if (!r) throw new Error(`No burst row for ${on}`);
  return r;
};

function hit(ctx: Ctx, units: readonly Unit[], damage: number, source: string, from: Coord): void {
  for (const u of units) dealDamage(ctx, u, damage, source, [], { heading: null, at: from });
}

function announce(
  ctx: Ctx,
  burst: BurstId,
  at: Coord,
  tiles: Coord[],
  units: readonly Unit[],
): void {
  nameOnce(ctx, 'burst', burst);
  emit(ctx, {
    type: 'burst',
    burst,
    at: { ...at },
    tiles: tiles.map((c) => ({ ...c })),
    units: units.map((u) => ref(u)),
  });
}

const fireLayer = (origin: Origin | null, rounds: number = TUNING.fireRounds): Layer => ({
  id: 'fire',
  rounds,
  origin,
});

// ── The five bursts ─────────────────────────────────────

function detonate(ctx: Ctx, u: Unit): void {
  withLine(ctx, sparkLine('mark'), () => {
    const row = rowFor('mark');
    announce(ctx, 'detonation', u.pos, [u.pos], [u]);
    spendMark(ctx, u); // spent, never released (P31)
    hit(ctx, [u], row.damage, 'Detonation', u.pos);
  });
}

/** Fire: every connected oil tile catches, 2 to each unit on it, and the fire stays 2 rounds. */
function ignite(
  ctx: Ctx,
  at: Coord,
  flow: Flow | null,
  id: BurstId,
  row: BurstRow,
  source: string,
  marks = false,
): void {
  const s = ctx.s;
  const net = oilNet(s, at);
  const tiles = net.length ? net : [at];
  for (const c of tiles) tileAt(s, c).state = fireLayer(flow?.origin ?? null);
  const units = unitsNear(ctx, tiles, reachOf(flow));
  announce(ctx, id, at, tiles, units);
  burnGates(ctx);
  hit(ctx, units, row.damage, source, at);
  if (marks) {
    for (const u of units) if (u.hp > 0 && !u.mark) markUnit(ctx, u, flow?.origin ?? null);
  }
}

/**
 * Storm: 2 to every unit in the connected cloud. `twice` units (marked at the start) take it a
 * second time, as a separate hit.
 */
function storm(
  ctx: Ctx,
  at: Coord,
  flow: Flow | null,
  id: BurstId,
  damage: number,
  source: string,
  doubleMarked = false,
): Coord[] {
  const net = cloudNet(ctx.s, at);
  const tiles = net.length ? net : [at];
  const units = unitsNear(ctx, tiles, reachOf(flow));
  const marked = new Set(units.filter((u) => u.mark).map((u) => u.id));
  announce(ctx, id, at, tiles, units);
  for (const u of units) {
    const n = doubleMarked && marked.has(u.id) ? CHEMISTRY.markedStormHits : 1;
    for (let i = 0; i < n; i++) hit(ctx, [u], damage, source, at);
  }
  return tiles;
}

/** Conduct: 2 to every unit on or touching the connected brass (collared units are brass). */
function conduct(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const net = brassNet(ctx.s, at);
  const tiles = net.length ? net : [at];
  const units = unitsNear(ctx, tiles, 1 + reachOf(flow));
  announce(ctx, 'conduct', at, tiles, units);
  hit(ctx, units, rowFor('plate').damage, 'Conduct', at);
}

/** Surge: 3 to the unit on the tile, and one arc of 1 to the nearest other unit. */
function surge(ctx: Ctx, at: Coord): void {
  const row = rowFor('fire');
  const onTile = unitAt(ctx.s, at);
  const others = livingUnits(ctx.s).filter((u) => u.id !== onTile?.id);
  const nearest = manyOf(others).sort(
    (a, b) => manhattan(at, a.pos) - manhattan(at, b.pos) || byReadingOrder(a.pos, b.pos),
  )[0];
  announce(ctx, 'surge', at, [at], [...(onTile ? [onTile] : []), ...(nearest ? [nearest] : [])]);
  if (onTile) hit(ctx, [onTile], row.damage, 'Surge', at);
  if (nearest) hit(ctx, [nearest], CHEMISTRY.arcDamage, 'Arc', at);
}

// ── The burst page (P18) ────────────────────────────────

function pageDeepMark(ctx: Ctx, u: Unit): void {
  const mark = u.mark as Mark;
  announce(ctx, 'page:deepMark', u.pos, [u.pos], [u]);
  mark.deep = false; // leaves a plain mark
  emit(ctx, { type: 'marked', unit: ref(u), deep: false, bound: mark.bound?.action ?? null });
  hit(ctx, [u], rowFor('deepMark').damage, 'Deep mark', u.pos);
}

function pageShackle(ctx: Ctx, u: Unit, flow: Flow | null): void {
  announce(ctx, 'page:shackle', u.pos, [u.pos], [u]);
  u.shackle = 0;
  const from = { ...u.pos };
  hit(ctx, [u], rowFor('shackle').damage, 'Shackle', from);
  const heading = headingAt(ctx, flow, from);
  if (u.hp > 0 && heading) push(ctx, u, heading, CHEMISTRY.shackleThrow, flow?.origin ?? null);
}

function pageSkid(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const s = ctx.s;
  const heading = headingAt(ctx, flow, at);
  tileAt(s, at).state = null;
  if (!heading) {
    withLine(ctx, sparkLine('noHeading'), () => announce(ctx, 'page:skidPlate', at, [at], []));
    return;
  }
  const path: Coord[] = [];
  let victim: Unit | null = null;
  for (let c = step(at, heading); inBoard(s, c); c = step(c, heading)) {
    if (blocksUnits(tileAt(s, c))) break;
    path.push(c);
    victim = unitAt(s, c);
    if (victim) break;
  }
  announce(ctx, 'page:skidPlate', at, path, victim ? [victim] : []);
  if (!victim) return;
  hit(ctx, [victim], rowFor('skidPlate').damage, 'Skid plate', at);
  if (victim.hp > 0) push(ctx, victim, heading, 1, flow?.origin ?? null);
}

/** The direction from a tile out to a unit, along the larger axis (a tie goes vertical). */
function awayFrom(from: Coord, to: Coord): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

function pageWall(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const units = unitsNear(ctx, [at], 1 + reachOf(flow)).filter((u) => manhattan(at, u.pos) > 0);
  announce(ctx, 'page:wall', at, [at], units);
  hit(ctx, units, rowFor('wall').damage, 'Wall', at);
  for (const u of units) {
    if (u.hp > 0) push(ctx, u, awayFrom(at, u.pos), CHEMISTRY.wallPush, flow?.origin ?? null);
  }
}

function pageKettle(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const units = unitsNear(ctx, [at], 1 + reachOf(flow)).filter((u) => manhattan(at, u.pos) > 0);
  announce(ctx, 'page:kettle', at, [at], units);
  tileAt(ctx.s, at).state = {
    id: 'cloud',
    rounds: TUNING.cloudRounds,
    origin: flow?.origin ?? null,
  };
  hit(ctx, units, rowFor('kettle').damage, 'Kettle', at);
}

/** Flashover: a storm through the fog, then every fog tile in it burns for a round. */
function pageFog(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const s = ctx.s;
  const tiles = storm(ctx, at, flow, 'page:greaseFog', rowFor('greaseFog').damage, 'Flashover');
  for (const c of tiles) {
    if (tileAt(s, c).state?.id === 'greaseFog') {
      tileAt(s, c).state = fireLayer(flow?.origin ?? null, CHEMISTRY.flashoverFireRounds);
    }
  }
  burnGates(ctx);
}

/** Thunderhead: a storm now and, if the bank still stands, again at round end. */
function pageBank(ctx: Ctx, at: Coord, flow: Flow | null): void {
  storm(ctx, at, flow, 'page:bank', rowFor('bank').damage, 'Thunderhead');
  if (!flow) return;
  ctx.s.scheduled.push({
    when: 'roundEnd',
    owner: flow.caster,
    step: 'spark',
    target: { kind: 'tile', at: { ...at } },
    heading: null,
    origin: flow.origin,
    kind: 'thunderhead',
  });
  emit(ctx, { type: 'scheduled', kind: 'thunderhead', at: { ...at } });
}

/** Round end: each queued Thunderhead storms again if the bank's cloud is still there. */
export function runThunderheads(ctx: Ctx): void {
  const s = ctx.s;
  const due = s.scheduled.filter((e) => e.kind === 'thunderhead' && e.when === 'roundEnd');
  if (!due.length) return;
  s.scheduled = s.scheduled.filter((e) => !due.includes(e));
  for (const e of due) {
    if (e.target.kind !== 'tile' || !isCloud(tileAt(s, e.target.at))) continue;
    const at = e.target.at;
    withLine(ctx, sparkLine('bank'), () => {
      storm(ctx, at, null, 'page:bank', rowFor('bank').damage, 'Thunderhead');
    });
  }
}

// ── Entry points ────────────────────────────────────────

/** True if a burst happened. The unit layer is a mark, a shackle or a collar. */
function burstUnit(ctx: Ctx, at: Coord, flow: Flow | null): boolean {
  const u = unitAt(ctx.s, at);
  if (!u) return false;
  if (u.mark?.deep) {
    withLine(ctx, sparkLine('deepMark'), () => pageDeepMark(ctx, u));
  } else if (u.mark) {
    detonate(ctx, u);
  } else if (u.shackle > 0) {
    withLine(ctx, sparkLine('shackle'), () => pageShackle(ctx, u, flow));
  } else if (u.collar !== false) {
    withLine(ctx, sparkLine('collar'), () => conduct(ctx, at, flow));
  } else {
    return false;
  }
  return true;
}

/** True if a burst happened. The tile layer is the state or compound there. */
function burstTile(ctx: Ctx, at: Coord, flow: Flow | null): boolean {
  const layer = tileAt(ctx.s, at).state;
  if (!layer) return false;
  const run = (fn: () => void): true => {
    withLine(ctx, sparkLine(layer.id), fn);
    return true;
  };
  switch (layer.id) {
    case 'slick':
      return run(() => ignite(ctx, at, flow, 'fire', rowFor('slick'), 'Fire'));
    case 'cloud':
      return run(() => storm(ctx, at, flow, 'storm', rowFor('cloud').damage, 'Storm'));
    case 'plate':
      return run(() => conduct(ctx, at, flow));
    case 'fire':
      return run(() => surge(ctx, at));
    case 'stain':
      return run(() => ignite(ctx, at, flow, 'page:stain', rowFor('stain'), 'Inkfire', true));
    case 'pool':
      return run(() => ignite(ctx, at, flow, 'page:pool', rowFor('pool'), 'Pool fire'));
    case 'brandCloud':
      return run(() =>
        storm(ctx, at, flow, 'page:brandCloud', rowFor('brandCloud').damage, 'Brand storm', true),
      );
    case 'greaseFog':
      return run(() => pageFog(ctx, at, flow));
    case 'skidPlate':
      return run(() => pageSkid(ctx, at, flow));
    case 'bank':
      return run(() => pageBank(ctx, at, flow));
    case 'kettle':
      return run(() => pageKettle(ctx, at, flow));
    case 'wall':
      return run(() => pageWall(ctx, at, flow));
    default:
      return false; // a blot does nothing on its own (P13)
  }
}

/** Spark bursts what's on a layer of a tile; returns whether anything burst. */
export function burst(ctx: Ctx, at: Coord, layer: 'unit' | 'tile', flow: Flow | null): boolean {
  return layer === 'unit' ? burstUnit(ctx, at, flow) : burstTile(ctx, at, flow);
}

/** Spark bursts what's on a layer of a tile (E2, design §4.3). */
export function burstAt(ctx: Ctx, at: Coord, layer: 'unit' | 'tile', flow: Flow | null): void {
  burst(ctx, at, layer, flow);
}
