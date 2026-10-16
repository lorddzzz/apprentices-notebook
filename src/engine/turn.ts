import { ATTACKS, TUNING } from '$data';
import { enemyPhase } from './ai';
import { runEchoes } from './cast';
import { type Ctx, checkEnd, emit, ref } from './ctx';
import { burnGates, drift } from './current';
import { burn, dealDamage } from './damage';
import { burstAt, resolveSpecial, snuffStep } from './foes';
import { byReadingOrder, type Coord, neighbors4, step } from './grid';
import { applyInk, heatNearFire, scaldInSteam } from './materials';
import { enemies, isAlive, livingUnits, members, tileAt, travel, unitAt } from './queries';
import type { EnemyUnit, Unit } from './types';

/**
 * End of turn: telegraphed attacks resolve in intent order, hazards tick, the round advances, the
 * enemies move and telegraph, and the party's next turn begins (echoes fire first).
 */

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
    burstAt(ctx, e);
    return;
  }
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

/** Scalding from hot brass: `heatDamage` to each orthogonal neighbour, normal damage path (inked +1 applies). */

function scaldFromHeat(ctx: Ctx): void {
  const s = ctx.s;
  type Source = { at: Coord; unit: Unit | null };
  const sources: Source[] = [
    ...livingUnits(s)
      .filter((u) => u.brass && u.heat > 0)
      .map((u) => ({ at: u.pos, unit: u })),
    ...s.tiles.flatMap((t, i) =>
      t.plate && t.heat > 0 ? [{ at: tileCoord(i, s.width), unit: null }] : [],
    ),
  ].sort((a, b) => byReadingOrder(a.at, b.at));
  for (const src of sources) {
    if (src.unit && !isAlive(src.unit)) continue;
    for (const n of neighbors4(src.at).sort(byReadingOrder)) {
      const victim = unitAt(s, n);
      if (victim && victim !== src.unit) dealDamage(ctx, victim, TUNING.heatDamage, 'Heated brass');
    }
  }
}

/** Hot brass counts down; whatever reaches 0 cools. */
function coolBrass(ctx: Ctx): void {
  const s = ctx.s;
  const tiles: Coord[] = [];
  const units: Unit[] = [];
  s.tiles.forEach((t, i) => {
    if (t.heat > 0 && --t.heat === 0) tiles.push(tileCoord(i, s.width));
  });
  for (const u of livingUnits(s)) if (u.heat > 0 && --u.heat === 0) units.push(u);
  if (tiles.length || units.length)
    emit(ctx, { type: 'cooled', tiles, units: units.map((u) => ref(u)) });
}

/**
 * The current drifts, fire burns, gates catch, hot brass scalds, then heat, fire and steam age,
 * vents refill, and snuffers put fire out.
 */
function hazards(ctx: Ctx): void {
  const s = ctx.s;
  drift(ctx);
  // Brass that came to rest beside burning oil since the ignition catches the heat now.
  heatNearFire(
    ctx,
    s.tiles.flatMap((t, i) => (t.fire > 0 ? [tileCoord(i, s.width)] : [])),
    false,
  );
  const onFire = livingUnits(s)
    .filter((u) => tileAt(s, u.pos).fire > 0)
    .sort((a, b) => byReadingOrder(a.pos, b.pos));
  for (const u of onFire) if (isAlive(u)) burn(ctx, u);
  burnGates(ctx);
  scaldFromHeat(ctx);
  scaldInSteam(ctx);
  coolBrass(ctx);

  const out: Coord[] = [];
  const faded: Coord[] = [];
  const crumbled: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.fire > 0 && --t.fire === 0) {
      t.oil = false;
      t.stain = false;
      out.push(tileCoord(i, s.width));
    }
    if (t.steam > 0 && --t.steam === 0) {
      t.scald = false;
      faded.push(tileCoord(i, s.width));
    }
    if (t.plate && t.plateRounds > 0 && --t.plateRounds === 0) {
      t.plate = false;
      t.heat = 0;
      t.etched = false;
      crumbled.push(tileCoord(i, s.width));
    }
  });
  if (out.length) emit(ctx, { type: 'fireOut', tiles: out });
  if (faded.length) emit(ctx, { type: 'steamFades', tiles: faded });
  if (crumbled.length) emit(ctx, { type: 'plateCrumbles', tiles: crumbled });

  s.tiles.forEach((t, i) => {
    if (!t.vent || t.plate || t.steam > 0) return;
    const at = tileCoord(i, s.width);
    emit(ctx, { type: 'vent', at });
    t.steam = TUNING.steamRounds;
    t.scald = false; // vents give plain steam
    if (t.fire > 0) {
      t.fire = 0;
      emit(ctx, { type: 'extinguish', tiles: [at] });
    }
  });
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
  }
  runEchoes(ctx);
  checkEnd(ctx);
}
