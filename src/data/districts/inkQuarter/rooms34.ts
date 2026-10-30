import type { RuleId } from '$engine/districts/types';
import type { EncounterDef, EncounterVariant, LootTableId } from '../../types';
import type { KitRoomDef } from '../index';
import { INK_LETTERS } from './papers';

/**
 * The ink-makers' quarter's rooms 3, 4 and the heart (IQ-10; ink-quarter-plan P1, P3, P9, P10;
 * design §1), three layouts each. Tokens: `{return}` return stamp, `{order}` standing order,
 * `{forward:a}` a forwarding stamp sending to `{address:a}`, `x` a dead letter, `u` a Sorter,
 * `z` a Sealer, `p` the stand-in postmaster. Authoring rules as rooms12: no `P` beside a foe or
 * on a writ; stamps on the paper's approach; an address tile beside a foe so a forwarded hit
 * has a target.
 *
 * The heart needs the clock rule. It is district-scoped, so it is active when the district lists
 * it (`HEART_RULES`, the id of the engine's CLOCK_RULE_ID, spelled out because data cannot import the
 * engine module without a cycle; the wiring task puts it on the DistrictDef). A layout cannot name it.
 * The notary's desk (IQ-13) is a marked free tile in room 3: see `NOTARY_DESK`.
 */

const DEEP: LootTableId = 'inkQuarter:deep';
const HEART: LootTableId = 'inkQuarter:heart';

/** The clock rule the heart board runs under (the district lists it; no other room does). */
export const HEART_RULES: readonly RuleId[] = ['inkQuarter:clock'];

/** IQ-13 hook: room 3's notary desk is the empty tile at this (x, y) in every room-3 layout. */
export const NOTARY_DESK = { x: 5, y: 7 } as const;

const board = (rows: readonly string[]): string => rows.join('\n');

function room(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: EncounterDef['loot'],
  lore: number,
  heart = false,
): KitRoomDef {
  return {
    id,
    title,
    depth,
    layout: variants[0]?.layout ?? '',
    variants,
    loot,
    picks: heart ? 2 : 1,
    heart,
    lore: INK_LETTERS[lore]?.id,
  };
}

/** Room 3, *The tube hall* (6x9): adds forwarding; a Sealer and two dead letters. */
const INK_3: readonly EncounterVariant[] = [
  {
    name: 'The brass tubes',
    layout: board([
      '. . z . . .',
      'x . . . . {address:a}',
      '. . . . x .',
      '. {forward:a} . . . .',
      '. . {return} . . .',
      '. . . . . .',
      'P . P . P .',
      '. . . . . .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The pneumatic line',
    layout: board([
      '. . . . z .',
      '. x . . . .',
      '{address:a} . . . x .',
      '. . . {forward:a} . .',
      '. {return} . . . .',
      '. . . . . .',
      'P . . P . .',
      '. P . . . .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The carriage drop',
    layout: board([
      'x . . . z .',
      '. . . . . .',
      '. {forward:a} . . . x',
      '. . . . . .',
      '. . {return} . {address:a} .',
      '. . . . . .',
      'P . . P . .',
      '. . P . . .',
      '. . . . . P',
    ]),
  },
];

/** Room 4, *The ledger stacks* (6x9): all three writs; a Sealer, a Sorter, two dead letters. */
const INK_4: readonly EncounterVariant[] = [
  {
    name: 'The long shelves',
    layout: board([
      '. z . . u .',
      'x . . . . x',
      '. . {order} {order} . {address:a}',
      '. {forward:a} . . . .',
      '. . . . {return} .',
      '. . . . . .',
      'P . P . . .',
      '. . . . P .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The indexed aisle',
    layout: board([
      '. . u . z .',
      '. x . . . .',
      '{order} . . . x .',
      '. . {address:a} . . {order}',
      '. {return} . {forward:a} . .',
      '. . . . . .',
      'P . . P . .',
      '. P . . . .',
      '. . . . . P',
    ]),
  },
  {
    name: 'The archive cage',
    layout: board([
      'x . . . u .',
      '. . . z . .',
      '. {forward:a} . . . x',
      '{order} . . {address:a} . .',
      '. . {return} . {order} .',
      '. . . . . .',
      'P . . . P .',
      '. P . . . .',
      '. . . . . P',
    ]),
  },
];

/**
 * The heart, *The postmaster's counter* (7x9): the stand-in postmaster `p`, a Sealer and two
 * dead letters (`HEART_ROSTER`). He never walks, so he sits behind the counter at the top.
 */
const INK_HEART: readonly EncounterVariant[] = [
  {
    name: 'The long counter',
    layout: board([
      '. . x . z . .',
      '. . . p . . .',
      '. x . . . . .',
      '. . . {return} . . .',
      '. . . . . . .',
      '. {order} . . . {order} .',
      '. . . . . . .',
      'P . P . P . .',
      '. . . . . . P',
    ]),
  },
  {
    name: 'The sorting window',
    layout: board([
      '. z . . x . .',
      '. . . p . . .',
      '. . . . . x .',
      '. . . . . . .',
      '. {return} . . {order} . .',
      '. . . . . . .',
      '. . . . . . .',
      'P . . P . . .',
      '. P . . . . P',
    ]),
  },
  {
    name: 'The dead-letter shelf',
    layout: board([
      'x . . p . . z',
      '. . . . . . .',
      '. . . . . x .',
      '. {order} . . {return} . .',
      '. . . . . . .',
      '. . . . . . .',
      'P . . P . . .',
      '. P . . . . .',
      '. . . . . . P',
    ]),
  },
];

export const INK_ROOMS_34: readonly KitRoomDef[] = [
  room('ink-tubes', 'The brass tubes', 3, INK_3, DEEP, 2),
  room('ink-ledgers', 'The long shelves', 4, INK_4, DEEP, 3),
  room('ink-counter', "The postmaster's counter", 5, INK_HEART, HEART, 4, true),
];
