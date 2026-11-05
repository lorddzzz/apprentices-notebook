import {
  BIND_EVENT_PHRASE,
  type BindEvent,
  type InventionDef,
  type InventionId,
  isInvention,
  type LineId,
  METHODS,
  type MethodId,
  type PartAccepts,
  type Role,
  RUNES,
  type RuneId,
  type RuneRef,
  SOLVENTS,
} from '$data';
import { markUnit, reachOf, unitsNear } from './bursts';
import { type Ctx, emit, withLine } from './ctx';
import { hasFootnote } from './footnotes';
import { type Coord, type Dir, opposite, step } from './grid';
import { sealedContext } from './jars';
import { addInk, inkPricer, nameOf } from './lattice';
import { asBindCarrier, attachBound, liftMark } from './marks';
import { netCollar } from './mix';
import { brassNet, cloudNet, isBrass } from './networks';
import { findUnit, giftedIn, isAlive, isCloud, members, tileAt, unitAt } from './queries';
import { NEST_LIMIT } from './resolve';
import { handlerFor } from './runes';
import { schedule } from './schedule';
import { SOLVENT_RULES } from './solvents';
import { axisToward, whereIs } from './targets';
import type {
  AuraRef,
  Flow,
  InventionLibrary,
  Scheduled,
  Step,
  Target,
  Unit,
  UnitId,
} from './types';
import { targetKey } from './types';

export type { InventionLibrary };

/**
 * Inventions (design §6.1–6.2, §6.4; plan P33, P34, P37): what fits where, the headline, the ink,
 * and what each method does when an invention runs. Parts are runes or other inventions; every
 * part is paid and every nested invention runs one level deeper (limit 1).
 */

/** What the household knows: what the Bench may use (design §6.1). */
export interface KnownSet {
  runes: readonly RuneId[];
  methods: readonly MethodId[];
  events: readonly BindEvent[];
  inventions: InventionLibrary;
}

// ── Compatibility (§6.2: visible, not secret) ───────────

const ROLE_NAME: Record<Role, string> = {
  source: 'Source',
  action: 'Action',
  kind: 'Kind',
  shape: 'Shape',
  trigger: 'Trigger',
  seal: 'Seal',
  aura: 'Aura',
};

/** What each method does with an Action, for "a Shape has nothing to store". */
const VERB: Record<MethodId, string> = {
  conduct: 'conduct',
  repeat: 'repeat',
  margin: 'echo',
  bind: 'store',
  lift: 'lift',
};

/** The authored Actions that move something (design §6.2: Shove, Sentence, Swap, Draw). */
const MOVING: ReadonlySet<RuneRef> = new Set(['shove', 'sentence', 'swap', 'draw']);

const defOf = (ref: RuneRef, lib: InventionLibrary): InventionDef | null =>
  isInvention(ref) ? (lib[ref] ?? null) : null;

const isRepeat = (ref: RuneRef, lib: InventionLibrary): boolean =>
  defOf(ref, lib)?.method === 'repeat';

/** A rune's role, or an invention's (its method's); null for an invention nobody knows. */
function partRole(ref: RuneRef, lib: InventionLibrary): Role | null {
  if (!isInvention(ref)) return RUNES[ref].role;
  const d = lib[ref];
  return d ? inventionRole(d, lib) : null;
}

/** Whether `ref` is, or is made of, an Action that moves a unit (bounded: nesting is finite). */
function moves(ref: RuneRef, lib: InventionLibrary, hops = 0): boolean {
  if (MOVING.has(ref)) return true;
  const d = defOf(ref, lib);
  if (!d || hops > 4) return false;
  if (d.method !== 'conduct' && d.method !== 'repeat') return false;
  const part = d.parts[0];
  return part !== undefined && moves(part, lib, hops + 1);
}

/** Whether `ref` is `id` or has it somewhere inside. */
function contains(ref: RuneRef, id: InventionId, lib: InventionLibrary): boolean {
  const pending = [ref];
  const seen = new Set<RuneRef>();
  while (pending.length) {
    const part = pending.pop();
    if (part === undefined) continue;
    if (part === id) return true;
    if (seen.has(part)) continue;
    seen.add(part);
    for (const nested of defOf(part, lib)?.parts ?? []) pending.push(nested);
  }
  return false;
}

