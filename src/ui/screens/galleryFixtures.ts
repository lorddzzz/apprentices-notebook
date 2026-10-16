import { type GameEvent, parseBoard, type UnitRef } from '$engine';
import type { Overlay } from '../../app/overlay';
import { type BoardView, viewOfSpec } from '../../app/view';

/** Every tile layer and unit type in one 6 × 8 board (A1 top-left). */
export const SHOWCASE_BOARD = `
D  .   o  ro  i   @
.  oi  .  *   *   .
o  S*  i  ~   b   ~
.  .   =  =   d   .
.  r!o .  f~  .   .
.  .   @~ .   r&  .
.  .   .  .   .   .
.  .   .  .   .   .
`;

export function showcaseView(): BoardView {
  const v = viewOfSpec(parseBoard(SHOWCASE_BOARD));
  const by = (id: string) => v.units.find((u) => u.id === id);
  const draughtsman = by('draughtsman');
  if (draughtsman) draughtsman.shield = 2;
  const stoker = by('stoker');
  if (stoker) stoker.hp = 5;
  const rat = by('rat-2');
  if (rat) rat.hp = 1;
  const dummy = by('dummy-1');
  if (dummy) {
    dummy.maxHp = 12;
    dummy.hp = 9;
  }
  const sentry = by('sentry-1');
  if (sentry) sentry.intent = { kind: 'attack', attack: 'line', dir: 'left', order: 1 };
  const rat1 = by('rat-1');
  if (rat1) rat1.intent = { kind: 'attack', attack: 'bite', dir: 'left', order: 2 };
  return v;
}

export const SHOWCASE_OVERLAY: Overlay = {
  selected: 'stoker',
  highlights: [
    { kind: 'reach', at: { x: 1, y: 0 } },
    { kind: 'reach', at: { x: 0, y: 1 } },
    { kind: 'reach', at: { x: 0, y: 2 } },
    { kind: 'aim', at: { x: 1, y: 3 }, chevron: 'down' },
    { kind: 'aim', at: { x: 1, y: 4 } },
    { kind: 'aim', at: { x: 1, y: 5 } },
    {
      kind: 'path',
      cells: [
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 1, y: 5 },
      ],
    },
    { kind: 'target', at: { x: 1, y: 4 } },
    { kind: 'shove', at: { x: 4, y: 3 } },
  ],
  intents: [
    {
      from: { x: 4, y: 2 },
      path: [
        { x: 3, y: 2 },
        { x: 2, y: 2 },
      ],
      hit: { x: 1, y: 2 },
      order: 1,
      attack: 'line',
      dir: 'left',
      emphasis: 'normal',
    },
    {
      from: { x: 3, y: 0 },
      path: [],
      hit: { x: 2, y: 0 },
      order: 2,
      attack: 'bite',
      dir: 'left',
      emphasis: 'normal',
    },
  ],
  badges: [
    { at: { x: 1, y: 4 }, kind: 'damage', text: '−3' },
    { at: { x: 1, y: 4 }, kind: 'kill', text: '' },
    { at: { x: 4, y: 5 }, kind: 'shield', text: '+2' },
  ],
  ghosts: [{ unit: 'stoker', at: { x: 1, y: 6 }, kind: 'member', def: 'stoker' }],
};

/** Compiled Glyph sockets for the Gallery: one spell, one payload. */
export const GLYPH_SAMPLES: readonly { name: string; kind: 'spell' | 'payload' }[] = [
  { name: 'Cashing In', kind: 'spell' },
  { name: 'Bonfire', kind: 'payload' },
];

/** S2 "oil-chain" from the engine plan. */
export const OIL_CHAIN_BOARD = `
. . . . . d
S . ro o ro o
`;

const ref = (id: string, name: string, x: number, y: number, member = false): UnitRef => ({
  id,
  name,
  at: { x, y },
  member,
});

const stoker = ref('stoker', 'Stoker', 0, 1, true);
const rat1 = ref('rat-1', 'rat', 2, 1);
const rat2 = ref('rat-2', 'rat', 4, 1);

/** The expected S2 lines, as events. */
export const OIL_CHAIN_EVENTS: GameEvent[] = [
  {
    type: 'cast',
    caster: stoker,
    spell: 'Bolt',
    aim: { kind: 'dir', dir: 'right' },
    aimText: 'right',
    echo: false,
  },
  { type: 'damage', target: rat1, amount: 2, source: 'Bolt', bonus: [], hpLeft: 0 },
  { type: 'died', unit: rat1 },
  {
    type: 'ignite',
    at: { x: 2, y: 1 },
    tiles: [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ],
  },
  { type: 'damage', target: rat2, amount: 2, source: 'Fire', bonus: ['oil-soaked +1'], hpLeft: 0 },
  { type: 'died', unit: rat2 },
];
