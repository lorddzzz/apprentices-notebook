import type { VariantDef } from '../types';
import type { RivalDef, RivalPageDef } from './types';

/**
 * The Carillonneur as a rival (bell-foundry plan P9, P10, BF-9; rivals plan P10): the Great Bell's
 * ringer. His kit is two Resonance casts, *Tune* (`Bolt> Toll Strike`) and *Knell*
 * (`Bolt> Toll Shove`); his signature trick is *plays a tune* (`foundry:playsATune`,
 * `engine/districts/foundry/tune.ts`): a per-round mark that rings the next note of a four-note tune,
 * telegraphed a round ahead, and after the fourth the Great Peal. He never walks. HP is
 * `FOUNDRY_TUNING.carillonneur.hp` (the shell in `foundry/enemies.ts` matches; *tune by playing*).
 * No stand-in remains (P10).
 */

const TUNE = 'Bolt> Toll Strike';
const KNELL = 'Bolt> Toll Shove';

export const CARILLONNEUR_TRICK_ID = 'foundry:playsATune';
/** The district goal his routine reads: a cast that lands on an apprentice and spares him and his friends. */
export const RING_TRUE = 'foundry:ringTrue';

export const CARILLONNEUR_RIVAL: RivalDef = {
  id: 'carillonneur',
  name: 'Carillonneur',
  token: 'V',
  district: 'foundry',
  hp: 14,
  move: 0,
  elite: true,
  habitat: 'any',
  blurb:
    'The ringer of the Great Bell, playing a four-note tune. Each round he rings the next note, shown a round ahead; after the fourth, the Great Peal rings every bell at once. Ring a note first, mute or retune its bells, or silence him, and the tune starts over.',
  spells: [
    { id: 'tune', name: 'Tune', lattice: TUNE, charges: 5 },
    { id: 'knell', name: 'Knell', lattice: KNELL, charges: 5 },
  ],
  /**
   * Knell whoever it moves, else Tune whoever it strikes, each only when it spares him and his own
   * friends (a ring of his bells that would hurt a Ringer is not cast). He never walks.
   */
  routine: [
    { goal: RING_TRUE, action: { kind: 'spell', spell: 'knell' } },
    { goal: RING_TRUE, action: { kind: 'spell', spell: 'tune' } },
  ],
  trick: CARILLONNEUR_TRICK_ID,
  fallback: { damage: 1 },
  dryStrike: 'line',
  page: 'carillonneur:tune',
};

/** The Toll note's id: a rival's note keeps the rival's name, not the page's (`postmaster:sentence`). */
export const CARILLONNEUR_TOLL = 'carillonneur:toll';

/**
 * His recovered page (P10, BF-24): *Tune*. The "Seam has no bell" thread is the story's: the bells
 * hold the drawn streets down, and the Seam has none.
 */
export const CARILLONNEUR_PAGE: RivalPageDef = {
  id: 'carillonneur:tune',
  rival: 'carillonneur',
  spell: 'tune',
  title: 'Tune',
  lattice: TUNE,
  annotation:
    'Bolt carries the cast down the line, Toll takes every tile joined to the first by the same state, and Strike lands on each: one blow for as much metal as it is wide (Bolt, Toll, Strike).',
  story:
    'A tuning sheet for the Great Bell, four notes ruled in a column and the fifth line left bare. In the margin, in a ringer’s cramped hand: every street on the plan has a bell to hold it down. Walk out to the Seam and listen. The Seam has no bell.',
  trial: { board: '. . . . . .\nD . r . r .\n. . . . . .' },
  /**
   * The Carillonneur's note on Toll (P15, P25): a third option at level II of `toll:bell`, hidden
   * until this page is held.
   */
  note: { rune: 'toll', line: 'toll:bell', variant: CARILLONNEUR_TOLL },
};

/** The note itself, in FN's variant shape (registered in the footnote `rivals` batch, like the Lamplighter's wick). */
export const CARILLONNEUR_NOTE: VariantDef = {
  id: CARILLONNEUR_TOLL,
  subject: 'toll',
  slot: { line: 'toll:bell', level: 2 },
  text: 'Tolled as one. A Toll that reaches a bell strikes every bell of its tone at once, and the rest of the cast lands beside each of them.',
  rival: 'carillonneur',
  credit: "Copied from the Carillonneur's tuning sheet.",
};
