import type { Tone } from '$data/districts/foundry';
import type { BattleState, GameEvent, Unit } from '$engine';
import type { BellsState } from '$engine/districts/foundry/types';
import type { DistrictEvent } from '$engine/districts/types';

/**
 * Shared readers for the foundry acceptance tests (BF-T2). Tests assert on the event log and the
 * final state only; none of them names a function the build has not written yet.
 */

type At = { x: number; y: number };
type Data = Record<string, unknown>;

/** The district events of one type, in log order. */
export const ev = (events: readonly GameEvent[], type: string): DistrictEvent[] =>
  events.filter((e) => e.type === type) as unknown as DistrictEvent[];

export const dataOf = (e: DistrictEvent | undefined): Data => (e?.data ?? {}) as Data;

/** The tones that rang, in order. */
export const ringTones = (events: readonly GameEvent[]): unknown[] =>
  ev(events, 'foundry:ring').map((e) => dataOf(e).tone);

/** The bells of one ring as `"x,y"`, in the order the event lists them. */
export const ringBells = (e: DistrictEvent | undefined): string[] =>
  ((dataOf(e).bells ?? []) as At[]).map((b) => `${b.x},${b.y}`);

export const struckAt = (events: readonly GameEvent[], x: number, y: number): DistrictEvent[] =>
  ev(events, 'foundry:bellStruck').filter((e) => e.at?.x === x && e.at?.y === y);

export const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};

/** The bell rule's state, or an empty one when the board does not list it. */
export const bellsOf = (s: BattleState): BellsState => {
  const raw = s.rules?.['foundry:bells'] as Partial<BellsState> | undefined;
  return { humming: raw?.humming ?? [], struck: raw?.struck ?? {} };
};

export const hums = (s: BattleState): Tone[] => bellsOf(s).humming;

/** The damage events that hit one unit. */
export const damageTo = (events: readonly GameEvent[], id: string) =>
  events.flatMap((e) => (e.type === 'damage' && e.target.id === id ? [e] : []));

/** A small seeded generator (mulberry32) for the fuzz tests: no `Math.random`. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
