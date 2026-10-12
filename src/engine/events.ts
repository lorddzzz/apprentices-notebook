import type { Coord } from './grid';

/**
 * Everything that happens in the game is a GameEvent. The UI animates the log;
 * tests assert on it. Add new variants here as rules arrive in v0.
 */
export type GameEvent =
  | { type: 'note'; text: string }
  | { type: 'spawn'; unit: string; at: Coord }
  | { type: 'damage'; target: string; amount: number; source?: string };

export type EventLog = readonly GameEvent[];

/** One plain-English line per event: the format scenario tests compare against. */
export function describe(e: GameEvent): string {
  switch (e.type) {
    case 'note':
      return e.text;
    case 'spawn':
      return `${e.unit} appears`;
    case 'damage':
      return e.source
        ? `${e.source} hits ${e.target} for ${e.amount}`
        : `${e.target} takes ${e.amount}`;
  }
}

export function describeLog(log: EventLog): string[] {
  return log.map(describe);
}
