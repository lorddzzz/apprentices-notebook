import {
  ACTIONS,
  type ActionRuneId,
  type CompoundId,
  type HabitId,
  type KindId,
  type LineId,
  RUNES,
  type StateId,
  TUNING,
} from '$data';
import { hasTrait, objectArrives, relocateAll } from '../arrival';
import { markUnit, unmarkedBeside } from '../bursts';
import { cloneData } from '../clone';
import {
  type Ctx,
  emit,
  type FootnoteVariantId,
  ref,
  withHabit,
  withLine,
  withOrigin,
} from '../ctx';
import { dealDamage, gainShield } from '../damage';
import { crackedTiles } from '../districts/api';
import { hasFootnote } from '../footnotes';
import {
  byReadingOrder,
  type Coord,
  DIRS,
  type Dir,
  neighbors4,
  opposite,
  sameCoord,
  step,
  turnLeft,
  turnRight,
} from '../grid';
import { ruleOf, sameSide } from '../habits';
import { guardCancels } from '../harm';
import { sealJar } from '../jars';
import { jarLimit } from '../leans';
import { releaseSpent, spendMark } from '../marks';
import { landOnTile } from '../mix';
import { type PushResult, push, wearPlate } from '../push';
import { findUnit, inBoard, isPlate, tileAt, unitAt, unitById } from '../queries';
import type { Handler } from '../resolve';
import { trickResists } from '../rivals/tricks';
import { SOLVENT_RULES } from '../solvents';
import { splashSpares } from '../targets';
import {
  type ErasedPart,
  type ErasedRecord,
  type Flow,
  type Layer,
  type Target,
  type Tile,
  targetKey,
  type Unit,
  type UnitId,
} from '../types';

// Numbers the design fixes (§5.2) that have no TUNING key yet: Sentence's push, Hold's duration,
// Levy's shield per mark. Move them into TUNING when types.ts gains the keys.

/** A unit target's unit; a tile target's unit only if someone now stands there. */
function unitOf(ctx: Ctx, t: Target): Unit | null {
  if (t.kind === 'tile') return unitAt(ctx.s, t.at);
  const u = ctx.s.units.find((x) => x.id === t.unit);
  return u && u.hp > 0 ? u : null;
}

/** Where a target is now (R7). */
function posOf(ctx: Ctx, t: Target): Coord | null {
  if (t.kind === 'tile') return t.at;
  return unitOf(ctx, t)?.pos ?? null;
}

const headingOf = (flow: Flow, t: Target): Dir | null => flow.headings.get(targetKey(t)) ?? null;

/** Extra tiles a push-gifted caster or a Mortar-like solvent adds (§9, §6.3); Fog jar's reach takes some off. */
function pushBonus(rune: ActionRuneId, flow: Flow): number {
  const gift = flow.gifted && RUNES[rune].gift === 'push' ? 1 : 0;
  const solvent = flow.solvent ? (SOLVENT_RULES[flow.solvent]?.pushBonus ?? 0) : 0;
  return gift + solvent - (flow.weaker ?? 0);
}

/** Mortar's longer pushes carry its line, so the log shows where the extra tile came from. */
const solventLine = (flow: Flow): LineId | null =>
  flow.solvent && SOLVENT_RULES[flow.solvent]?.pushBonus ? `${flow.solvent}:unit` : null;

/** The tiles of a push that are the solvent's own (Mortar), after Fog jar's reach takes some off. */
const mortarTiles = (flow: Flow): number =>
  Math.max(
    0,
    (flow.solvent ? (SOLVENT_RULES[flow.solvent]?.pushBonus ?? 0) : 0) - (flow.weaker ?? 0),
  );

const roundBonus = (rune: ActionRuneId, flow: Flow): number =>
  flow.gifted && RUNES[rune].gift === 'round' ? 1 : 0;

/** Runs `fn` inside `line` when there is one. */
const maybeLine = (ctx: Ctx, line: LineId | null, fn: () => void): void => {
  if (line) withLine(ctx, line, fn);
  else fn();
};

function miss(ctx: Ctx, rune: ActionRuneId, line: LineId): void {
  withLine(ctx, line, () => emit(ctx, { type: 'miss', source: RUNES[rune].name }));
}

