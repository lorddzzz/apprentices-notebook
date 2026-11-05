import type { LineId, RuneRef, SolventId } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, inCastScope, ref, withLine, withOrigin } from './ctx';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, type Dir, neighbors4 } from './grid';
import { habitOf } from './habits';
import { jarLimit } from './leans';
import { coordOf, findUnit, inBoard, isAlive, livingUnits, tileAt, unitAt } from './queries';
import { runContinuation, runStep, snapshotOf } from './resolve';
import type { Flow, Jar, Origin, SealedContext, Step, Target, Unit, UnitId } from './types';
import { targetKey } from './types';

/** The Lamplighter's Jar note (footnotes §1 "Rival notes", RV-20b): written, rivals trip your jars. */
export const WICK_NOTE = 'lamplighter:wick';

/**
 * Whether a unit's own step opens the step-jar under it. Foes and members always do (J5). A rival
 * treads carefully over a jar that is not his own unless the household has written the Lamplighter's
 * Jar note; shoves, pulls and the rest still open it, and the contents stay the owner's either way.
 */
export function stepOpens(ctx: Ctx, opener: Unit, jar: Jar, cause: string): boolean {
  if (opener.kind === 'member' && ownedByMember(ctx, jar) && hasFootnote(ctx, 'jar-unit-kin'))
    return false; // `jar-unit-kin`: your jar stays shut under you and your allies
  if (cause !== 'walk' || opener.kind !== 'enemy' || !opener.rival || jar.owner === opener.id)
    return true;
  return hasFootnote(ctx, WICK_NOTE);
}

/** A jar sealed by one of the party: the household's margins bend only these. */
export const ownedByMember = (ctx: Ctx, jar: Jar): boolean =>
  findUnit(ctx.s, jar.owner)?.kind === 'member';

/** Where the jar with this id lies now (a carried or drifted jar is not where it was sealed). */
function jarTile(ctx: Ctx, id: number | undefined): Coord | null {
  const i = ctx.s.tiles.findIndex((t) => t.jar !== null && t.jar.id === id);
  return i < 0 ? null : coordOf(ctx.s, i);
}

/** The first rune of a step chain: what a jar's contents peek shows. */
export function firstRune(step: Step | null): RuneRef | null {
  if (!step) return null;
  switch (step.role) {
    case 'action':
    case 'kind':
    case 'trigger':
    case 'shape':
    case 'seal':
      return step.rune;
    case 'fork':
      return firstRune(step.left) ?? firstRune(step.right);
    case 'split':
      for (const b of step.branches) {
        const r = firstRune(b);
        if (r) return r;
      }
      return null;
  }
}

/**
 * Jars (design §7, plan P32): one per owner, opened by a step onto their tile or at dusk. What a
 * jar holds runs as a new moment (P25): a fresh snapshot, the sealing cast's heading and origin.
 */

/**
 * What a delayed run keeps of the flow that sealed it (P9): the step's auras, the caster's gifted
 * auras, Fog's weakness and the habit. `woken` and `repeated` stay behind (limit 5, nested Wick).
 */
export function sealedContext(flow: Flow): SealedContext {
  return {
    auras: [...flow.auras],
    ...(flow.giftedAuras?.length ? { giftedAuras: [...flow.giftedAuras] } : {}),
    ...(flow.weaker ? { weaker: flow.weaker } : {}),
    habit: flow.habit,
  };
}

/**
 * Runs `step` for `caster` on a target with a flow of its own: a jar opening, a repeat coming due.
 * It has its own event cap; the outer cast's scope is restored afterwards. A repeat coming due
 * passes `repeated` (it can't schedule again, design §6.4 limit 5) and its flavour; a Wick
 * coming due passes `woken` (it has waited). `context` is what the first cast sealed (P9): the
 * run starts with it instead of bare.
 */
