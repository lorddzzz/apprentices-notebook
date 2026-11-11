import { INK_FOE_TUNING } from '$data/districts/inkQuarter/enemies';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { type BattleState, type EnemyUnit, findUnit, type LootItem, label } from '$engine';
import type { Telegraph } from '$engine/rivals/types';
import { ordinal, shortName } from '../../../app/describe';
import type { DistrictDescribe } from '../logic';

/**
 * The postal staff's telegraphs in words (IQ-16): who is addressed, whose mark moves where, which
 * tile is sealed. Null for any other foe, or when a named unit is gone (the engine's plain line
 * then stands).
 */
function postalPhrase(s: BattleState, tg: Telegraph): string | null {
  const named = (i: number): string | null => {
    const u = tg.units[i] ? findUnit(s, tg.units[i]) : null;
    return u && u.hp > 0 ? shortName(u) : null;
  };
  const tile = tg.tiles[0] ? label(tg.tiles[0]) : '?';
  switch (tg.label) {
    case 'deliver': {
      const to = named(0);
      return to ? `deliver to ${to} and burst for ${INK_FOE_TUNING.deadLetterBurst}` : null;
    }
    case 'forward': {
      const from = named(0);
      const to = named(1);
      return from && to ? `forward the mark on ${from} to ${to}` : null;
    }
    case 'file': {
      const to = named(0);
      return to ? `file ${to} for ${INK_FOE_TUNING.sorterFile}` : null;
    }
    case 'seal':
      return `seal ${tile} in wax: step off to dodge`;
    // The stand-in heart's script steps (IQ-18): the writ's tiles read as board labels.
    case 'serve':
      return tg.tiles[0] && tg.tiles[1]
        ? `serve a clock writ: seal ${label(tg.tiles[0])}, stamp ${label(tg.tiles[1])}`
        : 'serve a clock writ';
    case 'pen':
      return `strike with his pen at ${tile}`;
    case 'stunned':
      return 'reel, his writ answered';
    default:
      return null;
  }
}

/** A postal foe's telegraph in words (IQ-16); null for any other foe. */
function postalIntent(s: BattleState, e: EnemyUnit): string | null {
  const i = e.intent;
  if (!i) return null;
  const own =
    (i.kind === 'step' && i.step.startsWith('inkQuarter:')) ||
    (i.kind === 'behaviour' && i.id.startsWith('inkQuarter:'));
  if (!own) return null;
  const words = postalPhrase(s, i.telegraph);
  return words ? `will ${words} (${ordinal(i.order)})` : null;
}

/** A signed term names what it holds. */
function termedLoot(item: LootItem): { title: string; text: string } | null {
  const data =
    'data' in item && typeof item.data === 'object' && item.data !== null ? item.data : null;
  const def = data && 'def' in data ? INK_TERMS.find((t) => t.id === data.def) : undefined;
  if (item.kind === 'inkQuarter:termed' && def)
    return { title: `Signed: ${def.text.reward}`, text: `If you ${def.text.condition}.` };
  return null;
}

export const INK_DESCRIBE: DistrictDescribe = { intent: postalIntent, loot: termedLoot };
