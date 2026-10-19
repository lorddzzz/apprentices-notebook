import { ATTACKS, TUNING } from '$data';
import { enemyPhase } from './ai';
import { type Ctx, checkEnd, emit, ref } from './ctx';
import { burnGates, drift } from './current';
import { dealDamage } from './damage';
import { foeBurst, resolveSpecial, snuffStep } from './foes';
import { type Coord, step } from './grid';
import { openDuskJars } from './jars';
import { decayStates, landKindFree, roundEndChemistry } from './mix';
import {
  blockerName,
  coordOf,
  enemies,
  isAlive,
  livingUnits,
  members,
  tileAt,
  travel,
  unitAt,
} from './queries';
import { runScheduled } from './schedule';
import type { EnemyUnit, Unit } from './types';

/**
 * End of turn (design §3 round order): telegraphed attacks resolve in intent order, then dusk
 * jars, queued round-end entries, round-end chemistry and decay; the round advances, the enemies
 * move and telegraph, and the party's next turn begins (queued repeats, Guard and Hold expiry).
 */

/** A spit lands Ink where it hits (P11: a foe's Kind): it mixes like the player's, with no cast behind it. */
function spitInk(ctx: Ctx, at: Coord, victim: Unit | null): void {
  landKindFree(
    ctx,
    'ink',
    victim ? { kind: 'unit', unit: victim.id } : { kind: 'tile', at: { ...at } },
  );
}

function resolveIntent(ctx: Ctx, e: EnemyUnit): void {
  const intent = e.intent;
  if (!intent) return;
  e.intent = null;
  if (e.stunned) {
    e.stunned = false; // a dropped elite loses the action it had telegraphed (P19)
    emit(ctx, { type: 'idle', unit: ref(e) });
    return;
  }
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

/** A vent puffs a cloud onto its tile when nothing lies there (K-7). */
function vents(ctx: Ctx): void {
  const s = ctx.s;
  s.tiles.forEach((t, i) => {
    if (!t.terrain.vent || t.state !== null) return;
    emit(ctx, { type: 'vent', at: coordOf(s, i) });
    t.state = { id: 'cloud', rounds: TUNING.cloudRounds, origin: null };
  });
}

/** Cinder cools a round at a time. */
function coolTiles(ctx: Ctx): void {
  for (const t of ctx.s.tiles) if (t.hot > 0) t.hot--;
}

/**
 * Dusk: the current drifts, dusk jars open, queued round-end entries run, the chemistry of the
 * board plays out (storms, brand, kettles, fire), gates catch, then layers decay, vents refill,
 * and snuffers put fire out.
 */
function hazards(ctx: Ctx): void {
  drift(ctx);
  openDuskJars(ctx);
  runScheduled(ctx, 'roundEnd');
  roundEndChemistry(ctx);
  burnGates(ctx);
  decayStates(ctx);
  coolTiles(ctx);
  vents(ctx);
  snuffStep(ctx);
}

/**
 * The next player phase begins: this phase's landed list resets, queued owner-turn entries run,
 * Guard shields lapse, and Hold counts down (it counts player-phase starts, so it
 * lasts through the enemy phase; a Shackle wears off at round end in `decayStates`). A stunned apprentice sits this turn out.
 */
function beginPlayerPhase(ctx: Ctx): void {
  const s = ctx.s;
  for (const m of members(s)) {
    m.moved = false;
    m.acted = false;
    m.undo = null;
    m.lastMove = null;
  }
  s.landed = [];
  runScheduled(ctx, 'ownerTurn');
  for (const u of livingUnits(s)) {
    if (u.guardUntil !== null && u.guardUntil <= s.round) {
      u.shield = 0;
      u.guardUntil = null;
    }
    if (u.held > 0) u.held--;
    if (u.kind === 'member' && u.stunned) {
      u.stunned = false;
      u.moved = true;
      u.acted = true;
    }
  }
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
  beginPlayerPhase(ctx);
  checkEnd(ctx);
}