function slotIssue(
  method: MethodId,
  accepts: PartAccepts,
  part: RuneRef,
  lib: InventionLibrary,
): string | null {
  const name = METHODS[method].name;
  const partName = nameOf(part, lib);
  if (accepts === 'carrier') return part === 'ink' ? null : `${name} needs Ink first`;
  if (accepts === 'repeat') return isRepeat(part, lib) ? null : `${name} takes a Repeat`;
  const role = partRole(part, lib);
  if (role !== 'action') {
    return `a ${ROLE_NAME[role ?? 'action']} has nothing to ${VERB[method]}`;
  }
  if (accepts === 'instantAction' && isRepeat(part, lib)) {
    return `${partName} waits a turn, and ${name} needs an Action that resolves at once`;
  }
  if (accepts === 'movingAction' && !moves(part, lib)) {
    return `${partName} moves nothing, and ${name} needs an Action that moves a unit`;
  }
  return null;
}

/** Why `part` can't go in slot `slot` of `method` (the Bench greys it with this), or null if it can. */
export function partIssue(
  method: MethodId,
  slot: number,
  part: RuneRef,
  known: KnownSet,
): string | null {
  const accepts = METHODS[method].slots[slot]?.accepts;
  if (accepts === undefined) return `${METHODS[method].name} has no slot ${slot + 1}`;
  const lib = known.inventions;
  if (isInvention(part)) {
    if (!lib[part]) return `${nameOf(part, lib)} is not one of your inventions`;
  } else if (!known.runes.includes(part)) {
    return `You don't know ${RUNES[part].name} yet`;
  }
  return slotIssue(method, accepts, part, lib);
}

/** Why a combination doesn't fit ("a Shape has nothing to store"), or null if it does. */
export function inventionIssue(def: InventionDef, known: KnownSet): string | null {
  const method = METHODS[def.method as MethodId] as (typeof METHODS)[MethodId] | undefined;
  if (!method) return `${def.method} is not a method`;
  if (!known.methods.includes(def.method)) return `You haven't learned ${method.name} yet`;
  if (def.parts.length !== method.slots.length) {
    const n = method.slots.length;
    return `${method.name} takes ${n} ${n === 1 ? 'part' : 'parts'}, not ${def.parts.length}`;
  }
  const lib = known.inventions;
  for (const p of def.parts) {
    if (contains(p, def.id, lib)) return "an invention can't contain itself";
  }
  for (const p of def.parts) {
    if (isInvention(p)) {
      if (!lib[p]) return `${nameOf(p, lib)} is not one of your inventions`;
    } else if (!(p in RUNES)) {
      return `${p} is not a rune`;
    } else if (!known.runes.includes(p)) {
      return `You don't know ${RUNES[p].name} yet`;
    }
  }
  for (const [i, slot] of method.slots.entries()) {
    const part = def.parts[i];
    const issue = part === undefined ? null : slotIssue(def.method, slot.accepts, part, lib);
    if (issue) return issue;
  }
  if (def.method === 'bind') {
    if (!def.event) return 'Bind needs an event to wait for';
    if (!method.events?.includes(def.event)) return `${def.event} is not a Bind event`;
    if (!known.events.includes(def.event)) {
      return `You don't know the "${BIND_EVENT_PHRASE[def.event]}" event yet`;
    }
  } else if (def.event) {
    return `Only Bind waits for an event, not ${method.name}`;
  }
  return null;
}

// ── Derived facts ───────────────────────────────────────

