import { type ApprenticeId, MEMBER_IDS } from '$data';
import { basicDirs } from '../basicActions';
import { applyAction } from '../battle';
import { boilOverState, forecastBoilOver } from '../districts/bathhouses/boilOver';
import { crackedSet } from '../districts/bridges/preview';
import type { GameEvent } from '../events';
import { castableSpells, legalAims, legalMoves, memberById } from '../queries';
import type { Action, BattleState } from '../types';

/** Deterministic, deliberately small greedy bot: value harm, avoid friendly fire, then approach. */
/** Bot options. `gauge` makes it read the boil-over forecast (BH-16); off keeps the old bot. */
export interface BotOptions {
  gauge?: boolean;
  /** BR-21: never end a move on a cracked span tile (it falls at dusk) while a standing one is reachable. */
  cracks?: boolean;
  /** Most applied actions before the bot gives up (deterministic, never wall-clock). Default: none. */
  budget?: number;
  /** Lite policy for generation: moves pruned to the `LITE_MOVES` tiles nearest a foe. */
  lite?: boolean;
}

export const LITE_MOVES = 6;
export const TRIAL_BUDGET = 6000;

const nearestFoe = (s: BattleState, to: { x: number; y: number }): number =>
  Math.min(
    ...s.units
      .filter((u) => u.kind === 'enemy' && !u.bystander && u.hp > 0)
      .map((u) => Math.abs(u.pos.x - to.x) + Math.abs(u.pos.y - to.y)),
  );

function movesOf(s: BattleState, id: ApprenticeId, lite: boolean) {
  const all = legalMoves(s, id);
  if (!lite || all.length <= LITE_MOVES) return all;
  return all
    .map((c, i) => ({ c, i, d: nearestFoe(s, c) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, LITE_MOVES)
    .map((x) => x.c);
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
  const cracks = opts.cracks === true;
  const lite = opts.lite === true;
  const budget = opts.budget ?? Number.POSITIVE_INFINITY;
  let exhausted = false;
  let firstBoil: number | null = null;
  let state = initial;
  const events: GameEvent[] = [];
  const actions: Action[] = [];
  const step = (a: Action) => {
    if (actions.length >= budget) {
      exhausted = true;
      return;
    }
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    actions.push(a);
    if (firstBoil === null && r.events.some((e) => e.type === 'bathhouses:boilOver')) {
      firstBoil = state.round;
    }
  };
  for (let n = 0; n < maxRounds && state.phase === 'player' && !exhausted; n++) {
    for (const id of order) {
      if (state.phase !== 'player' || memberById(state, id).hp === 0 || memberById(state, id).out) {
        continue;
      }
      if (exhausted) break;
      const first = bestAttack(state, id, gauge);
      if (first && first.gain > 0) step(first.action);
      if (state.phase !== 'player') break;
      let move: Action | null = null;
      let score = -Infinity;
      for (const to of movesOf(state, id, lite)) {
        const action: Action = { type: 'move', unit: id, to };
        const next = applyAction(state, action).state;
        const enemies = next.units.filter((u) => u.kind === 'enemy' && !u.bystander && u.hp > 0);
        const distance = Math.min(
          ...enemies.map((u) => Math.abs(u.pos.x - to.x) + Math.abs(u.pos.y - to.y)),
        );
        // A cracked tile costs more than any attack gains, so it is picked only when nothing else is legal.
        const crackCost =
          cracks && crackedSet(next).some((c) => c.x === to.x && c.y === to.y) ? 1e6 : 0;
        const candidate =
          -crackCost +
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
  return { state, events, actions, firstBoil, exhausted };
}

/**
 * One generation trial: the lite policy under a deterministic operation budget (applied actions).
 * Exceeding the budget counts as not won.
 */
export function botTrial(
  initial: BattleState,
  budget = TRIAL_BUDGET,
  order?: readonly ApprenticeId[],
  opts: BotOptions = {},
) {
  const r = botFight(initial, 40, order, { ...opts, lite: true, budget });
  return { ...r, won: r.state.phase === 'won' && !r.exhausted, ops: r.actions.length };
}