const strike: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) {
    // `strike-cap-crack`: a Strike on a plate, wall, kettle or skid plate breaks it.
    const at = t.kind === 'tile' ? t.at : null;
    if (
      at &&
      inBoard(ctx.s, at) &&
      isPlate(tileAt(ctx.s, at)) &&
      hasFootnote(ctx, 'strike-cap-crack')
    ) {
      wearPlate(ctx, at, 99);
    }
    return;
  }
  const caster = unitById(ctx.s, flow.caster);
  const damage = TUNING.strikeDamage - (flow.weaker ?? 0);
  if (damage <= 0) return;
  if (splashSpares(ctx, flow, caster, u)) return; // `splash-member-friendly`
  const shielded = u.shield > 0;
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  const heading = headingOf(flow, t);
  maybeLine(ctx, shielded ? 'strike:shielded' : null, () => {
    dealDamage(ctx, u, damage, RUNES.strike.name, [], {
      heading,
      at: { ...caster.pos },
      ...(shielded && fn('strike-shielded-break')
        ? { shield: 'break' as const }
        : shielded && fn('strike-shielded-pierce')
          ? { shield: 'pierce' as const }
          : {}),
    });
    if (!shielded) return;
    // `strike-shielded-glance`: the nearest other unit beside the target takes 1.
    if (fn('strike-shielded-glance')) {
      const near = neighbors4(u.pos)
        .sort(byReadingOrder)
        .flatMap((at) => unitAt(ctx.s, at) ?? [])
        .find((v) => v.hp > 0 && v.id !== u.id && v.id !== caster.id);
      if (near) {
        dealDamage(ctx, near, 1, RUNES.strike.name, [], { heading, at: { ...u.pos } });
      }
    }
    // `strike-shielded-knock`: the shielded unit is knocked one tile along the heading.
    if (fn('strike-shielded-knock') && heading && u.hp > 0) push(ctx, u, heading, 1, flow.origin);
  });
};

const shove: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  const heading = headingOf(flow, t);
  if (!heading) return miss(ctx, 'shove', 'shove:noHeading');
  let tiles = TUNING.shoveTiles + pushBonus('shove', flow);
  const caster = unitById(ctx.s, flow.caster);
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  const touch = flow.src === 'touch';
  const selfTouch = touch && u.id === caster.id;
  const unitTouch = touch && u.id !== caster.id;
  // `touch-member-runup`: a tile for each one walked in a straight line, up to 3.
  if (selfTouch && fn('touch-member-runup')) tiles = Math.max(tiles, Math.min(3, caster.run ?? 0));
  // `touch-member-tow`: the unit right behind you is pulled along one tile.
  const behind =
    selfTouch && fn('touch-member-tow') ? unitAt(ctx.s, step(u.pos, opposite(heading))) : null;
  const opts = {
    ...(flow.area?.includes(u.id) ? { area: flow.area } : {}),
    ...(selfTouch && fn('touch-member-ram') ? { ram: true as const } : {}),
    ...(flow.src === 'vat' ? { vat: true as const } : {}),
    ...(solventLine(flow) ? { bonus: mortarTiles(flow) } : {}),
  };
  maybeLine(ctx, solventLine(flow), () => {
    const r = push(ctx, u, heading, Math.max(0, tiles), flow.origin, opts);
    if (behind && behind.hp > 0 && r.moved > 0) {
      push(ctx, behind, heading, 1, flow.origin, { crush: false, as: 'pull' });
    }
    if (unitTouch && r.moved > 0 && caster.hp > 0) {
      // `touch-unit-follow`: you step after it; `touch-unit-recoil`: you are pushed the other way.
      if (fn('touch-unit-follow')) push(ctx, caster, heading, 1, flow.origin, { crush: false });
      else if (fn('touch-unit-recoil')) push(ctx, caster, opposite(heading), 1, flow.origin);
    }
  });
};

const guard: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  // Until the start of the next player phase; a round-gifted caster adds one more round.
  const until = ctx.s.round + 1 + roundBonus('guard', flow);
  const again = u.shield > 0;
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  // `guard-cap-share`: Guarding someone else shields you for 1 too.
  const caster = findUnit(ctx.s, flow.caster);
  if (caster && caster.id !== u.id && fn('guard-cap-share')) gainShield(ctx, caster, 1, until);
  maybeLine(ctx, again ? 'guard:shielded' : null, () => {
    if (!again) return gainShield(ctx, u, TUNING.guardShield, until);
    if (fn('guard-shielded-long')) gainShield(ctx, u, 0, until, true);
    else gainShield(ctx, u, fn('guard-shielded-thick') ? 3 : TUNING.guardShield, until);
    if (fn('guard-shielded-thorns') && u.hp > 0) u.thorns = true;
    // `guard-shielded-spill`: the nearest unshielded ally beside it is shielded for 1.
    if (fn('guard-shielded-spill')) {
      const near = neighbors4(u.pos)
        .sort(byReadingOrder)
        .flatMap((at) => unitAt(ctx.s, at) ?? [])
        .find((v) => v.hp > 0 && v.shield === 0 && sameSide(u, v));
      if (near) gainShield(ctx, near, 1, until);
    }
  });
};

