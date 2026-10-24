import { type DistrictId, encountersOf } from '$data';
import {
  choicesAt,
  type DistrictShape,
  nextTripSeed,
  type Profile,
  placeOf,
  returnCheck,
  type SaveData,
  shapeOf,
  startTrip,
  type Trip,
  takeChoice,
} from '$engine';
import type { CrossroadsChoice, StartAt } from '$engine/districts/types';

/** One button at the Crossroads: a way on, or the way home (greyed with its reason). */
export interface WayView {
  id: string;
  kind: CrossroadsChoice['kind'];
  label: string;
  /** The second line: where it leads, what is kept, or why it is shut. */
  sub: string;
  /** "After this room: no way home" on a way that walks past the point of no return. */
  warn?: string;
  disabled: boolean;
  testid: string;
}

export interface CrossroadsView {
  heading: string;
  ways: WayView[];
  home: WayView | null;
}

/** The room name `choice` leads to: its variant pool decides which layout the next room plays. */
function leadsTo(t: Trip, choice: CrossroadsChoice): string {
  const next = t.encounter + 1;
  const kit = t.kit;
  if (!kit || !choice.variantPool?.length) return placeOf(t, next);
  const taken = { after: t.encounter, id: choice.id, pool: [...choice.variantPool] };
  return placeOf({ ...t, kit: { ...kit, choices: [...kit.choices, taken] } }, next);
}

const finds = (n: number): string => `keep ${n} ${n === 1 ? 'find' : 'finds'}`;

/**
 * What the Crossroads shows (DK-11, P4): the district module's choices as buttons. Greyed choices
 * carry their reason; a greyed way home on a landings district also says where the next landing is.
 */
export function crossroadsView(
  t: Trip,
  shape: DistrictShape = shapeOf(t.district),
): CrossroadsView {
  const depth = `depth ${t.encounter + 2} of ${encountersOf(t.district).length}`;
  const views = choicesAt(t, shape).map((c): WayView => {
    const base = {
      id: c.id,
      kind: c.kind,
      label: c.label,
      disabled: c.disabled !== undefined,
      testid: c.kind === 'return' ? 'return' : c.id === 'push' ? 'push' : `way-${c.id}`,
      ...(c.warn ? { warn: c.warn } : {}),
    };
    if (c.kind === 'return') {
      if (c.disabled === undefined) return { ...base, sub: finds(t.loot.length) };
      const reason = c.disabled || 'No way home from here.';
      const check = returnCheck(t, shape);
      const next = shape.ret.kind === 'landings' && !check.ok ? check.next : undefined;
      return {
        ...base,
        sub:
          next === undefined ? reason : `${reason} The next landing is after ${placeOf(t, next)}.`,
      };
    }
    return { ...base, sub: `Deeper: ${leadsTo(t, c)} (${depth})` };
  });
  return {
    heading: t.district === 'seam' ? 'The Seam goes on.' : 'Deeper still.',
    ways: views.filter((v) => v.kind !== 'return'),
    home: views.find((v) => v.kind === 'return') ?? null,
  };
}

/** Takes a way on from the Crossroads; the choice is recorded on a trip that carries a kit. */
export function chooseWay(save: SaveData, id: string): SaveData {
  if (!save.trip) throw new Error('The party is not out');
  return { ...save, trip: takeChoice(save.trip, id) };
}

/** The doorway's name once the city remembers reaching it, else null (P5). */
export function startCheckpoint(profile: Profile, district: DistrictId): string | null {
  const cp = shapeOf(district).checkpoint;
  return cp && profile.city.checkpoints?.[district] === cp.after ? cp.name : null;
}

/** A fresh trip from the first room or from the remembered checkpoint. Throws as `startTrip` does. */
export function setOutAt(save: SaveData, district: DistrictId, at: StartAt = 'start'): SaveData {
  if (save.trip) throw new Error('The party is already out');
  const { seed, save: next } = nextTripSeed(save);
  return { ...next, trip: startTrip(next.profile, seed, district, { at }), lastTrip: null };
}
