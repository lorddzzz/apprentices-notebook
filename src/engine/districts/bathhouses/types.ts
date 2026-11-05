import type { HeatLevel } from '$data/districts/bathhouses/types';
import type { DistrictEvent, RuleId, TripShapeId } from '../types';

/**
 * The bathhouses' engine contracts (BH-0; bathhouses-plan §2, §4): the boil-over rule's state, its
 * events, the trip state and its reader, the foes' traits and the `steam` arrival cause. Plain JSON
 * throughout (saved and cloned as is). Nothing reads them yet.
 */

// ── The boil-over rule (P1–P4; BH-1) ────────────────────
export const BOIL_OVER_RULE_ID: RuleId = 'bathhouses:boilOver';
/**
 * `BattleState.rules['bathhouses:boilOver']`: `pressure` and `capacity` in quarter-pips, the
 * room's effective heat, and an optional marked level (quarter-pips) the HUD draws and a
 * threshold goal reads (BH-9: "fill the dome" to the line).
 */
export type BoilOverState = {
  pressure: number;
  capacity: number;
  heat: HeatLevel;
  line?: number;
};

// ── Events (P2, P3) ─────────────────────────────────────
type Ev<T extends string, D> = DistrictEvent & { type: `bathhouses:${T}`; data: D };
type At = { x: number; y: number };
/** The round's fill: pressure `from` → `to` (quarters), from cloud tiles, vents and feeders. */
export type PressureEvent = Ev<
  'pressure',
  { from: number; to: number; clouds: number; vents: number; feeders: number }
>;
/** The gauge boiled over: every cloud tile and the unit ids standing on them (each then takes 2). */
export type BoilOverEvent = Ev<'boilOver', { tiles: At[]; units: string[] }>;

export type BathEvent = PressureEvent | BoilOverEvent;
export type BathEventType = BathEvent['type'];
export const BATH_EVENT_TYPES = [
  'bathhouses:pressure',
  'bathhouses:boilOver',
] as const satisfies readonly BathEventType[];

// ── Trip state (P5, P6; BH-2, BH-3) ─────────────────────
/** `Trip.kit.state`: 1 when a cold plunge taken after the last room cools the next one. */
export type BathTripState = { pendingCool: 0 | 1 };
export const BATH_SHAPE: TripShapeId = 'bathhouses:heat';
export const initBathState = (): BathTripState => ({ pendingCool: 0 });
/** The forgiving reader (kit convention): anything but `pendingCool: 1` reads as not cooled. */
export function parseBathState(raw: unknown): BathTripState {
  const cool =
    typeof raw === 'object' && raw !== null && 'pendingCool' in raw ? raw.pendingCool : 0;
  return { pendingCool: cool === 1 ? 1 : 0 };
}

// ── Traits and causes (P7, P8, P10; BH-4, BH-5, BH-6) ───
/** The arrival cause a unit re-forming through the steam uses (FD-3): only its landing is entered. */
export const STEAM_CAUSE = 'bathhouses:steam' as const;

declare module '$engine/arrival' {
  interface UnitTraitSet {
    /** P8, the dissolved bather: passes through single hits while on a cloud tile. */
    dissolves: true;
    /** P7, the boilerman: feeds the gauge from beside a vent. */
    feeds: true;
    /** P10, the Bath-Steward: re-forms elsewhere in his cloud when hit. */
    steamsAway: true;
  }
  interface ArrivalCauses {
    'bathhouses:steam': 'landing';
  }
}