export function runDetached(
  ctx: Ctx,
  step: Step | null,
  target: Target,
  caster: UnitId,
  origin: Origin,
  heading: Dir | null,
  extra: {
    repeated?: boolean;
    woken?: boolean;
    solvent?: SolventId | null;
    trace?: boolean;
    context?: SealedContext;
  } = {},
): void {
  const sealed = extra.context;
  const unit = findUnit(ctx.s, caster);
  const flow: Flow = {
    caster,
    origin,
    snapshot: snapshotOf(ctx.s),
    headings: new Map([[targetKey(target), heading]]),
    lay: false,
    gifted: false,
    solvent: extra.solvent ?? null,
    habit: sealed ? sealed.habit : unit ? habitOf(unit) : null,
    depth: 0,
    auras: sealed ? [...sealed.auras] : [],
    ...(sealed?.giftedAuras ? { giftedAuras: [...sealed.giftedAuras] } : {}),
    ...(sealed?.weaker ? { weaker: sealed.weaker } : {}),
    ...(extra.repeated ? { repeated: true } : {}),
    ...(extra.woken ? { woken: true } : {}),
  };
  inCastScope(ctx, () =>
    withOrigin(ctx, origin, () =>
      (extra.trace === false ? runStep : runContinuation)(ctx, step, [target], flow),
    ),
  );
}

/** The owner's jars on the board, oldest first; `event` keeps only Jars or only Fuses. */
function jarsOf(ctx: Ctx, owner: UnitId, event?: Jar['event']): Coord[] {
  const out: { at: Coord; seq: number }[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.jar?.owner === owner && (!event || t.jar.event === event))
      out.push({ at: coordOf(ctx.s, i), seq: t.jar.seq ?? 0 });
  });
  return out.sort((a, b) => a.seq - b.seq).map((j) => j.at);
}

/** The next jar id (P10): the battle's counter, or past every jar on an old save's board. */
function takeJarId(ctx: Ctx): number {
  const id =
    ctx.s.nextJar ??
    Math.max(0, ...ctx.s.tiles.map((t) => Math.max(t.jar?.id ?? 0, t.jar?.seq ?? 0))) + 1;
  ctx.s.nextJar = id + 1;
  return id;
}

/** The sealing rune's line for a jar: a step-jar is Jar's, a dusk-jar Fuse's (CN-F1). */
const jarLine = (jar: Jar, meets: 'jar' | 'unit'): LineId =>
  jar.event === 'dusk' ? `fuse:${meets}` : `jar:${meets}`;

/** What a footnote changes about how a jar opens (CN-F3). */
export interface OpenOpts {
  /** Replaces the sealing cast's heading for this run (`jar-unit-pushed`, a drifted Fuse). */
  heading?: Dir | null;
  /** The line the `jarOpened` event carries, unless a line already explains it. */
  line?: LineId;
}

/**
 * A new jar crumbles an old one (`jar:jar`, `fuse:jar`), unless a line already explains why.
 * `jar-jar-spill`: your own old jar opens instead, on whoever stands there.
 */
function crumble(ctx: Ctx, at: Coord, by: Jar): void {
  const old = tileAt(ctx.s, at).jar;
  const line = jarLine(by, 'jar');
  if (
    old &&
    old.owner === by.owner &&
    ownedByMember(ctx, old) &&
    hasFootnote(ctx, 'jar-jar-spill')
  ) {
    openJar(ctx, at, null, { line });
    return;
  }
  tileAt(ctx.s, at).jar = null;
  const go = () => emit(ctx, { type: 'jarCrumbles', at: { ...at } });
  if (ctx.meta.line) go();
  else withLine(ctx, line, go);
}

/**
 * Seals a jar on a tile: the owner's oldest jar crumbles empty once they would keep more than
 * `jarLimit` (one; two with the Draughtsman's habit), and so does any jar already there (J4, P32).
 * The `jar:jar` margins bend this: stack (your own jar there opens first), keep (at the limit the
 * new jar fizzles), share (Jars and Fuses each keep their own limit); `jar-unit-standing` opens a
 * step jar sealed under a unit; `fuse-unit-follow` and `-late` mark a Fuse.
 */
