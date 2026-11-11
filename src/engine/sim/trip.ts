import type { GameEvent } from '../events';
import type { BattleState, SaveData, Trip } from '../types';

/** The trip steps the runner needs, passed in because the engine never imports `app/`. */
export interface TripFlow {
  startBattle(save: SaveData): { state: BattleState };
  endBattle(
    save: SaveData,
    battle: BattleState,
    log: readonly GameEvent[],
  ): { outcome: string; save: SaveData };
  takeOffer(save: SaveData, index: number): SaveData;
  leaveDoorway(save: SaveData, draft: SaveData['profile']): SaveData;
  pushOnward(save: SaveData): SaveData;
}

export interface TripHooks {
  /** Plays the room; the runner stops the trip when the phase is still `player` (a stall). */
  fight(save: SaveData, trip: Trip): { state: BattleState; events: GameEvent[] };
  /** Which offer to take. */
  pick(trip: Trip): number;
  /** Before each step. */
  step?(trip: Trip): void;
  /** A stalled room (out of rounds or budget). */
  onStall?(trip: Trip, state: BattleState): void;
  /** A finished room, with what the flow returned. */
  onRoom?(trip: Trip, state: BattleState, end: { outcome: string; save: SaveData }): void;
  /** After taking an offer, with the trip as it stood before. */
  onLoot?(before: Trip, after: SaveData): void;
}

export type TripEnd = 'stalled' | 'lost' | 'guard' | Trip['status'];

/** The generic whole-trip loop: fight, loot, doorway, crossroads until the trip ends. */
export function runTrip(
  start: SaveData,
  flow: TripFlow,
  hooks: TripHooks,
  guardMax = 60,
): { save: SaveData; end: TripEnd } {
  let save = start;
  for (let guard = 0; guard < guardMax && save.trip; guard++) {
    const t = save.trip;
    hooks.step?.(t);
    if (t.status === 'fight') {
      const fight = hooks.fight(save, t);
      if (fight.state.phase === 'player') {
        hooks.onStall?.(t, fight.state);
        return { save, end: 'stalled' };
      }
      const end = flow.endBattle(save, fight.state, fight.events);
      hooks.onRoom?.(t, fight.state, end);
      save = end.save;
      if (end.outcome !== 'won') return { save, end: 'lost' };
    } else if (t.status === 'looting') {
      save = flow.takeOffer(save, hooks.pick(t));
      hooks.onLoot?.(t, save);
    } else if (t.status === 'doorway') save = flow.leaveDoorway(save, save.profile);
    else if (t.status === 'crossroads') save = flow.pushOnward(save);
    else return { save, end: t.status };
  }
  return { save, end: 'guard' };
}
