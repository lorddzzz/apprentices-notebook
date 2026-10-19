import type { Ctx } from './ctx';
import type { Hook } from './hooks';
import type { Mark, Unit } from './types';

/** Marks, Bind, spreading and release (E5). */
export function applyMark(
  _ctx: Ctx,
  _unit: Unit,
  _mark: Omit<Mark, 'lineage'> & { lineage?: number },
): void {
  throw new Error('not implemented (E5)');
}
/** Takes the unit's mark off without releasing it (P31). Trivial until E5. */
export function spendMark(_ctx: Ctx, unit: Unit): Mark | null {
  const m = unit.mark;
  unit.mark = null;
  return m;
}
export function spreadFrom(_ctx: Ctx, _unit: Unit): void {
  throw new Error('not implemented (E5)');
}
export function liftMark(_ctx: Ctx, _from: Unit, _to: Unit): void {
  throw new Error('not implemented (E5)');
}
/** Releases bound marks on their event. No-op until E5. */
export function onHook(_ctx: Ctx, _h: Hook): void {}