/**
 * Holds a unit. `viaHold`: the Hold rune's own target (`hold-held-extend` lengthens only that).
 * `holds` and `holdFreeUntil` are written only while `hold-held-exposed` or `hold-held-shake` is
 * written, so units are unchanged without them (bridges plan P22).
 */
export function holdUnit(ctx: Ctx, u: Unit, rounds: number, viaHold = false): void {
  if (trickResists(ctx, u, 'hold')) return; // RV-11 `resists`
  if (guardCancels(ctx, u, { kind: 'hold', unit: u.id, harm: null }, 'Hold')) return; // BH P8
  // `hold-held-shake`: a unit freed by the shake cannot be held again for a round.
  if (u.holdFreeUntil !== undefined && ctx.s.round <= u.holdFreeUntil) {
    withLine(ctx, 'hold:held', () => emit(ctx, { type: 'miss', source: 'Hold' }));
    return;
  }
  const shake = hasFootnote(ctx, 'hold-held-shake');
  if (shake || hasFootnote(ctx, 'hold-held-exposed')) {
    u.holds = u.held > 0 ? (u.holds ?? 1) + 1 : 1;
  }
  if (viaHold && u.held > 0 && hasFootnote(ctx, 'hold-held-extend')) {
    u.held = Math.min(u.held + 1, rounds + 2); // at most 2 extra in all
  } else {
    u.held = Math.max(u.held, rounds);
  }
  // The Hold that makes it held twice frees it at your next turn (it wins over `hold-held-extend`).
  if (shake && u.holds === 2) {
    u.held = 1;
    u.holdFreeUntil = ctx.s.round + 1; // the round it is freed in
  }
  emit(ctx, { type: 'held', unit: ref(u), rounds: u.held });
}

/** Units each cast has held so far in this draft (holdTwo skips them, AH P15). */
const heldByCast = new WeakMap<Ctx, Map<string, Set<UnitId>>>();
function heldThisCast(ctx: Ctx, flow: Flow): Set<UnitId> {
  const byCast = heldByCast.get(ctx) ?? new Map<string, Set<UnitId>>();
  heldByCast.set(ctx, byCast);
  const key = `${flow.origin.caster}:${flow.origin.cast}`;
  const held = byCast.get(key) ?? new Set<UnitId>();
  byCast.set(key, held);
  return held;
}

/** Who this step holds anyway: its unit targets and whoever stands on its tile targets. */
function stepTargets(ctx: Ctx, flow: Flow): UnitId[] {
  const out: UnitId[] = [];
  for (const k of flow.headings.keys()) {
    if (k.startsWith('u:')) out.push(k.slice(2));
    else {
      const [x = -1, y = -1] = k.slice(2).split(',').map(Number);
      const u = unitAt(ctx.s, { x, y });
      if (u) out.push(u.id);
    }
  }
  return out;
}

/** holdTwo's scan (AH P15): ahead, left, right, behind; no heading: up, right, down, left. */
const scanOrder = (h: Dir | null): readonly Dir[] =>
  h ? [h, turnLeft(h), turnRight(h), opposite(h)] : DIRS;

