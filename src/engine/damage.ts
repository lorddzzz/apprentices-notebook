import { ENEMIES, type HarmKind } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { foeBurst } from './foes';
import type { Coord, Dir } from './grid';
import { guardHarm } from './harm';
import { notify } from './hooks';
import { findUnit } from './queries';
import type { Unit } from './types';

/** Where a hit came from, and (AH P14) what kind of harm it is, for wards and harm guards. */
export interface HitFrom {
  heading: Dir | null;
  at: Coord | null;
  harm?: HarmKind;
  /** Set on a redirected hit: it is not guarded again. */
  unguarded?: true;
}

/**
 * Damage: shield first, then HP. The log line shows the amount before the shield; a fully
 * shielded hit is still a hit (P27). A harm guard may cancel it first (`unharmed`: not a hit) or
 * send it to another unit (AH harm guards). Returns true if the hit killed the unit.
 */
export function dealDamage(
  ctx: Ctx,
  unit: Unit,
  base: number,
  source: string,
  extra: readonly string[] = [],
  from: HitFrom = { heading: null, at: null },
): boolean {
  if (unit.hp <= 0) return false;
  if (!from.unguarded) {
    const v = guardHarm(ctx, {
      kind: 'hit',
      unit: unit.id,
      amount: base,
      source,
      harm: from.harm ?? null,
    });
    if (v.kind === 'cancel') {
      emit(ctx, {
        type: 'unharmed',
        unit: ref(unit),
        source,
        harm: from.harm ?? null,
        ...(v.line ? { line: v.line } : {}),
        ...(v.habit ? { habit: v.habit } : {}),
      });
      return false;
    }
    if (v.kind === 'redirect') {
      const to = findUnit(ctx.s, v.to);
      return to ? dealDamage(ctx, to, base, source, extra, { ...from, unguarded: true }) : false;
    }
  }
  const amount = base;
  const absorbed = Math.min(unit.shield, amount);
  unit.shield -= absorbed;
  unit.hp = Math.max(0, unit.hp - (amount - absorbed));
  emit(ctx, {
    type: 'damage',
    target: ref(unit),
    amount,
    source,
    bonus: [...extra],
    hpLeft: unit.hp,
  });
  if (absorbed > 0)
    emit(ctx, { type: 'shieldAbsorbs', unit: ref(unit), absorbed, left: unit.shield });
  notify(ctx, { kind: 'hit', unit: unit.id, heading: from.heading, from: from.at });
  if (unit.hp > 0) return false;
  kill(ctx, unit);
  return true;
}

/**
 * Shield on a unit (Guard, Levy; P27). It lasts until the start of the player phase of round
 * `until` (E6 clears it there); a longer-lived shield already on the unit keeps its date.
 */
export function gainShield(ctx: Ctx, unit: Unit, amount: number, until: number): void {
  if (amount <= 0 || unit.hp <= 0) return;
  unit.shield += amount;
  unit.guardUntil = Math.max(unit.guardUntil ?? 0, until);
  emit(ctx, {
    type: 'shieldGained',
    unit: ref(unit),
    amount,
    until: unit.guardUntil,
    total: unit.shield,
  });
}

/** Dead units stay in `units` (hp 0) but leave the board. A dying moth bursts (K-16) unless `bursts` is false. */
export function kill(ctx: Ctx, unit: Unit, bursts = true): void {
  emit(ctx, { type: 'died', unit: ref(unit) });
  if (unit.kind === 'enemy') unit.intent = null;
  else unit.undo = null;
  notify(ctx, { kind: 'died', unit: unit.id });
  if (bursts && unit.kind === 'enemy' && ENEMIES[unit.def].bursts) foeBurst(ctx, unit);
}
