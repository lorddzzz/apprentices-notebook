import { type EncounterDef, LOOT_TABLES, type LootTableId, TUNING } from '$data';
import type { BonusObjective } from '$data/districts/index';
import { checkGoal } from '../city';
import type {
  BoardEdit,
  BoardRule,
  KitLootItem,
  KitLootSpec,
  OfferContributor,
  RoomSetup,
  RuleId,
} from '../districts/types';
import type { EventLog } from '../events';
import { boardRules, initBroughtRules, listRules } from '../rules';
import type { BattleState, Trip } from '../types';
import { type OfferRegistry, offerRegistry } from './offerKinds';
import { type DistrictShape, shapeInput, shapeOf } from './shape';

/**
 * The trip shape's state side (P7, P13; DK-5b): a room set up from trip state, the room's bonus
 * objective, the module's `afterRoom`, and its per-room offers. A district with no hooks, no
 * district-scoped rules and no bonus rooms gets back exactly what it passed in.
 */

/** The module's setup for the room the trip is about to fight, if it has one. */
export function roomSetupFor(t: Trip, shape: DistrictShape = shapeOf(t.district)): RoomSetup {
  return shape.trip?.roomSetup?.(shapeInput(t, shape)) ?? {};
}

/** The rules a room lists: its district's district-scoped rules, then the setup's `activate`. */
export function roomRules(shape: DistrictShape, setup: RoomSetup): RuleId[] {
  const ids = [...(shape.rules ?? []), ...(setup.activate ?? [])];
  return ids.filter((id, i) => ids.indexOf(id) === i);
}

function applyEdit(s: BattleState, edit: BoardEdit): void {
  const { x, y } = edit.at;
  const tile = x >= 0 && y >= 0 && x < s.width && y < s.height ? s.tiles[y * s.width + x] : null;
  if (!tile) throw new Error(`Board edit off the board at ${x},${y}`);
  if ('piece' in edit) tile.piece = edit.piece && structuredClone(edit.piece);
  else tile.terrain = { ...tile.terrain, ...edit.terrain };
}

/**
 * A fresh battle under its room's setup (DK-3's hook): the listed rules initialised with their
 * config (`listRules`), then the board edits, after HC's start-point draw. Edits land after the
 * opening telegraph, so a module edits tiles the round-1 plan does not depend on. Returns the same
 * state when there is nothing to apply (golden logs and saves stay byte-identical).
 */
export function setUpRoom(
  s: BattleState,
  shape: DistrictShape,
  setup: RoomSetup,
  rules: readonly BoardRule[] = boardRules(),
): BattleState {
  const ids = roomRules(shape, setup);
  const edits = setup.boardEdits ?? [];
  if (ids.length === 0 && edits.length === 0) return s;
  const out = structuredClone(s);
  if (ids.length > 0) out.rules = listRules(out, ids, setup.rulesConfig ?? {}, rules);
  for (const e of edits) applyEdit(out, e);
  if (edits.length > 0) initBroughtRules(out, rules);
  return out;
}

/** The won room's bonus objective when its goal was met in this fight (P13). */
export function bonusMet(
  shape: DistrictShape,
  room: number,
  b: BattleState,
  log: EventLog,
): BonusObjective | null {
  const bonus = shape.bonuses?.[room];
  return bonus && checkGoal(bonus.goal, log, b) ? bonus : null;
}

/**
 * A won room's mark on the trip (P7, P13): a met bonus is noted in `kit.bonuses`, then the
 * module's `afterRoom` writes its state (it reads the bonuses, so a `state` reward is its tag),
 * then its `lootAfterRoom` edits the loot. Trips without a kit come back unchanged.
 */
export function afterRoomWon(
  t: Trip,
  b: BattleState,
  log: EventLog,
  shape: DistrictShape = shapeOf(t.district),
): { trip: Trip; bonus: BonusObjective | null } {
  if (!t.kit) return { trip: t, bonus: null };
  const bonus = bonusMet(shape, t.encounter, b, log);
  const bonuses = bonus ? [...t.kit.bonuses, t.encounter] : t.kit.bonuses;
  const marked: Trip = { ...t, kit: { ...t.kit, bonuses } };
  const after = shape.trip?.afterRoom;
  if (!after) return { trip: marked, bonus };
  const state = after(shapeInput(marked, shape), log, true);
  const settled: Trip = { ...marked, kit: { ...t.kit, bonuses, state } };
  const loot = shape.trip?.lootAfterRoom?.(shapeInput(settled, shape));
  return { trip: loot ? { ...settled, loot: [...loot] } : settled, bonus };
}

/** A core spec as the card it is (a bonus's named offer is offered as itself). */
function itemOf(spec: KitLootSpec): KitLootItem {
  switch (spec.kind) {
    case 'ink':
      return { kind: 'ink', amount: TUNING.inkReserve };
    default:
      return spec as KitLootItem;
  }
}

const isTable = (id: string): id is LootTableId => Object.hasOwn(LOOT_TABLES, id);

/** What a won room offers: its table, its picks and the registry the roll runs through. */
export interface RoomRoll {
  table: LootTableId;
  picks: number;
  /** Null: the game's registry as is (rooms without hooks roll exactly as before). */
  registry: OfferRegistry | null;
}

/**
 * The won room's offers (P7, P13, CG/BF): the module's `offersFor` may replace the table and the
 * picks and add guaranteed and extra cards; a met bonus adds a pick or names an extra card. Both
 * feed the offer registry (DK-7) as contributors after its own, so limits and kinds still apply.
 */
export function roomRoll(
  t: Trip,
  enc: EncounterDef,
  bonus: BonusObjective | null,
  shape: DistrictShape = shapeOf(t.district),
): RoomRoll {
  const own = t.kit ? (shape.trip?.offersFor?.(shapeInput(t, shape)) ?? null) : null;
  const table = own?.table ?? enc.loot;
  if (!isTable(table)) throw new Error(`No loot table '${table}'`);
  const picks = (own?.picks ?? enc.picks) + (bonus?.reward.kind === 'pick' ? 1 : 0);
  const added: OfferContributor[] = [];
  for (const must of own?.guaranteed ?? []) added.push(() => ({ must }));
  const extra = [...(own?.extra ?? [])];
  if (bonus?.reward.kind === 'offer') extra.push(itemOf(bonus.reward.spec));
  if (extra.length > 0) added.push(() => ({ extra }));
  if (added.length === 0) return { table, picks, registry: null };
  const base = offerRegistry();
  return {
    table,
    picks,
    registry: { ...base, contributors: [...base.contributors, ...added] },
  };
}
