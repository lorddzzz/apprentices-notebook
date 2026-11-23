/**
 * Short in-world lines for the screens that were bare (names-and-voice.md, narrative-audit.md §2).
 * Voice: cozy and wistful, plain, a little dry. Nothing here names the owner.
 */

/** Shown once, on a notebook that has never cast: the attic, the lamp, the notebook. */
export const FIRST_EVENING = {
  place: 'The Leaning House, 9 Lantaarnsteeg, Halvemeer. Fourth floor, under the roof.',
  lamp: 'The last tenant left the lamp lit.',
  notebook:
    'There is a notebook on the desk, open halfway, in a hand that is not yours. Pell has found the kettle. Joost has found the stove, which is worse.',
  dismiss: 'Pick up the pen',
} as const;

/** The map's heading: the city has a name now. */
export const MAP_HEADING = "The owner's map of Halvemeer";

/** Headings for a wiped trip; one is picked from the place they fell, so a retry reads the same. */
export const WIPE_LINES: readonly string[] = [
  'Somebody carries you home. The lamp is still lit.',
  'The stairs are longer going up. You make it, mostly.',
  'The notebook is open on the desk, exactly as you left it. It does not say I told you so.',
];

export function wipeLine(place: string): string {
  let h = 0;
  for (const ch of place) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return WIPE_LINES[h % WIPE_LINES.length] ?? WIPE_LINES[0] ?? '';
}

/** The bottom of the lower Seam's stair (the first line, "The stair ends here.", stays). */
export const LOWEST_FLOOR_LINE =
  'The lowest floor is quiet. Take it all home. The kettle will be cold, but it is there.';