export function sealJar(ctx: Ctx, at: Coord, jar: Jar): void {
  const owner = findUnit(ctx.s, jar.owner);
  if (!owner) return;
  const party = owner.kind === 'member';
  const note = (id: string): boolean => party && hasFootnote(ctx, id);
  const here = tileAt(ctx.s, at).jar;
  if (here && here.owner === jar.owner && note('jar-jar-stack'))
    openJar(ctx, at, null, { line: jarLine(jar, 'jar') });
  // A jar of theirs already on this tile is replaced below, so it doesn't count against the limit.
  const kind = note('jar-jar-share') ? jar.event : undefined;
  const mine = jarsOf(ctx, jar.owner, kind).filter((c) => c.x !== at.x || c.y !== at.y);
  if (note('jar-jar-keep') && mine.length >= jarLimit(owner)) {
    withLine(ctx, jarLine(jar, 'jar'), () => emit(ctx, { type: 'jarCrumbles', at: { ...at } }));
    return;
  }
  while (mine.length >= jarLimit(owner)) {
    const old = mine.shift();
    if (old) crumble(ctx, old, jar);
  }
  if (tileAt(ctx.s, at).jar) crumble(ctx, at, jar);
  const id = takeJarId(ctx);
  const sealed: Jar = { ...cloneData(jar), id, seq: id };
  if (jar.event === 'dusk') {
    const under = unitAt(ctx.s, at);
    if (note('fuse-unit-follow') && under && isAlive(under) && under.kind === 'enemy')
      sealed.carrier = under.id;
    if (note('fuse-unit-late')) sealed.dusks = 0;
  }
  tileAt(ctx.s, at).jar = sealed;
  emit(ctx, {
    type: 'jarSealed',
    at: { ...at },
    owner: ref(owner),
    event: jar.event,
    id,
    peek: firstRune(jar.rest),
  });
  const standing = unitAt(ctx.s, at);
  if (
    jar.event === 'step' &&
    !jar.resealed &&
    standing &&
    isAlive(standing) &&
    note('jar-unit-standing')
  )
    openJar(ctx, at, standing.id);
}

/**
 * Opens the jar on a tile (it is used up): its rest runs on the unit standing there, else the tile.
 * A step onto a step-jar opens it through the arrival pipeline's `stepJar` hook (J5, arrival.ts).
 * The capstones add to the run: `jar-cap-ring` (the first unit beside the opener), `jar-cap-reseal`
 * (the jar seals once more) and `fuse-cap-reach` (the nearest unit within 2 of an empty tile).
 */
