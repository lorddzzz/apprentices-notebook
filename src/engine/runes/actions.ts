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
import { cloneData } from '../clone';
import { type Ctx, emit, ref, withHabit, withLine, withOrigin } from '../ctx';
import { dealDamage, gainShield } from '../damage';
import { type Coord, DIRS, type Dir, opposite, step, turnLeft, turnRight } from '../grid';
import { ruleOf, sameSide } from '../habits';
import { sealJar } from '../jars';
import { jarLimit } from '../leans';
import { spendMark } from '../marks';
import { push } from '../push';
import { findUnit, inBoard, isPlate, tileAt, unitAt, unitById } from '../queries';
import type { Handler } from '../resolve';
import { SOLVENT_RULES } from '../solvents';
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
  if (!u) return;
  const caster = unitById(ctx.s, flow.caster);
  const damage = TUNING.strikeDamage - (flow.weaker ?? 0);
  if (damage <= 0) return;
  maybeLine(ctx, u.shield > 0 ? 'strike:shielded' : null, () => {
    dealDamage(ctx, u, damage, RUNES.strike.name, [], {
      heading: headingOf(flow, t),
      at: { ...caster.pos },
    });
  });
};

const shove: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  const heading = headingOf(flow, t);
  if (!heading) return miss(ctx, 'shove', 'shove:noHeading');
  const tiles = TUNING.shoveTiles + pushBonus('shove', flow);
  maybeLine(ctx, solventLine(flow), () => push(ctx, u, heading, Math.max(0, tiles), flow.origin));
};

const guard: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  // Until the start of the next player phase; a round-gifted caster adds one more round.
  const until = ctx.s.round + 1 + roundBonus('guard', flow);
  maybeLine(ctx, u.shield > 0 ? 'guard:shielded' : null, () => {
    gainShield(ctx, u, TUNING.guardShield, until);
  });
};

function holdUnit(ctx: Ctx, u: Unit, rounds: number): void {
  u.held = Math.max(u.held, rounds);
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
  maybeLine(ctx, u.held > 0 ? 'hold:held' : null, () => holdUnit(ctx, u, rounds));
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

const sentence: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  if (!u.mark) return miss(ctx, 'sentence', 'sentence:unit');
  const heading = headingOf(flow, t);
  if (!heading) return miss(ctx, 'sentence', 'sentence:noHeading');
  spendMark(ctx, u); // spent before the push, never released (P31)
  const tiles = ACTIONS.sentenceTiles + pushBonus('sentence', flow);
  maybeLine(ctx, solventLine(flow), () => push(ctx, u, heading, Math.max(0, tiles), flow.origin));
};

const levy: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u?.mark) return;
  const caster = unitById(ctx.s, flow.caster);
  spendMark(ctx, u);
  gainShield(ctx, caster, ACTIONS.levyShieldPerMark, ctx.s.round + 1 + roundBonus('levy', flow));
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
