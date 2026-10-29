import { ENEMIES } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, ref } from './ctx';
import { KIT } from './districts/kit';
import type { FoeBehaviour, PreviewShape } from './districts/types';
import { isAlive } from './queries';
import type { Telegraph } from './rivals/types';
import type { BattleState, EnemyUnit, Intent } from './types';

/**
 * Ordinary district foes on the kit's behaviour registry (DK-IQ D2): `EnemyDef.behaviour` names a
 * `FoeBehaviour` in `KIT.foes`. In the enemy phase it may walk (`move`), then plans a telegraph
 * (RV's contract); in the resolve phase it acts on it. A behaviour that cannot plan idles.
 */

/** The foe's registered behaviour, or null for a foe on the core `ai`. Throws on an unknown id. */
export function behaviourOf(e: Pick<EnemyUnit, 'def'>): FoeBehaviour | null {
  const id = ENEMIES[e.def].behaviour;
  if (!id) return null;
  const b = KIT.foes[id];
  if (!b) throw new Error(`Unknown foe behaviour '${id}' for ${e.def}`);
  return b;
}

/** The behaviour's words for a telegraph: its `describe`, else the telegraph's label. */
export function behaviourVerb(id: string, telegraph: Telegraph): string {
  return KIT.foes[id as keyof typeof KIT.foes]?.describe?.(telegraph) ?? telegraph.label;
}

/** Walks (when it may), plans and telegraphs the foe's behaviour. Returns true if it telegraphed. */
export function behaviourAct(
  ctx: Ctx,
  e: EnemyUnit,
  b: FoeBehaviour,
  move: boolean,
  order: number,
): boolean {
  if (move) b.move?.(ctx, e);
  const telegraph = isAlive(e) ? b.plan(ctx.s, e) : null;
  if (!telegraph) {
    e.intent = null;
    if (isAlive(e)) emit(ctx, { type: 'idle', unit: ref(e) });
    return false;
  }
  const intent: Intent = { kind: 'behaviour', id: b.id, telegraph, order };
  e.intent = cloneData(intent);
  emit(ctx, {
    type: 'telegraph',
    unit: ref(e),
    intent: cloneData(intent),
    verb: behaviourVerb(b.id, telegraph),
  });
  return true;
}

/** Acts on a telegraphed behaviour, unless the foe was downed meanwhile. */
export function resolveBehaviour(
  ctx: Ctx,
  e: EnemyUnit,
  intent: Extract<Intent, { kind: 'behaviour' }>,
): void {
  const b = KIT.foes[intent.id];
  if (!b || !isAlive(e)) return;
  b.resolve(ctx, e, intent.telegraph);
}

/** A behaviour foe has just been killed (`kill`): its `onDeath`, if any. */
export function behaviourDied(ctx: Ctx, e: EnemyUnit): void {
  behaviourOf(e)?.onDeath?.(ctx, e);
}

/** Every living behaviour foe's preview shapes (the board's "Next round" layer), in unit order. */
export function behaviourPreview(s: BattleState): PreviewShape[] {
  const out: PreviewShape[] = [];
  for (const u of s.units) {
    if (u.kind !== 'enemy' || !isAlive(u) || u.intent?.kind !== 'behaviour') continue;
    const b = KIT.foes[u.intent.id];
    if (b?.preview) out.push(...b.preview(s, u));
  }
  return out;
}