/** An invention's role is its method's (Bind is a Kind, Margin an Aura, the rest Actions). */
export function inventionRole(def: InventionDef, _lib: InventionLibrary): Role {
  return METHODS[def.method].makes;
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** The method's sentence filled with the parts' names, then the solvent's flavour (always shown). */
export function headlineOf(def: InventionDef, lib: InventionLibrary): string {
  const method = METHODS[def.method];
  const name = (i: number): string => {
    const part = def.parts[i];
    return part === undefined ? '…' : nameOf(part, lib);
  };
  const base = method.headline
    .replace('{0}', name(0))
    .replace('{1}', name(1))
    .replace('{event}', def.event ? BIND_EVENT_PHRASE[def.event] : '…');
  if (!def.solvent) return base;
  const solvent = SOLVENTS[def.solvent];
  return `${base} With ${solvent.name}, ${lowerFirst(solvent.rule)}`;
}

/** Σ the parts' ink (nested ones included) + the method's; a solvent adds none (P33). */
export function inventionInk(def: InventionDef, lib: InventionLibrary): number {
  const price = inkPricer(lib);
  return def.parts.reduce((sum, p) => addInk(sum, price(p)), METHODS[def.method].ink);
}

// ── Running ─────────────────────────────────────────────

/** Runs one part (a rune, or an invention one level deeper) on a target. */
function runPart(ctx: Ctx, part: RuneRef, t: Target, flow: Flow): void {
  const caster = findUnit(ctx.s, flow.caster);
  const gifted = !isInvention(part) && caster !== null && giftedIn(caster, part);
  const st: Step = {
    role: 'action',
    rune: part,
    auras: flow.auras,
    next: null,
    at: { x: 0, y: 0 },
  };
  handlerFor(part)?.(ctx, t, { ...flow, gifted }, st);
}

const headingFor = (flow: Flow, t: Target): Dir | null => flow.headings.get(targetKey(t)) ?? null;

/** The target's unit: a unit target's, or whoever stands on a tile target. */
function unitOf(ctx: Ctx, t: Target): Unit | null {
  if (t.kind === 'tile') return unitAt(ctx.s, t.at);
  const u = findUnit(ctx.s, t.unit);
  return u && isAlive(u) ? u : null;
}

const unitTarget = (u: Unit): Target => ({ kind: 'unit', unit: u.id });

/**
 * The brass the target touches (§4.4, §6.2): the connected brass it stands on, else every brass
 * network on a tile next to it. Plates and collared units are both brass.
 */
function networkTouching(ctx: Ctx, at: Coord, cloud = false): Coord[] {
  const s = ctx.s;
  const inNet = (c: Coord): boolean => (cloud ? isCloud(tileAt(s, c)) : isBrass(s, c));
  const seeds = inNet(at)
    ? [at]
    : [step(at, 'up'), step(at, 'down'), step(at, 'left'), step(at, 'right')].filter(inNet);
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const seed of seeds) {
    for (const c of cloud ? cloudNet(s, seed) : brassNet(s, seed)) {
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/** `conduct-network-scatter`: the way from the nearest other brass tile to the unit, along its longer axis. */
function awayFromNet(u: Unit, net: readonly Coord[]): Dir | null {
  const dist = (c: Coord): number => Math.abs(c.x - u.pos.x) + Math.abs(c.y - u.pos.y);
  const others = net.filter((c) => c.x !== u.pos.x || c.y !== u.pos.y);
  const from = [...(others.length ? others : net)].sort((a, b) => dist(a) - dist(b))[0];
  return from ? axisToward(from, u.pos) : null;
}

/**
 * Conduct: the network is read once, and every living unit on it or touching it (one tile
 * further with a Coil) takes the action once, whatever the action then does to the board (limit 4).
 */
function conduct(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  const at = whereIs(ctx.s, t);
  const part = def.parts[0];
  if (!at || part === undefined) return [];
  let net = networkTouching(ctx, at);
  // `conduct-cap-cloud`: with no brass about, the action travels the connected cloud.
  if (net.length === 0 && hasFootnote(ctx, 'conduct-cap-cloud'))
    net = networkTouching(ctx, at, true);
  if (net.length === 0) {
    withLine(ctx, 'conduct:noTarget', () => emit(ctx, { type: 'miss', source: 'Conduct' }));
    return [];
  }
  let units = unitsNear(ctx, net, 1 + reachOf(flow));
  // `conduct-network-spare`: the action passes over your apprentices.
  if (hasFootnote(ctx, 'conduct-network-spare')) units = units.filter((u) => u.kind !== 'member');
  // `conduct-cap-mark`: a marked target marks every unit the conduct reaches.
  const marking = hasFootnote(ctx, 'conduct-cap-mark') && unitOf(ctx, t)?.mark != null;
  const scatter = hasFootnote(ctx, 'conduct-network-scatter');
  // A solvent that lengthens the reach (Chalk) signs the line it reached by.
  const line: LineId =
    flow.solvent && SOLVENT_RULES[flow.solvent]?.reach
      ? `${flow.solvent}:network`
      : 'conduct:network';
  withLine(ctx, line, () => {
    emit(ctx, {
      type: 'conducted',
      action: part,
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        at: { ...u.pos },
        member: u.kind === 'member',
      })),
    });
    const heading = headingFor(flow, t);
    const headings = new Map(flow.headings);
    for (const u of units) {
      headings.set(targetKey(unitTarget(u)), scatter ? (awayFromNet(u, net) ?? heading) : heading);
    }
    const conducted: Flow = { ...flow, headings };
    for (const u of units) if (isAlive(u)) runPart(ctx, part, unitTarget(u), conducted);
    if (marking) {
      for (const u of units) if (isAlive(u) && !u.mark) markUnit(ctx, u, flow.origin, flow);
    }
    // `conduct-network-collar`: every unit reached joins the brass for the next conduct.
    if (hasFootnote(ctx, 'conduct-network-collar')) {
      for (const u of units) if (isAlive(u)) netCollar(ctx, u, flow.origin);
    }
    // `conduct-network-hum`: the brass hums until round end, and Spark on it hits harder.
    if (hasFootnote(ctx, 'conduct-network-hum')) {
      ctx.s.hum = [...(ctx.s.hum ?? []), ...net.map((c) => ({ ...c }))];
    }
  });
  return units.map(unitTarget);
}

