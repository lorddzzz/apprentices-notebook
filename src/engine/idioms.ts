import { type Ctx, emit } from './ctx';
import type { GameEvent } from './events';
import { livingUnits } from './queries';
import type { BattleState, Origin, Step, UnitId } from './types';

/**
 * The 9 idioms (design §11; rules in `data/idioms.ts`) as patterns over one action's log, credited
 * to the cast that made the pattern (its `origin`). A few need what the board held before the
 * action; `withIdioms` takes that snapshot, runs the action, then names each idiom the first time
 * it happens in a battle (D7).
 */

export type IdiomId =
  | 'cashingIn'
  | 'bonfire'
  | 'theWall'
  | 'lanternWalk'
  | 'debtCollection'
  | 'steamRoom'
  | 'longDrop'
  | 'peal'
  | 'redraft';

/** What an idiom pattern needs from before the action ran. */
export interface IdiomPre {
  /** Caster of each marked unit's mark (the apprentice that set it). */
  markedBy: ReadonlyMap<UnitId, UnitId | null>;
  /** Jars on water holding a Spark, by `x,y`. */
  sparkJars: ReadonlySet<string>;
}

export interface IdiomHit {
  id: IdiomId;
  origin?: Origin;
}

function holdsSpark(step: Step | null): boolean {
  if (!step) return false;
  if (step.role === 'kind' && step.rune === 'spark') return true;
  switch (step.role) {
    case 'fork':
      return holdsSpark(step.left) || holdsSpark(step.right);
    case 'split':
      return step.branches.some(holdsSpark);
    case 'seal':
      return holdsSpark(step.rest);
    default:
      return holdsSpark(step.next);
  }
}

export function idiomPre(s: BattleState): IdiomPre {
  const markedBy = new Map<UnitId, UnitId | null>();
  for (const u of livingUnits(s)) if (u.mark) markedBy.set(u.id, u.mark.origin?.caster ?? null);
  const sparkJars = new Set<string>();
  s.tiles.forEach((t, i) => {
    if (t.jar && t.terrain.water && holdsSpark(t.jar.rest)) {
      sparkJars.add(`${i % s.width},${Math.floor(i / s.width)}`);
    }
  });
  return { markedBy, sparkJars };
}

const found = (id: IdiomId, e?: GameEvent): IdiomHit => ({
  id,
  ...(e?.origin ? { origin: e.origin } : {}),
});

const sameTile = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
  a.x === b.x && a.y === b.y;

/** Every idiom this action's log (and the board it left) makes, in the design's order. */
export function idiomsIn(log: readonly GameEvent[], pre: IdiomPre, s: BattleState): IdiomHit[] {
  const hits: IdiomHit[] = [];
  const first = log.find((e) => e.type === 'cast');
  const actorId = first?.type === 'cast' ? first.caster.id : null;

  // Cashing In: Spark bursts a mark that was already there when the action began.
  const cashed = log.find(
    (e) =>
      e.type === 'burst' && e.burst === 'detonation' && e.units.some((u) => pre.markedBy.has(u.id)),
  );
  if (cashed) hits.push(found('cashingIn', cashed));

  // Bonfire: one fire along 4 or more tiles.
  const fire = log.find((e) => e.type === 'burst' && e.burst === 'fire' && e.tiles.length >= 4);
  if (fire) hits.push(found('bonfire', fire));

  // The Wall: a unit that slid is then crushed.
  for (const [i, e] of log.entries()) {
    if (e.type !== 'push' || e.slid <= 0) continue;
    const id = e.unit.id;
    const crush = log.slice(i + 1).find((c) => c.type === 'crush' && c.unit.id === id);
    if (crush) {
      hits.push(found('theWall', crush));
      break;
    }
  }

  // Lantern Walk: a jar on water holding Spark opens on a foe.
  const lantern = log.find(
    (e) =>
      e.type === 'jarOpened' &&
      e.by !== null &&
      !e.by.member &&
      pre.sparkJars.has(`${e.at.x},${e.at.y}`),
  );
  if (lantern) hits.push(found('lanternWalk', lantern));

  // Debt Collection: a bound mark is released by another apprentice.
  const debt = log.find((e) => {
    if (e.type !== 'released' || actorId === null) return false;
    const binder = pre.markedBy.get(e.unit.id);
    return binder != null && binder !== actorId;
  });
  if (debt) hits.push(found('debtCollection', debt));

  // Steam Room: a compound made in this action now covers 6 or more tiles.
  const made = new Set<string>();
  for (const e of log) if (e.type === 'mixed') made.add(e.compound);
  for (const id of made) {
    if (s.tiles.filter((t) => t.state?.id === id).length < 6) continue;
    const last = [...log].reverse().find((e) => e.type === 'mixed' && e.compound === id);
    hits.push(found('steamRoom', last));
    break;
  }

  // The Long Drop: a foe is pushed off an edge or into a canal.
  const drop = log.find((e) => e.type === 'dropped' && !e.unit.member);
  if (drop) hits.push(found('longDrop', drop));

  // Peal: one burst tolled across 3 or more tiles.
  const peal = log.find((e) => e.type === 'burst' && e.burst === 'conduct' && e.tiles.length >= 3);
  if (peal) hits.push(found('peal', peal));

  // Redraft: Draw or Swap moves something onto a tile that a later burst goes off on.
  for (const [i, e] of log.entries()) {
    const to = e.type === 'drawn' ? [e.to] : e.type === 'swapped' ? [e.a.at, e.b.at] : null;
    if (!to) continue;
    const boom = log
      .slice(i + 1)
      .find((b) => b.type === 'burst' && b.tiles.some((t) => to.some((c) => sameTile(c, t))));
    if (boom) {
      hits.push(found('redraft', e));
      break;
    }
  }
  return hits;
}

/**
 * Runs an action's body, then names the idioms it made, once per battle each (silent `named`
 * event, credited to the cast behind the pattern). The one call site is `applyAction`.
 */
export function withIdioms(ctx: Ctx, body: () => void): void {
  const pre = idiomPre(ctx.s);
  const start = ctx.log.length;
  body();
  for (const hit of idiomsIn(ctx.log.slice(start), pre, ctx.s)) {
    const full = `idiom:${hit.id}`;
    if (ctx.s.named.includes(full)) continue;
    ctx.s.named.push(full);
    emit(ctx, {
      type: 'named',
      what: 'idiom',
      id: hit.id,
      ...(hit.origin ? { origin: hit.origin } : {}),
    });
  }
}