const hold: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  const rounds = ACTIONS.holdRounds + roundBonus('hold', flow);
  // A hold on a cracked span tile pins the unit there for the dusk fall (BR-17).
  const cracked = crackedTiles(ctx.s).some((c) => sameCoord(c, u.pos));
  const line: LineId | null = u.held > 0 ? 'hold:held' : cracked ? 'hold:cracked' : null;
  // `hold-held-pass`: the second Hold goes to the first unheld unit beside it, yours included, so
  // the first unit is not held twice.
  const passTo =
    u.held > 0 && hasFootnote(ctx, 'hold-held-pass')
      ? neighbors4(u.pos)
          .sort(byReadingOrder)
          .flatMap((at) => (inBoard(ctx.s, at) ? (unitAt(ctx.s, at) ?? []) : []))
          .find((v) => v.hp > 0 && v.held === 0)
      : undefined;
  maybeLine(ctx, line, () => holdUnit(ctx, passTo ?? u, rounds, !passTo));
  // `hold-cracked-knot`: the units beside the target on the same cracked span are held too.
  if (cracked && hasFootnote(ctx, 'hold-cracked-knot')) {
    const span = crackedTiles(ctx.s);
    for (const at of neighbors4(u.pos).sort(byReadingOrder)) {
      const v = inBoard(ctx.s, at) ? unitAt(ctx.s, at) : null;
      if (v && v.hp > 0 && span.some((c) => sameCoord(c, at)))
        withLine(ctx, 'hold:cracked', () => holdUnit(ctx, v, rounds));
    }
  }
  const habit = flow.habit;
  const extra = ruleOf(habit).holdExtra ?? 0;
  if (!habit || extra <= 0) return;
  const held = heldThisCast(ctx, flow);
  held.add(u.id);
  const skip = new Set([...held, ...stepTargets(ctx, flow), flow.caster]);
  const caster = findUnit(ctx.s, flow.caster);
  const order = scanOrder(headingOf(flow, t));
  for (let i = 0; i < extra; i++) {
    const next = order
      .map((d) => unitAt(ctx.s, step(u.pos, d)))
      .find((x): x is Unit => x !== null && !skip.has(x.id));
    if (!next) return;
    skip.add(next.id);
    held.add(next.id);
    const ally = caster !== null && sameSide(caster, next);
    withHabit(ctx, habit, () =>
      maybeLine(ctx, ally ? 'holdTwo:member' : null, () => holdUnit(ctx, next, rounds)),
    );
  }
};

const swap: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  const caster = unitById(ctx.s, flow.caster);
  if (!u || u.id === caster.id || caster.hp <= 0) return;
  const blocked = [caster, u].find((x) => x.held > 0);
  if (blocked) {
    withLine(ctx, 'swap:held', () =>
      emit(ctx, { type: 'held', unit: ref(blocked), rounds: blocked.held }),
    );
    return;
  }
  // An anchored unit never moves (P5, party §1); the Swap rune still trades places with fliers.
  if (hasTrait(u, 'anchored') || hasTrait(caster, 'anchored')) {
    emit(ctx, { type: 'miss', source: RUNES.swap.name });
    return;
  }
  if (guardCancels(ctx, u, { kind: 'swap', unit: u.id, harm: null }, RUNES.swap.name)) return;
  const a = { ...caster.pos };
  const b = { ...u.pos };
  emit(ctx, {
    type: 'swapped',
    unit: ref(caster),
    with: ref(u),
    from: a,
    to: b,
    path: [{ ...b }],
    cause: 'swap',
  });
  // Both are lifted and set down, then arrive: the caster first, then the target (P4).
  relocateAll(
    ctx,
    [
      { unit: caster.id, from: a, to: b, path: [b] },
      { unit: u.id, from: b, to: a, path: [a] },
    ],
    'swap',
    flow.origin,
  );
};

const spaced = (id: string): string => id.replace(/([A-Z])/g, ' $1').toLowerCase();

/** What one hop of Draw moved (null: nothing). */
interface Hop {
  state: Layer['id'] | null;
  jar: boolean;
}

/** One hop of Draw: the tile's state and jar go to `to` if it will take them. */
function drawHop(ctx: Ctx, from: Coord, to: Coord): Hop | null {
  const s = ctx.s;
  const src = tileAt(s, from);
  const dst = tileAt(s, to);
  const moved: Hop = { state: null, jar: false };
  if (src.state && dst.state === null) {
    const standing = isPlate(src) && unitAt(s, to);
    if (standing) {
      withLine(ctx, 'draw:unit', () => emit(ctx, { type: 'miss', source: RUNES.draw.name }));
    } else if (!dst.terrain.gate && !dst.terrain.grate) {
      emit(ctx, { type: 'drawn', from: { ...from }, to: { ...to }, what: spaced(src.state.id) });
      dst.state = src.state;
      src.state = null;
      moved.state = dst.state.id;
    }
  }
  if (src.jar && dst.jar === null) {
    withLine(ctx, 'draw:jar', () =>
      emit(ctx, { type: 'drawn', from: { ...from }, to: { ...to }, what: 'jar' }),
    );
    dst.jar = src.jar;
    src.jar = null;
    moved.jar = true;
  }
  return moved.state || moved.jar ? moved : null;
}

