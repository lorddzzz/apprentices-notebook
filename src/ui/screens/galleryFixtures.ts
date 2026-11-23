import {
  type ApprenticeId,
  DISTRICT_IDS,
  type Drawing,
  ENEMY_IDS,
  type EnemyId,
  type Meets,
  RUNES,
} from '$data';
import {
  deriveSeed,
  type GameEvent,
  type Profile,
  parseBoard,
  type Trip,
  type UnitRef,
} from '$engine';
import { KIT } from '$engine/districts/kit';
import { placeParty, START_SALT } from '$engine/rooms';
import { sampleHousehold } from '../../app/dev/samples';
import { blankDrawing, type TableView, tableView } from '../../app/drawing';
import { LAB_ROOMS } from '../../app/lab';
import { EMPTY_OVERLAY, type Overlay } from '../../app/overlay';
import { type BoardView, viewOfSpec } from '../../app/view';

/** Every tile state, all eight tile compounds, the drop, and every unit type in one 6 × 8 board (A1 top-left). */
export const SHOWCASE_BOARD = `
D  .       o  ro   i       @
.  {stain} .  *    *       .
o  S*      i  ~    b       ~
.  .       =  =    d       .
.  r!o     .  f~   {brand} .
.  .       @~ {pool} r&    _
.  r!!     .  .    r$      .
{fog} {skid} {bank} {kettle} {wall} {wall}
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
  const jarred = v.tiles[3 * v.width + 0];
  if (jarred) jarred.jar = { owner: 'stoker', event: 'step', peek: 'oil' };
  const dusk = v.tiles[6 * v.width + 2];
  if (dusk) dusk.jar = { owner: 'draughtsman', event: 'dusk', peek: 'guard' };
  // A bound mark shows the action it holds; one wall is already cracked.
  const bound = v.units.find((u) => u.mark === 'plain' && u.kind === 'enemy');
  if (bound) bound.bound = 'shove';
  const cracked = v.tiles[7 * v.width + 5];
  if (cracked) cracked.hits = 1;
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

/** The room sizes at both ends of the format, each with a party the Gallery places on its start points. */
export const ROOM_SAMPLES: readonly {
  id: string;
  title: string;
  layout: string;
  lineup: readonly ApprenticeId[];
}[] = [
  {
    id: 'room-7x9',
    title: 'Room 7×9, three apprentices',
    layout: LAB_ROOMS[0]?.board ?? '',
    lineup: ['draughtsman', 'stoker', 'towelBearer'],
  },
  {
    id: 'room-5x6',
    title: 'Room 5×6, one apprentice',
    layout: LAB_ROOMS[1]?.board ?? '',
    lineup: ['runaway'],
  },
];

/** A room with its party standing on a seeded draw of the start points (the way a trip places them). */
export function roomView(layout: string, lineup: readonly ApprenticeId[], seed = 1): BoardView {
  const board = placeParty(parseBoard(layout), lineup, deriveSeed(seed, START_SALT));
  return viewOfSpec(board);
}

/** The room's start points, tinted. */
export function roomOverlay(layout: string): Overlay {
  return {
    ...EMPTY_OVERLAY,
    highlights: parseBoard(layout).starts.map((at) => ({ kind: 'reach' as const, at })),
  };
}

/** Compiled Glyph sockets for the Gallery: one spell, one payload. */
export const GLYPH_SAMPLES: readonly { name: string; kind: 'spell' | 'payload' }[] = [
  { name: 'Cashing In', kind: 'spell' },
  { name: 'Bonfire', kind: 'payload' },
];

/** The oil chain board for the playback demo. */
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

const stoker = ref('stoker', 'Joost', 0, 1, true);
const rat1 = ref('rat-1', 'rat', 2, 1);
const rat2 = ref('rat-2', 'rat', 4, 1);

/** A chain for the playback demo: a Bolt kills the first rat, a Spark lights the oil, the fire runs on. */
export const OIL_CHAIN_EVENTS: GameEvent[] = [
  {
    type: 'cast',
    caster: stoker,
    spell: 'Bolt',
    aim: { kind: 'dir', dir: 'right' },
    aimText: 'right',
  },
  {
    type: 'aimed',
    source: 'bolt',
    targets: [{ kind: 'unit', unit: 'rat-1' }],
    heading: 'right',
  },
  { type: 'damage', target: rat1, amount: 2, source: 'Bolt', bonus: [], hpLeft: 0 },
  { type: 'died', unit: rat1 },
  { type: 'landed', kind: 'spark', at: { x: 2, y: 1 }, makes: 'fire' },
  {
    type: 'spreadState',
    from: { x: 2, y: 1 },
    to: [
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ],
  },
  { type: 'damage', target: rat2, amount: 1, source: 'Fire', bonus: [], hpLeft: 1 },
  {
    type: 'push',
    unit: rat2,
    from: rat2.at,
    to: { x: 5, y: 1 },
    path: [{ x: 5, y: 1 }],
    cause: 'push',
    dir: 'right',
    slid: 1,
  },
  { type: 'crush', unit: rat2, into: 'wall', damage: 2, at: { x: 6, y: 1 }, dir: 'right' },
  { type: 'damage', target: rat2, amount: 2, source: 'Crush', bonus: [], hpLeft: 0 },
  { type: 'died', unit: rat2 },
];

/** One playable chain for the Gallery's fx part: a board, what happens on it, and any start-view tweak. */
export interface FxDemo {
  id: string;
  label: string;
  board: string;
  events: GameEvent[];
  prepare?: (v: BoardView) => void;
}

const at = (x: number, y: number) => ({ x, y });
const dummy = (x: number): UnitRef => ref('dummy-1', 'dummy', x, 0);
const ratAt = (x: number, y: number): UnitRef => ref('rat-1', 'rat', x, y);

export const FX_DEMOS: FxDemo[] = [
  {
    id: 'oil',
    label: 'Oil chain',
    board: OIL_CHAIN_BOARD,
    events: OIL_CHAIN_EVENTS,
  },
  {
    id: 'slide',
    label: 'Slide and crush',
    board: `
