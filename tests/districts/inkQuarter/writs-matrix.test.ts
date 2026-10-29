import { describe, expect, it } from 'vitest';
import { type BattleState, type Coord, type Dir, parseLabel, type Unit, unitAt } from '$engine';
import { BASIC_ACTIONS } from '$engine/basicActions';
import type { Ctx } from '$engine/ctx';
import { drift } from '$engine/current';
import { WRITS_RULE_ID } from '$engine/districts/inkQuarter/writs';
import { enemyWalk, moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { snapshotOf } from '$engine/resolve';
import { listRules } from '$engine/rules';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { undoBoard } from '$engine/solvents';
import { type Flow, type Step, type Target, targetKey } from '$engine/types';
import { board, draft } from '../../scenarios/harness';

/**
 * The return stamp's arrival rows (ink-quarter plan P1, P2; IQ-1): every cause × trait, in the
 * shape of `tests/engine/arrival-matrix.test.ts`. y = the stamp sent the subject back. It answers a
 * landing by every cause but `return` and `restore`; fliers are read too; the anchored never move.
 * The writs rule is listed at the start, so each subject's start tile is where the rig begins.
 */

type Trait = 'land' | 'flier' | 'swimmer' | 'anchored';
const TOKEN: Record<Trait, string> = { land: 'r', flier: 'm', swimmer: 'e', anchored: 'M' };
const STAMP = '{return}';
const at = (lbl: string): Coord => parseLabel(lbl);
const ORIGIN = { caster: 'draughtsman', spell: 'x', cast: 0 } as const;

interface Rig {
  ascii: string;
  subject: string;
  hp?: number;
  run: (ctx: Ctx, u: Unit) => void;
}

const rows = (row1: string): string => `${row1}\n. . . .\n. . . .`;
const first = (t: Trait, stampAt: 1 | 2): string => {
  const cells =
    t === 'swimmer' ? [`${TOKEN.swimmer}w>`, 'w>', 'w>', 'w>'] : [TOKEN[t], '.', '.', '.'];
  const c = cells[stampAt] ?? '.';
  cells[stampAt] = c === '.' ? STAMP : `${c}${STAMP}`;
  return rows(cells.join(' '));
};

function flowOf(s: BattleState, t: Target, heading: Dir | null): Flow {
  return {
    caster: 'draughtsman',
    origin: ORIGIN,
    snapshot: snapshotOf(s),
    headings: new Map([[targetKey(t), heading]]),
    lay: false,
    gifted: false,
    solvent: null,
    habit: null,
    depth: 0,
    auras: [],
  };
}
const swapRune = (ctx: Ctx, u: Unit) => {
  const t: Target = { kind: 'unit', unit: u.id };
  const step: Step = { role: 'action', rune: 'swap', auras: [], next: null, at: { x: 0, y: 0 } };
  ACTION_HANDLERS.swap(ctx, t, flowOf(ctx.s, t, null), step);
};
const walkFoe = (path: string[]) => (ctx: Ctx, u: Unit) => {
  if (u.kind !== 'enemy') throw new Error('not a foe');
  enemyWalk(ctx, u, path.map(at));
};
const pushRight = (n: number) => (ctx: Ctx, u: Unit) => {
  push(ctx, u, 'right', n, null);
};
const basic = (a: 'pull' | 'hop' | 'swap') => (ctx: Ctx) =>
  BASIC_ACTIONS[a].apply(ctx, 'draughtsman', 'right');

type Cause =
  | 'walk (member)'
  | 'walk (foe)'
  | 'walk through (foe)'
  | 'push'
  | 'push through'
  | 'slide'
  | 'swap'
  | 'pull'
  | 'hop'
  | 'hop over'
  | 'basic swap'
  | 'drift'
  | 'restore';

const allTraits = (f: (t: Trait) => Rig): Record<Trait, Rig> => ({
  land: f('land'),
  flier: f('flier'),
  swimmer: f('swimmer'),
  anchored: f('anchored'),
});

const CAUSES: Record<Cause, Partial<Record<Trait, Rig>>> = {
  'walk (member)': {
    land: {
      ascii: rows(`D ${STAMP} . .`),
      subject: 'A1',
      run: (ctx, u) => {
        if (u.kind !== 'member') throw new Error('not a member');
        moveMember(ctx, u, at('B1'));
      },
    },
  },
  'walk (foe)': {
    land: { ascii: first('land', 1), subject: 'A1', run: walkFoe(['B1']) },
    flier: { ascii: first('flier', 1), subject: 'A1', run: walkFoe(['B1']) },
    swimmer: { ascii: first('swimmer', 1), subject: 'A1', run: walkFoe(['B1']) },
  },
  // The stamp is on B1, walked through; the walk lands on C1.
  'walk through (foe)': {
    land: { ascii: first('land', 1), subject: 'A1', run: walkFoe(['B1', 'C1']) },
    flier: { ascii: first('flier', 1), subject: 'A1', run: walkFoe(['B1', 'C1']) },
  },
  push: allTraits((t) => ({ ascii: first(t, 1), subject: 'A1', run: pushRight(1) })),
  // Pushed two tiles over the stamp on B1, onto C1.
  'push through': {
    land: { ascii: first('land', 1), subject: 'A1', run: pushRight(2) },
    flier: { ascii: first('flier', 1), subject: 'A1', run: pushRight(2) },
  },
  // Pushed onto a slick on B1, it slides on to the stamp on C1.
  slide: {
    land: { ascii: rows(`r o ${STAMP} .`), subject: 'A1', run: pushRight(1) },
    swimmer: { ascii: rows(`ew> w>o w>${STAMP} w>`), subject: 'A1', run: pushRight(1) },
  },
  // The Draughtsman on the stamp (A1) swaps with the subject on B1, which lands on the stamp.
  swap: allTraits((t) => ({
    ascii: rows(
      t === 'swimmer' ? `Dw>${STAMP} ${TOKEN.swimmer}w> w> w>` : `D${STAMP} ${TOKEN[t]} . .`,
    ),
    subject: 'B1',
    run: swapRune,
  })),
  // The Draughtsman on A1 pulls the subject on C1 onto the stamp on B1.
  pull: {
    land: { ascii: rows(`D ${STAMP} r .`), subject: 'C1', hp: 5, run: basic('pull') },
    flier: { ascii: rows(`D ${STAMP} m .`), subject: 'C1', hp: 5, run: basic('pull') },
    swimmer: { ascii: rows(`Dw> w>${STAMP} ew> w>`), subject: 'C1', run: basic('pull') },
  },
  // The Draughtsman hops from A1 onto the stamp on C1; `hop over` puts it under the arc (B1).
  hop: { land: { ascii: rows(`D . ${STAMP} .`), subject: 'A1', run: basic('hop') } },
  'hop over': { land: { ascii: rows(`D ${STAMP} . .`), subject: 'A1', run: basic('hop') } },
  // The basic Swap: the Draughtsman on the stamp swaps with the rat on B1.
  'basic swap': { land: { ascii: rows(`D${STAMP} r . .`), subject: 'B1', run: basic('swap') } },
  // The current carries a rat off its lane onto the stamp on B1.
  drift: { land: { ascii: rows(`rw> ${STAMP} . .`), subject: 'A1', run: (ctx) => drift(ctx) } },
  // Graphite puts the subject (now on B1) back on A1, the stamp: a placement, not an arrival.
  restore: allTraits((t) => ({
    ascii: rows(
      t === 'swimmer' ? `w>${STAMP} ${TOKEN.swimmer}w> w> w>` : `${STAMP} ${TOKEN[t]} . .`,
    ),
    subject: 'B1',
    run: (ctx, u) => undoBoard(ctx, { tiles: [], units: [{ id: u.id, pos: at('A1') }] }, ORIGIN),
  })),
};

/** Runs one cell: did the stamp send the subject back? */
function sentBack(cause: Cause, trait: Trait): boolean {
  const rig = CAUSES[cause][trait];
  if (!rig) throw new Error(`${cause} has no ${trait} rig`);
  const s = structuredClone(board(rig.ascii));
  const subject = unitAt(s, at(rig.subject));
  if (!subject) throw new Error(`no subject at ${rig.subject}`);
  if (rig.hp) subject.hp = subject.maxHp = rig.hp;
  // The subject's start tile of the round is a plain tile when it starts on the stamp's neighbour.
  s.rules = listRules(s, [WRITS_RULE_ID]);
  const id = subject.id;
  const r = draft(s, (ctx) => {
    const u = unitAt(ctx.s, at(rig.subject));
    if (!u) throw new Error(`no subject at ${rig.subject}`);
    rig.run(ctx, u);
  });
  return r.events.some((e) => e.type === 'inkQuarter:sentBack' && e.unit?.id === id);
}

type Yn = 'y' | 'n';
const MATRIX: readonly { cause: Cause; trait: Trait; expect: Yn }[] = [
  { cause: 'walk (member)', trait: 'land', expect: 'y' },
  { cause: 'walk (foe)', trait: 'land', expect: 'y' },
  { cause: 'walk (foe)', trait: 'flier', expect: 'y' }, // P1: fliers are read
  { cause: 'walk (foe)', trait: 'swimmer', expect: 'y' },
  { cause: 'walk through (foe)', trait: 'land', expect: 'n' }, // landing only
  { cause: 'walk through (foe)', trait: 'flier', expect: 'n' },
  { cause: 'push', trait: 'land', expect: 'y' },
  { cause: 'push', trait: 'flier', expect: 'y' },
  { cause: 'push', trait: 'swimmer', expect: 'y' },
  { cause: 'push', trait: 'anchored', expect: 'n' }, // never moves
  { cause: 'push through', trait: 'land', expect: 'n' },
  { cause: 'push through', trait: 'flier', expect: 'n' },
  { cause: 'slide', trait: 'land', expect: 'y' },
  { cause: 'slide', trait: 'swimmer', expect: 'y' },
  { cause: 'swap', trait: 'land', expect: 'y' },
  { cause: 'swap', trait: 'flier', expect: 'y' },
  { cause: 'swap', trait: 'swimmer', expect: 'y' },
  { cause: 'swap', trait: 'anchored', expect: 'n' },
  { cause: 'pull', trait: 'land', expect: 'y' },
  { cause: 'pull', trait: 'flier', expect: 'y' },
  { cause: 'pull', trait: 'swimmer', expect: 'y' },
  { cause: 'hop', trait: 'land', expect: 'y' },
  { cause: 'hop over', trait: 'land', expect: 'n' },
  { cause: 'basic swap', trait: 'land', expect: 'y' },
  { cause: 'drift', trait: 'land', expect: 'y' },
  { cause: 'restore', trait: 'land', expect: 'n' },
  { cause: 'restore', trait: 'flier', expect: 'n' },
  { cause: 'restore', trait: 'swimmer', expect: 'n' },
  { cause: 'restore', trait: 'anchored', expect: 'n' },
];

describe('return stamp × arrival cause × trait (IQ-1, P2)', () => {
  for (const r of MATRIX) {
    it(`${r.cause} × ${r.trait}: ${r.expect}`, () => {
      expect(sentBack(r.cause, r.trait) ? 'y' : 'n').toBe(r.expect);
    });
  }
  it.todo('carry (BR gargoyle) × every trait: y, once BR adds a mover');
});
