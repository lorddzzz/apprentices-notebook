import { INK_FOE_TUNING } from '$data/districts/inkQuarter/enemies';
import { candidatesOf, closestTo, nearestMember } from '../../ai';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage, kill } from '../../damage';
import { byReadingOrder, type Coord, DIRS, label, sameCoord, step } from '../../grid';
import { liftMark } from '../../marks';
import { landKindFree } from '../../mix';
import { enemyWalk } from '../../movement';
import { enemies, findUnit, isAlive, members, unitAt } from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { FoeBehaviour, KitId, PreviewShape } from '../types';

/**
 * The postal staff's brains (ink-quarter plan P8; IQ-5a): the dead letter and the Sorter, as
 * behaviours on the kit's registry (DK-IQ D2). Each has one telegraph; planners walk with
 * `candidatesOf`, so the return stamp's `aiAvoid` already keeps them off it (D7).
 */

export const DEAD_LETTER_BEHAVIOUR: KitId = 'inkQuarter:deadLetter';
export const SORTER_BEHAVIOUR: KitId = 'inkQuarter:sorter';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const living = (units: readonly Unit[]): Unit[] => units.filter(isAlive);

/** Walks toward the nearest apprentice by the shortest way (ties: path length, reading order). */
function approach(ctx: Ctx, e: EnemyUnit): void {
  const target = nearestMember(ctx.s, e);
  if (!target) return;
  const best = closestTo(ctx.s, e, target, candidatesOf(ctx.s, e, true));
  enemyWalk(ctx, e, best?.path ?? []);
}

/** A tile in words for a telegraph line ("A1"). */
const where = (c: Coord | undefined): string => (c ? label(c) : '?');

/** The "Next round" shapes of a telegraph: a pulse on the tile it will land on. */
const pulseOnLast = (unit: EnemyUnit): readonly PreviewShape[] => {
  const t = unit.intent?.kind === 'behaviour' ? unit.intent.telegraph : null;
  const at = t?.tiles[t.tiles.length - 1];
  return at ? [{ kind: 'pulse', at: { ...at } }] : [];
};

// ── The dead letter ─────────────────────────────────────

/**
 * A fluttering paper minion. It flies at the nearest apprentice; once beside them it is
 * addressed to them (the telegraph names them) and bursts on delivery. Dying or bursting leaves
 * a blot of ink on its tile (`onDeath`), so it feeds Tally.
 */
export const DEAD_LETTER_FOE: FoeBehaviour = {
  id: DEAD_LETTER_BEHAVIOUR,
  move: approach,
  plan(s, e): Telegraph | null {
    const to = nearestMember(s, e);
    if (!to || manhattan(e.pos, to.pos) !== 1) return null;
    return { label: 'deliver', tiles: [{ ...to.pos }], units: [to.id] };
  },
  resolve(ctx, e, tg) {
    const to = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    if (!to || !isAlive(to) || manhattan(e.pos, to.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'Dead letter' });
      return;
    }
    const from = { ...e.pos };
    emit(ctx, { type: 'foeBursts', unit: ref(e), at: from });
    e.hp = 0;
    kill(ctx, e, false); // the blot comes from `onDeath`
    const dir = DIRS.find((d) => sameCoord(step(from, d), to.pos)) ?? null;
    dealDamage(ctx, to, INK_FOE_TUNING.deadLetterBurst, 'Dead letter', [], {
      heading: dir,
      at: from,
    });
  },
  onDeath(ctx, e) {
    landKindFree(ctx, 'ink', { kind: 'tile', at: { ...e.pos } });
  },
  preview: (_s, e) => pulseOnLast(e),
  describe: (tg) => `deliver to ${where(tg.tiles[0])}`,
};

// ── The Sorter ──────────────────────────────────────────

/** Nearest to `from` by Manhattan distance, ties in reading order. */
function nearestOf<T extends Unit>(from: Coord, units: readonly T[]): T | null {
  let best: T | null = null;
  for (const u of units) {
    if (
      !best ||
      manhattan(from, u.pos) < manhattan(from, best.pos) ||
      (manhattan(from, u.pos) === manhattan(from, best.pos) && byReadingOrder(u.pos, best.pos) < 0)
    ) {
      best = u;
    }
  }
  return best;
}

/** The foe (itself included) with a mark nearest the Sorter: the one it will take the mark from. */
const markedFoe = (s: BattleState, e: EnemyUnit): EnemyUnit | null =>
  nearestOf(
    e.pos,
    living(enemies(s)).filter((u): u is EnemyUnit => u.kind === 'enemy' && !!u.mark),
  );

/** The apprentice with no mark nearest the Sorter: the one it will put the mark on. */
const unmarkedMember = (s: BattleState, e: EnemyUnit): Unit | null =>
  nearestOf(
    e.pos,
    living(members(s)).filter((u) => !u.mark),
  );

/**
 * A clerk of the sorting hall. It walks at the nearest apprentice; if a foe (or itself) carries
 * a mark and an apprentice has none, it telegraphs forwarding that mark onto the apprentice
 * (`forward`: source tile, then addressee tile), which fizzles if the mark is spent meanwhile.
 * Otherwise it files a hit at an adjacent apprentice, or waits.
 */
export const SORTER_FOE: FoeBehaviour = {
  id: SORTER_BEHAVIOUR,
  move: approach,
  plan(s, e): Telegraph | null {
    const from = markedFoe(s, e);
    const to = unmarkedMember(s, e);
    if (from && to) {
      return { label: 'forward', tiles: [{ ...from.pos }, { ...to.pos }], units: [from.id, to.id] };
    }
    const beside = DIRS.map((d) => unitAt(s, step(e.pos, d))).find((u) => u?.kind === 'member');
    return beside ? { label: 'file', tiles: [{ ...beside.pos }], units: [beside.id] } : null;
  },
  resolve(ctx, e, tg) {
    if (tg.label === 'forward') {
      const from = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
      const to = tg.units[1] ? findUnit(ctx.s, tg.units[1]) : null;
      if (!from || !to || !isAlive(from) || !isAlive(to) || !from.mark || to.mark) {
        emit(ctx, { type: 'miss', source: 'Forwarding' });
        return;
      }
      liftMark(ctx, from, to);
      return;
    }
    const victim = unitAt(ctx.s, tg.tiles[0] ?? e.pos);
    if (!victim || victim.kind !== 'member' || manhattan(e.pos, victim.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'File' });
      return;
    }
    const dir = DIRS.find((d) => sameCoord(step(e.pos, d), victim.pos)) ?? null;
    dealDamage(ctx, victim, INK_FOE_TUNING.sorterFile, 'File', [], { heading: dir, at: e.pos });
  },
  preview: (_s, e) => pulseOnLast(e),
  describe: (tg) =>
    tg.label === 'forward'
      ? `forward the mark on ${where(tg.tiles[0])} to ${where(tg.tiles[1])}`
      : `file ${where(tg.tiles[0])}`,
};

/** The postal staff's behaviours, for the district module (IQ-5b adds the Sealer's). */
export const INK_FOES: readonly FoeBehaviour[] = [DEAD_LETTER_FOE, SORTER_FOE];