S  .  do  o  o  {wall}
.  .  .   .  .  .
`,
    events: [
      { type: 'shove', by: stoker, target: dummy(2), dir: 'right' },
      {
        type: 'push',
        unit: dummy(2),
        from: at(2, 0),
        to: at(4, 0),
        path: [at(3, 0), at(4, 0)],
        cause: 'push',
        dir: 'right',
        slid: 1,
      },
      { type: 'crush', unit: dummy(4), into: 'plate', damage: 3, at: at(5, 0), dir: 'right' },
      { type: 'damage', target: dummy(4), amount: 3, source: 'Crush', bonus: [], hpLeft: 9 },
    ],
  },
  {
    id: 'storm',
    label: 'Storm',
    board: `
S  .  .  ~  ~  ~
.  .  .  .  .  r~
`,
    events: [
      {
        type: 'burst',
        burst: 'storm',
        at: at(3, 0),
        tiles: [at(3, 0), at(4, 0), at(5, 0), at(5, 1)],
        units: [ratAt(5, 1)],
      },
      { type: 'damage', target: ratAt(5, 1), amount: 2, source: 'Storm', bonus: [], hpLeft: 0 },
      { type: 'died', unit: ratAt(5, 1) },
    ],
  },
  {
    id: 'brand',
    label: 'Brand cloud',
    board: `
