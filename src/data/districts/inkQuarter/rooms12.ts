import type { EncounterDef, EncounterVariant, LootTableId } from '../../types';
import type { KitRoomDef } from '../index';
import { INK_LETTERS } from './papers';

/**
 * The ink-makers' quarter's rooms 1 and 2 (IQ-9; ink-quarter-plan P1, design §1): three layouts
 * each, boards sized and start-pointed per HC's `checkRoom`. Tokens: `{return}` the return
 * stamp, `{order}` the standing order, `x` a dead letter, `u` a Sorter.
 *
 * Authoring rules (tune by playing): no `P` beside a foe; the stamps sit on the paper's
 * approach (a dead letter that lands on one is sent back to where its round began) and on a
 * lane a shove or a walk reaches, so a member's push into one is a play; a standing order lies
 * where foes must cross, so the Sorter has something to forward.
 */

/**
 * The rooms' table (P15).
 */
const SHALLOW: LootTableId = 'inkQuarter:shallow';

const board = (rows: readonly string[]): string => rows.join('\n');

function room(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: EncounterDef['loot'],
  lore: number,
): KitRoomDef {
  return {
    id,
    title,
    depth,
    layout: variants[0]?.layout ?? '',
    variants,
    loot,
    picks: 1,
    heart: false,
    lore: INK_LETTERS[lore]?.id,
  };
}

/** Room 1, *The sorting hall* (6x8): return stamps only; three dead letters. */
const INK_1: readonly EncounterVariant[] = [
  {
    name: 'The pigeonholes',
    layout: board([
      'x . . . . x',
      '. . {return} . {return} .',
      '. . . x . .',
      '. . . . . .',
      '. {return} . . . .',
      '. . . . . .',
      'P . P . P .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The franking desk',
    layout: board([
      '. x . . x .',
      '. . . . . .',
      '{return} . . {return} . x',
      '. . . . . .',
      '. . {return} . . .',
      'P . . . . P',
      '. . . . . .',
      '. P . . P .',
    ]),
  },
  {
    name: 'The chute',
    layout: board([
      'x . . . . .',
      '. . x . . .',
      '. {return} . {return} . x',
      '. . . . . .',
      '. . . . . .',
      '. . {return} . . .',
      'P P . . P .',
      '. . . . . P',
    ]),
  },
];

/** Room 2, *The blotting room* (6x9): adds the standing order; a Sorter and two dead letters. */
const INK_2: readonly EncounterVariant[] = [
  {
    name: 'The blotter rack',
    layout: board([
      '. . u . . .',
      'x . . . . x',
      '. . {order} {order} . .',
      '. . . . . .',
      '. {return} . . {return} .',
      '. . . . . .',
      '. . . . . .',
      'P . P . P .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The inkwell row',
    layout: board([
      '. . . . u .',
      'x . . . . .',
      '. {order} . . . x',
      '. . . {return} . .',
      '. . . . . .',
      '. {return} {order} . . .',
      '. . . . . .',
      'P . . . P .',
      '. P . . . P',
    ]),
  },
  {
    name: 'The drying loft',
    layout: board([
      'x . . . . .',
      '. . u . . .',
      '. . . . . x',
      '{order} . {return} . {order} .',
      '. . . . . .',
      '. {return} . . . .',
      '. . . . . .',
      'P . . P . .',
      '. P . . . P',
    ]),
  },
];

export const INK_ROOMS_12: readonly KitRoomDef[] = [
  room('ink-sorting', 'The pigeonholes', 1, INK_1, SHALLOW, 0),
  room('ink-blotting', 'The blotter rack', 2, INK_2, SHALLOW, 1),
];
