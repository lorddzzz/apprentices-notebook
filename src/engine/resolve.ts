import { isInvention, RUNES, type RuneRef } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, fizzled, ref, withLine, withOrigin } from './ctx';
import type { NodeSpan } from './events';
import { type Coord, key, label, sameCoord } from './grid';
import { marginEcho } from './inventions';
import { sealJar } from './jars';
import { giftedAuras } from './leans';
import { sameStateNet } from './networks';
import { findUnit, giftedIn, unitAt } from './queries';
import { handlerFor } from './runes';
import { forkSide, jarFor, passes, seep, toll } from './runes/flow';
import { aimTargets, boltTravel, whereIs } from './targets';
import type {
  Aim,
  BattleState,
  FiredCell,
  Flow,
  GlyphId,
  Origin,
  Snapshot,
  Spell,
  Step,
  Target,
  Unit,
  UnitId,
} from './types';
import { targetKey } from './types';

export { aimTargets, boltTravel, whereIs };

/**
 * Spell resolution (design §3, plan §2.4). `resolveSpell` emits `cast`, aims, snapshots the board
 * and walks the Step tree with `runStep` (R3–R9: wiring order, Fork sides, shapes, triggers,
 * seals); `targets.ts` aims and `runes/*.ts` say what one rune does to one target.
 */

/** What one Action or Kind does to one target (runes/actions.ts, runes/kinds.ts). */
export type Handler = (ctx: Ctx, t: Target, flow: Flow, step: Step) => void;

/** An invention inside an invention is as deep as a cast goes (design §6.4 limit 1). */
export const NEST_LIMIT = 1;

/**
 * Test seam: swap the pieces other tasks own (handlers, jars, networks) for fakes. Production code
 * never sets it; `withSeams` restores the previous table when the callback ends.
 */
export interface Seams {
  handlerFor?: (rune: RuneRef) => Handler | null;
  sealJar?: typeof sealJar;
  sameStateNet?: typeof sameStateNet;
}
let seams: Seams = {};
export function withSeams<T>(patch: Seams, fn: () => T): T {
  const prev = seams;
  seams = { ...prev, ...patch };
  try {
    return fn();
  } finally {
    seams = prev;
  }
}

/** What a cast has recorded so far: steps that ran, their spans, and its row in `landed` (P26). */
interface Recorder {
  from: number; // log index of the cast's first effect event
  ran: Step[];
  spans: NodeSpan[];
  glyphs: ReadonlyMap<string, GlyphId>; // a Glyph socket's key → its id
  landed: { caster: UnitId; targets: string[] };
}
/** By origin: every copy of a flow shares its cast's origin object. */
const recorders = new WeakMap<Origin, Recorder>();

/** A flow nobody set up (a jar opening, a repeat) gets its recorder and `landed` row on first use. */
function recorderOf(ctx: Ctx, flow: Flow): Recorder {
  let rec = recorders.get(flow.origin);
  if (!rec) {
    const landed = { caster: flow.caster, targets: [] as string[] };
    ctx.s.landed.push(landed);
    rec = { from: ctx.log.length, ran: [], spans: [], glyphs: new Map(), landed };
    recorders.set(flow.origin, rec);
  }
  return rec;
}

/** One step's own stretch of the log, from log index `begin` to now (M2). */
function spanOf(ctx: Ctx, rec: Recorder, st: Step, begin: number): NodeSpan {
  const glyph = st.inner ? (st.glyph ?? rec.glyphs.get(key(st.at))) : undefined;
  return {
    at: { ...st.at },
    ...(st.inner ? { inner: { ...st.inner } } : {}),
    ...(glyph ? { glyph } : {}),
    ...(st.viaInner && st.viaInner.length > 0
      ? { viaInner: st.viaInner.map((c) => ({ ...c })) }
      : {}),
    from: begin - rec.from,
    to: ctx.log.length - rec.from,
  };
}

const handlerOf = (rune: RuneRef): Handler | null => (seams.handlerFor ?? handlerFor)(rune);

/** An invention is gifted through its parts (E7); only authored runes know their school here. */
const giftedFor = (caster: Unit | null, rune: RuneRef): boolean =>
  caster !== null && !isInvention(rune) && giftedIn(caster, rune);