/**
 * Repeat: acts now, then waits one more turn on the same tile (not on the unit: if it moved
 * away, whoever stands there takes it). A repeat coming due is spent and never waits again.
 */
function repeat(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  const part = def.parts[0];
  const at = whereIs(ctx.s, t);
  if (part === undefined) return [];
  const hit = at ? unitAt(ctx.s, at) : null;
  runPart(ctx, part, t, flow);
  if (!at || flow.repeated) return [t];
  const wait = (): void =>
    schedule(ctx, {
      // `repeat-empty-dusk`: falls due at round end instead of the caster's next turn.
      when: hasFootnote(ctx, 'repeat-empty-dusk') ? 'roundEnd' : 'ownerTurn',
      owner: flow.caster,
      ...waitingOn(ctx, 'repeat', hit),
      step: part,
      target: { kind: 'tile', at: { ...at } },
      heading: headingFor(flow, t),
      origin: flow.origin,
      kind: 'repeat',
      solvent: flow.solvent,
      context: sealedContext(flow),
    });
  if (unitAt(ctx.s, at)) wait();
  else withLine(ctx, 'repeat:empty', wait);
  return [t];
}

/** The next living apprentice after `caster` in casting order (the caster again if alone). */
function nextMember(ctx: Ctx, caster: UnitId): UnitId {
  const all = members(ctx.s).filter((m) => isAlive(m) || m.id === caster);
  const i = all.findIndex((m) => m.id === caster);
  return all[(i + 1) % all.length]?.id ?? caster;
}

/** What a repeat or echo keeps of the unit it first hit: follow, and how long an empty tile waits. */
function waitingOn(ctx: Ctx, kind: 'repeat' | 'margin', hit: Unit | null): Partial<Scheduled> {
  const follow = hasFootnote(ctx, `${kind}-empty-follow`);
  const wait = kind === 'repeat' ? 'repeat-cap-patient' : 'margin-empty-wait';
  const turns = hasFootnote(ctx, wait) ? (kind === 'repeat' ? 1 : 2) : 0;
  return {
    ...(hit ? { hit: hit.id } : {}),
    ...(hit && follow ? { follow: true as const } : {}),
    ...(turns ? { wait: turns } : {}),
  };
}

/**
 * Margin's echo (an Aura): an Action on a path touching a Margin happens again next turn on the
 * same tile, exactly as a Repeat does. `resolve.ts` calls this after each Action on a target
 * that stood at `at`. A repeat coming due, and a Repeat itself, are not echoed (limit 5); nor is a
 * Wick waking with its Margin restored (P9): it was echoed when it was cast.
 */
