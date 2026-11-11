import type { RivalDef, RivalPageDef } from './types';

/**
 * The Chief Warden as a rival (bridges plan P16, BR-20; rivals plan P10): the great arch's host.
 * His kit is *Chalk the line* (`Bolt> Hold`) and *Mind the edge* (`Bolt> Brink Shove`, which shoves
 * whoever stands beside fog off it). His signature trick is right of way (`bridges:keystoneRight`,
 * `engine/districts/bridges/keystoneRight.ts`): while the keystone stands he cannot be pushed, held
 * or dropped. He never walks. HP is `BRIDGE_TUNING.chiefHp` (the shell in `bridges/enemies.ts`
 * matches; *tune by playing*). The staff he used to call as a stand-in is not part of the kit.
 */

const CHALK = 'Bolt> Hold';
const MIND_THE_EDGE = 'Bolt> Brink Shove';

export const CHIEF_WARDEN_TRICK_ID = 'bridges:keystoneRight';

export const CHIEF_WARDEN_RIVAL: RivalDef = {
  id: 'chiefWarden',
  name: 'Chief Warden',
  token: 'K',
  district: 'bridges',
  hp: 10,
  move: 0,
  elite: true,
  habitat: 'any',
  blurb:
    'The Chief Warden, on the keystone. While it stands he cannot be pushed, held or dropped. Chalks a circle, and shoves whoever stands beside fog. Break the keystone, or wear him down: when he falls the bridge falls after you.',
  spells: [
    { id: 'chalk', name: 'Chalk the line', lattice: CHALK, charges: 5 },
    { id: 'mindTheEdge', name: 'Mind the edge', lattice: MIND_THE_EDGE, charges: 5 },
  ],
  /** Shove whoever a shove sends into the fog; else chalk whoever is in line; else shove anyone. */
  routine: [
    {
      goal: 'herdInto',
      action: { kind: 'spell', spell: 'mindTheEdge' },
      params: { object: 'hazard' },
    },
    { goal: 'hitParty', action: { kind: 'spell', spell: 'chalk' } },
    { goal: 'hitParty', action: { kind: 'spell', spell: 'mindTheEdge' } },
  ],
  trick: CHIEF_WARDEN_TRICK_ID,
  fallback: { damage: 1 },
  dryStrike: 'line',
  page: 'chiefWarden:mindTheEdge',
};

/** His recovered page (P16): *Mind the edge*, its trial a fogged ledge. */
export const CHIEF_WARDEN_PAGE: RivalPageDef = {
  id: 'chiefWarden:mindTheEdge',
  rival: 'chiefWarden',
  spell: 'mindTheEdge',
  title: 'Mind the edge',
  lattice: MIND_THE_EDGE,
  annotation:
    'Bolt carries the cast down the line, Brink marks the first tile that is not floor, and Shove sends whoever stands beside it over: the edge does the harm (Bolt, Brink, Shove).',
  story:
    'A watch roster for the great arch, every span counted and ticked. In the margin, in chalk: the count comes out the same whether I walk it or not. Mind the edge.',
  trial: { board: '. . . . _\nD . . r _\n. . . . _' },
  note: { rune: 'brink', line: 'brink:edge', variant: 'chiefWarden:brink' },
};
