import { type Ctx, emit, ref } from './ctx';
import type { EnemyUnit, Unit } from './types';

/**
 * The canal foes (K-13 to K-17): the eel's lurking, the moth's flight and burst, snuffing and the
 * lamp-mother's summon and flare. W0 stubs; E2 fills them. `ai.ts` dispatches the new AIs here.
 */

/** Snuffers and the lamp-mother put out fire and its oil in their 3×3, last in `hazards` (K-15). */
export function snuffStep(_ctx: Ctx): void {}

/** Resolves a summon or flare intent (K-17). The intent is already cleared. */
export function resolveSpecial(_ctx: Ctx, _e: EnemyUnit): void {}

/** A moth bursts: lights oil on its tile, 1 to each orthogonal neighbour, dies; bursts chain (K-16). */
export function burstAt(_ctx: Ctx, _unit: Unit): void {}

/**
 * Plans, moves and telegraphs a foe with a canal AI (`lurker`, `moth`, `mother`). Returns true if it
 * telegraphed (it then takes intent `order`).
 */
export function foeAct(ctx: Ctx, e: EnemyUnit, _move: boolean, _order: number): boolean {
  e.intent = null;
  emit(ctx, { type: 'idle', unit: ref(e) });
  return false;
}