export function marginEcho(ctx: Ctx, rune: RuneRef, t: Target, at: Coord, flow: Flow): void {
  if (flow.repeated || flow.woken || flow.auras.length === 0) return;
  const lib = ctx.s.inventions;
  const touching = flow.auras.some((a: AuraRef) => defOf(a, lib)?.method === 'margin');
  if (!touching) return;
  if (isRepeat(rune, lib)) {
    // Said once per cast, however many targets the Repeat reached.
    if (!ctx.log.some((e) => e.type === 'miss' && e.line === 'margin:limit')) {
      withLine(ctx, 'margin:limit', () => emit(ctx, { type: 'miss', source: 'Margin' }));
    }
    return;
  }
  const targeted = t.kind === 'unit' ? findUnit(ctx.s, t.unit) : null;
  const hit = unitAt(ctx.s, at) ?? (targeted && isAlive(targeted) ? targeted : null);
  const heading = headingFor(flow, t);
  const wait = (): void =>
    schedule(ctx, {
      when: 'ownerTurn',
      // `margin-empty-relay`: the next apprentice in casting order sets it off.
      owner: hasFootnote(ctx, 'margin-empty-relay') ? nextMember(ctx, flow.caster) : flow.caster,
      ...waitingOn(ctx, 'margin', hit),
      step: rune,
      target: { kind: 'tile', at: { ...at } },
      // `margin-empty-mirror`: the echo points the opposite way.
      heading: heading && hasFootnote(ctx, 'margin-empty-mirror') ? opposite(heading) : heading,
      origin: flow.origin,
      kind: 'margin',
      solvent: flow.solvent,
      context: sealedContext(flow),
    });
  if (unitAt(ctx.s, at)) wait();
  else withLine(ctx, 'margin:empty', wait);
}

/** The other unit the log shows marked since entry `from`, when the mark aimed at `aimed` was redirected. */
function markedInstead(ctx: Ctx, from: number, aimed: Unit): Unit | null {
  for (let i = ctx.log.length - 1; i >= from; i--) {
    const e = ctx.log[i];
    if (e?.type === 'marked') return e.unit.id === aimed.id ? null : findUnit(ctx.s, e.unit.id);
  }
  return null;
}

/**
 * Bind: the carrier (Ink) lands as it always does, then the mark it made holds the action until
 * its event. Marks already holding something keep it; Ink on a collar is a Shackle and holds none.
 */
function bind(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  const [carrier, action] = def.parts;
  const event = def.event;
  if (carrier === undefined || action === undefined || !event) return [];
  const unit = unitOf(ctx, t);
  const heading = headingFor(flow, t);
  const held = unit?.mark?.bound != null; // already holds an action: the Ink only deepens it
  const collared = unit !== null && unit.collar !== false && unit.shackle === 0;
  const logged = ctx.log.length;
  asBindCarrier(ctx, () => runPart(ctx, carrier, t, flow));
  if (!unit) {
    withLine(ctx, 'bind:empty', () => emit(ctx, { type: 'miss', source: 'Bind' }));
    return [t];
  }
  // A harm guard (a forwarding stamp) may have sent the mark to another unit: that one holds it.
  const sent = markedInstead(ctx, logged, unit);
  if (sent) {
    if (isAlive(sent) && sent.mark && !sent.mark.bound) {
      attachBound(ctx, sent, { action, event, solvent: def.solvent ?? flow.solvent, heading });
    }
    return [t];
  }
  // Nothing to hold the action: a shackle took the mark's place, or the old action stayed.
  const lost: LineId | null = !isAlive(unit)
    ? null
    : collared && !unit.mark
      ? 'bind:collar'
      : held && unit.mark
        ? 'bind:deepMark'
        : null;
  if (lost) withLine(ctx, lost, () => emit(ctx, { type: 'miss', source: 'Bind' }));
  if (isAlive(unit) && unit.mark && !unit.mark.bound) {
    attachBound(ctx, unit, { action, event, solvent: def.solvent ?? flow.solvent, heading });
  }
  return [t];
}

/**
 * Lift: the Action works on the target's mark instead of the target: the mark, with whatever it
 * holds, moves to the adjacent unit the heading points at (a Swap's goes to the caster).
 */
function lift(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  const part = def.parts[0];
  const from = unitOf(ctx, t);
  if (!from || part === undefined) return [];
  const heading = headingFor(flow, t);
  const caster = findUnit(ctx.s, flow.caster);
  const adjacent = (c: Coord): boolean =>
    Math.abs(c.x - from.pos.x) + Math.abs(c.y - from.pos.y) === 1;
  let to: Unit | null = null;
  if (part === 'swap') to = caster && adjacent(caster.pos) ? caster : null;
  else if (heading) to = unitAt(ctx.s, step(from.pos, heading));
  if (!to || !liftMark(ctx, from, to)) {
    withLine(ctx, 'lift:noTarget', () => emit(ctx, { type: 'miss', source: 'Lift' }));
    return [];
  }
  return [t];
}

