import type { LineId } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, withLine } from './ctx';
import { hasFootnote } from './footnotes';
import { runDetached } from './jars';
import { findUnit, isAlive, unitAt } from './queries';
import { KIND_HANDLERS } from './runes/kinds';
import { undoBoard } from './solvents';
import { axisToward, whereIs } from './targets';
import type { Origin, Scheduled, Step, Unit, UnitId } from './types';

/**
 * The scheduled queue (E6): repeats, Margin echoes, Wick, Graphite, Filings and Pitch wait here for
 * their moment. Each entry runs once (design §6.4 limit 5). Thunderhead entries belong to
 * `roundEndChemistry` (E2) and are left alone.
 */

export function schedule(ctx: Ctx, s: Scheduled): void {
  ctx.s.scheduled.push(cloneData(s));
  const at = whereIs(ctx.s, s.target);
  if (at) emit(ctx, { type: 'scheduled', kind: s.kind, at });
}

/** A bare rune becomes a one-step tree so it runs through the same path as a cast. */
function stepOf(entry: Scheduled): Step | null {
  if (typeof entry.step !== 'string') return entry.step;
  const role = entry.step in KIND_HANDLERS ? 'kind' : 'action';
  // The auras that touched the first cast's step touch it again (P9).
  const auras = [...(entry.context?.auras ?? [])];
  return { role, rune: entry.step, at: { x: 0, y: 0 }, auras, next: null };
}

/** The waits that say so when they lapse (`repeat:member`, `margin:member`, `wick:member`). */
const LAPSES: Partial<Record<Scheduled['kind'], { source: string; line: LineId }>> = {
  repeat: { source: 'Repeat', line: 'repeat:member' },
  margin: { source: 'Margin', line: 'margin:member' },
  wick: { source: 'Wick', line: 'wick:member' },
};

function run(ctx: Ctx, e: Scheduled): void {
  if (e.kind === 'graphite') {
    if (e.undo) undoBoard(ctx, e.undo);
    return;
  }
  // A downed caster's delayed actions lapse (graphite undos above still restore the board).
  const owner = ctx.s.units.find((u) => u.id === e.owner);
  if (!owner || owner.hp <= 0) {
    const lapse = LAPSES[e.kind];
    if (lapse) withLine(ctx, lapse.line, () => emit(ctx, { type: 'miss', source: lapse.source }));
    return;
  }
  // `repeat-empty-follow`, `margin-empty-follow`: the unit first hit, while it lives.
  const followed = e.follow && e.hit ? findUnit(ctx.s, e.hit) : null;
  const live = followed && isAlive(followed) ? followed : null;
  const at = live ? live.pos : whereIs(ctx.s, e.target);
  if (!at) return;
  const unit = live ?? (e.target.kind === 'tile' ? unitAt(ctx.s, at) : null);
  // `repeat-cap-patient`, `margin-empty-wait`: an empty tile waits another turn.
  if (!unit && (e.wait ?? 0) > 0 && (e.kind === 'repeat' || e.kind === 'margin')) {
    ctx.s.scheduled.push({ ...cloneData(e), wait: (e.wait ?? 0) - 1 });
    withLine(ctx, `${e.kind}:empty`, () => emit(ctx, { type: 'scheduled', kind: e.kind, at }));
    return;
  }
  // A tile target hits whoever stands there now; otherwise the tile itself.
  const target = unit ? { kind: 'unit' as const, unit: unit.id } : e.target;
  // `repeat-empty-reaim`: the repeat points from where its caster stands now.
  const heading =
    e.kind === 'repeat' && hasFootnote(ctx, 'repeat-empty-reaim')
      ? (axisToward(owner.pos, at) ?? e.heading)
      : e.heading;
  // Ringing again (Filings) is a repeat too: spent, it never waits again.
  const again = e.kind === 'repeat' || e.kind === 'margin' || e.kind === 'filings';
  if (again && typeof e.step === 'string') emit(ctx, { type: 'repeated', action: e.step });
  runDetached(ctx, stepOf(e), target, e.owner, e.origin, heading, {
    trace: typeof e.step !== 'string',
    repeated: again,
    woken: e.kind === 'wick',
    solvent: e.solvent ?? null,
    ...(e.context ? { context: e.context } : {}),
  });
}

/**
 * Runs every entry due `when` (an owner's turn start, round end), in the order they were queued.
 * Entries queued while this runs wait for the next time. At round end, entries marked
 * `nextRoundEnd` then become `roundEnd` ones.
 */
export function runScheduled(ctx: Ctx, when: Scheduled['when'], owner?: UnitId): void {
  const s = ctx.s;
  const due = s.scheduled.filter(
    (e) => e.when === when && e.kind !== 'thunderhead' && (!owner || e.owner === owner),
  );
  s.scheduled = s.scheduled.filter((e) => !due.includes(e));
  // Graphite undoes last-in-first, so stacked undos peel back in order.
  const ordered = [
    ...due.filter((e) => e.kind !== 'graphite'),
    ...due.filter((e) => e.kind === 'graphite').reverse(),
  ];
  for (const e of ordered) run(ctx, e);
  if (when === 'roundEnd') {
    for (const e of s.scheduled) if (e.when === 'nextRoundEnd') e.when = 'roundEnd';
  }
}

/**
 * A unit came to rest on `u.pos` (arrival.ts). `repeat-empty-step`: a repeat waiting on that tile
 * (or following that unit) goes off now. `repeat-cap-pushed`: a repeat whose first target was
 * pushed in a member's cast acts at once on its new tile. Either way it is spent.
 */
export function disturbRepeats(ctx: Ctx, u: Unit, cause: string, origin: Origin | null): void {
  if (ctx.s.scheduled.length === 0 || !isAlive(u)) return;
  const step = hasFootnote(ctx, 'repeat-empty-step');
  const pushed =
    cause === 'push' &&
    hasFootnote(ctx, 'repeat-cap-pushed') &&
    origin !== null &&
    findUnit(ctx.s, origin.caster)?.kind === 'member';
  const onTile = (e: Scheduled): boolean =>
    e.target.kind === 'tile' && e.target.at.x === u.pos.x && e.target.at.y === u.pos.y;
  const stepped = (e: Scheduled): boolean => step && (e.follow ? e.hit === u.id : onTile(e));
  const due = ctx.s.scheduled.filter(
    (e) => e.kind === 'repeat' && ((pushed && e.hit === u.id) || stepped(e)),
  );
  if (due.length === 0) return;
  ctx.s.scheduled = ctx.s.scheduled.filter((e) => !due.includes(e));
  for (const e of due) {
    const here = pushed && e.hit === u.id;
    run(ctx, here ? { ...e, target: { kind: 'tile', at: { ...u.pos } } } : e);
  }
}
