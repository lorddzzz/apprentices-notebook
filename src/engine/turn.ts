import { ATTACKS, TUNING } from '$data';
import { enemyPhase } from './ai';
import { type Ctx, checkEnd, emit, ref } from './ctx';
import { burnGates, drift } from './current';
import { dealDamage } from './damage';
import { foeBurst, resolveSpecial, snuffStep } from './foes';
import { byReadingOrder, type Coord, step } from './grid';
import {
  blockerName,
  coordOf,
  enemies,
  isAlive,
  isFire,
  livingUnits,
  members,
  tileAt,
  travel,
  unitAt,
} from './queries';
import type { EnemyUnit, Unit } from './types';

/**
 * End of turn: telegraphed attacks resolve in intent order, hazards tick, the round advances, the
 * enemies move and telegraph, and the party's next turn begins. E6 rebuilds the round order
 * (jars at dusk, round-end chemistry, decay, Steep, Afterglow, scheduled repeats).
 */

/** A spit lands Ink where it hits (P11: a foe's Kind). Interim: a blot on an empty tile; E2 mixes. */
function spitInk(ctx: Ctx, at: Coord, victim: Unit | null): void {
  if (victim) {
    if (victim.mark || !isAlive(victim)) return;
    victim.mark = { deep: false, lineage: ctx.s.nextLineage++, bound: null, origin: null };
    emit(ctx, { type: 'landed', kind: 'ink', at: { ...at }, unit: ref(victim), makes: 'mark' });
    return;
  }
  const t = tileAt(ctx.s, at);
  if (t.state !== null) return;
  t.state = { id: 'blot', rounds: 0, origin: null };
  emit(ctx, { type: 'landed', kind: 'ink', at: { ...at }, makes: 'blot' });
}

function resolveIntent(ctx: Ctx, e: EnemyUnit): void {
  const intent = e.intent;
  if (!intent) return;
  e.intent = null;
  if (intent.kind !== 'attack') {
    resolveSpecial(ctx, e, intent);
    return;
  }
  const att = ATTACKS[intent.attack];
  if (att.id === 'burst') {
    foeBurst(ctx, e);
    return;
  }
  emit(ctx, { type: 'attack', unit: ref(e), intent: { ...intent }, verbs: att.verbs });
  if (att.kind === 'adjacent') {
    const victim = unitAt(ctx.s, step(e.pos, intent.dir));
    if (victim)
      dealDamage(ctx, victim, att.damage, att.name, [], { heading: intent.dir, at: e.pos });
    else emit(ctx, { type: 'miss', source: att.name });
    return;
  }
  const r = travel(ctx.s, e.pos, intent.dir, att.range, e.id);
  if (r.reason === 'none') {
    emit(ctx, { type: 'miss', source: att.name });
    return;
  }
  const at = { ...r.stop };
  switch (r.reason) {
    case 'unit': {
      dealDamage(ctx, r.unit, att.damage, att.name, [], { heading: intent.dir, at: e.pos });
      if (att.inks) spitInk(ctx, at, r.unit);
      return;
    }
    case 'cloud':
      emit(ctx, { type: 'stopped', source: att.name, at, by: 'cloud', path: r.path });
      return;
    case 'blocked':
      emit(ctx, {
        type: 'stopped',
        source: att.name,
        at,
        by: blockerName(tileAt(ctx.s, at)),
        path: r.path,
      });
      return;
    case 'end':
      emit(ctx, { type: 'lands', source: att.name, at, path: r.path });
      if (att.inks) spitInk(ctx, at, null);
      return;
  }
}

/** Layers with a lifetime count down; whatever reaches 0 fades (interim for E2's `decayStates`). */
function ageStates(ctx: Ctx): void {
  const s = ctx.s;
  const faded: Coord[] = [];
  s.tiles.forEach((t, i) => {
    const l = t.state;
    if (!l || l.rounds === 0 || l.set) return;
    l.rounds--;
    if (l.rounds > 0) return;
    t.state = null;
    faded.push(coordOf(s, i));
  });
  if (faded.length) emit(ctx, { type: 'stateFades', tiles: faded });
}

/** A vent puffs a cloud onto its tile when nothing lies there (K-7). */
function vents(ctx: Ctx): void {
  const s = ctx.s;
  s.tiles.forEach((t, i) => {
    if (!t.terrain.vent || t.state !== null) return;
    emit(ctx, { type: 'vent', at: coordOf(s, i) });
    t.state = { id: 'cloud', rounds: TUNING.cloudRounds, origin: null };
  });
}

/**
 * The current drifts, fire burns, gates catch, then states age, vents refill, and snuffers put
 * fire out.
 */
function hazards(ctx: Ctx): void {
  const s = ctx.s;
  drift(ctx);
  const onFire = livingUnits(s)
    .filter((u) => isFire(tileAt(s, u.pos)))
    .sort((a, b) => byReadingOrder(a.pos, b.pos));
  for (const u of onFire) if (isAlive(u)) dealDamage(ctx, u, TUNING.fireDamage, 'Fire');
  burnGates(ctx);
  ageStates(ctx);
  vents(ctx);
  snuffStep(ctx);
}

/** Legality (player phase) is checked by `isLegal` before this runs. */
export function endTurnAction(ctx: Ctx): void {
  const s = ctx.s;
  emit(ctx, { type: 'phase', phase: 'resolve' });
  const order = enemies(s)
    .filter((e) => isAlive(e) && e.intent)
    .sort((a, b) => (a.intent?.order ?? 0) - (b.intent?.order ?? 0));
  for (const e of order) {
    if (!isAlive(e)) continue;
    resolveIntent(ctx, e);
    if (checkEnd(ctx)) return;
  }
  hazards(ctx);
  if (checkEnd(ctx)) return;

  s.round++;
  emit(ctx, { type: 'round', round: s.round });
  emit(ctx, { type: 'phase', phase: 'enemy' });
  enemyPhase(ctx, { move: true });
  if (checkEnd(ctx)) return;

  emit(ctx, { type: 'phase', phase: 'player' });
  for (const m of members(s)) {
    m.moved = false;
    m.acted = false;
    m.undo = null;
    m.lastMove = null;
  }
  s.landed = [];
  checkEnd(ctx);
}
