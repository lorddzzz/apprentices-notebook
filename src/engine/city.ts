import {
  DISTRICT_IDS,
  DISTRICTS,
  type DistrictDef,
  type DistrictId,
  type Goal,
  type HearCondition,
  type LootTableId,
} from '$data';
import type { EventLog, GameEvent } from './events';
import { parseLabel } from './notation';
import { placeOf } from './trip/place';
import { returnCheck } from './trip/ret';
import type { BattleState, CityState, LootItem, Profile, Trip } from './types';

/**
 * The city (K-19 to K-24): which districts are heard of, open and cleared, how hearing happens,
 * how gates open, keys, rumours and landings (read from the trip shape, `trip/ret.ts`). Logic functions take the district table as an
 * optional last parameter so tests can pass fixture districts.
 */

export type DistrictState = 'unheard' | 'heard' | 'open';
type DistrictTable = Readonly<Record<DistrictId, DistrictDef>>;

const add = (xs: readonly DistrictId[], id: DistrictId): DistrictId[] =>
  xs.includes(id) ? [...xs] : [...xs, id];

/** A new notebook's city: only the Seam, heard and open. */
export function cityDefaults(): CityState {
  return { heard: ['seam'], open: ['seam'], hearts: [], solved: [], trips: 0, fresh: [] };
}

export function districtState(p: Profile, id: DistrictId): DistrictState {
  if (p.city.open.includes(id)) return 'open';
  return p.city.heard.includes(id) ? 'heard' : 'unheard';
}

/** Hears `id`: heard + fresh, and open at once for a `discovery` gate. Never twice. */
function hear(city: CityState, id: DistrictId, table: DistrictTable): CityState {
  return {
    ...city,
    heard: add(city.heard, id),
    fresh: add(city.fresh, id),
    open: table[id].gate.kind === 'discovery' ? add(city.open, id) : city.open,
  };
}

/** Hears every not-yet-heard district with a `voice` condition that `holds`. */
function hearWhere(
  p: Profile,
  voice: HearCondition['voice'],
  holds: (c: HearCondition) => boolean,
  table: DistrictTable,
): { profile: Profile; heard: DistrictId[] } {
  let city = p.city;
  const heard: DistrictId[] = [];
  for (const id of DISTRICT_IDS) {
    if (city.heard.includes(id)) continue;
    if (!table[id].hear.some((c) => c.voice === voice && holds(c))) continue;
    city = hear(city, id, table);
    heard.push(id);
  }
  return heard.length ? { profile: { ...p, city }, heard } : { profile: p, heard };
}

const named = (p: Profile, id: string): boolean => p.named.includes(id);

/**
 * Owner hearing, read off a finished trip battle's log, win or wipe (K-20). `heard` lists the
 * districts newly heard (they also go into `city.fresh`; a `discovery` gate opens them).
 */
export function hearFromBattle(
  p: Profile,
  t: Trip,
  log: EventLog,
  table: DistrictTable = DISTRICTS,
): { profile: Profile; heard: DistrictId[] } {
  const biggest = (burst: string): number =>
    log.reduce(
      (m, e) => (e.type === 'burst' && e.burst === burst ? Math.max(m, e.tiles.length) : m),
      0,
    );
  return hearWhere(
    p,
    'owner',
    (c) =>
      (c.kind === 'burst' &&
        (c.district === undefined || c.district === t.district) &&
        biggest(c.burst) >= c.atLeast) ||
      (c.kind === 'named' && named(p, c.id)),
    table,
  );
}

/**
 * After a trip ends (returned or wiped): counts it, marks a cleared heart, then checks rumour
 * conditions (K-20). `heard` lists the districts newly heard.
 */
export function hearAfterTrip(
  p: Profile,
  t: Trip,
  outcome: 'returned' | 'wiped',
  table: DistrictTable = DISTRICTS,
): { profile: Profile; heard: DistrictId[] } {
  const city: CityState = { ...p.city, trips: p.city.trips + 1 };
  if (outcome === 'returned' && t.status === 'cleared') {
    city.hearts = add(city.hearts, t.district);
    city.heard = add(city.heard, t.district);
    city.open = add(city.open, t.district);
  }
  return hearWhere(
    { ...p, city },
    'rumour',
    (c) =>
      (c.kind === 'heart' && city.hearts.includes(c.district)) ||
      (c.kind === 'trips' && city.trips >= c.atLeast) ||
      (c.kind === 'named' && named(p, c.id)),
    table,
  );
}

