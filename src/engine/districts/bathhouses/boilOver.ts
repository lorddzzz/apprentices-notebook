import {
  BOIL_CAPACITY_PIPS,
  FEEDER_PIPS,
  HEAT,
  type HeatLevel,
} from '$data/districts/bathhouses/types';
import { hasTrait } from '../../arrival';
import { type Ctx, emit } from '../../ctx';
import { dealDamage } from '../../damage';
import { type Coord, inBounds, neighbors4 } from '../../grid';
import { habitOf, ruleOf } from '../../habits';
import { coordOf, isCloud, livingUnits, tileAt } from '../../queries';
import type { BattleState, Unit, UnitId } from '../../types';
import type { BoardRule, Json, PreviewShape } from '../types';
import {
  BOIL_OVER_RULE_ID,
  type BoilOverEvent,
  type BoilOverState,
  type PressureEvent,
} from './types';

/**
 * The boil-over gauge (bathhouses-plan P1–P3; BH-1). A district-scoped round-end rule in DK's
 * `afterChemistry` slot: every cloud tile on the board and every vent fill the gauge by the room's
 * heat (plus boilermen beside a vent); at capacity it boils over, hitting each unit on a cloud tile
 * for the Storm result through `dealDamage` (as steam, so wards and shields answer), and resets to
 * 0 with the surplus dropped. It never falls on its own. Active only where listed: the district's
 * rooms (its module rules) and Lab boards that list it.
 */

/** The Storm result (rune-design-final §4.3): what a boil-over deals each unit. */
export const BOIL_DAMAGE = 2;
export const BOIL_SOURCE = 'Boil-over';
const QUARTERS = 4;

const isHeat = (v: unknown): v is HeatLevel => v === 1 || v === 2 || v === 3 || v === 4;

/** The rule's state from a room's config (`{ heat, line? }`); anything else reads as heat 1. */
export function initBoilOver(config: Json | undefined): BoilOverState {
  const c = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const heat = 'heat' in c && isHeat(c.heat) ? c.heat : 1;
  const line =
    'line' in c && typeof c.line === 'number' && Number.isSafeInteger(c.line) && c.line > 0
      ? c.line
      : undefined;
  return {
    pressure: 0,
    capacity: BOIL_CAPACITY_PIPS * QUARTERS,
    heat,
    ...(line !== undefined ? { line } : {}),
  };
}

/** A saved state read forgivingly (old saves, hand-built Lab states). */
export function parseBoilOver(raw: unknown): BoilOverState {
  const base = initBoilOver(raw as Json | undefined);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Record<keyof BoilOverState, unknown>>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const capacity = Math.max(1, num(r.capacity, base.capacity));
  return { ...base, capacity, pressure: Math.max(0, Math.min(capacity, num(r.pressure, 0))) };
}

/** The listed state in `s`, or null when the rule is not on this board. */
export const boilOverState = (s: BattleState): BoilOverState | null =>
  s.rules && Object.hasOwn(s.rules, BOIL_OVER_RULE_ID)
    ? parseBoilOver(s.rules[BOIL_OVER_RULE_ID])
    : null;

/** Every cloud tile, in reading order (all four cloud kinds, every network: P2). */
function cloudTiles(s: BattleState): Coord[] {
  const out: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (isCloud(t)) out.push(coordOf(s, i));
  });
  return out;
}

const ventTiles = (s: BattleState): Coord[] =>
  s.tiles.flatMap((t, i) => (t.terrain.vent ? [coordOf(s, i)] : []));

/** P7: living units with `feeds` standing orthogonally next to a vent. */
function feeders(s: BattleState): Unit[] {
  return livingUnits(s).filter(
    (u) =>
      hasTrait(u, 'feeds') &&
      neighbors4(u.pos).some((n) => inBounds(n, s.width, s.height) && tileAt(s, n).terrain.vent),
  );
}

/** Units standing on a cloud tile, in reading order of position (P3). */
function unitsInCloud(s: BattleState): Unit[] {
  return livingUnits(s)
    .filter((u) => isCloud(tileAt(s, u.pos)))
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
}