/**
 * Run one step (and what follows it) on targets, in order (R3, R5, R7, R9). Each Action or Kind
 * runs on every target before the next step starts; a unit target follows its unit and a dead
 * one drops out; Fork, Seep and Toll rebuild the target list; a Trigger lets targets through or
 * ends the branch; a Seal hands everything after it to a jar. Earlier effects always stay.
 */
export function runStep(ctx: Ctx, st: Step | null, targets: readonly Target[], flow: Flow): void {
  const pending: { step: Step; targets: readonly Target[]; flow: Flow }[] = [];
  const queue = (step: Step | null, targets: readonly Target[], flow: Flow): void => {
    if (step) pending.push({ step, targets, flow });
  };
  queue(st, targets, flow);
  while (pending.length && !fizzled(ctx)) {
    const job = pending.pop();
    if (job) one(job.step, job.targets, job.flow);
  }
  function one(st: Step, targets: readonly Target[], flow: Flow): void {
    if (!st || fizzled(ctx)) return;
    if (flow.depth > NEST_LIMIT) {
      emit(ctx, { type: 'fizzles', reason: 'depth' });
      return;
    }
    const s = ctx.s;
    const live = targets.filter((t) => whereIs(s, t) !== null);
    if (live.length === 0) return; // nothing left to act on
    const rec = recorderOf(ctx, flow);
    rec.ran.push(st);
    for (const t of live) {
      const k = targetKey(t);
      if (!rec.landed.targets.includes(k)) rec.landed.targets.push(k);
    }
    const begin = ctx.log.length;
    const glyph = st.inner ? (st.glyph ?? rec.glyphs.get(key(st.at))) : undefined;
    const stepOrigin: Origin = glyph
      ? { ...flow.origin, glyph, glyphAt: { ...st.at } }
      : flow.origin;
    recorders.set(stepOrigin, rec);
    const span = (): void => {
      rec.spans.push(spanOf(ctx, rec, st, begin));
    };

    switch (st.role) {
      case 'action':
      case 'kind': {
        const handler = handlerOf(st.rune);
        const here: Flow = {
          ...flow,
          origin: stepOrigin,
          gifted: giftedFor(findUnit(s, flow.caster), st.rune),
          auras: st.auras,
          giftedAuras: giftedAuras(findUnit(s, flow.caster), st.auras),
        };
        const acted = new Set<UnitId>(); // P23: a unit is acted on once per Action
        for (const t of live) {
          if (fizzled(ctx)) return;
          const at = whereIs(s, t);
          if (!at) continue; // died under an earlier target's hit
          if (t.kind === 'unit') acted.add(t.unit);
          else if (st.role === 'action') {
            const u = unitAt(s, at);
            if (u && acted.has(u.id)) continue; // pushed onto this tile in this very step
          }
          withOrigin(ctx, stepOrigin, () => {
            handler?.(ctx, t, here, st);
            if (st.role === 'action') marginEcho(ctx, st.rune, t, at, here);
          });
        }
        span();
        queue(st.next, live, flow);
        return;
      }
      case 'fork': {
        const left = forkSide(s, live, flow.headings, 'left');
        const right = forkSide(s, live, flow.headings, 'right');
        const ahead = flow.habit === 'forkAhead' ? forkSide(s, live, flow.headings, 'ahead') : null;
        if (left.blind > 0) {
          withLine(ctx, 'fork:noHeading', () => emit(ctx, { type: 'miss', source: 'Fork' }));
        }
        span();
        if (ahead) {
          // LIFO: ahead runs after the ordinary left and right branches.
          queue(st.right, ahead.targets, { ...flow, headings: ahead.headings });
          queue(st.left, ahead.targets, { ...flow, headings: ahead.headings });
        }
        queue(st.right, right.targets, { ...flow, headings: right.headings });
        queue(st.left, left.targets, { ...flow, headings: left.headings });
        return;
      }
      case 'shape': {
        if (st.rune === 'lay') {
          span();
          queue(st.next, live, { ...flow, lay: true });
          return;
        }
        const aimed =
          st.rune === 'seep'
            ? seep(s, live, flow.headings)
            : toll(s, live, flow.headings, seams.sameStateNet ?? sameStateNet);
        span();
        queue(st.next, aimed.targets, { ...flow, headings: aimed.headings });
        return;
      }
      case 'trigger': {
        const through = live.filter((t) => passes(s, st.rune, t, flow));
        emit(ctx, { type: 'triggered', rune: st.rune, passed: through.length > 0 });
        span();
        queue(st.next, through, flow);
        return;
      }
      case 'seal': {
        const seal = seams.sealJar ?? sealJar;
        for (const t of live) {
          const at = whereIs(s, t);
          if (at && st.rest)
            withOrigin(ctx, stepOrigin, () =>
              seal(ctx, at, jarFor(st.rune, st.rest, t, { ...flow, origin: stepOrigin })),
            );
        }
        span();
        return;
      }
      case 'split': {
        span();
        for (let i = st.branches.length - 1; i >= 0; i--) queue(st.branches[i] ?? null, live, flow);
        return;
      }
    }
  }
}

