import { BATHER_AREA_SOURCES, STEWARD_TUNING } from '$data/districts/bathhouses';
import { type Ctx, emit, ref } from '../../ctx';
import { who } from '../../events';
import { byReadingOrder, type Coord, label, sameCoord } from '../../grid';
import { cloudNet } from '../../networks';
import { isCloud, isOpen, tileAt, unitAt } from '../../queries';
import type { TrickDef } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { DistrictEvent, DistrictEventDef } from '../types';
import { parseBoilOver } from './boilOver';
import { BOIL_OVER_RULE_ID, STEAM_CAUSE } from './types';

/**
 * The Bath-Steward's trick (bathhouses-plan P10; BH-17b): he is a rival (`data/rivals/bathSteward.ts`),
 * and his two signature moves are registered through the rival kit. *Steams away* is a `beforeHarm`
 * reaction: hit on a cloud tile by anything but a burst of the cloud, he re-forms on the free tile
 * of that connected cloud farthest from where he stood (ties in reading order) and the hit does not
 * land; with no free tile he takes it. The *stoke* is his trick action: it adds `stokePips` to the
 * gauge, capped at its capacity (the round end then boils it).
 */

export const STEAMS_AWAY = 'bathhouses:steamsAway';
export const STOKE = 'bathhouses:stoke';
const QUARTERS = 4;

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const copy = (c: Coord): Coord => ({ x: c.x, y: c.y });
const where = (c: Coord | undefined): string => (c ? label(c) : '?');

/** P10: the free tile of his cloud farthest from where he stands (ties: reading order), or null. */
export function reformSpot(s: BattleState, u: Unit): Coord | null {
  if (!isCloud(tileAt(s, u.pos))) return null;
  const free = cloudNet(s, u.pos)
    .filter((c) => !sameCoord(c, u.pos) && !unitAt(s, c) && isOpen(s, c, u.id))
    .sort((a, b) => manhattan(b, u.pos) - manhattan(a, u.pos) || byReadingOrder(a, b));
  return free[0] ?? null;
}

/** Adds the stoke to the gauge; false when the board has none. */
function stoke(ctx: Ctx, e: EnemyUnit): boolean {
  const rules = ctx.s.rules;
  if (!rules || !Object.hasOwn(rules, BOIL_OVER_RULE_ID)) return false;
  const own = parseBoilOver(rules[BOIL_OVER_RULE_ID]);
  const to = Math.min(own.capacity, own.pressure + STEWARD_TUNING.stokePips * QUARTERS);
  const ev: DistrictEvent = { type: STOKE, unit: ref(e), data: { from: own.pressure, to } };
  emit(ctx, ev);
  ctx.s.rules = { ...rules, [BOIL_OVER_RULE_ID]: { ...own, pressure: to } };
  return true;
}

export const STEWARD_TRICK: TrickDef<null> = {
  id: STEAMS_AWAY,
  name: 'the Steward',
  effectEvents: [STOKE],
  init: () => null,
  action: {
    /** Only on a board with the gauge. */
    plan: (s) =>
      s.rules && Object.hasOwn(s.rules, BOIL_OVER_RULE_ID) ? [{ lock: null, data: null }] : [],
    resolve(ctx, unit, _intent, own) {
      stoke(ctx, unit);
      return own;
    },
  },
  beforeHarm(ctx, unit, harm) {
    if (harm.kind !== 'hit' || BATHER_AREA_SOURCES.includes(harm.source)) return { kind: 'pass' };
    const to = reformSpot(ctx.s, unit);
    if (!to) return { kind: 'pass' };
    const ev: DistrictEvent = {
      type: STEAMS_AWAY,
      unit: ref(unit),
      at: copy(to),
      data: { source: harm.source, from: { x: unit.pos.x, y: unit.pos.y } },
    };
    emit(ctx, ev);
    return { kind: 'relocate', to, cause: STEAM_CAUSE };
  },
  draw: () => ({ label: 'stoke', tiles: [], units: [] }),
  describe: () =>
    'stokes the house, and turns to steam when struck in a cloud, re-forming across it',
};

export const STEWARD_TRICKS: readonly TrickDef[] = [STEWARD_TRICK];

export const STEWARD_EVENT_LINES: readonly DistrictEventDef[] = [
  {
    type: STEAMS_AWAY,
    describe: (e) =>
      `${e.unit ? who(e.unit) : 'the Steward'} steams away and re-forms at ${where(e.at)}`,
  },
  {
    type: STOKE,
    describe: () => `the Steward stokes the house (+${STEWARD_TUNING.stokePips})`,
  },
];
