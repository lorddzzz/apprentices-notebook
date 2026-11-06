import { type ApprenticeId, MEMBER_IDS, type RuneId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  basicDirs,
  castableSpells,
  type GameEvent,
  type LootItem,
  legalAims,
  legalMoves,
  memberById,
  type Profile,
  type Trip,
} from '$engine';
import { boilOverState, forecastBoilOver } from '$engine/districts/bathhouses/boilOver';
import { preconditionsOf, waitingFor } from '$engine/recruits';
import type { Rng } from '$engine/rng';

/** Deterministic, deliberately small greedy bot: value harm, avoid friendly fire, then approach. */
/** Bot options. `gauge` makes it read the boil-over forecast (BH-16); off keeps the old bot. */
export interface BotOptions {
  gauge?: boolean;
}

/**
 * What the forecast boil-over is worth at round end: foes standing in the steam take 2 (brewing on
 * purpose), party members on a cloud take 2 (never end the round in a cloud that boils).
 */
function boilTerm(s: BattleState): number {
  const own = boilOverState(s);
  if (!own) return 0;
  const f = forecastBoilOver(s, own);
  if (!f.boils) return 0;
  let v = 0;
  for (const id of f.units) {
    const u = s.units.find((x) => x.id === id);
    if (!u || u.bystander) continue;
    if (u.kind === 'enemy') v += 10 * Math.min(2, u.hp) + (u.hp <= 2 ? 20 : 0);
    else v -= 30 * Math.min(2, u.hp) + (u.hp <= 2 ? 200 : 0);
  }
  return v;
}

function value(s: BattleState, gauge = false): number {
  return (
    (gauge ? boilTerm(s) : 0) +
    s.units.reduce(
      (v, u) =>
        v +
        (u.bystander
          ? 0 // the canal crate is cargo, never a target (CN P3)
          : u.kind === 'enemy'
            ? -10 * u.hp - (u.hp > 0 ? 20 : 0) + (u.mark ? 0.2 : 0)
            : 30 * u.hp),
      0,
    )
  );
}
/** The member's own basic action (Shove, Pull, Hop or Swap) in every direction it can take now. */
function basics(s: BattleState, id: (typeof MEMBER_IDS)[number]): Action[] {
  const m = memberById(s, id);
  if (m.acted) return [];
  return basicDirs(s, id).map((dir): Action => ({ type: m.action, unit: id, dir }) as Action);
}
function attacks(s: BattleState, id: (typeof MEMBER_IDS)[number]): Action[] {
  return [
    ...basics(s, id),
    ...castableSpells(s, id)
      .filter((x) => x.usable)
      .flatMap(({ spell }) =>
        legalAims(s, id, spell.key).map(
          (aim): Action => ({ type: 'cast', unit: id, spell: spell.key, aim }),
        ),
      ),
  ];
}
function bestAttack(s: BattleState, id: (typeof MEMBER_IDS)[number], gauge = false) {
  let best: { action: Action; gain: number } | null = null;
  for (const action of attacks(s, id)) {
    const gain = value(applyAction(s, action).state, gauge) - value(s, gauge);
    if (!best || gain > best.gain) best = { action, gain };
  }
  return best;
}
/**
 * `order` names who acts, in turn order: default is the founding pair (the members present), as
 * before. Parties of other sizes or recruits pass their own lineup (HC-9).
 */
export function botFight(
  initial: BattleState,
  maxRounds = 40,
  order: readonly ApprenticeId[] = MEMBER_IDS.filter((id) =>
    initial.units.some((u) => u.kind === 'member' && u.id === id),
  ),
  opts: BotOptions = {},
) {
  const gauge = opts.gauge === true;
  let firstBoil: number | null = null;
  let state = initial;
  const events: GameEvent[] = [];
  const actions: Action[] = [];
  const step = (a: Action) => {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    actions.push(a);
    if (firstBoil === null && r.events.some((e) => e.type === 'bathhouses:boilOver')) {
      firstBoil = state.round;
    }
  };
  for (let n = 0; n < maxRounds && state.phase === 'player'; n++) {
    for (const id of order) {
      if (state.phase !== 'player' || memberById(state, id).hp === 0) continue;
      const first = bestAttack(state, id, gauge);
      if (first && first.gain > 0) step(first.action);
      if (state.phase !== 'player') break;
      let move: Action | null = null;
      let score = -Infinity;
      for (const to of legalMoves(state, id)) {
        const action: Action = { type: 'move', unit: id, to };
        const next = applyAction(state, action).state;
        const enemies = next.units.filter((u) => u.kind === 'enemy' && !u.bystander && u.hp > 0);
        const distance = Math.min(
          ...enemies.map((u) => Math.abs(u.pos.x - to.x) + Math.abs(u.pos.y - to.y)),
        );
        const candidate =
          value(next, gauge) -
          value(state, gauge) +
          Math.max(0, bestAttack(next, id, gauge)?.gain ?? 0) -
          distance * 0.01;
        if (candidate > score) {
          score = candidate;
          move = action;
        }
      }
      if (move) step(move);
      if (state.phase !== 'player') break;
      const last = bestAttack(state, id, gauge);
      if (last && last.gain > 0) step(last.action);
    }
    if (state.phase === 'player') step({ type: 'endTurn' });
  }
  return { state, events, actions, firstBoil };
}

// ── Recruit policies (RC-9) ─────────────────────────────

/** The recruit sims' base seed (`tests/sim/recruits.test.ts`); env vars scale the runs, not the seed. */
export const RECRUIT_SIM_SEED = 9301;

/**
 * The runes some waiting recruit still lacks, counting the trip's loot as owned: what an eager
 * player picks to bring someone in.
 */
export function wantedRunes(p: Profile, t: Trip): Set<RuneId> {
  const owned = new Set<RuneId>([
    ...p.known,
    ...t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : [])),
  ]);
  const want = new Set<RuneId>();
  for (const id of waitingFor(p, t)) {
    const { all, any } = preconditionsOf(id).runes;
    for (const r of all) if (!owned.has(r)) want.add(r);
    if (any && !any.some((r) => owned.has(r))) for (const r of any) want.add(r);
  }
  return want;
}

/** The eager pick: a recruit card, then a page a waiting recruit needs, a key, a new page, else the first. */
export function eagerPick(p: Profile, t: Trip): number {
  const want = wantedRunes(p, t);
  const rank = (i: LootItem): number => {
    if (i.kind === 'recruit') return 0;
    if (i.kind === 'rune' && want.has(i.rune)) return 1;
    if (i.kind === 'key') return 2;
    if (i.kind === 'rune' || i.kind === 'method') return 3;
    return 4;
  };
  let best = 0;
  t.offers.forEach((o, i) => {
    const b = t.offers[best];
    if (b && rank(o) < rank(b)) best = i;
  });
  return best;
}

/** The eager policy at a Crossroads: home as soon as the loot holds a recruit or a page someone waits for. */
export function eagerGoesHome(p: Profile, t: Trip): boolean {
  const want = wantedRunes(p, { ...t, loot: [] });
  return t.loot.some((i) => i.kind === 'recruit' || (i.kind === 'rune' && want.has(i.rune)));
}

/** The random policy: any offer; home or on at a coin toss (the driver adds the wipes). */
export const randomPick = (t: Trip, rng: Rng): number => rng.int(0, t.offers.length - 1);
export const randomGoesHome = (rng: Rng): boolean => rng.int(0, 1) === 0;
