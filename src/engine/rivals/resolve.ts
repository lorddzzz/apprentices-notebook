import { ATTACKS, TUNING } from '$data';
import { RIVALS, type RivalDef } from '$data/rivals';
import { cloneData } from '../clone';
import { type Ctx, emit, ref } from '../ctx';
import { dealDamage } from '../damage';
import type { EventLog, GameEvent } from '../events';
import { type Coord, chebyshev, DIRS, type Dir, label, sameCoord, step } from '../grid';
import { inBoard, isAlive, unitAt } from '../queries';
import { resolveSpell } from '../resolve';
import type { Aim, AttackIntent, BattleState, EnemyUnit, RivalIntent, Spell } from '../types';

/**
 * Rival turns (rivals plan P2, P3; RV-2): telegraphing a pinned intent, locked-aim casting, the
 * starved-chain fallback and the dry strike. Planning (RV-4) and tricks (RV-3) plug in here.
 */

/**
 * Gameplay effects (P3): damage (absorbed too), displacement, kind/state/mix/burst, jars, marks and
 * binds, schedules, hold/shackle/collar, erase/draw/swap, kills. Flight, landings, stops, failed
 * triggers, misses and traces are not.
 */
const EFFECTS: ReadonlySet<GameEvent['type']> = new Set<GameEvent['type']>([
  'damage',
  'shieldAbsorbs',
  'shieldGained',
  'died',
  'moved',
  'push',
  'crush',
  'dropped',
  'swapped',
  'drift',
  'landed',
  'mixed',
  'washed',
  'burst',
  'spreadState',
  'snuff',
  'gateBurns',
  'jarSealed',
  'jarOpened',
  'marked',
  'markSpread',
  'markSpent',
  'markLifted',
  'released',
  'conducted',
  'collared',
  'held',
  'stunned',
  'scheduled',
  'drawn',
  'erased',
  'summon',
]);

export const isEffect = (e: GameEvent): boolean => EFFECTS.has(e.type);

/** A starved action changed nothing (P3): every event is flight, a stop, a miss or a trace. */
export const isStarved = (events: EventLog): boolean => !events.some(isEffect);

export function rivalDefOf(e: EnemyUnit): RivalDef | null {
  return e.rival ? (RIVALS[e.rival.rival] ?? null) : null;
}

const spellName = (def: RivalDef | null, id: string): string =>
  def?.spells.find((sp) => sp.id === id)?.name ?? id;

function aimWords(aim: Aim): string {
  switch (aim.kind) {
    case 'dir':
      return aim.dir;
    case 'tile':
      return `at ${label(aim.at)}`;
    case 'self':
      return 'on itself';
  }
}

/** The telegraph's verb: "cast Lantern right", "use canals:longWick", the dry strike's verb. */
export function rivalVerb(e: EnemyUnit, intent: RivalIntent): string {
  const def = rivalDefOf(e);
  switch (intent.kind) {
    case 'cast':
      return `cast ${spellName(def, intent.spell)} ${aimWords(intent.aim)}`;
    case 'trick':
      return `use ${intent.trick}`;
    case 'rivalStrike':
      return ATTACKS[def?.dryStrike ?? 'bite'].verb;
  }
}

/** Shows a rival intent on the board (same `telegraph` event as any foe). */
export function telegraphRival(ctx: Ctx, e: EnemyUnit, intent: RivalIntent): void {
  e.intent = intent;
  emit(ctx, {
    type: 'telegraph',
    unit: ref(e),
    intent: cloneData(intent),
    verb: rivalVerb(e, intent),
  });
}

/**
 * A rival's enemy-phase turn. A pinned intent (scenarios, RV-1) is telegraphed in place of
 * planning; until RV-4's planner lands, an unpinned rival waits. Returns true when it telegraphed.
 */
export function rivalAct(ctx: Ctx, e: EnemyUnit, order: number): boolean {
  const pinned = e.rival?.pinned;
  if (!pinned) {
    e.intent = null;
    emit(ctx, { type: 'idle', unit: ref(e) });
    return false;
  }
  telegraphRival(ctx, e, { ...cloneData(pinned), order });
  return true;
}

/**
 * Whether a locked aim is still legal from the caster's tile. A Bolt direction always is (its
 * parallel line just moves); a tile aim must be in range (area) or adjacent (Touch).
 */