/** Record the cells reached when stored flow resumes, without creating another cast. */
export function runContinuation(
  ctx: Ctx,
  st: Step | null,
  targets: readonly Target[],
  flow: Flow,
): void {
  if (!st) return;
  const rec = recorderOf(ctx, flow);
  const before = rec.ran.length;
  const spanStart = rec.spans.length;
  const from = ctx.log.length;
  runStep(ctx, st, targets, flow);
  const caster = findUnit(ctx.s, flow.caster);
  const spell =
    caster?.kind === 'member' ? caster.spells.find((s) => s.key === flow.origin.spell) : null;
  if (!spell || !caster || rec.ran.length === before) return;
  emit(ctx, {
    type: 'trace',
    continued: true,
    caster: ref(caster),
    spell: spell.key,
    cells: firedCells(spell, rec.ran.slice(before)),
    meaningful: ctx.log.slice(from).some((e) => MEANINGFUL.has(e.type)),
    // Deferred harm is attributed by Origin; these spans only recover local fired cells.
    spans: rec.spans.slice(spanStart).map((s) => ({ ...s, from: 0, to: 0 })),
  });
}

/** "right" / "at C4" / "on himself": the aim as it reads in the log. */
function aimText(aim: Aim): string {
  switch (aim.kind) {
    case 'dir':
      return aim.dir;
    case 'tile':
      return `at ${label(aim.at)}`;
    case 'self':
      return 'on itself';
  }
}

/** The board as it stands, deep-copied (R8, P25). */
export function snapshotOf(s: BattleState): Snapshot {
  return cloneData({ tiles: s.tiles, units: s.units, landed: s.landed });
}

/** Event types that make a cast count toward proof (plan P6). */
export const MEANINGFUL: ReadonlySet<string> = new Set([
  'damage',
  'shieldGained',
  'shieldAbsorbs',
  'died',
  'landed',
  'mixed',
  'burst',
  'push',
  'crush',
  'dropped',
  'marked',
  'collared',
  'held',
  'swapped',
  'drawn',
  'erased',
  'jarSealed',
  'conducted',
  'markSpread',
  'released',
  'spreadState',
  'jarOpened',
  'markSpent',
  'scheduled',
]);

/** The source, every step that ran and the shape cells walked to reach it, once each (plan P7). */
export function firedCells(spell: Spell, ran: readonly Step[]): FiredCell[] {
  const known = new Map((spell.cells ?? []).map((c) => [key(c.at), c]));
  const dir = spell.path.find((p) => sameCoord(p.at, spell.at) && !p.inner)?.dir;
  const out: FiredCell[] = [];
  const seen = new Set<string>();
  const add = (at: Coord, fallback: FiredCell | null): void => {
    const cell = known.get(key(at)) ?? fallback;
    if (!cell || seen.has(key(at))) return;
    seen.add(key(at));
    out.push({ ...cell, at: { ...cell.at } });
  };
  add(spell.at, {
    at: spell.at,
    rune: spell.glyph ? null : spell.source,
    ...(dir ? { dir } : {}),
  });
  for (const step of ran) {
    for (const v of step.via ?? []) add(v, null);
    add(step.at, { at: step.at, rune: 'rune' in step ? step.rune : null });
  }
  return out;
}

