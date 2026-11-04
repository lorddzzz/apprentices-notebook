import { type BattleState, type Coord, type EnemyUnit, parseLabel, scenarioBattle } from '$engine';
import type { Telegraph, TrickDef, TrickMark, TrickPlan } from '$engine/rivals/types';
import {
  EMPTY_OVERLAY,
  type Overlay,
  type RivalDraw,
  type TrickDraw,
  trickDrawOf,
  trickSteps,
} from '../../app/overlay';
import { type BoardView, viewOf } from '../../app/view';

/**
 * The Gallery's trick telegraphs (RV-13): five test-only fixture tricks, each only a `draw` and a
 * `describe` over the generic descriptor, drawn through the same `trickDrawOf`/`trickSteps` the
 * battle uses. They are not registered anywhere, so no battle can meet them. RV-14 builds the
 * playable fixture rivals on the same shapes.
 */

const at = (lbl: string): Coord => parseLabel(lbl);

/** A 6 × 6 room: Draughtsman at B2, Stoker at E2, the fixture rival at C4. */
export const TRICK_BOARD = `
. . . . . .
. D . . S .
. . . . . .
. . L . . .
. . . . . .
. . . . . .
`;

type Ids = { d: string; s: string };

const idsOf = (s: BattleState): Ids => {
  const by = (def: string): string => s.units.find((u) => u.def === def)?.id ?? def;
  return { d: by('draughtsman'), s: by('stoker') };
};

const fixture = (
  id: string,
  name: string,
  describe: string,
  draw: (ids: Ids) => Telegraph,
): TrickDef => ({
  id: `canals:${id}`,
  name,
  init: () => null,
  draw: (s) => draw(idsOf(s)),
  describe: () => describe,
});

/** The clock contract: a writ with a seal and a stamp, so many rounds to answer it. */
const CLOCK = fixture(
  'fixtureClock',
  'the clock writ',
  'serve a writ: break the seal or stand on the stamp',
  (p) => ({
    label: 'clock writ',
    tiles: [at('E2'), at('C6')],
    units: [p.s],
    objects: [{ kind: 'trick', id: 1 }],
    countdown: 2,
  }),
);

/** Steams away: a reaction, shown as the tile he would vanish to when struck. */
const STEAM = fixture(
  'fixtureSteam',
  'steams away',
  'turns to steam and reappears at A6 when struck',
  () => ({
    label: 'steams away',
    tiles: [at('A6')],
    units: [],
  }),
);

/** Right of way: while he stands on the lane, nothing pushes or holds him. */
const WAY = fixture(
  'fixtureWay',
  'right of way',
  'cannot be pushed or held while he stands on the lane',
  () => ({ label: 'right of way', tiles: [at('C3'), at('C4'), at('C5')], units: [] }),
);

/** Plays a tune: note 2 of 4 sounds at a tile; the tune itself has no tile. */
const TUNE = fixture('fixtureTune', 'plays a tune', 'sounds the next note of his tune', () => ({
  label: 'tune',
  tiles: [at('B4')],
  units: [],
  objects: [{ kind: 'trick', id: 2 }],
  sequence: [2, 4],
}));

/** Strike from the register: two circled apprentices, erased at dusk. */
const REGISTER = fixture(
  'fixtureRegister',
  'the register',
  'strikes the circled names from the register at dusk',
  (p) => ({
    label: 'register',
    tiles: [],
    units: [p.d, p.s],
    objects: [
      { kind: 'trick', id: 3 },
      { kind: 'trick', id: 4 },
    ],
    countdown: 0,
  }),
);

export interface TrickSample {
  id: string;
  label: string;
  /** Whether it is the rival's telegraphed action (an order badge and name pill) or a per-round mark. */
  slot: TrickDraw['slot'];
  trick: TrickDef;
  /** Objects it owns, placed on the board (`null`: off the board). */
  objects: readonly { id: number; at: Coord | null }[];
}

export const TRICK_SAMPLES: readonly TrickSample[] = [
  {
    id: 'clock',
    label: 'Clock contract',
    slot: 'action',
    trick: CLOCK,
    objects: [{ id: 1, at: at('E5') }],
  },
  { id: 'steam', label: 'Steams away', slot: 'mark', trick: STEAM, objects: [] },
  { id: 'way', label: 'Right of way', slot: 'mark', trick: WAY, objects: [] },
  { id: 'tune', label: 'Plays a tune', slot: 'mark', trick: TUNE, objects: [{ id: 2, at: null }] },
  {
    id: 'register',
    label: 'The register',
    slot: 'action',
    trick: REGISTER,
    objects: [
      { id: 3, at: at('B2') },
      { id: 4, at: at('E2') },
    ],
  },
];

export interface TrickScene {
  view: BoardView;
  overlay: Overlay;
  draws: TrickDraw[];
}

/** The room with one fixture trick drawn on it: the banner's lines and the board's overlay. */
export function trickScene(sample: TrickSample): TrickScene {
  const s = scenarioBattle({ board: TRICK_BOARD });
  const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy');
  if (!rival) throw new Error('the gallery room has no rival');
  rival.rival = {
    rival: 'lamplighter',
    spells: {},
    charges: {},
    trick: null,
    objects: sample.objects.map((o) => ({
      id: o.id,
      trick: sample.trick.id,
      owner: rival.id,
      at: o.at ? { ...o.at } : null,
      data: null,
    })),
  } as NonNullable<EnemyUnit['rival']>;
  const shown: TrickPlan & TrickMark = { lock: null, data: null, tiles: [] };
  const draws = [
    trickDrawOf(
      s,
      rival,
      sample.slot,
      sample.trick.draw(s, rival, shown, null),
      sample.trick.describe(shown),
      sample.slot === 'action' ? 1 : null,
    ),
  ];
  const rivals: RivalDraw[] =
    sample.slot === 'action'
      ? [
          {
            unit: rival.id,
            from: { ...rival.pos },
            order: 1,
            label: sample.trick.name.replace(/^the /, ''),
            dir: null,
            path: [],
            landing: null,
            effects: [],
            wick: null,
            fallback: null,
            starving: false,
            emphasis: 'normal',
          },
        ]
      : [];
  return {
    view: viewOf(s),
    overlay: { ...EMPTY_OVERLAY, rivals, steps: trickSteps(draws), tricks: draws },
    draws,
  };
}
