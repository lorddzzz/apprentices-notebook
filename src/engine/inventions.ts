import {
  BIND_EVENT_PHRASE,
  type BindEvent,
  type InventionDef,
  type InventionId,
  isInvention,
  METHODS,
  type MethodId,
  type PartAccepts,
  type Role,
  RUNES,
  type RuneId,
  type RuneRef,
  SOLVENTS,
} from '$data';
import { reachOf, unitsNear } from './bursts';
import { type Ctx, emit, withLine } from './ctx';
import { type Coord, type Dir, step } from './grid';
import { inkOf, nameOf } from './lattice';
import { attachBound, liftMark } from './marks';
import { brassNet, isBrass } from './networks';
import { findUnit, giftedIn, isAlive, unitAt } from './queries';
import { NEST_LIMIT } from './resolve';
import { handlerFor } from './runes';
import { schedule } from './schedule';
import { SOLVENT_RULES } from './solvents';
import { whereIs } from './targets';
import type { AuraRef, Flow, InventionLibrary, Step, Target, Unit } from './types';
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
function contains(ref: RuneRef, id: InventionId, lib: InventionLibrary, hops = 0): boolean {
  if (ref === id) return true;
  const d = defOf(ref, lib);
  return !!d && hops < 8 && d.parts.some((p) => contains(p, id, lib, hops + 1));
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
  return def.parts.reduce((sum, p) => sum + inkOf(p, lib), 0) + METHODS[def.method].ink;
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
function networkTouching(ctx: Ctx, at: Coord): Coord[] {
  const s = ctx.s;
  const seeds = isBrass(s, at)
    ? [at]
    : [step(at, 'up'), step(at, 'down'), step(at, 'left'), step(at, 'right')].filter((c) =>
        isBrass(s, c),
      );
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const seed of seeds) {
    for (const c of brassNet(s, seed)) {
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/**
 * Conduct: the network is read once, and every living unit on it or touching it (one tile
 * further with a Coil) takes the action once, whatever the action then does to the board (limit 4).
 */
function conduct(ctx: Ctx, def: InventionDef, t: Target, flow: Flow): Target[] {
  const at = whereIs(ctx.s, t);
  const part = def.parts[0];
  if (!at || part === undefined) return [];
  const net = networkTouching(ctx, at);
  if (net.length === 0) {
    withLine(ctx, 'conduct:noTarget', () => emit(ctx, { type: 'miss', source: 'Conduct' }));
    return [];
  }
  const units = unitsNear(ctx, net, 1 + reachOf(flow));
  withLine(ctx, 'conduct:network', () => {
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
    for (const u of units) headings.set(targetKey(unitTarget(u)), heading);
    const conducted: Flow = { ...flow, headings };
    for (const u of units) if (isAlive(u)) runPart(ctx, part, unitTarget(u), conducted);
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
  runPart(ctx, part, t, flow);
  if (!at || flow.repeated) return [t];
  const wait = (): void =>
    schedule(ctx, {
      when: 'ownerTurn',
      owner: flow.caster,
      step: part,
      target: { kind: 'tile', at: { ...at } },
      heading: headingFor(flow, t),
      origin: flow.origin,
      kind: 'repeat',
      solvent: flow.solvent,
    });
  if (unitAt(ctx.s, at)) wait();
  else withLine(ctx, 'repeat:empty', wait);
  return [t];
}

/**
 * Margin's echo (an Aura): an Action on a path touching a Margin happens again next turn on the
 * same tile, exactly as a Repeat does. `resolve.ts` calls this after each Action on a target
 * that stood at `at`. A repeat coming due, and a Repeat itself, are not echoed (limit 5).
 */
export function marginEcho(ctx: Ctx, rune: RuneRef, t: Target, at: Coord, flow: Flow): void {
  if (flow.repeated || flow.auras.length === 0) return;
  const lib = ctx.s.inventions;
  const touching = flow.auras.some((a: AuraRef) => defOf(a, lib)?.method === 'margin');
  if (!touching || isRepeat(rune, lib)) return;
  const wait = (): void =>
    schedule(ctx, {
      when: 'ownerTurn',
      owner: flow.caster,
      step: rune,
      target: { kind: 'tile', at: { ...at } },
      heading: headingFor(flow, t),
      origin: flow.origin,
      kind: 'margin',
      solvent: flow.solvent,
    });
  if (unitAt(ctx.s, at)) wait();
  else withLine(ctx, 'margin:empty', wait);
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
  runPart(ctx, carrier, t, flow);
  if (!unit) {
    withLine(ctx, 'bind:empty', () => emit(ctx, { type: 'miss', source: 'Bind' }));
    return [t];
  }
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

/**
 * Runs an invention on one target (the handler `handlerFor` gives an `inv:` rune). The invention's
 * parts run one level deeper than it; its solvent travels in `flow.solvent`, where the actions
 * read their bonuses, and the solvent's own hooks are applied here (E8 fills `SOLVENT_RULES`):
 * `widen` picks the targets, `onReach` runs on each unit or tile reached, `after` once per target.
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
  const inner: Flow = { ...flow, depth: flow.depth + 1, solvent: def.solvent ?? flow.solvent };
  const rule = inner.solvent ? SOLVENT_RULES[inner.solvent] : undefined;
  const targets = rule?.widen ? rule.widen(ctx.s, t, inner) : [t];
  for (const tt of targets) {
    const reached = invoke(ctx, def, tt, inner);
    for (const r of reached) rule?.onReach?.(ctx, r, inner);
    rule?.after?.(ctx, tt, inner);
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
