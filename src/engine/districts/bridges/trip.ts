import { BRIDGE_PICKS, spanLedger, spanVariantPool, tableForSpan } from '$data/districts/bridges';
import { SPAN_KINDS, type SpanKind } from '$data/districts/bridges/types';
import type {
  CrossroadsChoice,
  RoomOffers,
  ShapeInput,
  TripKitState,
  TripShapeDef,
} from '../types';
import type { BridgeTripState } from './types';

/**
 * The span choice (bridges-plan P1, P11; BR-7): after rooms 1–4 the party picks a sound long span
 * or a crumbling short one. The pick is the Crossroads choice the kit records (`kit.choices`, id =
 * the span kind, with the variant pool it fixed), so the next room's layout, loot table and
 * ledger line all read that one record. Return is `any` in the data, heart included.
 */

const LABELS: Record<SpanKind, string> = {
  sound: 'The sound span (long)',
  crumbling: 'The crumbling span (short)',
};

const isSpan = (id: string): id is SpanKind => (SPAN_KINDS as readonly string[]).includes(id);

/** The span kinds picked so far, in order: read from the kit's recorded choices. */
export const spansOf = (kit: Pick<TripKitState, 'choices'>): SpanKind[] =>
  [...kit.choices]
    .sort((a, b) => a.after - b.after)
    .map((c) => c.id)
    .filter(isSpan);

/** The kind of the span room `room` was reached over; room 1 has no choice and is sound. */
export const spanOfRoom = (kit: Pick<TripKitState, 'choices'>, room: number): SpanKind => {
  const id = kit.choices.find((c) => c.after === room - 1)?.id;
  return id !== undefined && isSpan(id) ? id : 'sound';
};

const noteOf = (after: number, kind: SpanKind): { note?: string } => {
  const note = spanLedger(after, kind)?.text;
  return note ? { note } : {};
};

/** The two ways on after room `input.room`: each carries its variant pool. */
export const bridgeChoices = (
  input: Pick<ShapeInput<BridgeTripState>, 'room'>,
): CrossroadsChoice[] =>
  SPAN_KINDS.map((kind) => ({
    id: kind,
    label: LABELS[kind],
    kind: 'push' as const,
    variantPool: spanVariantPool(input.room + 1, kind),
    ...noteOf(input.room, kind),
  }));

/** P11: the room's table follows the span it was reached over. */
export const bridgeOffersFor = (input: ShapeInput<BridgeTripState>): RoomOffers => ({
  table: tableForSpan(spanOfRoom(input.kit, input.room)),
  picks: BRIDGE_PICKS[Math.min(input.room, BRIDGE_PICKS.length - 1)] ?? 1,
});

/** The mason's-ledger line shown on a choice at the Crossroads after room `after` (P18). */
export const choiceLedger = (after: number, kind: SpanKind): string | undefined =>
  spanLedger(after, kind)?.text;

export const BRIDGE_TRIP_HOOKS: Pick<TripShapeDef<BridgeTripState>, 'choices' | 'offersFor'> = {
  choices: bridgeChoices,
  offersFor: bridgeOffersFor,
};