const draw: Handler = (ctx, t, flow) => {
  let at = posOf(ctx, t);
  if (!at) return;
  const heading = headingOf(flow, t);
  const here = tileAt(ctx.s, at);
  if (!here.state && !here.jar) return;
  if (!heading) return miss(ctx, 'draw', 'draw:noHeading');
  // Where the drawn state and jar came to rest: they arrive there once, after the hops (P2, P6).
  let state: { id: Layer['id']; at: Coord } | null = null;
  let jarAt: Coord | null = null;
  for (let i = 0; i < Math.max(0, 1 + pushBonus('draw', flow)); i++) {
    const next = step(at, heading);
    if (!inBoard(ctx.s, next)) {
      miss(ctx, 'draw', 'draw:edge');
      break;
    }
    const hop = drawHop(ctx, at, next);
    if (!hop) break;
    if (hop.state) state = { id: hop.state, at: next };
    if (hop.jar) jarAt = next;
    at = next;
  }
  const opts = { cause: 'draw', origin: flow.origin } as const;
  if (state) objectArrives(ctx, { kind: 'state', state: state.id }, state.at, opts);
  if (jarAt && tileAt(ctx.s, jarAt).jar) objectArrives(ctx, { kind: 'jar' }, jarAt, opts);
};

/** Whether an Erase would take anything from this tile and unit. */
const holdsAny = (tile: Tile, u: Unit | null): boolean =>
  !!tile.state ||
  !!tile.jar ||
  !!u?.mark ||
  (!!u && u.collar !== false && u.collar !== null) ||
  (!!u && u.shackle > 0);

/** The step that wrote the record, so one Erase's targets add up to one record (AH P18). */
const recordWriter = new WeakMap<ErasedRecord, Flow>();

function remember(ctx: Ctx, t: Target, parts: readonly ErasedPart[], flow: Flow): void {
  const cur = ctx.s.erased ?? null;
  const k = targetKey(t);
  const kept = cur && recordWriter.get(cur) === flow ? cur.entries : [];
  const next: ErasedRecord = {
    by: flow.caster,
    cast: ctx.s.castSeq,
    entries: [...kept.filter((e) => targetKey(e.target) !== k), { target: t, parts }],
  };
  recordWriter.set(next, flow);
  ctx.s.erased = next;
}

const PLAIN_KIND: Record<StateId, KindId> = {
  blot: 'ink',
  slick: 'oil',
  cloud: 'steam',
  plate: 'brass',
  fire: 'oil',
};
const isPlainState = (id: StateId | CompoundId): id is StateId => id in PLAIN_KIND;

/** A restored state logs the event a fresh landing of it would, so playback draws it. */
function landAgain(ctx: Ctx, at: Coord, layer: Layer): void {
  const id = layer.id;
  if (isPlainState(id))
    emit(ctx, { type: 'landed', kind: PLAIN_KIND[id], at: { ...at }, makes: id });
  else emit(ctx, { type: 'mixed', at: { ...at }, compound: id });
}

/** Puts one recorded part back (AH P18); what cannot come back stays gone. */
function restorePart(ctx: Ctx, part: ErasedPart, u: Unit | null): void {
  const s = ctx.s;
  if (part.kind === 'state') {
    const tile = tileAt(s, part.at);
    if (tile.state) return;
    // A plate cannot share a tile with a unit (as Draw, `draw:unit`).
    if (isPlate({ ...tile, state: part.layer }) && unitAt(s, part.at)) {
      miss(ctx, 'erase', 'restoreErase:unit');
      return;
    }
    tile.state = cloneData(part.layer);
    withOrigin(ctx, part.layer.origin, () => landAgain(ctx, part.at, part.layer));
    return;
  }
  if (part.kind === 'jar') {
    const owner = findUnit(s, part.jar.owner);
    if (!owner || tileAt(s, part.at).jar) return;
    const mine = s.tiles.filter((x) => x.jar?.owner === owner.id).length;
    // Through sealJar: it counts as its owner's newest (J4), so an older one may crumble.
    maybeLine(ctx, mine >= jarLimit(owner) ? 'restoreErase:jar' : null, () =>
      withOrigin(ctx, part.jar.origin, () => sealJar(ctx, part.at, part.jar)),
    );
    return;
  }
  // A unit's part returns only to the unit that bore it, standing on the target.
  if (!u || u.id !== part.unit) {
    if (part.kind === 'mark') miss(ctx, 'erase', 'restoreErase:mark');
    return;
  }
  if (part.kind === 'shackle') {
    u.shackle = part.rounds;
    emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'shackle' });
  } else if (part.kind === 'collar') {
    const collar = part.collar;
    u.collar = collar;
    if (collar) withOrigin(ctx, collar, () => emit(ctx, { type: 'collared', unit: ref(u) }));
    // A born collar (null origin) comes back as born: `landed` leaves the view's `born` alone.
    else
      emit(ctx, { type: 'landed', kind: 'brass', at: { ...u.pos }, unit: ref(u), makes: 'collar' });
  } else {
    const mark = cloneData(part.mark);
    u.mark = mark;
    withOrigin(ctx, mark.origin, () =>
      emit(ctx, {
        type: 'marked',
        unit: ref(u),
        deep: mark.deep,
        bound: mark.bound?.action ?? null,
      }),
    );
  }
}

