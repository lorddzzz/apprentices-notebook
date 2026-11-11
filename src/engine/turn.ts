import { ATTACKS, TUNING } from '$data';
import { enemyPhase } from './ai';
import { resolveBehaviour } from './behaviours';
import { type Ctx, checkEnd, emit, ref } from './ctx';
import { dealDamage } from './damage';
import type { BoardRule, RoundEndSlot } from './districts/types';
import { foeBurst, resolveSpecial, snuffStep } from './foes';
import { type Coord, step } from './grid';
import { openDuskJars } from './jars';
import { runLateSpreads } from './marks';
import { decayStates, landKindFree, roundEndChemistry } from './mix';
import { hitPiece, piecesTurnEnd } from './pieces';
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
import { dryStrikeIntent, resolveRivalIntent } from './rivals/resolve';
import { runTrickMarks, runTrickRoundEnd } from './rivals/tricks';
import { boardRules, runRuleSlot, settleRules } from './rules';
import { runScheduled } from './schedule';
import { actStep } from './standIn';
import type { AttackIntent, EnemyUnit, Unit } from './types';

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
  if (intent.kind === 'cast' || intent.kind === 'trick') {
    resolveRivalIntent(ctx, e, intent);
    return;
  }
  if (intent.kind === 'step') {
    actStep(ctx, e, intent);
    return;
  }
  if (intent.kind === 'behaviour') {
    resolveBehaviour(ctx, e, intent);
    return;
  }
  if (intent.kind === 'summon' || intent.kind === 'flare') {
    resolveSpecial(ctx, e, intent);
    return;
  }
  resolveAttack(ctx, e, intent.kind === 'rivalStrike' ? dryStrikeIntent(e, intent) : intent);
}

/** A telegraphed attack (a rival's dry strike too: plain approach and strike, never a fallback). */
function resolveAttack(ctx: Ctx, e: EnemyUnit, intent: AttackIntent): void {
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
      hitPiece(ctx, at);
      return;
    case 'end':
      emit(ctx, { type: 'lands', source: att.name, at, path: r.path });
      hitPiece(ctx, at);
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
  for (const t of ctx.s.tiles) {
    if (t.hot > 0) t.hot--;
    if (t.brassHot) t.brassHot--;
  }
}

/**
 * Dusk: the board rules' `carry` slot (the canals' current drifts, floating jars and Pitch waits
 * with it), dusk jars open, queued round-end entries run, the chemistry of the board plays out
 * (storms, brand, kettles, fire), the `afterChemistry` slot (gates catch), then layers decay,
 * vents refill, snuffers put fire out, and the `late` slot runs (P8). `rules` is for tests.
 */
export function roundEnd(ctx: Ctx, rules: readonly BoardRule[] = boardRules()): void {
  slot(ctx, 'carry', rules);
  openDuskJars(ctx);
  runScheduled(ctx, 'roundEnd');
  runLateSpreads(ctx);
  roundEndChemistry(ctx);
  slot(ctx, 'afterChemistry', rules);
  delete ctx.s.hum;
  decayStates(ctx);
  coolTiles(ctx);
  vents(ctx);
  snuffStep(ctx);
  slot(ctx, 'late', rules);
}

/** One round-end slot: its board rules, then the rivals' trick steps in it (RV-11). */
function slot(ctx: Ctx, at: RoundEndSlot, rules: readonly BoardRule[]): void {
  runRuleSlot(ctx, at, rules);
  runTrickRoundEnd(ctx, at);
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
    m.prevMove = m.lastMove ?? m.prevMove ?? null;
    m.lastMove = null;
    m.run = 0;
  }
  s.landed = [];
  runScheduled(ctx, 'ownerTurn');
  for (const u of livingUnits(s)) {
    if (u.guardUntil !== null && u.guardUntil <= s.round) {
      u.shield = 0;
      u.guardUntil = null;
      delete u.thorns;
    }
    if (u.held > 0) u.held--;
    if (u.kind === 'member' && u.stunned) {
      u.stunned = false;
      u.moved = true;
      u.acted = true;
    }
  }
}

/**
 * The phase ended early (a wipe or a win): no replan follows, so a foe that spent a behaviour
 * intent (a district event the view never reads) stands idle in the log, and the final state and
 * its projection agree that no spent intent is left.
 */
function idleSpent(ctx: Ctx, spent: readonly EnemyUnit[]): void {
  for (const e of spent) if (isAlive(e) && !e.intent) emit(ctx, { type: 'idle', unit: ref(e) });
}

/** Legality (player phase) is checked by `isLegal` before this runs. */
export function endTurnAction(ctx: Ctx): void {
  const s = ctx.s;
  emit(ctx, { type: 'phase', phase: 'resolve' });
  const order = enemies(s)
    .filter((e) => isAlive(e) && e.intent)
    .sort((a, b) => (a.intent?.order ?? 0) - (b.intent?.order ?? 0));
  // Rivals' per-round marks resolve in their timing slot around the actions (RV-11).
  if (runTrickMarks(ctx, 'beforeActions') && checkEnd(ctx)) return;
  const spent: EnemyUnit[] = [];
  for (const e of order) {
    if (!isAlive(e)) continue;
    if (e.intent?.kind === 'behaviour') spent.push(e);
    resolveIntent(ctx, e);
    settleRules(ctx); // P18 settle point 3: a foe's projectile rings at the end of its action
    if (checkEnd(ctx)) {
      idleSpent(ctx, spent);
      return;
    }
  }
  if (runTrickMarks(ctx, 'afterActions') && checkEnd(ctx)) {
    idleSpent(ctx, spent);
    return;
  }
  roundEnd(ctx);
  piecesTurnEnd(ctx);
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
