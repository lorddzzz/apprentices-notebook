import { TUNING } from '$data';
import { INK_ENEMIES, INK_FOE_TUNING } from '$data/districts/inkQuarter/enemies';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import type {
  NextRoomCost,
  ResourceLoss,
  TermDef,
  TermStake,
} from '$data/districts/inkQuarter/types';
import type { Ctx } from '../../ctx';
import { makeEnemy } from '../../foes';
import { byReadingOrder, type Coord } from '../../grid';
import { coordOf, findUnit, isAlive, isOpen, tileAt, unitAt } from '../../queries';
import { createRng, deriveSeed } from '../../rng';
import type { BattleState, MemberUnit, Trip } from '../../types';
import type { BoardRule, KitLootItem, RoomSetup, RuleId, ShapeInput } from '../types';
import { termDef } from './terms';
import { type InkTripState, openTerm, type Term } from './types';
import { placeSeal } from './wax';

/**
 * Term stakes beyond the held reward (P6; IQ-4). Three kinds, all ending with the trip:
 * - **Ink** lost on a broken term comes off the trip's ink loot at once (`lootAfterRoom`).
 * - **HP / charges** lost on a broken term are taken as the next room starts (`inkQuarter:stakes`
 *   rule init), because `finishEncounter` rewrites the trip's HP and charges from the battle after
 *   the shape's hooks have run. Never below revive HP, never a charge below 0.
 * - **Next-room handicaps** (a plain mark, one extra dead letter, a wax seal on a start tile) are
 *   always applied when the term was signed, win or lose. They go through the same rule's init
 *   (board edits cannot touch units), on one apprentice drawn from the trip seed.
 * The rule's init edits its own clone of the fresh battle silently: no events are logged for it.
 */

export const STAKES_RULE_ID: RuleId = 'inkQuarter:stakes';
/** Salt for the apprentice draw (kept clear of START_SALT 6000). */
const STAKE_SALT = 6400;

/** What the rule's init is told, plain JSON. */
export type StakeConfig = {
  /** The apprentice the handicap lands on. */
  member: string;
  cost: NextRoomCost | null;
  loss: ResourceLoss | null;
};
/** The rule's own state: what it applied (a record for tests and the UI). */
export type StakeState = { applied: string[] };

const NO_STAKE: TermStake = { kind: 'reward' };

// ── Which term, which stake ─────────────────────────────
/** The term signed in the room before `room`, still open: its next-room cost is due now. */
const pendingTerm = (state: InkTripState, room: number): Term | null => {
  const t = openTerm(state);
  return t && t.signedAt === room - 1 ? t : null;
};

/** The term settled broken by room `room - 1`'s win (signed in `room - 2`): its resource loss is due. */
const brokenTerm = (state: InkTripState, room: number): Term | null =>
  state.terms.find((t) => t.status === 'broken' && t.signedAt === room - 2) ?? null;

const costOf = (s: TermStake): NextRoomCost | null => (s.kind === 'nextRoom' ? s.cost : null);
const lossOf = (s: TermStake): ResourceLoss | null => (s.kind === 'resources' ? s.loss : null);

/** The apprentice for a room's stake, from the trip seed alone. */
export function stakeMember(trip: Trip, room: number): string {
  const rng = createRng(deriveSeed(trip.seed, STAKE_SALT + room));
  return trip.party[rng.int(0, trip.party.length - 1)] as string;
}

/** The `roomSetup` hunk (P6): lists the stakes rule when this room owes something. */
export function stakeSetup(
  { trip, state, room }: ShapeInput<InkTripState>,
  defs: readonly TermDef[] = INK_TERMS,
): RoomSetup {
  const due = pendingTerm(state, room);
  const owed = brokenTerm(state, room);
  const cost = due ? costOf(termDef(due.def, defs)?.stake ?? NO_STAKE) : null;
  const loss = owed ? lossOf(termDef(owed.def, defs)?.stake ?? NO_STAKE) : null;
  if (!cost && !loss) return {};
  const config: StakeConfig = { member: stakeMember(trip, room), cost, loss };
  return { activate: [STAKES_RULE_ID], rulesConfig: { [STAKES_RULE_ID]: config } };
}

// ── Resource penalties ──────────────────────────────────
/** Takes `amount` ink from the trip's ink loot (earliest first); never below none. */
export function loseInk(loot: readonly KitLootItem[], amount: number): KitLootItem[] {
  let owed = amount;
  const out: KitLootItem[] = [];
  for (const i of loot) {
    if (i.kind !== 'ink' || owed <= 0) {
      out.push(i);
      continue;
    }
    const take = Math.min(owed, i.amount);
    owed -= take;
    if (i.amount - take > 0) out.push({ ...i, amount: i.amount - take });
  }
  return out;
}

/** The `lootAfterRoom` hunk: the broken term's ink comes off (the page is IQ-3's `releaseHeld`). */
export function inkAfterRoom(
  { state, room }: ShapeInput<InkTripState>,
  loot: readonly KitLootItem[],
  defs: readonly TermDef[] = INK_TERMS,
): readonly KitLootItem[] {
  const broke = state.terms.find((t) => t.status === 'broken' && t.signedAt === room - 1);
  const loss = broke ? lossOf(termDef(broke.def, defs)?.stake ?? NO_STAKE) : null;
  return loss?.kind === 'ink' ? loseInk(loot, loss.amount) : loot;
}