export function lockedAimLegal(s: BattleState, e: EnemyUnit, spell: Spell, aim: Aim): boolean {
  switch (spell.source) {
    case 'bolt':
      return aim.kind === 'dir';
    case 'splash':
    case 'vat':
      return (
        aim.kind === 'tile' &&
        inBoard(s, aim.at) &&
        chebyshev(e.pos, aim.at) <=
          (spell.source === 'splash' ? TUNING.splashRange : TUNING.vatRange)
      );
    case 'touch':
      return (
        aim.kind === 'self' ||
        (aim.kind === 'tile' &&
          inBoard(s, aim.at) &&
          DIRS.some((d) => sameCoord(step(e.pos, d), aim.at)))
      );
  }
}

/** The dry strike as an ordinary attack intent, resolved by the turn's attack path. */
export function dryStrikeIntent(
  e: EnemyUnit,
  intent: Extract<RivalIntent, { kind: 'rivalStrike' }>,
): AttackIntent {
  return {
    kind: 'attack',
    attack: rivalDefOf(e)?.dryStrike ?? 'bite',
    dir: intent.dir,
    order: intent.order,
  };
}

const dirToward = (from: Coord, to: Coord): Dir | null =>
  DIRS.find((d) => sameCoord(step(from, d), to)) ?? null;

/**
 * The starved-chain strike (rivals §1): the pre-shown tile only, still adjacent and holding a
 * living apprentice, or it finds no one. Never a new target.
 */
export function fallbackStrike(ctx: Ctx, e: EnemyUnit, at: Coord | null): void {
  if (!at || !isAlive(e)) return;
  const def = rivalDefOf(e);
  const damage = def?.fallback.damage ?? 1;
  const heading = dirToward(e.pos, at);
  const victim = unitAt(ctx.s, at);
  const live = heading !== null && victim?.kind === 'member' && isAlive(victim) ? victim : null;
  emit(ctx, {
    type: 'fallbackStrike',
    unit: ref(e),
    at: { ...at },
    target: live ? ref(live) : null,
    damage: live ? damage : 0,
  });
  if (live)
    dealDamage(ctx, live, damage, `${def?.name ?? e.name}'s strike`, [], { heading, at: e.pos });
}

/**
 * A telegraphed `cast` (rivals §1): from the caster's actual tile with the locked native aim;
 * recipients are chosen as the cast begins (R7 after). A tile aim no longer legal fails without a
 * charge. A starved cast earns the fallback. Dry charges wait, with no fallback. Rival casts run
 * without the household's footnotes: those are the party's notes, not his.
 */
export function resolveRivalCast(
  ctx: Ctx,
  e: EnemyUnit,
  intent: Extract<RivalIntent, { kind: 'cast' }>,
): void {
  const r = e.rival;
  const spell = r?.spells[intent.spell];
  if (!r || !spell || (r.charges[intent.spell] ?? 0) <= 0) {
    emit(ctx, { type: 'idle', unit: ref(e) });
    return;
  }
  if (!lockedAimLegal(ctx.s, e, spell, intent.aim)) {
    const at = intent.aim.kind === 'tile' ? intent.aim.at : e.pos;
    emit(ctx, {
      type: 'castFails',
      unit: ref(e),
      spell: spellName(rivalDefOf(e), intent.spell),
      at: { ...at },
    });
    fallbackStrike(ctx, e, intent.fallback);
    return;
  }
  r.charges[intent.spell] = (r.charges[intent.spell] ?? 0) - 1;
  const from = ctx.log.length;
  const footnotes = ctx.footnotes;
  ctx.footnotes = {};
  resolveSpell(ctx, e, spell, cloneData(intent.aim));
  ctx.footnotes = footnotes;
  if (isStarved(ctx.log.slice(from))) fallbackStrike(ctx, e, intent.fallback);
}

/** Resolves a rival's cast or trick intent (stun and death are handled before, with no fallback). */
export function resolveRivalIntent(
  ctx: Ctx,
  e: EnemyUnit,
  intent: Extract<RivalIntent, { kind: 'cast' | 'trick' }>,
): void {
  if (intent.kind === 'cast') {
    resolveRivalCast(ctx, e, intent);
    return;
  }
  // Action tricks (the long wick) resolve through RV-3's lock rules; until then the order waits.
  emit(ctx, { type: 'idle', unit: ref(e) });
}