/** What the next round end will do, read from the board as it stands. Pure. */
export interface BoilForecast {
  /** Pressure now and after the fill (capped at capacity), in quarter-pips. */
  value: number;
  forecast: number;
  capacity: number;
  /** The fill's parts: cloud tiles, vent tiles, feeders. */
  clouds: number;
  vents: number;
  feeders: number;
  boils: boolean;
  /** When it boils: every cloud tile and the units on them, in reading order. */
  tiles: Coord[];
  units: UnitId[];
  /** Party members it would hurt (on a cloud and not warded from steam): the harm ring. */
  harm: UnitId[];
}

export function forecastBoilOver(s: BattleState, own: BoilOverState): BoilForecast {
  const row = HEAT[own.heat];
  const tiles = cloudTiles(s);
  const vents = ventTiles(s).length;
  const feeding = feeders(s).length;
  const fill =
    tiles.length * row.tileQuarters + vents * row.ventQuarters + feeding * FEEDER_PIPS * QUARTERS;
  const boils = fill > 0 && own.pressure + fill >= own.capacity;
  const hit = boils ? unitsInCloud(s) : [];
  return {
    value: own.pressure,
    forecast: Math.min(own.capacity, own.pressure + fill),
    capacity: own.capacity,
    clouds: tiles.length,
    vents,
    feeders: feeding,
    boils,
    tiles: boils ? tiles : [],
    units: hit.map((u) => u.id),
    harm: hit
      .filter((u) => u.kind === 'member' && !ruleOf(habitOf(u)).wards?.includes('steam'))
      .map((u) => u.id),
  };
}

/** P3: every unit on a cloud takes 2 as steam; the battle's end check runs after the whole step. */
function boilOver(ctx: Ctx, f: BoilForecast): void {
  const ev: BoilOverEvent = {
    type: 'bathhouses:boilOver',
    data: { tiles: f.tiles.map((t) => ({ ...t })), units: [...f.units] },
  };
  emit(ctx, ev);
  for (const id of f.units) {
    const u = ctx.s.units.find((v) => v.id === id);
    if (!u || u.hp <= 0 || u.out) continue; // downed by an earlier hit's chain
    dealDamage(ctx, u, BOIL_DAMAGE, BOIL_SOURCE, [], { heading: null, at: null, harm: 'steam' });
  }
}

/** One round end: fill, then boil over at capacity and reset (the surplus is dropped). */
export function boilOverStep(ctx: Ctx, own: BoilOverState): BoilOverState {
  const f = forecastBoilOver(ctx.s, own);
  if (f.forecast === f.value && !f.boils) return own;
  const ev: PressureEvent = {
    type: 'bathhouses:pressure',
    data: {
      from: f.value,
      to: f.forecast,
      clouds: f.clouds,
      vents: f.vents,
      feeders: f.feeders,
    },
  };
  emit(ctx, ev);
  if (!f.boils) return { ...own, pressure: f.forecast };
  boilOver(ctx, f);
  return { ...own, pressure: 0 };
}

const pips = (q: number): number => Math.floor(q / QUARTERS);

/**
 * P4: the meter (whole pips now, next round's level as its `forecast`, `danger` when it boils),
 * then when it boils a warn tone on every cloud tile and a pulse on each member it would hurt.
 */
export function boilOverPreview(s: BattleState, own: BoilOverState): PreviewShape[] {
  const f = forecastBoilOver(s, own);
  const max = pips(f.capacity);
  const out: PreviewShape[] = [
    {
      kind: 'meter',
      label: 'Pressure',
      value: pips(f.value),
      max,
      forecast: pips(f.forecast),
      danger: f.boils,
    },
  ];
  if (!f.boils) return out;
  for (const at of f.tiles) out.push({ kind: 'tile', at, tone: 'warn' });
  for (const id of f.harm) {
    const u = s.units.find((v) => v.id === id);
    if (u) out.push({ kind: 'pulse', at: { ...u.pos } });
  }
  return out;
}

export const BOIL_OVER_RULE: BoardRule<BoilOverState> = {
  id: BOIL_OVER_RULE_ID,
  slot: 'afterChemistry',
  order: 10,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: (_s, config) => initBoilOver(config),
  step: (ctx, own) => boilOverStep(ctx, parseBoilOver(own)),
  preview: (s, own) => boilOverPreview(s, parseBoilOver(own)),
};
