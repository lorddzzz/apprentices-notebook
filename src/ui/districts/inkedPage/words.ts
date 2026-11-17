import { type Drawing, ENEMIES } from '$data';
import { kitLabel, LENGTH_WORD } from '../../../app/drawing';

/** A drawing's rule and heart as the map and the Set out sheet say them (text only). */
export const ruleWords = (d: Drawing): string => (d.rule === null ? 'no rule' : kitLabel(d.rule));
export const heartWords = (d: Drawing): string => ENEMIES[d.heart].name;

/** "current · Mother" (the map's small line, after the depth words). */
export const pageLine = (d: Drawing): string => `${ruleWords(d)} · ${heartWords(d)}`;

/** The sheet's description lines for a drawn page. */
export function pageFacts(d: Drawing): string[] {
  return [
    `${LENGTH_WORD[d.length]}`,
    `rule: ${ruleWords(d)}`,
    `heart: ${heartWords(d)}`,
    `foes: ${d.foes.map((f) => ENEMIES[f].name).join(', ')}`,
  ];
}
