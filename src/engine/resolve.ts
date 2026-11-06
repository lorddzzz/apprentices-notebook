import { isInvention, RUNES, type RuneRef } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, fizzled, inCastScope, ref, withLine, withOrigin } from './ctx';
import { dealDamage } from './damage';
import type { NodeSpan } from './events';
import { hasFootnote } from './footnotes';
import { type Coord, type Dir, key, label, neighbors4, sameCoord, step } from './grid';
import { habitOf, ruleOf, withHabit } from './habits';
import { marginEcho } from './inventions';
import { sealJar } from './jars';
import { giftedAuras } from './leans';
import { layThinCloud } from './mix';
import { sameStateNet } from './networks';
import { hitPiece } from './pieces';
import {
  blockerName,
  findUnit,
  giftedIn,
  inBoard,
  isCloud,
  longTouchOver,
  tileAt,
  unitAt,
} from './queries';
import { handlerFor } from './runes';
import { forkSide, isForked, jarFor, reheaded, seep, toll, trial } from './runes/flow';
import { aimLine, aimTargets, boltTravel, targetOn, tilesBetween, whereIs } from './targets';
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
import { takesCloud, type VatPlan, vatPlan } from './vatPlan';

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
    // `bend-cap-turn` / `bend-cap-back`: the Bends just crossed turn (or reverse) the heading.
    if (st.turn) {
      const quarter = hasFootnote(ctx, 'bend-cap-turn')
        ? st.turn
        : hasFootnote(ctx, 'bend-cap-back')
          ? 2
          : 0;
      if (quarter) flow = { ...flow, headings: reheaded(flow.headings, quarter) };
    }
    let live = targets.filter((t) => whereIs(s, t) !== null);
    // `bolt-cap-onward`: a Bolt's target that died hands the rest on to the next unit along the line.
    if (flow.src === 'bolt' && hasFootnote(ctx, 'bolt-cap-onward')) {
      const more: Target[] = [];
      const way = new Map<string, Dir | null>();
      for (const t of targets) {
        if (t.kind !== 'unit' || whereIs(s, t) !== null) continue;
        const dead = findUnit(s, t.unit);
        const dir = flow.headings.get(targetKey(t)) ?? null;
        if (!dead || !dir) continue;
        let at = dead.pos;
        for (let i = 0; i < 8; i++) {
          at = step(at, dir);
          const next = unitAt(s, at);
          if (next) {
            const nt: Target = { kind: 'unit', unit: next.id };
            more.push(nt);
            way.set(targetKey(nt), dir);
            break;
          }
        }
      }
      if (more.length) {
        flow = { ...flow, headings: reheaded(flow.headings, 0, way) };
        live = [...live, ...more];
      }
    }
    // `splash-cap-trail`: a kind lands on the tiles between the caster and the Splash's centre too.
    const origin0 = findUnit(s, flow.caster);
    if (
      st.role === 'kind' &&
      flow.src === 'splash' &&
      flow.centre &&
      origin0 &&
      hasFootnote(ctx, 'splash-cap-trail')
    ) {
      const trail: Target[] = tilesBetween(origin0.pos, flow.centre).map((at) => ({
        kind: 'tile',
        at,
      }));
      live = [...live, ...trail.filter((t) => !live.some((x) => targetKey(x) === targetKey(t)))];
    }
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
        let sawUnit = false;
        const forked = st.role === 'action' && isForked(flow.headings);
        for (const t of live) {
          if (fizzled(ctx)) return;
          const at = whereIs(s, t);
          if (!at) continue; // died under an earlier target's hit
          if (t.kind === 'unit') acted.add(t.unit);
          else if (st.role === 'action') {
            const u = unitAt(s, at);
            if (u && acted.has(u.id)) continue; // pushed onto this tile in this very step
          }
          const standing = t.kind === 'unit' || unitAt(s, at) !== null;
          if (standing) sawUnit = true;
          withOrigin(ctx, stepOrigin, () => {
            const run = (): void => {
              if (handler && forked && standing) {
                withLine(ctx, 'fork:unit', () => handler(ctx, t, here, st));
              } else handler?.(ctx, t, here, st);
            };
            // `seep:member`: your own party beside a Seep target; `seep-member-guard` guards it instead.
            if (standing && flow.seep?.members.includes(targetKey(t))) {
              const guarding = st.role === 'action' && hasFootnote(ctx, 'seep-member-guard');
              withLine(ctx, 'seep:member', () =>
                guarding ? handlerOf('guard')?.(ctx, t, here, st) : run(),
              );
            } else run();
            if (st.role === 'action' || hasFootnote(ctx, 'margin-cap-kinds')) {
              marginEcho(ctx, st.rune, t, at, here);
            }
          });
        }
        // A Strike or Guard that found nobody anywhere in its targets says so, once.
        const rune = st.rune;
        if (!sawUnit && st.role === 'action' && (rune === 'strike' || rune === 'guard')) {
          withLine(ctx, `${rune}:empty`, () =>
            emit(ctx, { type: 'miss', source: RUNES[rune].name }),
          );
        }
        span();
        // `strike-cap-finish`: a Strike that killed its target hands the rest to the nearest unit beside it.
        let onward = live;
        let nextFlow = flow;
        if (st.role === 'action' && st.rune === 'strike' && hasFootnote(ctx, 'strike-cap-finish')) {
          const more: Target[] = [];
          const way = new Map<string, Dir | null>();
          for (const t of live) {
            const dead = t.kind === 'unit' ? findUnit(s, t.unit) : null;
            if (!dead || dead.hp > 0) continue;
            const near = neighbors4(dead.pos)
              .sort((a, b) => a.y - b.y || a.x - b.x)
              .flatMap((at) => unitAt(s, at) ?? [])
              .find((u) => u.id !== flow.caster);
            if (!near) continue;
            const nt: Target = { kind: 'unit', unit: near.id };
            more.push(nt);
            way.set(targetKey(nt), flow.headings.get(targetKey(t)) ?? null);
          }
          if (more.length) {
            onward = [...live, ...more];
            nextFlow = { ...flow, headings: reheaded(flow.headings, 0, way) };
          }
        }
        // `seep-cap-chain`: a neighbour Seep's rest defeated lets it act on that one's neighbours, once.
        if (
          st.role === 'action' &&
          flow.seep &&
          !flow.seep.chained &&
          hasFootnote(ctx, 'seep-cap-chain')
        ) {
          const more: Target[] = [];
          const way = new Map<string, Dir | null>();
          const taken = new Set(live.map(targetKey));
          for (const t of live) {
            if (t.kind !== 'unit' || !flow.seep.neighbours.includes(targetKey(t))) continue;
            const fallen = findUnit(s, t.unit);
            if (!fallen || fallen.hp > 0) continue;
            for (const c of neighbors4(fallen.pos)) {
              if (!inBoard(s, c)) continue;
              const nt = targetOn(s, c);
              if (taken.has(targetKey(nt))) continue;
              taken.add(targetKey(nt));
              more.push(nt);
              way.set(targetKey(nt), flow.headings.get(targetKey(t)) ?? null);
            }
          }
          if (more.length) {
            queue(st, more, {
              ...flow,
              headings: reheaded(flow.headings, 0, way),
              seep: { ...flow.seep, chained: true },
            });
          }
        }
        queue(st.next, onward, nextFlow);
        return;
      }
      case 'fork': {
        let left = forkSide(s, live, flow.headings, 'left', ctx.footnotes);
        let right = forkSide(s, live, flow.headings, 'right', ctx.footnotes);
        // `fork-cap-pinch`: when both branches push units they push toward the target.
        if (
          hasFootnote(ctx, 'fork-cap-pinch') &&
          carriesShove(st.left) &&
          carriesShove(st.right) &&
          hasUnits(s, left.targets) &&
          hasUnits(s, right.targets)
        ) {
          left = forkSide(s, live, flow.headings, 'left', ctx.footnotes, true);
          right = forkSide(s, live, flow.headings, 'right', ctx.footnotes, true);
        }
        const ahead = ruleOf(flow.habit).forkAhead
          ? forkSide(s, live, flow.headings, 'ahead', ctx.footnotes)
          : null;
        if (left.blind > 0) {
          withLine(ctx, 'fork:noHeading', () => emit(ctx, { type: 'miss', source: 'Fork' }));
        }
        if (left.off + right.off > 0) {
          withLine(ctx, 'fork:edge', () => emit(ctx, { type: 'miss', source: 'Fork' }));
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
        const seeped =
          st.rune === 'seep'
            ? seep(s, live, flow.headings, ctx.footnotes, findUnit(s, flow.caster) ?? null)
            : null;
        const aimed = seeped ?? toll(s, live, flow.headings, seams.sameStateNet ?? sameStateNet);
        if (seeped && seeped.off > 0) {
          withLine(ctx, 'seep:edge', () => emit(ctx, { type: 'miss', source: 'Seep' }));
        }
        span();
        queue(st.next, aimed.targets, {
          ...flow,
          headings: aimed.headings,
          ...(seeped ? { seep: { members: seeped.members, neighbours: seeped.neighbours } } : {}),
        });
        return;
      }
      case 'trigger': {
        const trials = live.map((t) => ({ t, r: trial(s, st.rune, t, flow) }));
        const through = trials.filter((x) => x.r.pass).map((x) => x.t);
        const verdict = () =>
          emit(ctx, { type: 'triggered', rune: st.rune, passed: through.length > 0 });
        // The habit's headline when it let a target through (AH P11), its fine print when met.
        const byHabit = flow.habit && trials.some((x) => x.r.byHabit) ? flow.habit : null;
        const line = trials.find((x) => x.r.line)?.r.line ?? null;
        const tagged = byHabit ? () => withHabit(ctx, byHabit, verdict) : verdict;
        if (line) withLine(ctx, line, tagged);
        else tagged();
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

/** Whether a branch has a Shove anywhere along it. */
function carriesShove(st: Step | null): boolean {
  for (let cur = st; cur; ) {
    if (cur.role === 'action' && cur.rune === 'shove') return true;
    if (cur.role === 'fork') return carriesShove(cur.left) || carriesShove(cur.right);
    if (cur.role === 'split') return cur.branches.some(carriesShove);
    if (cur.role === 'seal') return false;
    cur = cur.next;
  }
  return false;
}

const hasUnits = (s: BattleState, targets: readonly Target[]): boolean =>
  targets.some((t) => {
    const at = whereIs(s, t);
    return t.kind === 'unit' || (at !== null && unitAt(s, at) !== null);
  });

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
  // The foundry's (BF-0; `FOUNDRY_MEANINGFUL_TYPES`): a strike, a ring, a pulse, a retune, a muffle, a rung bell.
  'foundry:bellStruck',
  'foundry:ring',
  'foundry:pulse',
  'foundry:retuned',
  'foundry:muffled',
  'foundry:bellRung',
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
function flight(ctx: Ctx, caster: Unit, aim: Aim, gifted: boolean): Coord | null {
  if (aim.kind !== 'dir') return null;
  const r = boltTravel(ctx.s, caster, aim.dir, gifted, ctx.footnotes);
  const name = RUNES.bolt.name;
  switch (r.reason) {
    case 'none':
      emit(ctx, { type: 'miss', source: name });
      return null;
    case 'cloud':
      withLine(ctx, 'bolt:cloud', () => {
        emit(ctx, { type: 'stopped', source: name, at: r.stop, by: 'cloud', path: r.path });
      });
      return r.stop;
    case 'blocked': {
      const by = blockerName(tileAt(ctx.s, r.stop));
      withLine(ctx, 'bolt:plate', () => {
        emit(ctx, { type: 'stopped', source: name, at: r.stop, by, path: r.path });
      });
      hitPiece(ctx, r.stop);
      return null;
    }
    case 'unit':
      // `bolt-cloud-through` stamps its own line on the shot that passed a cloud.
      if (r.through) {
        withLine(ctx, 'bolt:cloud', () =>
          emit(ctx, { type: 'lands', source: name, at: r.stop, path: r.path }),
        );
      } else emit(ctx, { type: 'lands', source: name, at: r.stop, path: r.path });
      return null;
    case 'end':
      withLine(ctx, r.through ? 'bolt:cloud' : 'bolt:empty', () => {
        emit(ctx, { type: 'lands', source: name, at: r.stop, path: r.path });
      });
      hitPiece(ctx, r.stop);
      return null;
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
  const glyphs = new Map<string, GlyphId>();
  for (const c of spell.cells ?? []) if (c.glyph) glyphs.set(key(c.at), c.glyph);
  const landed = { caster: caster.id, targets: [] as string[] };
  const clear: { at: Coord | null } = { at: null };
  // Span offsets count from the first effect event, right after `cast` (M2).
  const rec: Recorder = { from: ctx.log.length + 1, ran: [], spans: [], glyphs, landed };
  withOrigin(ctx, origin, () => {
    inCastScope(ctx, () => castBody());
    // `bolt-cloud-clear`: the cloud that stopped the Bolt thins once the spell has ended.
    if (clear.at && hasFootnote(ctx, 'bolt-cloud-clear')) {
      const at = clear.at;
      const tile = tileAt(ctx.s, at);
      if (isCloud(tile)) {
        tile.state = null;
        withLine(ctx, 'bolt:cloud', () => emit(ctx, { type: 'stateFades', tiles: [{ ...at }] }));
      }
    }
    if (caster.kind === 'member') {
      emit(ctx, {
        type: 'trace',
        caster: ref(caster),
        spell: spell.key,
        cells: firedCells(spell, rec.ran),
        meaningful: ctx.log.slice(rec.from).some((e) => MEANINGFUL.has(e.type)),
        spans: rec.spans,
      });
    }
  });

  function castBody(): void {
    emit(ctx, {
      type: 'cast',
      caster: ref(caster),
      spell: RUNES[spell.source].name,
      aim: cloneData(aim),
      aimText: aimText(aim),
    });
    const from = ctx.log.length;
    rec.from = from;
    const gifted = giftedIn(caster, spell.source);
    const { targets, headings } = aimTargets(s, caster, spell.source, aim, gifted, ctx.footnotes);
    const first = targets[0];
    const aimed = () =>
      emit(ctx, {
        type: 'aimed',
        source: spell.source,
        targets: cloneData(targets),
        heading: first ? (headings.get(targetKey(first)) ?? null) : null,
      });
    const over =
      spell.source === 'touch' && aim.kind === 'tile' ? longTouchOver(caster.pos, aim.at) : null;
    const habit = habitOf(caster);
    if (over && habit) {
      // A long Touch is the habit's headline (AH P11, P17); what it passed over is fine print.
      const line = unitAt(s, over)
        ? 'longTouch:unit'
        : isCloud(tileAt(s, over))
          ? 'longTouch:cloud'
          : null;
      withHabit(ctx, habit, () => (line ? withLine(ctx, line, aimed) : aimed()));
    } else {
      const line = aimLine(caster, spell.source, aim, targets, ctx.footnotes, s);
      if (line) withLine(ctx, line, aimed);
      else aimed();
    }
    if (spell.source === 'bolt') clear.at = flight(ctx, caster, aim, gifted);
    landed.targets = targets.map(targetKey);
    s.landed.push(landed);
    rec.spans.push(sourceSpan(spell, from, ctx.log.length));
    recorders.set(origin, rec);
    const flow: Flow = {
      caster: caster.id,
      origin,
      snapshot,
      headings,
      lay: false,
      gifted: false,
      solvent: null,
      habit: habitOf(caster),
      depth: 0,
      auras: spell.sourceAuras,
      src: spell.source,
      ...(spell.source === 'splash' && aim.kind === 'tile' ? { centre: { ...aim.at } } : {}),
      ...(spell.source === 'splash'
        ? {
            area: targets.flatMap((t) => {
              const at = whereIs(s, t);
              return (at && unitAt(s, at)?.id) || [];
            }),
          }
        : {}),
    };
    const vat =
      spell.source === 'vat' && aim.kind === 'tile'
        ? vatPlan(s, caster, aim.at, ctx.footnotes)
        : null;
    if (vat?.weaker) flow.weaker = vat.weaker; // `vat-edge-press`: stronger, by the tiles lost
    runStep(ctx, spell.first, targets, flow);
    if (vat) afterVat(ctx, vat, spell, flow);
  }
}

/** What a Vat adds once its rest has run: the ring (`vat-cap-room`), clouds, the crowd's toll. */
function afterVat(ctx: Ctx, vat: VatPlan, spell: Spell, flow: Flow): void {
  if (fizzled(ctx)) return;
  // `vat-cap-room`: the rest also acts on the ring around the square, one step weaker.
  if (vat.ring) {
    const weaker = Math.max(0, flow.weaker ?? 0) + 1;
    runStep(ctx, spell.first, vat.ring.targets, { ...flow, headings: vat.ring.headings, weaker });
  }
  // `vat-unit-fill`: a tile that was empty and still is takes a thin cloud for a round.
  for (const at of vat.fill) if (takesCloud(ctx, at)) layThinCloud(ctx, at, flow.origin);
  // `vat-cap-crowd`: two or more foes in the Vat each take 1 per other foe, at most 2.
  const crowd = vat.crowd;
  const caster = findUnit(ctx.s, flow.caster);
  for (const foe of crowd) {
    dealDamage(ctx, foe, Math.min(2, crowd.length - 1), RUNES.vat.name, [], {
      heading: null,
      at: caster ? { ...caster.pos } : null,
    });
  }
}