/** Whether the party may return home from this Crossroads (K-4; the district's `ret`, P3). */
export function canReturn(t: Trip): boolean {
  return returnCheck(t).ok;
}

/**
 * The next return point's room name for the greyed Return button, or null when this is one or
 * the way home is shut by a block rather than the policy (K-4, P3).
 */
export function nextLanding(t: Trip): string | null {
  const check = returnCheck(t);
  return check.ok || check.next === undefined ? null : placeOf(t, check.next);
}

/**
 * The key a won fight's table may offer (K-23): a district whose `key` gate is `t.district` +
 * `table`, heard and not open, none on this trip yet. Null for none.
 */
export function keyOffer(
  p: Profile,
  t: Trip,
  lootTable: LootTableId,
  districts: DistrictTable = DISTRICTS,
): { district: DistrictId; weight: number } | null {
  if ([...t.loot, ...t.offers].some((i) => i.kind === 'key')) return null;
  for (const id of DISTRICT_IDS) {
    const gate = districts[id].gate;
    if (gate.kind !== 'key' || gate.from !== t.district || gate.table !== lootTable) continue;
    if (districtState(p, id) === 'heard') return { district: id, weight: gate.weight };
  }
  return null;
}

/** Opens the districts whose keys are in the banked loot (K-23). */
export function bankKeys(p: Profile, loot: readonly LootItem[]): Profile {
  let city = p.city;
  for (const item of loot) {
    if (item.kind !== 'key' || city.open.includes(item.district)) continue;
    city = {
      ...city,
      heard: add(city.heard, item.district),
      open: add(city.open, item.district),
    };
  }
  return city === p.city ? p : { ...p, city };
}

/** One goal against a log and the final state (K-22). */
export function checkGoal(goal: Goal, events: readonly GameEvent[], state: BattleState): boolean {
  if ('all' in goal) return goal.all.every((g) => checkGoal(g, events, state));
  if ('happens' in goal) {
    return events.filter((e) => e.type === goal.happens).length >= (goal.atLeast ?? 1);
  }
  if ('hurt' in goal) {
    let total = 0;
    for (const e of events) if (e.type === 'damage' && e.target.id === goal.hurt) total += e.amount;
    return total >= goal.atLeast;
  }
  const unit = (id: string) => state.units.find((u) => u.id === id);
  if ('dies' in goal) {
    const u = unit(goal.dies);
    return events.some((e) => e.type === 'died' && e.unit.id === goal.dies) || (!!u && u.hp <= 0);
  }
  if ('spared' in goal) {
    const u = unit(goal.spared);
    return !!u && u.hp > 0 && !events.some((e) => e.type === 'died' && e.unit.id === goal.spared);
  }
  const at = parseLabel(goal.tile);
  return state.tiles[at.y * state.width + at.x]?.state?.id === goal.has;
}

/** A threshold battle's objective, checked on an action's log and the state (K-22). */
export function objectiveMet(state: BattleState, log: EventLog): boolean {
  return state.objective ? checkGoal(state.objective, log, state) : false;
}

/** A threshold room solved: the district opens and the map shows a burnt gate (K-22). */
export function solveThreshold(p: Profile, district: DistrictId): Profile {
  const c = p.city;
  return {
    ...p,
    city: {
      ...c,
      heard: add(c.heard, district),
      open: add(c.open, district),
      solved: add(c.solved, district),
    },
  };
}

/** The map was opened: nothing is fresh any more (K-19). */
export function seeMap(p: Profile): Profile {
  return p.city.fresh.length ? { ...p, city: { ...p.city, fresh: [] } } : p;
}

/** Dev: every district heard and open (K-24). */
export function openAll(p: Profile): Profile {
  const c = p.city;
  return {
    ...p,
    city: {
      ...c,
      heard: DISTRICT_IDS.reduce(add, c.heard),
      open: DISTRICT_IDS.filter((id) => DISTRICTS[id].gate.kind !== 'drawing').reduce(add, c.open),
    },
  };
}