/** HP off a member, never to less than revive HP (never lethal). */
const loseHp = (m: MemberUnit, amount: number): void => {
  m.hp = Math.min(m.hp, Math.max(TUNING.reviveHp, m.hp - amount));
};

/** One charge off the member's fullest spell (ties by key); nothing when it has none. */
function loseCharge(m: MemberUnit, amount: number): void {
  let best: string | null = null;
  for (const k of Object.keys(m.charges).sort()) {
    if (best === null || (m.charges[k] ?? 0) > (m.charges[best] ?? 0)) best = k;
  }
  if (best !== null) m.charges[best] = Math.max(0, (m.charges[best] ?? 0) - amount);
}

// ── Next-room handicaps ─────────────────────────────────
const members = (s: BattleState): MemberUnit[] =>
  s.units.filter((u): u is MemberUnit => u.kind === 'member' && isAlive(u));

/** A tile for the extra foe: open, not the drop, as far from every apprentice as the board allows. */
function foeTile(s: BattleState): Coord | null {
  const ms = members(s);
  let best: { at: Coord; d: number } | null = null;
  for (let i = 0; i < s.tiles.length; i++) {
    const at = coordOf(s, i);
    if (!isOpen(s, at) || tileAt(s, at).terrain.drop || tileAt(s, at).piece) continue;
    const d = Math.min(...ms.map((m) => Math.abs(m.pos.x - at.x) + Math.abs(m.pos.y - at.y)));
    if (!best || d > best.d || (d === best.d && byReadingOrder(at, best.at) < 0)) best = { at, d };
  }
  return best?.at ?? null;
}

/** Applies a next-room cost to the fresh battle `s` (in place); the line recorded, or null. */
function applyCost(s: BattleState, cost: NextRoomCost, member: string): string | null {
  const m = findUnit(s, member);
  switch (cost.kind) {
    case 'mark':
      if (!m || !isAlive(m) || m.mark) return null;
      m.mark = { deep: false, lineage: s.nextLineage++, bound: null, origin: null };
      return `mark:${member}`;
    case 'seal': {
      if (!m || !isAlive(m)) return null;
      // A throwaway ctx: the seal is set down without a log (nothing has happened yet).
      const ctx: Ctx = { s, log: [], cast: null, meta: {}, footnotes: {} };
      return placeSeal(ctx, m.pos, '', INK_FOE_TUNING.sealRounds) ? `seal:${member}` : null;
    }
    case 'extraFoe': {
      if (cost.foe !== 'deadLetter') return null;
      const at = foeTile(s);
      if (!at || unitAt(s, at)) return null;
      const foe = makeEnemy(s, cost.foe, at);
      s.units.push(foe);
      return `foe:${foe.id}`;
    }
  }
}

/** The stakes rule: listed by the room's setup only, so it never runs unless a stake is due. */
export const STAKES_RULE: BoardRule<StakeState> = {
  id: STAKES_RULE_ID,
  slot: 'late',
  order: 100,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init(s, raw) {
    const c = raw as unknown as StakeConfig | undefined;
    const applied: string[] = [];
    if (!c) return { applied };
    if (c.loss && c.loss.kind !== 'ink') {
      for (const m of members(s)) {
        if (c.loss.kind === 'hp') loseHp(m, c.loss.amount);
        else loseCharge(m, c.loss.amount);
      }
      applied.push(`${c.loss.kind}:${c.loss.amount}`);
    }
    if (c.cost) {
      const line = applyCost(s, c.cost, c.member);
      if (line) applied.push(line);
    }
    return { applied };
  },
  step: (_ctx, own) => own,
};

// ── The data check (P6: never beyond a normal room's band) ──
/** The most a term may take: HP, charges, ink. Never lethal: HP stops at revive HP anyway. */
export const STAKE_LIMITS = { hp: 2, charge: 1, ink: 3 } as const;
/** The district's ordinary (non-elite) staff a term may add, at most this many HP. */
const BAND_FOE_HP = 5;

/**
 * Problems with the stakes of a term list, or none. The band guard: a resource loss is within
 * `STAKE_LIMITS`; a handicap is one thing only (a plain mark, one non-elite foe of at most
 * `BAND_FOE_HP` HP that is one of the district's ordinary staff, or a seal no longer than the
 * Sealer's own 2 rounds), so a term room is a normal room plus one small thing.
 */
export function checkStakeDefs(defs: readonly TermDef[]): string[] {
  const errors: string[] = [];
  for (const d of defs) {
    const st = d.stake;
    if (st.kind === 'resources') {
      const { kind, amount } = st.loss;
      if (!Number.isInteger(amount) || amount < 1 || amount > STAKE_LIMITS[kind])
        errors.push(`${d.id}: loses ${amount} ${kind} (limit ${STAKE_LIMITS[kind]})`);
    } else if (st.kind === 'nextRoom') {
      const c = st.cost;
      if (c.kind === 'extraFoe') {
        const foe = (INK_ENEMIES as Record<string, { hp: number; elite: boolean }>)[c.foe];
        if (!foe) errors.push(`${d.id}: ${c.foe} is not an ordinary postal foe`);
        else if (foe.elite || foe.hp > BAND_FOE_HP)
          errors.push(`${d.id}: ${c.foe} is beyond the band`);
      } else if (c.kind === 'seal' && INK_FOE_TUNING.sealRounds > 2) {
        errors.push(`${d.id}: a seal beyond 2 rounds`);
      }
    }
  }
  return errors;
}
