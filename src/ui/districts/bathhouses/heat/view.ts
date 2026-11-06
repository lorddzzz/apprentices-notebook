import { PLUNGE_CARD, PLUNGE_ROOMS } from '$data/districts/bathhouses';
import type { HeatLevel } from '$data/districts/bathhouses/types';
import { roomsOf, type Trip } from '$engine';
import { baseHeat, heatOf } from '$engine/districts/bathhouses/trip';
import { parseBathState } from '$engine/districts/bathhouses/types';

/**
 * The heat in the trip screens (bathhouses-plan BH-13): pure readers of a trip, so the badge, the
 * Crossroads line, the loot header and the plunge card say the same numbers the gauge runs at.
 * Rooms are 0-based; `trip.encounter` is the room being fought, or the one just won (looting,
 * crossroads, doorway), whose successor is `encounter + 1`.
 */

export interface HeatView {
  /** Fighting: this room's heat. Between rooms: the heat of the room just cleared (its base heat). */
  here: HeatLevel;
  /** The next room's heat after any plunge; null at the heart or once the heart is won. */
  next: HeatLevel | null;
  /** The next room's heat without a plunge. */
  nextBase: HeatLevel | null;
  /** A plunge is cooling the room in question (the fight in progress, or the next room). */
  cooled: boolean;
  fighting: boolean;
}

export function heatView(t: Trip): HeatView | null {
  if (t.district !== 'bathhouses') return null;
  const length = roomsOf(t).length;
  const state = parseBathState(t.kit?.state);
  const at = (room: number) => ({ room, length, state });
  if (t.status === 'fight') {
    const here = heatOf(at(t.encounter));
    return {
      here,
      next: null,
      nextBase: null,
      cooled: here < baseHeat(at(t.encounter)),
      fighting: true,
    };
  }
  const hasNext = t.status !== 'cleared' && t.encounter + 1 < length;
  const next = hasNext ? heatOf(at(t.encounter + 1)) : null;
  const nextBase = hasNext ? baseHeat(at(t.encounter + 1)) : null;
  return {
    here: baseHeat(at(t.encounter)),
    next,
    nextBase,
    cooled: next !== null && nextBase !== null && next < nextBase,
    fighting: false,
  };
}

/** The badge in the trip status: "Heat 3", or "Next hall: heat 3" between rooms; null when no room is ahead. */
export function heatBadge(t: Trip): { level: HeatLevel; label: string; note: string } | null {
  const v = heatView(t);
  if (!v) return null;
  const note = v.cooled ? 'cooled by the plunge' : '';
  if (v.fighting) return { level: v.here, label: `Heat ${v.here}`, note };
  if (v.next === null) return null;
  return { level: v.next, label: `Next hall: heat ${v.next}`, note };
}

/** The Crossroads line about the next hall; null away from the bathhouses or at the end. */
export function crossroadsHeatLine(t: Trip): string | null {
  const v = heatView(t);
  if (!v || v.next === null) return null;
  if (v.next > v.here) return `The next hall is hotter: heat ${v.next}.`;
  if (v.next < v.here) return `The next hall is cooler: heat ${v.next}.`;
  return v.cooled
    ? `The plunge holds the next hall at heat ${v.next}.`
    : `The next hall is as hot as it gets: heat ${v.next}.`;
}

/** The loot header's lines: what the room's heat gave, and what is ahead. */
export function lootHeatLine(t: Trip): { here: string; ahead: string | null } | null {
  const v = heatView(t);
  if (!v) return null;
  return {
    here: `A heat ${v.here} hall: the offers follow its heat.`,
    ahead: crossroadsHeatLine(t),
  };
}

export interface PlungeStakes {
  title: string;
  blurb: string;
  /** "Next hall: heat 3 → 2"; null when no trip is at hand or no hall can be cooled. */
  change: string | null;
  /** The pick it costs, said plainly. */
  cost: string;
}

/** What the plunge card says before it is picked: the cost, and the heat it buys. */
export function plungeStakes(t: Trip | null): PlungeStakes {
  const v = t ? heatView(t) : null;
  const room = t?.encounter ?? -1;
  const change =
    v && v.nextBase !== null && PLUNGE_ROOMS.includes(room)
      ? `Next hall: heat ${v.nextBase} → ${Math.max(1, v.nextBase - 1)}`
      : null;
  const only = t !== null && t.picksLeft <= 1;
  return {
    title: PLUNGE_CARD.title,
    blurb: 'Cools the next hall by one heat, never below 1. Its loot stays the same.',
    change,
    cost: only ? 'It is your only pick here: you take nothing else.' : 'Costs one of your picks.',
  };
}

/** Offer labels for the chips and lists, by offer kind. */
export const BATH_OFFER_LABELS: Readonly<Record<string, (item: unknown) => string>> = {
  'bathhouses:plunge': () => PLUNGE_CARD.title,
};