export function openJar(ctx: Ctx, at: Coord, by: UnitId | null = null, opts: OpenOpts = {}): void {
  const tile = tileAt(ctx.s, at);
  const jar = tile.jar;
  if (!jar) return;
  tile.jar = null;
  const unit = (by ? findUnit(ctx.s, by) : null) ?? unitAt(ctx.s, at);
  const opener = unit && isAlive(unit) && unit.pos.x === at.x && unit.pos.y === at.y ? unit : null;
  const open = () =>
    withOrigin(ctx, jar.origin, () =>
      emit(ctx, { type: 'jarOpened', at: { ...at }, by: opener ? ref(opener) : null }),
    );
  // A jar opened under someone other than its owner is the fine print of `jar:unit` (a Fuse's
  // at dusk, of `fuse:unit`); a footnote that opened it early names its own line.
  const line = ctx.meta.line ? undefined : opts.line;
  if (line) withLine(ctx, line, open);
  else if (opener && opener.id !== jar.owner) withLine(ctx, jarLine(jar, 'unit'), open);
  else open();
  const heading = opts.heading !== undefined ? opts.heading : jar.heading;
  const run = (target: Target) =>
    runDetached(ctx, jar.rest, target, jar.owner, jar.origin, heading, {
      ...(jar.context ? { context: jar.context } : {}),
    });
  run(opener ? { kind: 'unit', unit: opener.id } : { kind: 'tile', at: { ...at } });
  if (!ownedByMember(ctx, jar)) return;
  if (opener && jar.event === 'step' && hasFootnote(ctx, 'jar-cap-ring')) {
    const next = neighbors4(at)
      .filter((c) => inBoard(ctx.s, c))
      .sort(byReadingOrder)
      .map((c) => unitAt(ctx.s, c))
      .find((u) => u && isAlive(u) && u.id !== opener.id);
    if (next) run({ kind: 'unit', unit: next.id });
  }
  if (!opener && jar.event === 'dusk' && hasFootnote(ctx, 'fuse-cap-reach')) {
    const dist = (u: Unit) => Math.abs(u.pos.x - at.x) + Math.abs(u.pos.y - at.y);
    const near = livingUnits(ctx.s)
      .filter((u) => u.id !== jar.owner && dist(u) <= 2)
      .sort((a, b) => dist(a) - dist(b) || byReadingOrder(a.pos, b.pos))[0];
    if (near) run({ kind: 'unit', unit: near.id });
  }
  const owner = findUnit(ctx.s, jar.owner);
  if (
    jar.event === 'step' &&
    !jar.resealed &&
    owner &&
    isAlive(owner) &&
    hasFootnote(ctx, 'jar-cap-reseal')
  )
    sealJar(ctx, at, { ...jar, resealed: true });
}

/** `fuse-unit-follow`: a Fuse sealed under a foe goes where that foe stands now (if the tile is free). */
function followCarrier(ctx: Ctx, at: Coord, jar: Jar): Coord {
  const carrier = jar.carrier ? findUnit(ctx.s, jar.carrier) : null;
  if (!carrier || !isAlive(carrier)) return at;
  const to = carrier.pos;
  if ((to.x === at.x && to.y === at.y) || tileAt(ctx.s, to).jar) return at;
  tileAt(ctx.s, at).jar = null;
  tileAt(ctx.s, to).jar = jar;
  withOrigin(ctx, jar.origin, () =>
    withLine(ctx, 'fuse:unit', () =>
      emit(ctx, { type: 'drawn', from: { ...at }, to: { ...to }, what: 'jar' }),
    ),
  );
  return { ...to };
}

/**
 * Dusk: every dusk-jar opens, in reading order. Jars sealed while this runs wait for the next dusk.
 * A late Fuse waits its first dusk out, a spared one waits while a party member stands on it, a
 * carried one goes to its foe first; `fuse-cap-chain` then opens the jars beside it, in order.
 */
export function openDuskJars(ctx: Ctx): void {
  const due: number[] = [];
  for (const t of ctx.s.tiles) {
    if (t.jar?.event === 'dusk' && t.jar.id !== undefined) due.push(t.jar.id);
  }
  for (const id of due) {
    let at = jarTile(ctx, id);
    const jar = at ? tileAt(ctx.s, at).jar : null;
    if (!at || jar?.event !== 'dusk') continue;
    if (jar.carrier) at = followCarrier(ctx, at, jar);
    if (jar.dusks === 0) {
      jar.dusks = 1;
      continue;
    }
    const party = ownedByMember(ctx, jar);
    const under = unitAt(ctx.s, at);
    if (party && under?.kind === 'member' && isAlive(under) && hasFootnote(ctx, 'fuse-unit-spare'))
      continue;
    openJar(ctx, at);
    if (party && hasFootnote(ctx, 'fuse-cap-chain')) {
      for (const c of neighbors4(at)
        .filter((n) => inBoard(ctx.s, n))
        .sort(byReadingOrder)) {
        if (tileAt(ctx.s, c).jar) openJar(ctx, c);
      }
    }
  }
}
