import type { EncounterVariant } from '../../types';
import type { KitRoomDef } from '../index';
import type { PencilConfig } from './types';

/**
 * The Cartographers' six encounters (cartographers-plan P4, P13; CG-9, CG-10), set in the academy
 * (design §0 "Place"): the lecture theatre, the drafting benches, the registry, the archive of
 * corrections, the back hall with the owner's desk, and the register hall (the heart). Three
 * layouts each. Rooms 1-3 run a fixed-size pencil with `redraw: 0`; rooms 4-5 and the heart
 * carry outlines and a `redraw`, so the deep rooms keep moving. Every number is a first guess for
 * CAL (*tune by playing*).
 *
 * Layouts are drawn as character grids (`sheet`): `.` floor, `p` pencil, `b` blank paper, `P` a
 * start point; `A` Surveyor, `F` Eraser, `I` Tracer and `Y` the Registrar on floor, the lower case
 * (`a f i y`) on pencil; `O Q R` an outline carrying a Surveyor, an Eraser or a Tracer.
 */

const CELLS: Readonly<Record<string, string>> = {
  '.': '.',
  p: '{pencil}',
  b: '{blank}',
  P: 'P',
  A: 'A',
  F: 'F',
  I: 'I',
  Y: 'Y',
  a: 'A{pencil}',
  f: 'F{pencil}',
  i: 'I{pencil}',
  y: 'Y{pencil}',
  O: '{outline:surveyor}',
  Q: '{outline:eraser}',
  R: '{outline:tracer}',
};

function sheet(...rows: string[]): string {
  return rows
    .map((row) =>
      [...row]
        .map((c) => {
          const cell = CELLS[c];
          if (cell === undefined) throw new Error(`Unknown sheet cell '${c}'`);
          return cell;
        })
        .join(' '),
    )
    .join('\n');
}

const v = (name: string, ...rows: string[]): EncounterVariant => ({
  name,
  layout: sheet(...rows),
});

// ── The pencil per room (P4) ────────────────────────────
/** One config per room, in room order (rooms 1-5 then the heart). `share` is about the authored paper. */
export const ROOM_PENCIL: readonly PencilConfig[] = [
  { share: 0.25, perRound: 0.3, inkBias: 0.6, redraw: 0 },
  { share: 0.3, perRound: 1 / 3, inkBias: 0.55, redraw: 0 },
  { share: 0.25, perRound: 1 / 3, inkBias: 0.5, redraw: 0 },
  { share: 1 / 3, perRound: 0.4, inkBias: 0.5, redraw: 1 },
  { share: 0.4, perRound: 0.8, inkBias: 0.1, redraw: 2 },
  { share: 0.4, perRound: 0.4, inkBias: 0.45, redraw: 2 },
];

// ── Rooms 1-3 (CG-9) ────────────────────────────────────
/** Room 1, 6x8: a Surveyor and an Eraser (the hands met one at a time). */
const LECTURE: readonly EncounterVariant[] = [
  v(
    'The tiered seats',
    'b..A.b',
    '.p.p..',
    '..p.p.',
    '.p..F.',
    '..p..p',
    '.p.p..',
    'P..ppP',
    '.P..P.',
  ),
  v('The lectern', '..A..F', '.pppp.', '..p.p.', 'bp..pb', '.p..p.', '..p...', 'P....P', '.P..P.'),
  v(
    'The projection wall',
    'F....A',
    '..pp..',
    'p....p',
    'p.pp.p',
    '......',
    '.p..p.',
    'P....P',
    '.P..P.',
  ),
];

/** Room 2, 6x8: a Surveyor, an Eraser and a Tracer. */
const BENCHES: readonly EncounterVariant[] = [
  v(
    'The long bench',
    'I....A',
    '.pppp.',
    '......',
    'pp..pp',
    '..F...',
    '.pppp.',
    'P....P',
    '.P..P.',
  ),
  v(
    'The tracing tables',
    '.A..I.',
    'p.pp.p',
    '......',
    'p.pp.p',
    '.F....',
    'p.pp.p',
    'P....P',
    '.P..P.',
  ),
  v(
    'The inkwell row',
    'A....I',
    '.p.p.p',
    'p...p.',
    '.pF.p.',
    'p.p.p.',
    '.p...p',
    'P....P',
    '.P..P.',
  ),
];

