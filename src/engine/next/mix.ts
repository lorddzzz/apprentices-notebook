import type { KindId } from '$data/next/types';
import type { Ctx } from './ctx';
import type { Flow, Target } from './model';

/** Lands a kind on a target and mixes it with what's there (E2, design §4.1–4.2, P13–P16). */
export function landKind(_ctx: Ctx, _kind: KindId, _t: Target, _flow: Flow): void {
  throw new Error('not implemented (E2)');
}
/** Round end: lingering compounds tick down and fade; Steep spreads; Afterglow extends (E2/E6). */
export function decayStates(_ctx: Ctx): void {
  throw new Error('not implemented (E2)');
}
/** Round-end chemistry: Brand cloud marks, Kettle heat, fire burns (E2; E6 calls it). */
export function roundEndChemistry(_ctx: Ctx): void {
  throw new Error('not implemented (E2)');
}