/** Tile parts first, then the unit's: a shackle before the collar and mark it would clear. */
const RESTORE_ORDER: Record<ErasedPart['kind'], number> = {
  state: 0,
  jar: 1,
  shackle: 2,
  collar: 3,
  mark: 4,
};

/** restoreErase (AH P18): the record's entry for this target comes back and is used up. */
function restore(ctx: Ctx, t: Target, u: Unit | null, habit: HabitId): void {
  const rec = ctx.s.erased;
  const k = targetKey(t);
  const entry = rec?.entries.find((e) => targetKey(e.target) === k);
  if (!rec || !entry) return;
  const rest = rec.entries.filter((e) => e !== entry);
  ctx.s.erased = rest.length ? { ...rec, entries: rest } : null;
  const parts = [...entry.parts].sort((a, b) => RESTORE_ORDER[a.kind] - RESTORE_ORDER[b.kind]);
  withHabit(ctx, habit, () => {
    for (const p of parts) restorePart(ctx, p, u);
  });
}

const erase: Handler = (ctx, t, flow) => {
  const at = posOf(ctx, t);
  if (!at) return;
  const tile = tileAt(ctx.s, at);
  const u = unitOf(ctx, t);
  if (flow.habit && ruleOf(flow.habit).eraseRestores && !holdsAny(tile, u)) {
    return restore(ctx, t, u, flow.habit);
  }
  const parts: ErasedPart[] = [];
  const gone = (what: string, line: LineId | null): void =>
    maybeLine(ctx, line, () => emit(ctx, { type: 'erased', at: { ...at }, what }));
  if (u?.mark) {
    const deep = u.mark.deep;
    const mark = spendMark(ctx, u); // spent, never released (P31)
    if (mark) parts.push({ kind: 'mark', unit: u.id, mark: cloneData(mark) });
    gone(deep ? 'deep mark' : 'mark', deep ? 'erase:deepMark' : 'erase:mark');
  }
  if (u && u.collar !== false && u.collar !== null) {
    parts.push({ kind: 'collar', unit: u.id, collar: u.collar });
    u.collar = false;
    gone('collar', 'erase:collar');
  }
  if (u && u.shackle > 0) {
    parts.push({ kind: 'shackle', unit: u.id, rounds: u.shackle });
    u.shackle = 0;
    gone('shackle', 'erase:shackle');
  }
  if (tile.state) {
    const what = spaced(tile.state.id);
    parts.push({ kind: 'state', at: { ...at }, layer: cloneData(tile.state) });
    tile.state = null;
    gone(what, null);
  }
  if (tile.jar) {
    parts.push({ kind: 'jar', at: { ...at }, jar: cloneData(tile.jar) });
    tile.jar = null;
    gone('jar', 'erase:jar');
  }
  if (parts.length) remember(ctx, t, parts, flow);
};

/** A removable collar (not the born-brass kind): what `sentence-unit-collar` strikes off. */
const removableCollar = (u: Unit): boolean => u.collar !== false && u.collar !== null;

/** `sentence-unit-collar` / `-shield`: a bare unit with a cover that counts as marked. */
function coverCounts(ctx: Ctx, u: Unit): boolean {
  return (
    (hasFootnote(ctx, 'sentence-unit-collar') && removableCollar(u)) ||
    (hasFootnote(ctx, 'sentence-unit-shield') && u.shield > 0)
  );
}

/** The cover Sentence strikes off a bare unit (`sentence-unit-collar`, `-shield`): the collar first. */
function strikeCover(ctx: Ctx, u: Unit): void {
  if (removableCollar(u) && hasFootnote(ctx, 'sentence-unit-collar')) {
    emit(ctx, { type: 'erased', at: { ...u.pos }, what: 'collar' });
    u.collar = false;
  } else if (u.shield > 0 && hasFootnote(ctx, 'sentence-unit-shield')) {
    emit(ctx, { type: 'shieldAbsorbs', unit: ref(u), absorbed: u.shield, left: 0 });
    u.shield = 0;
    delete u.thorns;
  }
}

