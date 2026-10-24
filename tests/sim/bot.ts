import { MEMBER_IDS } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  basicDirs,
  castableSpells,
  type GameEvent,
  legalAims,
  legalMoves,
  memberById,
} from '$engine';

/** Deterministic, deliberately small greedy bot: value harm, avoid friendly fire, then approach. */
function value(s: BattleState): number {
  return s.units.reduce(
    (v, u) =>
      v + (u.kind === 'enemy' ? -10 * u.hp - (u.hp > 0 ? 20 : 0) + (u.mark ? 0.2 : 0) : 30 * u.hp),
    0,
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
function bestAttack(s: BattleState, id: (typeof MEMBER_IDS)[number]) {
  let best: { action: Action; gain: number } | null = null;
  for (const action of attacks(s, id)) {
    const gain = value(applyAction(s, action).state) - value(s);
    if (!best || gain > best.gain) best = { action, gain };
  }
  return best;
}
export function botFight(initial: BattleState, maxRounds = 40) {
  let state = initial;
  const events: GameEvent[] = [];
  const actions: Action[] = [];
  const step = (a: Action) => {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    actions.push(a);
  };
  for (let n = 0; n < maxRounds && state.phase === 'player'; n++) {
    for (const id of MEMBER_IDS) {
      if (state.phase !== 'player' || memberById(state, id).hp === 0) continue;
      const first = bestAttack(state, id);
      if (first && first.gain > 0) step(first.action);
      if (state.phase !== 'player') break;
      let move: Action | null = null;
      let score = -Infinity;
      for (const to of legalMoves(state, id)) {
        const action: Action = { type: 'move', unit: id, to };
        const next = applyAction(state, action).state;
        const enemies = next.units.filter((u) => u.kind === 'enemy' && u.hp > 0);
        const distance = Math.min(
          ...enemies.map((u) => Math.abs(u.pos.x - to.x) + Math.abs(u.pos.y - to.y)),
        );
        const candidate =
          value(next) -
          value(state) +
          Math.max(0, bestAttack(next, id)?.gain ?? 0) -
          distance * 0.01;
        if (candidate > score) {
          score = candidate;
          move = action;
        }
      }
      if (move) step(move);
      if (state.phase !== 'player') break;
      const last = bestAttack(state, id);
      if (last && last.gain > 0) step(last.action);
    }
    if (state.phase === 'player') step({ type: 'endTurn' });
  }
  return { state, events, actions };
}
