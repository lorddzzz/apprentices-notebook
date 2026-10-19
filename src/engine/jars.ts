import type { SolventId } from '$data';
import { type Ctx, emit, ref, withOrigin } from './ctx';
import type { Coord, Dir } from './grid';
import type { Hook } from './hooks';
import { jarLimit } from './leans';
import { coordOf, findUnit, isAlive, tileAt, unitAt } from './queries';
import { runContinuation, runStep, snapshotOf } from './resolve';
import type { Flow, Jar, Origin, Step, Target, UnitId } from './types';
import { targetKey } from './types';

/**
 * Jars (design §7, plan P32): one per owner, opened by a step onto their tile or at dusk. What a
 * jar holds runs as a new moment (P25): a fresh snapshot, the sealing cast's heading and origin.
 */

/**
 * Runs `step` for `caster` on a target with a flow of its own: a jar opening, a repeat coming due.
 * It has its own event cap; the outer cast's scope is restored afterwards. A repeat coming due
 * passes `repeated` (it can't schedule again, design §6.4 limit 5) and its flavour; a Wick
 * coming due passes `woken` (it has waited).
 */
export function runDetached(
  ctx: Ctx,
  step: Step | null,
  target: Target,
  caster: UnitId,
  origin: Origin,
  heading: Dir | null,
  extra: { repeated?: boolean; woken?: boolean; solvent?: SolventId | null; trace?: boolean } = {},
): void {
  const unit = findUnit(ctx.s, caster);
  const flow: Flow = {
    caster,
    origin,
    snapshot: snapshotOf(ctx.s),
    headings: new Map([[targetKey(target), heading]]),
    lay: false,
    gifted: false,
    solvent: extra.solvent ?? null,
    habit: unit?.kind === 'member' ? unit.lean.habit : null,
    depth: 0,
    auras: [],
    ...(extra.repeated ? { repeated: true } : {}),
    ...(extra.woken ? { woken: true } : {}),
  };
  const outer = ctx.cast;
  ctx.cast = { events: 0, capped: false };
  try {
    withOrigin(ctx, origin, () =>
      (extra.trace === false ? runStep : runContinuation)(ctx, step, [target], flow),
    );
  } finally {
    ctx.cast = outer;
  }
}

/** The owner's jars on the board, oldest first. */
function jarsOf(ctx: Ctx, owner: UnitId): Coord[] {
  const out: { at: Coord; seq: number }[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.jar?.owner === owner) out.push({ at: coordOf(ctx.s, i), seq: t.jar.seq ?? 0 });
  });
  return out.sort((a, b) => a.seq - b.seq).map((j) => j.at);
}

const newestSeq = (ctx: Ctx): number => Math.max(0, ...ctx.s.tiles.map((t) => t.jar?.seq ?? 0));

function crumble(ctx: Ctx, at: Coord): void {
  tileAt(ctx.s, at).jar = null;
  emit(ctx, { type: 'jarCrumbles', at: { ...at } });
}

/**
 * Seals a jar on a tile: the owner's oldest jar crumbles empty once they would keep more than
 * `jarLimit` (one; two with the Draughtsman's habit), and so does any jar already there (J4, P32).
 */
export function sealJar(ctx: Ctx, at: Coord, jar: Jar): void {
  const owner = findUnit(ctx.s, jar.owner);
  if (!owner) return;
  // A jar of theirs already on this tile is replaced below, so it doesn't count against the limit.
  const mine = jarsOf(ctx, jar.owner).filter((c) => c.x !== at.x || c.y !== at.y);
  while (mine.length >= jarLimit(owner)) {
    const old = mine.shift();
    if (old) crumble(ctx, old);
  }
  if (tileAt(ctx.s, at).jar) crumble(ctx, at);
  tileAt(ctx.s, at).jar = { ...structuredClone(jar), seq: newestSeq(ctx) + 1 };
  emit(ctx, { type: 'jarSealed', at: { ...at }, owner: ref(owner), event: jar.event });
}

/** Opens the jar on a tile (it is used up): its rest runs on the unit standing there, else the tile. */
export function openJar(ctx: Ctx, at: Coord, by: UnitId | null = null): void {
  const tile = tileAt(ctx.s, at);
  const jar = tile.jar;
  if (!jar) return;
  tile.jar = null;
  const unit = (by ? findUnit(ctx.s, by) : null) ?? unitAt(ctx.s, at);
  const opener = unit && isAlive(unit) && unit.pos.x === at.x && unit.pos.y === at.y ? unit : null;
  withOrigin(ctx, jar.origin, () =>
    emit(ctx, { type: 'jarOpened', at: { ...at }, by: opener ? ref(opener) : null }),
  );
  const target: Target = opener
    ? { kind: 'unit', unit: opener.id }
    : { kind: 'tile', at: { ...at } };
  runDetached(ctx, jar.rest, target, jar.owner, jar.origin, jar.heading);
}

/** A unit entering a tile opens its step-jar, whoever owns it (J5). */
export function onHook(ctx: Ctx, h: Hook): void {
  if (h.kind !== 'entered') return;
  const jar = tileAt(ctx.s, h.at).jar;
  if (jar?.event !== 'step') return;
  const unit = findUnit(ctx.s, h.unit);
  if (!unit || !isAlive(unit)) return;
  openJar(ctx, h.at, h.unit);
}

/** Dusk: every dusk-jar opens, in reading order. Jars sealed while this runs wait for the next dusk. */
export function openDuskJars(ctx: Ctx): void {
  const due: Coord[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.jar?.event === 'dusk') due.push(coordOf(ctx.s, i));
  });
  for (const at of due) if (tileAt(ctx.s, at).jar?.event === 'dusk') openJar(ctx, at);
}