/** Room 3, 7x8: all three hands and a second Eraser. */
const REGISTRY: readonly EncounterVariant[] = [
  v(
    'The card index',
    'bA...Fb',
    '.pp.pp.',
    '...I...',
    'pp...pp',
    '..pF...',
    '.p..pp.',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The ledger stacks',
    'F.....A',
    'p.p.p.p',
    'p.....p',
    '..pIp..',
    'p.....p',
    'p.p.p.p',
    'P..F..P',
    '.P...P.',
  ),
  v(
    'The filing aisle',
    '..A.F..',
    '.p.p.p.',
    'bp...pb',
    '...I...',
    'bp...pb',
    '.p.p.p.',
    'P..F..P',
    '.P...P.',
  ),
];

// ── Rooms 4-5 and the heart (CG-10) ─────────────────────
/** Room 4, 7x9: the three hands and two outlines (a Surveyor and an Eraser drawn in later). */
const CORRECTIONS: readonly EncounterVariant[] = [
  v(
    'The corrections desk',
    '..A...F',
    '.ppp.pp',
    '..pOp..',
    'pp...pp',
    '.pp.I.p',
    '..p.pp.',
    '.pQ.p..',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The struck pages',
    'F.....A',
    'pp.p.pp',
    '.p.O.p.',
    '.ppp.pp',
    'p..I..p',
    '.pp.ppp',
    '.p.Q.p.',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The red pencil',
    '.A...F.',
    'p.p.p.p',
    'ppQ.Opp',
    '.p...p.',
    'pp.I.pp',
    '.pp.pp.',
    'bp...pb',
    'P.....P',
    '.P...P.',
  ),
];

/** Room 5, 7x9: the back hall, with the owner's old desk; three outlines. */
const BACK_HALL: readonly EncounterVariant[] = [
  v(
    "The owner's desk",
    'A..p..F',
    'ppp.ppp',
    'p.O.Q.p',
    'pp...pp',
    '.pp.pp.',
    'p..I..p',
    'ppR.ppp',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The unswept floor',
    'F.p.p.A',
    '.pp.pp.',
    'pQ...Op',
    '.p.I.p.',
    'ppp.ppp',
    'p.pRp.p',
    'bpp.ppb',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The shuttered window',
    'A.....F',
    'pp.p.pp',
    '.pOpQp.',
    'p..p..p',
    'ppp.ppp',
    '.p.I.p.',
    'pp.R.pp',
    'P.....P',
    '.P...P.',
  ),
];

/** The heart, 7x9: the Registrar, a Tracer and two outlines. */
const REGISTER_HALL: readonly EncounterVariant[] = [
  v(
    'The register',
    'ppp.ppp',
    'p..Y..p',
    'p.pppp.',
    'pp.O.pp',
    '.p...p.',
    'pp.I.pp',
    'p..Q..p',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The struck name',
    '.pp.pp.',
    'p..Y..p',
    'ppQppOp',
    '.p...p.',
    'pp.I.pp',
    '.ppppp.',
    'p.....p',
    'P.....P',
    '.P...P.',
  ),
  v(
    'The ruled columns',
    'pp.Y.pp',
    'p.ppp.p',
    'p.O.Q.p',
    'pp...pp',
    '.p.I.p.',
    'ppp.ppp',
    'p.....p',
    'P.....P',
    '.P...P.',
  ),
];

function room(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: KitRoomDef['loot'],
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
  };
}

export const CARTOGRAPHERS_ROOMS: readonly KitRoomDef[] = [
  room('cartographers-lecture', 'The lecture theatre', 1, LECTURE, 'cartographers:room1'),
  room('cartographers-benches', 'The drafting benches', 2, BENCHES, 'cartographers:room2'),
  room('cartographers-registry', 'The registry', 3, REGISTRY, 'cartographers:room3'),
  room(
    'cartographers-corrections',
    'The archive of corrections',
    4,
    CORRECTIONS,
    'cartographers:room4',
  ),
  room('cartographers-back-hall', 'The back hall', 5, BACK_HALL, 'cartographers:room5'),
  room('cartographers-heart', 'The register hall', 6, REGISTER_HALL, 'cartographers:heart', true),
];