/** The heading of `t` copied to the targets a solvent added, so they act the same way. */
function withHeadings(flow: Flow, from: Target, to: readonly Target[]): Flow {
  const heading = headingFor(flow, from);
  const headings = new Map(flow.headings);
  for (const x of to) if (!headings.has(targetKey(x))) headings.set(targetKey(x), heading);
  return { ...flow, headings };
}

/**
 * Runs an invention on one target (the handler `handlerFor` gives an `inv:` rune). The invention's
 * parts run one level deeper than it; its solvent travels in `flow.solvent`, where the actions
 * read their bonuses. The solvent's own hooks (`SOLVENT_RULES`, E8) apply at the invention that
 * is flavoured, not at the ones nested inside it: `delay` waits a round, `reverse` turns the
 * target back on the caster, `widen` picks the targets, `onReach` runs on each unit or tile
 * reached, `after` once per target (`before` hands it a token).
 */
export function runInvention(ctx: Ctx, id: InventionId, t: Target, flow: Flow): void {
  const def = ctx.s.inventions[id];
  if (!def) {
    emit(ctx, { type: 'miss', source: nameOf(id) });
    return;
  }
  if (flow.depth > NEST_LIMIT) {
    emit(ctx, { type: 'fizzles', reason: 'depth' });
    return;
  }
  const own = def.solvent;
  const rule = own ? SOLVENT_RULES[own] : undefined;
  // `woken` is spent by the Wick that waited: a Wick inside it waits its own round (P9).
  const { woken: _woken, ...awake } = flow;
  const inner: Flow = { ...awake, depth: flow.depth + 1, solvent: own ?? flow.solvent };
  if (own && rule?.delay && !flow.woken) {
    const yours = findUnit(ctx.s, flow.caster)?.kind === 'member';
    withLine(ctx, `${own}:unit`, () =>
      schedule(ctx, {
        // `wick-unit-dusk`: falls due at round end; `wick-unit-long`: holds one more round.
        when: yours && hasFootnote(ctx, 'wick-unit-dusk') ? 'roundEnd' : 'ownerTurn',
        ...(yours && hasFootnote(ctx, 'wick-unit-long') ? { holds: 1 } : {}),
        owner: flow.caster,
        step: id,
        target: t,
        heading: headingFor(flow, t),
        origin: flow.origin,
        kind: 'wick',
        solvent: own,
        context: sealedContext(flow),
      }),
    );
    return;
  }
  let first = t;
  let base = inner;
  if (own && rule?.reverse && def.method !== 'bind') {
    // Sand: the action turns back on whoever set it off.
    const caster = findUnit(ctx.s, flow.caster);
    if (!caster) return;
    first = unitTarget(caster);
    const heading = headingFor(flow, t);
    const headings = new Map(inner.headings);
    headings.set(targetKey(first), heading ? opposite(heading) : null);
    base = { ...inner, headings };
  }
  const targets = rule?.widen ? rule.widen(ctx.s, first, base) : [first];
  const added = targets.filter((x) => targetKey(x) !== targetKey(first));
  const widened = withHeadings(base, first, added);
  for (const tt of targets) {
    const extra = added.includes(tt);
    const f: Flow = extra && rule?.weaker ? { ...widened, weaker: rule.weaker } : widened;
    const go = (): void => {
      const before = rule?.before?.(ctx, tt, f);
      const reached = invoke(ctx, def, tt, f);
      for (const r of reached) rule?.onReach?.(ctx, r, f);
      rule?.after?.(ctx, tt, f, { inv: id, before });
    };
    const line = extra ? (rule?.lineFor?.(ctx.s, tt, first) ?? rule?.line) : undefined;
    if (line) withLine(ctx, line, go);
    else go();
  }
}

/** One method's behaviour on one target; returns what it reached. Margin runs as an aura, not here. */
function invoke(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  switch (def.method) {
    case 'conduct':
      return conduct(ctx, def, t, flow);
    case 'repeat':
      return repeat(ctx, def, t, flow);
    case 'bind':
      return bind(ctx, def, t, flow);
    case 'lift':
      return lift(ctx, def, t, flow);
    case 'margin':
      return [];
  }
}