/** The source's stretch of the log (M2): everything up to `to`, offsets from the cast's start. */
function sourceSpan(spell: Spell, from: number, to: number): NodeSpan {
  const inner = spell.glyph ? spell.path[0]?.inner : undefined;
  return {
    at: { ...spell.at },
    ...(inner && spell.glyph ? { inner: { ...inner }, glyph: spell.glyph } : {}),
    from: 0,
    to: to - from,
  };
}

/** The line's flight, for the log and its animation: where a Bolt lands or what stops it. */
function flight(ctx: Ctx, caster: Unit, aim: Aim, gifted: boolean): void {
  if (aim.kind !== 'dir') return;
  const r = boltTravel(ctx.s, caster, aim.dir, gifted, ctx.footnotes);
  const name = RUNES.bolt.name;
  switch (r.reason) {
    case 'none':
      emit(ctx, { type: 'miss', source: name });
      return;
    case 'cloud':
      withLine(ctx, 'bolt:cloud', () => {
        emit(ctx, { type: 'stopped', source: name, at: r.stop, by: 'cloud', path: r.path });
      });
      return;
    case 'blocked': {
      const t = ctx.s.tiles[r.stop.y * ctx.s.width + r.stop.x];
      const by = t?.terrain.gate ? 'lock gate' : t?.terrain.grate ? 'grate' : 'brass plate';
      withLine(ctx, 'bolt:plate', () => {
        emit(ctx, { type: 'stopped', source: name, at: r.stop, by, path: r.path });
      });
      return;
    }
    case 'unit':
      emit(ctx, { type: 'lands', source: name, at: r.stop, path: r.path });
      return;
    case 'end':
      withLine(ctx, 'bolt:empty', () => {
        emit(ctx, { type: 'lands', source: name, at: r.stop, path: r.path });
      });
      return;
  }
}

/** Cast a spell: emit `cast`, aim, snapshot, run the steps, emit `trace` (E1, R1–R9). */
export function resolveSpell(ctx: Ctx, caster: Unit, spell: Spell, aim: Aim): void {
  const s = ctx.s;
  s.castSeq++;
  const origin: Origin = {
    caster: caster.id,
    spell: spell.key,
    cast: s.castSeq,
    ...(spell.glyph ? { glyph: spell.glyph, glyphAt: { ...spell.at } } : {}),
  };
  const snapshot = snapshotOf(s);
  const outer = ctx.cast;
  ctx.cast = { events: 0, capped: false };
  withOrigin(ctx, origin, () => {
    emit(ctx, {
      type: 'cast',
      caster: ref(caster),
      spell: RUNES[spell.source].name,
      aim: cloneData(aim),
      aimText: aimText(aim),
    });
    // Span offsets count from the first effect event, right after `cast` (M2).
    const from = ctx.log.length;
    const gifted = giftedIn(caster, spell.source);
    const { targets, headings } = aimTargets(s, caster, spell.source, aim, gifted, ctx.footnotes);
    const first = targets[0];
    emit(ctx, {
      type: 'aimed',
      source: spell.source,
      targets: cloneData(targets),
      heading: first ? (headings.get(targetKey(first)) ?? null) : null,
    });
    if (spell.source === 'bolt') flight(ctx, caster, aim, gifted);
    const landed = { caster: caster.id, targets: targets.map(targetKey) };
    s.landed.push(landed);
    const glyphs = new Map<string, GlyphId>();
    for (const c of spell.cells ?? []) if (c.glyph) glyphs.set(key(c.at), c.glyph);
    const rec: Recorder = {
      from,
      ran: [],
      spans: [sourceSpan(spell, from, ctx.log.length)],
      glyphs,
      landed,
    };
    recorders.set(origin, rec);
    const flow: Flow = {
      caster: caster.id,
      origin,
      snapshot,
      headings,
      lay: false,
      gifted: false,
      solvent: null,
      habit: caster.kind === 'member' ? caster.lean.habit : null,
      depth: 0,
      auras: spell.sourceAuras,
    };
    runStep(ctx, spell.first, targets, flow);
    ctx.cast = outer;
    if (caster.kind === 'member') {
      emit(ctx, {
        type: 'trace',
        caster: ref(caster),
        spell: spell.key,
        cells: firedCells(spell, rec.ran),
        meaningful: ctx.log.slice(from).some((e) => MEANINGFUL.has(e.type)),
        spans: rec.spans,
      });
    }
  });
}
