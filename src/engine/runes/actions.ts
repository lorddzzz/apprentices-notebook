import { ACTIONS, type ActionRuneId, type LineId, RUNES, TUNING } from '$data';
import { hasTrait, objectArrives, relocateAll } from '../arrival';
import { type Ctx, emit, ref, withLine } from '../ctx';
import { dealDamage, gainShield } from '../damage';
import { type Coord, type Dir, step } from '../grid';
import { spendMark } from '../marks';
import { push } from '../push';
import { inBoard, isPlate, tileAt, unitAt, unitById } from '../queries';
import type { Handler } from '../resolve';
import { SOLVENT_RULES } from '../solvents';
import { type Flow, type Layer, type Target, targetKey, type Unit } from '../types';

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

const hold: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  if (!u) return;
  const rounds = ACTIONS.holdRounds + roundBonus('hold', flow);
  maybeLine(ctx, u.held > 0 ? 'hold:held' : null, () => {
    u.held = Math.max(u.held, rounds);
    emit(ctx, { type: 'held', unit: ref(u) });
  });
};

const swap: Handler = (ctx, t, flow) => {
  const u = unitOf(ctx, t);
  const caster = unitById(ctx.s, flow.caster);
  if (!u || u.id === caster.id || caster.hp <= 0) return;
  const blocked = [caster, u].find((x) => x.held > 0);
  if (blocked) {
    withLine(ctx, 'swap:held', () => emit(ctx, { type: 'held', unit: ref(blocked) }));
    return;
  }
  // An anchored unit never moves (P5, party §1); the Swap rune still trades places with fliers.
  if (hasTrait(u, 'anchored') || hasTrait(caster, 'anchored')) {
    emit(ctx, { type: 'miss', source: RUNES.swap.name });
    return;
  }
  emit(ctx, { type: 'swapped', a: ref(caster), b: ref(u) });
  const a = { ...caster.pos };
  const b = { ...u.pos };
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

const erase: Handler = (ctx, t) => {
  const at = posOf(ctx, t);
  if (!at) return;
  const tile = tileAt(ctx.s, at);
  const u = unitOf(ctx, t);
  const gone = (what: string, line: LineId | null): void =>
    maybeLine(ctx, line, () => emit(ctx, { type: 'erased', at: { ...at }, what }));
  if (u?.mark) {
    const deep = u.mark.deep;
    spendMark(ctx, u); // spent, never released (P31)
    gone(deep ? 'deep mark' : 'mark', deep ? 'erase:deepMark' : 'erase:mark');
  }
  if (u && u.collar !== false && u.collar !== null) {
    u.collar = false;
    gone('collar', 'erase:collar');
  }
  if (u && u.shackle > 0) {
    u.shackle = 0;
    gone('shackle', 'erase:shackle');
  }
  if (tile.state) {
    const what = spaced(tile.state.id);
    tile.state = null;
    gone(what, null);
  }
  if (tile.jar) {
    tile.jar = null;
    gone('jar', 'erase:jar');
  }
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
