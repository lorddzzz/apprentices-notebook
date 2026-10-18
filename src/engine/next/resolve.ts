import type { SourceRuneId } from '$data/next/types';
import type { Coord, Dir } from '../grid';
import type { Ctx } from './ctx';
import type { Aim, BattleState, Flow, Spell, Step, Target, Unit } from './model';

/** What one Action or Kind does to one target (runes/actions.ts, runes/kinds.ts). */
export type Handler = (ctx: Ctx, t: Target, flow: Flow, step: Step) => void;

/** Cast a spell: emit `cast`, aim, snapshot, run the steps, emit `trace` (E1, R1–R9). */
export function resolveSpell(_ctx: Ctx, _caster: Unit, _spell: Spell, _aim: Aim): void {
  throw new Error('not implemented (E1)');
}
/** Where a Source aims, and each target's heading (R2, R4, P21–P23). */
export function aimTargets(
  _s: BattleState,
  _caster: Unit,
  _source: SourceRuneId,
  _aim: Aim,
  _gifted: boolean,
): { targets: Target[]; headings: Map<string, Dir | null> } {
  throw new Error('not implemented (E1)');
}
/** Run one step (and what follows it) on targets, in order (R3, R5, R7, R9). */
export function runStep(
  _ctx: Ctx,
  _step: Step | null,
  _targets: readonly Target[],
  _flow: Flow,
): void {
  throw new Error('not implemented (E1)');
}
/** A unit target follows its unit (R7); a tile target stays put. null = the unit is gone. */
export function whereIs(s: BattleState, t: Target): Coord | null {
  if (t.kind === 'tile') return t.at;
  const u = s.units.find((x) => x.id === t.unit);
  return u && u.hp > 0 ? u.pos : null;
}
