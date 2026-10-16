import { ENEMIES, TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { burstAt } from './foes';
import type { Unit } from './types';

/** Fire's bonus on a branded unit (A2; belongs in TUNING once data/ is open to it). */

/**
 * Order: base (incl. fire's oil-soaked bonus) → inked +1 → shield → HP. The log line shows the
 * total before the shield. Returns true if the hit killed the unit.
 */
export function dealDamage(
  ctx: Ctx,
  unit: Unit,
  base: number,
  source: string,
  extra: readonly string[] = [],
): boolean {
  if (unit.hp <= 0) return false;
  let amount = base;
  const bonus = [...extra];
  if (unit.inked) {
    amount += TUNING.inkedBonus;
    bonus.push(`inked +${TUNING.inkedBonus}`);
  }
  const absorbed = Math.min(unit.shield, amount);
  unit.shield -= absorbed;
  unit.hp = Math.max(0, unit.hp - (amount - absorbed));
  emit(ctx, { type: 'damage', target: ref(unit), amount, source, bonus, hpLeft: unit.hp });
  if (absorbed > 0)
    emit(ctx, { type: 'shieldAbsorbs', unit: ref(unit), absorbed, left: unit.shield });
  if (unit.hp > 0) return false;
  kill(ctx, unit);
  return true;
}

/** Dead units stay in `units` (hp 0) but leave the board. A dying moth bursts (K-16) unless `bursts` is false. */
export function kill(ctx: Ctx, unit: Unit, bursts = true): void {
  emit(ctx, { type: 'died', unit: ref(unit) });
  ctx.cast?.kills.push({ unit: unit.id, at: { ...unit.pos } });
  if (unit.kind === 'enemy') unit.intent = null;
  else unit.undo = null;
  if (bursts && unit.kind === 'enemy' && ENEMIES[unit.def].bursts) burstAt(ctx, unit);
}

/** The ink mark bursts: consumed first, so the detonation itself gets no inked bonus. */
export function detonate(ctx: Ctx, unit: Unit): void {
  unit.inked = false;
  emit(ctx, { type: 'detonate', unit: ref(unit) });
  dealDamage(ctx, unit, TUNING.detonateDamage, 'Detonation');
}

export function sparkHit(ctx: Ctx, unit: Unit, damage: number): void {
  const killed = dealDamage(ctx, unit, damage, 'Spark');
  if (!killed && unit.inked) detonate(ctx, unit);
}

export function burn(ctx: Ctx, unit: Unit): void {
  // Oil-soaked and branded don't stack: the larger bonus applies.
  const soaked = unit.oilSoaked ? TUNING.oilSoakedBonus : 0;
  const branded = unit.branded ? TUNING.brandedBonus : 0;
  const bonus = Math.max(soaked, branded);
  const killed = dealDamage(
    ctx,
    unit,
    TUNING.fireDamage + bonus,
    'Fire',
    bonus === 0 ? [] : [branded > soaked ? `branded +${bonus}` : `oil-soaked +${bonus}`],
  );
  if (!killed && unit.inked) detonate(ctx, unit);
}
