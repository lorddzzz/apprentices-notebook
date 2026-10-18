import type { DistrictId, Gift, Role, RuneDef, RuneId, SchoolId } from './types';

/** Shelf and codex order: the Seam's 13, then each school's three (design §5). */
export const RUNE_IDS = [
  'bolt',
  'splash',
  'touch',
  'strike',
  'shove',
  'guard',
  'ink',
  'oil',
  'steam',
  'brass',
  'spark',
  'fork',
  'bend',
  'jar',
  'fuse',
  'afterglow',
  'sentence',
  'levy',
  'tally',
  'vat',
  'seep',
  'steep',
  'hold',
  'brink',
  'lay',
  'toll',
  'coil',
  'unison',
  'swap',
  'draw',
  'erase',
] as const satisfies readonly RuneId[];

/** Where each school's pages are found (design §11). */
export const SCHOOL_DISTRICT: Record<SchoolId, DistrictId> = {
  seam: 'seam',
  timing: 'canals',
  contracts: 'inkQuarter',
  areas: 'bathhouses',
  structure: 'bridges',
  resonance: 'foundry',
  board: 'cartographers',
};

function rune(
  id: RuneId,
  name: string,
  role: Role,
  school: SchoolId,
  headline: string,
  opts: { charges?: number; gift?: Gift; arrow?: boolean } = {},
): RuneDef {
  return {
    id,
    name,
    token: name,
    role,
    school,
    district: SCHOOL_DISTRICT[school],
    headline,
    arrow: opts.arrow ?? role === 'source',
    charges: opts.charges ?? 0,
    gift: opts.gift ?? null,
  };
}

export const RUNES: Record<RuneId, RuneDef> = {
  // The Seam: mixing and pushing (design §5.1)
  bolt: rune('bolt', 'Bolt', 'source', 'seam', 'Aims a line at the first unit, range 4.', {
    charges: 5,
    gift: 'tile',
  }),
  splash: rune('splash', 'Splash', 'source', 'seam', 'Aims a 3×3 within range 3.', {
    charges: 3,
    gift: 'tile',
  }),
  touch: rune('touch', 'Touch', 'source', 'seam', 'Aims yourself or an adjacent unit or tile.', {
    charges: 6,
  }),
  strike: rune(
    'strike',
    'Strike',
    'action',
    'seam',
    'Deals 2 to the target. Mixes with nothing: the safe hit.',
  ),
  shove: rune('shove', 'Shove', 'action', 'seam', 'Pushes the target 1 tile along the heading.', {
    gift: 'push',
  }),
  guard: rune(
    'guard',
    'Guard',
    'action',
    'seam',
    'Shields the target from the next 2 damage until your next turn. A shielded hit is still a hit.',
    { gift: 'round' },
  ),
  ink: rune('ink', 'Ink', 'kind', 'seam', 'Lands Ink.'),
  oil: rune('oil', 'Oil', 'kind', 'seam', 'Lands Oil.'),
  steam: rune('steam', 'Steam', 'kind', 'seam', 'Lands Steam.', { gift: 'round' }),
  brass: rune('brass', 'Brass', 'kind', 'seam', 'Lands Brass.', { gift: 'round' }),
  spark: rune('spark', 'Spark', 'kind', 'seam', 'Lands Spark, the igniter.'),
  fork: rune(
    'fork',
    'Fork',
    'shape',
    'seam',
    'Left branch acts on the tile left of the target, right branch on the tile right.',
  ),
  bend: rune('bend', 'Bend', 'shape', 'seam', 'Turns the flow 90° on the page.', { arrow: true }),

  // Timing: the Lamplighters, the canals
  jar: rune(
    'jar',
    'Jar',
    'seal',
    'timing',
    "Seals the rest in a jar on the target's tile; it opens when a unit steps onto it.",
  ),
  fuse: rune(
    'fuse',
    'Fuse',
    'seal',
    'timing',
    "Seals the rest in a jar on the target's tile; it opens at the end of the round.",
  ),
  afterglow: rune(
    'afterglow',
    'Afterglow',
    'aura',
    'timing',
    'Lingering compounds from touching paths last 1 round longer.',
    { gift: 'round' },
  ),

  // Contracts: the Notaries, the ink-makers' quarter
  sentence: rune(
    'sentence',
    'Sentence',
    'action',
    'contracts',
    "Spends the target's mark to push it 2 tiles along the heading.",
    { gift: 'push' },
  ),
  levy: rune(
    'levy',
    'Levy',
    'action',
    'contracts',
    'Spends every mark in the target area; the caster gains 1 shield per mark.',
  ),
  tally: rune(
    'tally',
    'Tally',
    'trigger',
    'contracts',
    'The rest happens only if the target and its tile held 2 or more things (marks, states, jars) when the cast began.',
  ),

  // Areas: the bathhouses
  vat: rune('vat', 'Vat', 'source', 'areas', 'Aims a 2×2 within range 1.', {
    charges: 3,
    gift: 'tile',
  }),
  seep: rune('seep', 'Seep', 'shape', 'areas', "The rest also acts on the target's 4 neighbours."),
  steep: rune(
    'steep',
    'Steep',
    'aura',
    'areas',
    'Lingering compounds from touching paths spread one tile each round they last.',
    { gift: 'tile' },
  ),

  // Structure: the bridge-wardens, the bridges
  hold: rune(
    'hold',
    'Hold',
    'action',
    'structure',
    "The target can't change tiles until your next turn, not even by a push.",
    { gift: 'round' },
  ),
  brink: rune(
    'brink',
    'Brink',
    'trigger',
    'structure',
    'The rest happens only if the target stood beside an edge or canal when the cast began.',
  ),
  lay: rune(
    'lay',
    'Lay',
    'shape',
    'structure',
    'What the rest lands sets into the tile for good (until broken), instead of lingering.',
  ),

  // Resonance: the bell foundry
  toll: rune(
    'toll',
    'Toll',
    'shape',
    'resonance',
    'The rest also acts on every tile connected to the target by the same state.',
  ),
  coil: rune(
    'coil',
    'Coil',
    'aura',
    'resonance',
    'Bursts and conducted actions from touching paths reach one tile further.',
    { gift: 'tile' },
  ),
  unison: rune(
    'unison',
    'Unison',
    'trigger',
    'resonance',
    "The rest happens only if another apprentice's cast landed on this target this turn.",
  ),

  // The board itself: the Cartographers
  swap: rune('swap', 'Swap', 'action', 'board', 'The target and the caster trade places.'),
  draw: rune(
    'draw',
    'Draw',
    'action',
    'board',
    "Moves what's on the target's tile (a state, a plate, a jar) one tile along the heading.",
    { gift: 'push' },
  ),
  erase: rune(
    'erase',
    'Erase',
    'action',
    'board',
    'Removes the state, compound, mark or jar on the target; on unfinished paper, un-draws the tile.',
  ),
};

export const runeDef = (id: RuneId): RuneDef => RUNES[id];
