import { type Ctx, emit } from './ctx';
import { runDetached } from './jars';
import { unitAt } from './queries';
import { KIND_HANDLERS } from './runes/kinds';
import { undoBoard } from './solvents';
import { whereIs } from './targets';
import type { Scheduled, Step, UnitId } from './types';

/**
 * The scheduled queue (E6): repeats, Margin echoes, Wick, Graphite, Filings and Pitch wait here for
 * their moment. Each entry runs once (design §6.4 limit 5). Thunderhead entries belong to
 * `roundEndChemistry` (E2) and are left alone.
 */

export function schedule(ctx: Ctx, s: Scheduled): void {
  ctx.s.scheduled.push(structuredClone(s));
  const at = whereIs(ctx.s, s.target);
  if (at) emit(ctx, { type: 'scheduled', kind: s.kind, at });
}

/** A bare rune becomes a one-step tree so it runs through the same path as a cast. */
function stepOf(entry: Scheduled): Step | null {
  if (typeof entry.step !== 'string') return entry.step;
  const role = entry.step in KIND_HANDLERS ? 'kind' : 'action';
  return { role, rune: entry.step, at: { x: 0, y: 0 }, auras: [], next: null };
}

function run(ctx: Ctx, e: Scheduled): void {
  if (e.kind === 'graphite') {
    if (e.undo) undoBoard(ctx, e.undo);
    return;
  }
  // A downed caster's delayed actions lapse (graphite undos above still restore the board).
  const owner = ctx.s.units.find((u) => u.id === e.owner);
  if (!owner || owner.hp <= 0) return;
  const at = whereIs(ctx.s, e.target);
  if (!at) return;
  const unit = e.target.kind === 'tile' ? unitAt(ctx.s, at) : null;
  // A tile target hits whoever stands there now; otherwise the tile itself.
  const target = unit ? { kind: 'unit' as const, unit: unit.id } : e.target;
  // Ringing again (Filings) is a repeat too: spent, it never waits again.
  const again = e.kind === 'repeat' || e.kind === 'margin' || e.kind === 'filings';
  if (again && typeof e.step === 'string') emit(ctx, { type: 'repeated', action: e.step });
  runDetached(ctx, stepOf(e), target, e.owner, e.origin, e.heading, {
    repeated: again,
    woken: e.kind === 'wick',
    solvent: e.solvent ?? null,
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
