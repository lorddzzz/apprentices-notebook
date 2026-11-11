import { type BattleState, findUnit } from '$engine';
import { boilOverState, forecastBoilOver } from '$engine/districts/bathhouses/boilOver';
import type { GaugeLine } from '../../../app/describe';
import { tilesOfData } from '../eventTiles';
import type { DistrictDescribe } from '../logic';

/** "Ada and Bo", "Ada, Bo and Cy". */
const nameList = (names: readonly string[]): string =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** What the boil-over gauge says about the next round end, in words; null when the rule is off the board. */
function gaugeLine(s: BattleState): GaugeLine | null {
  const own = boilOverState(s);
  if (!own) return null;
  const f = forecastBoilOver(s, own);
  const pips = (q: number) => Math.floor(q / 4);
  const harm = f.harm.flatMap((id) => findUnit(s, id)?.name ?? []);
  if (f.boils) {
    const text =
      harm.length > 0
        ? `The house boils over at round end: ${nameList(harm)} will be stormed for 2`
        : 'The house boils over at round end (none of yours stand in the steam)';
    return { text, boils: true, harm };
  }
  const now = pips(f.value);
  const next = pips(f.forecast);
  const of = pips(f.capacity);
  return {
    text: next > now ? `Steam ${now} of ${of}, rising to ${next}` : `Steam ${now} of ${of}`,
    boils: false,
    harm,
  };
}

export const BATH_DESCRIBE: DistrictDescribe = {
  gauge: gaugeLine,
  eventTiles: { 'bathhouses:boilOver': tilesOfData },
};
