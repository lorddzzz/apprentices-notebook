import {
  BURSTS,
  type BurstId,
  type BurstRow,
  CHEMISTRY,
  type HarmKind,
  type LineId,
  type Meets,
  TUNING,
} from '$data';
import { type Ctx, emit, ref, reserve, withLine, withOrigin } from './ctx';
import { burnGates } from './current';
import { dealDamage } from './damage';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, type Dir, neighbors4, step } from './grid';
import { habitRule } from './habits';
import { applyMark, liftMark, spendMark } from './marks';
import { brassNet, cloudNet, oilNet } from './networks';
import { push } from './push';
import { blocksShots, inBoard, isCloud, livingUnits, tileAt, unitAt } from './queries';
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
  (flow?.auras.includes('coil')
    ? CHEMISTRY.coilReach + (flow.giftedAuras?.includes('coil') ? 1 : 0)
    : 0) + (flow?.solvent ? (SOLVENT_RULES[flow.solvent]?.reach ?? 0) : 0);

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

/** The first unmarked living unit beside `u`, in reading order (ink-mark-overflow, -pass). */
export function unmarkedBeside(ctx: Ctx, u: Unit): Unit | null {
  const beside = neighbors4(u.pos)
    .sort(byReadingOrder)
    .flatMap((c) => (inBoard(ctx.s, c) ? (unitAt(ctx.s, c) ?? []) : []));
  return beside.find((n) => n.hp > 0 && !n.mark) ?? null;
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

function hit(
  ctx: Ctx,
  units: readonly Unit[],
  damage: number,
  source: string,
  from: Coord,
  harm?: HarmKind,
): void {
  for (const u of units)
    dealDamage(ctx, u, damage, source, [], { heading: null, at: from, ...(harm ? { harm } : {}) });
}

/** Whether a unit's habit wards steam (AH P14): the steam bursts skip it. */
const wardsSteam = (u: Unit): boolean => habitRule(u).wards?.includes('steam') === true;

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

/** Footnote numbers for the Spark margin (seam.md; unbalanced on purpose). */
const KEEP_DAMAGE = 2;
const WIDE_DAMAGE = 1;
const FOCUS_DAMAGE = 3;
const SPARE_DAMAGE = 1;
const CHARGE_DAMAGE = 1;
const FLARE_DAMAGE = 1;

/** Detonation: 3 to the unit and its mark is spent. Footnotes: wide, keep, blast (`heading` is the spark's). */
function detonate(ctx: Ctx, u: Unit, heading: Dir | null = null): void {
  withLine(ctx, sparkLine('mark'), () => {
    const row = rowFor('mark');
    const from = { ...u.pos };
    const beside = hasFootnote(ctx, 'spark-mark-wide')
      ? manyOf(livingUnits(ctx.s).filter((n) => neighbors4(from).some((c) => sameTile(c, n.pos))))
      : [];
    announce(ctx, 'detonation', from, [from], [u, ...beside]);
    const keep = hasFootnote(ctx, 'spark-mark-keep');
    if (!keep) spendMark(ctx, u); // spent, never released (P31)
    hit(ctx, [u], keep ? KEEP_DAMAGE : row.damage, 'Detonation', from);
    hit(ctx, beside, WIDE_DAMAGE, 'Detonation', from);
    if (heading && u.hp > 0 && hasFootnote(ctx, 'spark-mark-blast')) {
      push(ctx, u, heading, 1, u.mark?.origin ?? null);
    }
  });
}

const sameTile = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

/** The other plain copies of `u`'s mark in its cloud (spark-mark-chain), in reading order. */
function markCopies(ctx: Ctx, u: Unit): Unit[] {
  const mark = u.mark;
  if (!mark) return [];
  const tiles = cloudNet(ctx.s, u.pos);
  return manyOf(
    livingUnits(ctx.s).filter(
      (o) =>
        o.id !== u.id &&
        o.mark?.lineage === mark.lineage &&
        !o.mark.deep &&
        tiles.some((c) => sameTile(c, o.pos)),
    ),
  );
}

/** After a conduct from a plate: the plate-layer brass holds a charge for the rest of the round. */
function chargeBrass(ctx: Ctx, tiles: readonly Coord[]): void {
  for (const c of tiles) {
    const layer = tileAt(ctx.s, c).state;
    if (layer?.id === 'plate') layer.charged = ctx.s.round;
  }
}

/**
 * spark-plate-charge: a unit entering a tile on or beside charged brass takes 1, once; the whole
 * network is then spent. Called by the arrival pipeline's `fire` slot.
 */
export function chargeTrip(ctx: Ctx, unit: Unit, at: Coord): void {
  const s = ctx.s;
  if (unit.hp <= 0 || (unit.kind === 'member' && hasFootnote(ctx, 'spark-plate-spare'))) return;
  const hot = [at, ...neighbors4(at)].find((c) => {
    const l = inBoard(s, c) ? tileAt(s, c).state : null;
    return l?.id === 'plate' && l.charged === s.round;
  });
  if (!hot) return;
  const origin = tileAt(s, hot).state?.origin ?? null;
  for (const c of brassNet(s, hot)) {
    const l = tileAt(s, c).state;
    if (l?.id === 'plate') delete l.charged;
  }
  withOrigin(ctx, origin, () =>
    withLine(ctx, sparkLine('plate'), () =>
      dealDamage(ctx, unit, CHARGE_DAMAGE, 'Charge', [], { heading: null, at: { ...hot } }),
    ),
  );
}

/** What a burned-out fire leaves (spark-slick-smoke, -soot); null leaves the tile bare. */
export function fireLeaves(ctx: Ctx, layer: Layer): Layer | null {
  if (hasFootnote(ctx, 'spark-slick-smoke')) {
    return { id: 'cloud', rounds: TUNING.cloudRounds, origin: layer.origin };
  }
  if (hasFootnote(ctx, 'spark-slick-soot')) return { id: 'blot', rounds: 0, origin: layer.origin };
  return null;
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
  // `ink-stain-wick`: a stain in the run burns as Inkfire.
  const wick = id !== 'page:stain' && hasFootnote(ctx, 'ink-stain-wick');
  const stains = wick ? tiles.filter((c) => tileAt(s, c).state?.id === 'stain') : [];
  const rounds = id === 'fire' && hasFootnote(ctx, 'spark-slick-long') ? 3 : TUNING.fireRounds;
  reserve(ctx, 2); // `named` (first time) and `burst`
  for (const c of tiles) tileAt(s, c).state = fireLayer(flow?.origin ?? null, rounds);
  const inked = stains.length ? unitsNear(ctx, stains, reachOf(flow)) : [];
  const units = unitsNear(ctx, tiles, reachOf(flow)).filter((u) => !inked.includes(u));
  announce(ctx, id, at, tiles, units);
  if (inked.length) {
    withLine(ctx, 'ink:stain', () => {
      announce(ctx, 'page:stain', at, stains, inked);
      hit(ctx, inked, rowFor('stain').damage, 'Inkfire', at);
      for (const u of inked) if (u.hp > 0 && !u.mark) markUnit(ctx, u, flow?.origin ?? null);
    });
  }
  burnGates(ctx);
  hit(
    ctx,
    units,
    id === 'fire' && hasFootnote(ctx, 'spark-slick-hot') ? 3 : row.damage,
    source,
    at,
  );
  if (marks) {
    for (const u of units) if (u.hp > 0 && !u.mark) markUnit(ctx, u, flow?.origin ?? null);
  }
}

interface StormOpts {
  /** Marked units (at the start) take it a second time, as a separate hit (Brand storm). */
  doubleMarked?: boolean;
  /** Steam by default (AH P14); Flashover's burst is fire (null). */
  harm?: HarmKind | null;
  /** The line a hit on a steam-warded unit carries when this storm is not steam (fine print). */
  throughWard?: LineId;
}

/** Storm: 2 to every unit in the connected cloud, tagged as steam unless `opts` says otherwise. */
function storm(
  ctx: Ctx,
  at: Coord,
  flow: Flow | null,
  id: BurstId,
  damage: number,
  source: string,
  opts: StormOpts = {},
): Coord[] {
  const { doubleMarked = false, throughWard } = opts;
  const harm = opts.harm === undefined ? 'steam' : (opts.harm ?? undefined);
  const net = cloudNet(ctx.s, at);
  const tiles = net.length ? net : [at];
  const units = unitsNear(ctx, tiles, reachOf(flow));
  const marked = new Set(units.filter((u) => u.mark).map((u) => u.id));
  announce(ctx, id, at, tiles, units);
  for (const u of units) {
    const n = doubleMarked && marked.has(u.id) ? CHEMISTRY.markedStormHits : 1;
    const once = () => hit(ctx, [u], damage, source, at, harm);
    for (let i = 0; i < n; i++)
      throughWard && wardsSteam(u) ? withLine(ctx, throughWard, once) : once();
  }
  return tiles;
}

/** Conduct: 2 to every unit on or touching the connected brass (collared units are brass). */
function conduct(ctx: Ctx, at: Coord, flow: Flow | null, fromPlate = false): void {
  const net = brassNet(ctx.s, at);
  const tiles = net.length ? net : [at];
  // The spark:plate footnotes bend only a conduct that started on a plate, not a collar's.
  const focus = fromPlate && hasFootnote(ctx, 'spark-plate-focus');
  const spare = fromPlate && hasFootnote(ctx, 'spark-plate-spare');
  const reach = reachOf(flow);
  let units = unitsNear(ctx, tiles, focus ? reach : 1 + reach);
  if (spare) units = units.filter((u) => u.kind !== 'member');
  announce(ctx, 'conduct', at, tiles, units);
  const damage = focus ? FOCUS_DAMAGE : spare ? SPARE_DAMAGE : rowFor('plate').damage;
  hit(ctx, units, damage, 'Conduct', at);
  if (!fromPlate) return;
  const heading = headingAt(ctx, flow, at);
  if (heading && hasFootnote(ctx, 'spark-plate-jolt')) {
    for (const u of units) if (u.hp > 0) push(ctx, u, heading, 1, flow?.origin ?? null);
  }
  if (hasFootnote(ctx, 'spark-plate-charge')) chargeBrass(ctx, tiles);
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
  // The ink margin: the plain mark left over jumps (pass), or each unit beside takes 1 (flare).
  const pass = hasFootnote(ctx, 'ink-mark-pass') ? unmarkedBeside(ctx, u) : null;
  if (pass && u.hp > 0) liftMark(ctx, u, pass, 'ink:mark');
  if (hasFootnote(ctx, 'ink-mark-flare')) {
    const from = { ...u.pos };
    const beside = manyOf(
      livingUnits(ctx.s).filter((n) => neighbors4(from).some((c) => sameTile(c, n.pos))),
    );
    withLine(ctx, 'ink:mark', () => hit(ctx, beside, FLARE_DAMAGE, 'Flare', from));
  }
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
    if (blocksShots(tileAt(s, c))) break;
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
  hit(ctx, units, rowFor('kettle').damage, 'Kettle', at, 'steam');
}

/** Flashover: a storm through the fog, then every fog tile in it burns for a round. */
function pageFog(ctx: Ctx, at: Coord, flow: Flow | null): void {
  const s = ctx.s;
  const tiles = storm(ctx, at, flow, 'page:greaseFog', rowFor('greaseFog').damage, 'Flashover', {
    harm: null,
    throughWard: 'steamproof:greaseFog',
  });
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
    const heading = headingAt(ctx, flow, at);
    const copies = hasFootnote(ctx, 'spark-mark-chain') ? markCopies(ctx, u) : [];
    detonate(ctx, u, heading);
    for (const c of copies) if (c.mark && c.hp > 0) detonate(ctx, c, heading);
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
      return run(() => conduct(ctx, at, flow, true));
    case 'fire':
      return run(() => surge(ctx, at));
    case 'stain':
      return run(() => ignite(ctx, at, flow, 'page:stain', rowFor('stain'), 'Inkfire', true));
    case 'pool':
      return run(() => ignite(ctx, at, flow, 'page:pool', rowFor('pool'), 'Pool fire'));
    case 'brandCloud':
      return run(() =>
        storm(ctx, at, flow, 'page:brandCloud', rowFor('brandCloud').damage, 'Brand storm', {
          doubleMarked: true,
        }),
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