S  .  .  .  .  .
.  .  .  d{brand}  .  .
`,
    events: [
      { type: 'marked', unit: ref('dummy-1', 'dummy', 3, 1), deep: false, bound: null },
      {
        type: 'burst',
        burst: 'page:brandCloud',
        at: at(3, 1),
        tiles: [at(3, 1)],
        units: [ref('dummy-1', 'dummy', 3, 1)],
      },
      {
        type: 'damage',
        target: ref('dummy-1', 'dummy', 3, 1),
        amount: 2,
        source: 'Brand storm',
        bonus: [],
        hpLeft: 10,
      },
      {
        type: 'damage',
        target: ref('dummy-1', 'dummy', 3, 1),
        amount: 2,
        source: 'Brand storm',
        bonus: [],
        hpLeft: 8,
      },
    ],
  },
  {
    id: 'jar',
    label: 'Jar opens',
    board: `
S  .  .  .  .  .
.  .  .  r  .  .
`,
    prepare(v) {
      const t = v.tiles[1 * v.width + 2];
      if (t) t.jar = { owner: 'stoker', event: 'step', peek: 'spark' };
    },
    events: [
      {
        type: 'moved',
        unit: ratAt(3, 1),
        from: at(3, 1),
        to: at(2, 1),
        path: [at(2, 1)],
        cause: 'walk',
      },
      { type: 'jarOpened', at: at(2, 1), by: ratAt(2, 1) },
      { type: 'burst', burst: 'fire', at: at(2, 1), tiles: [at(2, 1)], units: [ratAt(2, 1)] },
      { type: 'damage', target: ratAt(2, 1), amount: 2, source: 'Fire', bonus: [], hpLeft: 0 },
      { type: 'died', unit: ratAt(2, 1) },
    ],
  },
  {
    id: 'drop',
    label: 'Drop',
    board: `
