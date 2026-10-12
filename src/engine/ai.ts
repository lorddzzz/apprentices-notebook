import { type Ctx, emit, ref } from './ctx';
import { enemies, isAlive } from './queries';

export interface EnemyPhaseOptions {
  move: boolean; // false in round 1: enemies telegraph without moving
}

/** Stub until step 6 (enemy AI): every living enemy waits, in unit order. */
export function enemyPhase(ctx: Ctx, _opts: EnemyPhaseOptions): void {
  for (const e of enemies(ctx.s)) {
    if (!isAlive(e)) continue;
    e.intent = null;
    emit(ctx, { type: 'idle', unit: ref(e) });
  }
}
