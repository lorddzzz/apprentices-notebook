import { ATTACKS, TUNING } from '$data';
import { enemyPhase } from './ai';
import { runEchoes } from './cast';
import { type Ctx, checkEnd, emit, ref } from './ctx';
import { burn, dealDamage } from './damage';
import { byReadingOrder, type Coord, step } from './grid';
import { applyInk } from './materials';
import { enemies, isAlive, livingUnits, members, tileAt, travel, unitAt } from './queries';
import type { EnemyUnit } from './types';

/**
 * End of turn: telegraphed attacks resolve in intent order, hazards tick, the round advances, the
 * enemies move and telegraph, and the party's next turn begins (echoes fire first).
 */

function resolveIntent(ctx: Ctx, e: EnemyUnit): void {
  const intent = e.intent;
  if (!intent) return;
  e.intent = null;
  const att = ATTACKS[intent.attack];
  emit(ctx, { type: 'attack', unit: ref(e), intent: { ...intent }, verbs: att.verbs });
  if (att.kind === 'adjacent') {
    const victim = unitAt(ctx.s, step(e.pos, intent.dir));
    if (victim) dealDamage(ctx, victim, att.damage, att.name);
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
      dealDamage(ctx, r.unit, att.damage, att.name);
      if (att.inks && isAlive(r.unit)) applyInk(ctx, [at]);
      return;
    }
    case 'steam':
      emit(ctx, { type: 'stopped', source: att.name, at, by: 'steam', path: r.path });
      break;
    case 'brass':
      emit(ctx, { type: 'stopped', source: att.name, at, by: 'brass plate', path: r.path });
      return;
    case 'end':
      emit(ctx, { type: 'lands', source: att.name, at, path: r.path });
      break;
  }
  if (att.inks) applyInk(ctx, [at]);
}

function tileCoord(i: number, width: number): Coord {
  return { x: i % width, y: Math.floor(i / width) };
}

/** Fire burns, then fire and steam age, then vents refill. */
function hazards(ctx: Ctx): void {
  const s = ctx.s;
  const onFire = livingUnits(s)
    .filter((u) => tileAt(s, u.pos).fire > 0)
    .sort((a, b) => byReadingOrder(a.pos, b.pos));
  for (const u of onFire) if (isAlive(u)) burn(ctx, u);

  const out: Coord[] = [];
  const faded: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.fire > 0 && --t.fire === 0) {
      t.oil = false;
      out.push(tileCoord(i, s.width));
    }
    if (t.steam > 0 && --t.steam === 0) faded.push(tileCoord(i, s.width));
  });
  if (out.length) emit(ctx, { type: 'fireOut', tiles: out });
  if (faded.length) emit(ctx, { type: 'steamFades', tiles: faded });

  s.tiles.forEach((t, i) => {
    if (!t.vent || t.plate || t.steam > 0) return;
    const at = tileCoord(i, s.width);
    emit(ctx, { type: 'vent', at });
    t.steam = TUNING.steamRounds;
    if (t.fire > 0) {
      t.fire = 0;
      emit(ctx, { type: 'extinguish', tiles: [at] });
    }
  });
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
  }
  runEchoes(ctx);
  checkEnd(ctx);
}