/** `postmaster:sentence`: a unit the push crushed against a wall or the room's edge (`shove:wall`, `shove:edge`). */
function crushedAgainstWall(ctx: Ctx, at: Coord, dir: Dir, r: PushResult): boolean {
  if (r.crushed === null) return false;
  const ahead = step(at, dir);
  if (!inBoard(ctx.s, ahead)) return r.crushed === 'wall';
  return r.crushed === 'plate' && tileAt(ctx.s, ahead).state?.id === 'wall';
}

/** Levy's spends this cast, counted from the first (`levy-cap-bank` pays once, at the third). */
const levyCounts = new WeakMap<Ctx, Map<string, number>>();
function marksThisCast(ctx: Ctx, flow: Flow): number {
  const byCast = levyCounts.get(ctx) ?? new Map<string, number>();
  levyCounts.set(ctx, byCast);
  const key = `${flow.origin.caster}:${flow.origin.cast}`;
  const n = (byCast.get(key) ?? 0) + 1;
  byCast.set(key, n);
  return n;
}

/** The heading one tile from `from` toward `to`, along the longer axis (a tie reads horizontal). */
function towardHeading(from: Coord, to: Coord): Dir | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

const sentence: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  // A bare unit: no mark, and no collar or shield that counts as one (`sentence-unit-*`).
  const bare = !u.mark && !coverCounts(ctx, u);
  if (bare && fn('sentence-unit-serve')) {
    // `sentence-unit-serve`: the bare unit is marked plain instead of pushed.
    withLine(ctx, 'sentence:unit', () => markUnit(ctx, u, flow.origin));
    return;
  }
  if (bare && !fn('sentence-unit-nudge')) return miss(ctx, 'sentence', 'sentence:unit');
  const heading = headingOf(flow, t);
  if (!heading) return miss(ctx, 'sentence', 'sentence:noHeading');
  if (bare) {
    // `sentence-unit-nudge`: a bare unit is pushed one tile and spends nothing.
    withLine(ctx, 'sentence:unit', () => push(ctx, u, heading, 1, flow.origin));
    return;
  }
  if (!u.mark) withLine(ctx, 'sentence:unit', () => strikeCover(ctx, u)); // counts as marked: the full push
  // Spent whole before the push, never released by a hit (P31), unless a footnote says otherwise.
  let spent = false;
  const mark = u.mark;
  if (mark && u.held > 0 && fn('sentence-mark-held')) {
    // `sentence-mark-held`: a unit Sentence cannot move keeps its mark (and so its action).
  } else if (
    mark?.deep &&
    fn('sentence-mark-peel') &&
    !(fn('sentence-mark-release') && mark.bound)
  ) {
    // `sentence-mark-peel`: a deep mark drops to a plain one and is not spent, so nothing passes on.
    withLine(ctx, 'sentence:mark', () => {
      u.mark = { ...mark, deep: false };
      emit(ctx, { type: 'marked', unit: ref(u), deep: false, bound: mark.bound?.action ?? null });
    });
  } else if (mark) {
    spent = true;
    // `sentence-mark-release`: the held action runs on the bearer as the mark is spent (no peel with it).
    if (fn('sentence-mark-release') && mark.bound) releaseSpent(ctx, u, 'sentence:mark', heading);
    else withLine(ctx, 'sentence:mark', () => spendMark(ctx, u));
  }
  const tiles = ACTIONS.sentenceTiles + pushBonus('sentence', flow);
  const start = { ...u.pos };
  const box: { r?: PushResult } = {};
  maybeLine(ctx, solventLine(flow), () => {
    box.r = push(ctx, u, heading, Math.max(0, tiles), flow.origin);
  });
  const r = box.r;
  if (!r) return;
  // `sentence-cap-blot`: a spent mark leaves a blot where the unit was pushed from.
  if (spent && r.moved > 0 && fn('sentence-cap-blot')) landOnTile(ctx, 'ink', start, flow);
  // `sentence-mark-pass`: the spent mark's plain copy lands on the nearest unmarked unit beside the push's end.
  if (spent && u.hp > 0 && fn('sentence-mark-pass')) {
    const over = unmarkedBeside(ctx, u);
    if (over) withLine(ctx, 'sentence:mark', () => markUnit(ctx, over, flow.origin));
  }
  // `sentence-cap-cosign`: the unit a push runs into is marked plain (once).
  if (fn('sentence-cap-cosign') && r.crushed && r.crushed !== 'wall' && r.crushed !== 'plate') {
    const hit = findUnit(ctx.s, r.crushed);
    if (hit && hit.hp > 0 && !hit.mark) markUnit(ctx, hit, flow.origin);
  }
  // `postmaster:sentence`: crushed against a wall or the edge, held until your next turn (the rival's hold immunity wins).
  if (u.hp > 0 && fn('postmaster:sentence') && crushedAgainstWall(ctx, u.pos, heading, r)) {
    withLine(ctx, 'sentence:mark', () => holdUnit(ctx, u, 1));
  }
};