S  .  r  _  .  .
.  .  .  .  .  .
`,
    events: [
      { type: 'dropped', unit: ratAt(2, 0), at: at(3, 0), elite: false },
      { type: 'died', unit: ratAt(2, 0) },
    ],
  },
];

// ── The Cartographers' hall (CG-12) ─────────────────────

/**
 * A 7 x 9 hall: pencil unplanned and planned (ink and rub, with their due rounds), blank paper, two
 * outlines, the three hands (A the Surveyor, F the Eraser, I the Tracer) and the Registrar (Y).
 */
export const HALL_BOARD = `
.       .             {pencil}  {pencil:ink@1}  .                   .                    .
.       {pencil:rub@1}  D{pencil:rub@1}  {pencil:ink@2}  .          .                    .
{blank} {blank}       .         .               {outline:eraser@2}  .                    .
{blank} .             .         A               .                   .                    Y
.       .             S{pencil:ink@2}  .        .                   F                    .
.       {pencil}      .         .               .                   .                    .
.       I             .         .               {outline:surveyor@3}  .                  .
.       .             .         .               .                   .                    .
.       .             .         .               .                   .                    .
`;

export function hallView(): BoardView {
  return viewOfSpec(parseBoard(HALL_BOARD));
}

const hallAt = (x: number, y: number): { x: number; y: number } => ({ x, y });

/** The hall's marks: one circle of each source with its holder line, the Surveyor's pair and the Tracer's tether, over the generic "Next round" tiles. */
export function hallOverlay(): Overlay {
  return {
    ...EMPTY_OVERLAY,
    highlights: [
      // The Registrar's circle on the Joost's pencil, held by the Eraser (a guild hand), still shown.
      {
        kind: 'district',
        key: 'cartographers:circle',
        at: hallAt(2, 4),
        to: hallAt(5, 4),
        data: { source: 'registrar', state: 'shown', holder: 'hand' },
      },
      // His drawn circle, held by himself.
      {
        kind: 'district',
        key: 'cartographers:circle',
        at: hallAt(2, 1),
        to: hallAt(6, 3),
        data: { source: 'registrar', state: 'drawn', holder: 'self' },
      },
      // The household's one-round circle from the Registrar's note, held by an apprentice.
      {
        kind: 'district',
        key: 'cartographers:circle',
        at: hallAt(4, 7),
        to: hallAt(2, 4),
        data: { source: 'note', state: 'drawn', holder: 'member' },
      },
      {
        kind: 'district',
        key: 'cartographers:link',
        at: hallAt(3, 3),
        to: hallAt(2, 1),
        data: { kind: 'swap' },
      },
      {
        kind: 'district',
        key: 'cartographers:link',
        at: hallAt(1, 6),
        to: hallAt(2, 4),
        data: { kind: 'tether' },
      },
    ],
    next: {
      shapes: [
        { kind: 'tile', at: hallAt(1, 1), tone: 'erased' },
        { kind: 'tile', at: hallAt(3, 0), tone: 'drawn' },
        { kind: 'tile', at: hallAt(4, 2), tone: 'warn' },
      ],
      units: [],
    },
  };
}

// ── The drawing table (EN-6) ──
/** A household past the handover, as the table sees it: a few foes and runes, the Seam and canals open. */
function handoverHousehold(): Profile {
  const p = sampleHousehold();
  return {
    ...p,
    ending: { handover: true, creditsSeen: false },
    foesMet: ['rat', 'familiar', 'sentry'],
    city: { ...p.city, open: ['seam', 'canals'], hearts: ['seam'] },
    known: [...new Set([...p.known, ...(Object.keys(RUNES) as Profile['known'])])],
  };
}

/** Every district open and everything met: the rows that need other rows show their sentences. */
function fullHouseholdView(): Profile {
  const p = handoverHousehold();
  const met = [
    ...Object.values(KIT.rules).flatMap((r) => (r.met === undefined ? [] : [r.met])),
    ...Object.values(KIT.pieces).flatMap((d) => (d.bench === undefined ? [] : [d.bench.met])),
  ] as Meets[];
  return {
    ...p,
    met: [...new Set(met)],
    foesMet: [...ENEMY_IDS] as EnemyId[],
    pages: ['lamplighter:lantern'],
    city: {
      ...p.city,
      open: DISTRICT_IDS.filter((d) => d !== 'lowerSeam'),
      hearts: DISTRICT_IDS.filter((d) => d !== 'lowerSeam'),
    },
  };
}

export interface DrawingFixture {
  title: string;
  view: TableView;
  slot: 0 | 1 | 2;
  focusName?: boolean;
}

const FITS: Drawing = {
  name: 'The wet room',
  rule: 'canals:current',
  foes: ['eel', 'moth'],
  pieces: [],
  shape: 'plain',
  length: 4,
  heart: 'mother',
};

export function drawingFixtures(): DrawingFixture[] {
  const home = handoverHousehold();
  const full = fullHouseholdView();
  const lean: Profile = { ...full, known: [] };
  const overdrawn: Drawing = {
    name: 'Everything at once',
    rule: 'canals:current',
    foes: ['rat', 'familiar', 'sentry'],
    pieces: [],
    shape: 'plain',
    length: 6,
    heart: 'registrar',
  };
  const inUse = {
    district: 'inkedPage',
    kit: {
      state: { slot: 1, drawing: FITS, rooms: [null, null, null, null], inner: null },
      choices: [],
      checkpoint: false,
      bonuses: [],
    },
  } as unknown as Trip;
  const saved = { ...full, drawings: [null, FITS, null] };
  const noRule = { ...blankDrawing(full), name: 'Wet foes' };
  return [
    { title: 'Three empty pages', view: tableView(home, 0, null, null), slot: 0 },
    { title: 'A full drawing that fits', view: tableView(saved, 1, null, null), slot: 1 },
    { title: 'Over budget', view: tableView(lean, 0, overdrawn, null), slot: 0 },
    { title: 'Greyed rows', view: tableView(full, 0, noRule, null), slot: 0 },
    {
      title: 'Name field, keyboard up',
      view: tableView(home, 0, { ...blankDrawing(home), name: 'The lamp' }, null),
      slot: 0,
      focusName: true,
    },
    { title: 'A page in use by a trip', view: tableView(saved, 1, null, inUse), slot: 1 },
  ];
}