/**
 * One Levy spend: the mark's shield (2 for a deep mark under `levy-mark-deep`, 1 under `-peel`, with
 * the peel leaving the mark standing), paid to the caster, or to the ally under `levy-member-share`.
 * Returns whether the mark was spent whole.
 */
function levyMark(ctx: Ctx, u: Unit, flow: Flow, caster: Unit): boolean {
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  const mark = u.mark;
  if (!mark) return false;
  const member = u.kind === 'member';
  const line: LineId = member ? 'levy:member' : 'levy:mark';
  // An enemy casts after the party has acted, and the shield lapses at the next player phase
  // start: one more round, so it covers the party's coming turn. `levy-mark-ward` adds one.
  const until =
    ctx.s.round +
    1 +
    (caster.kind === 'enemy' ? 1 : 0) +
    roundBonus('levy', flow) +
    (fn('levy-mark-ward') ? 1 : 0);
  const peel = mark.deep && fn('levy-mark-peel') && !(fn('levy-mark-release') && mark.bound);
  const shield = ACTIONS.levyShieldPerMark * (mark.deep && fn('levy-mark-deep') ? 2 : 1);
  if (peel) {
    // `levy-mark-peel`: the deep mark drops to a plain one, stays, and still pays a shield.
    withLine(ctx, line, () => {
      u.mark = { ...mark, deep: false };
      emit(ctx, { type: 'marked', unit: ref(u), deep: false, bound: mark.bound?.action ?? null });
    });
  } else if (fn('levy-mark-release') && mark.bound) {
    // `levy-mark-release`: the held action runs on its bearer as the mark is spent.
    releaseSpent(ctx, u, line, null);
  } else {
    withLine(ctx, line, () => spendMark(ctx, u)); // spent, never released (P31)
  }
  // `levy-member-share`: an ally's mark pays the ally, not the caster; `levy-member-repay` adds 1 more to the ally.
  const ally = member && u.id !== caster.id;
  const who = ally && fn('levy-member-share') ? u : caster;
  withLine(ctx, who.shield > 0 ? 'levy:shielded' : line, () => gainShield(ctx, who, shield, until));
  if (ally && fn('levy-member-repay')) {
    withLine(ctx, u.shield > 0 ? 'levy:shielded' : line, () => gainShield(ctx, u, 1, until));
  }
  return !peel;
}

const levy: Handler = (ctx, t, flow) => {
  const fn = (id: FootnoteVariantId) => hasFootnote(ctx, id);
  const caster = unitById(ctx.s, flow.caster);
  const u = unitOf(ctx, t);
  if (u && !(u.kind === 'member' && u.id === caster.id && fn('levy-member-self'))) {
    // `levy:unit`: a unit with no mark pays nothing (the miss).
    if (!u.mark) miss(ctx, 'levy', 'levy:unit');
    else {
      const spent = levyMark(ctx, u, flow, caster);
      if (spent && fn('levy-cap-bank') && marksThisCast(ctx, flow) === 3) {
        // `levy-cap-bank`: the third mark in one cast shields every member of your party.
        const until =
          ctx.s.round + 1 + (caster.kind === 'enemy' ? 1 : 0) + roundBonus('levy', flow);
        for (const m of ctx.s.units)
          if (m.kind === 'member' && m.hp > 0) gainShield(ctx, m, 1, until);
      }
      // `levy-cap-draw`: a foe whose mark is spent is pulled one tile toward the caster.
      const toward =
        spent && fn('levy-cap-draw') && u.kind === 'enemy' && u.hp > 0
          ? towardHeading(u.pos, caster.pos)
          : null;
      if (toward) push(ctx, u, toward, 1, flow.origin, { as: 'pull' });
    }
  }
  // `levy-member-near`: the caster's neighbours that are your party have their marks spent too.
  if (fn('levy-member-near') && caster.hp > 0) {
    for (const at of neighbors4(caster.pos)) {
      const m = unitAt(ctx.s, at);
      if (m && m.kind === 'member' && m.id !== caster.id && m.hp > 0 && m.mark)
        levyMark(ctx, m, flow, caster);
    }
  }
};

/** What each authored Action does to one target (design §5, P27–P28). */
export const ACTION_HANDLERS: Record<ActionRuneId, Handler> = {
  strike,
  shove,
  guard,
  sentence,
  levy,
  hold,
  swap,
  draw,
  erase,
};
