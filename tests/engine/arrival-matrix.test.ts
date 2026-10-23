import { describe, expect, it } from 'vitest';
import {
  type BattleState,
  type Coord,
  type Dir,
  type GameEvent,
  type Jar,
  type Layer,
  type Mark,
  type Origin,
  parseLabel,
  tileAt,
  type Unit,
  unitAt,
} from '$engine';
import type { Ctx } from '$engine/ctx';
import { drift } from '$engine/current';
import { enemyWalk, moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { snapshotOf } from '$engine/resolve';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { driftWaiting, undoBoard } from '$engine/solvents';
import { type Flow, type Step, type Target, targetKey } from '$engine/types';
import { board, draft } from '../scenarios/harness';

/**
 * The arrival matrix (foundations plan FD-1): every way something comes to stand on a tile today
 * (cause) × what answers an arrival (hook) × the unit's exemption trait, run through the engine's
 * own movers. Each cell records whether the hook answered.
 *
 * Plain cases are today's behaviour that the P-rules keep. `it.fails` cases assert the P-rule
 * outcome and fail on today's code: FD-3 flips each to a plain `it` as it lands (the reviewed test
 * diff the plan asks for). `it.todo` lists causes and rules that don't exist yet.
 *
 * AH, DK and the districts add their causes and hooks as rows here.
 */

type Trait = 'land' | 'flier' | 'swimmer' | 'anchored';
type HookId =
  | 'stepJar'
  | 'fuseJar'
  | 'stain'
  | 'markSpread'
  | 'bindEnters'
  | 'bindPushed'
  | 'wax'
  | 'fire';
const HOOKS: readonly HookId[] = [
  'stepJar',
  'fuseJar',
  'stain',
  'markSpread',
  'bindEnters',
  'bindPushed',
  'wax',
  'fire',
];

const at = (lbl: string): Coord => parseLabel(lbl);
const below = (c: Coord): Coord => ({ x: c.x, y: c.y + 1 });
const ORIGIN: Origin = { caster: 'draughtsman', spell: 'x', cast: 0 };
const layer = (id: Layer['id']): Layer => ({ id, rounds: 0, origin: null });
const jar = (event: Jar['event']): Jar => ({
  owner: 'draughtsman',
  event,
  rest: null,
  heading: null,
  origin: ORIGIN,
});
const mark = (extra: Partial<Mark> = {}): Mark => ({
  deep: false,
  lineage: 99,
  bound: null,
  origin: ORIGIN,
  ...extra,
});
const bound = (event: 'enters' | 'pushed'): Mark['bound'] => ({
  action: 'strike',
  event,
  solvent: null,
  heading: null,
});

/** The token for a subject of each trait; land foes are rats. */
const TOKEN: Record<Trait, string> = { land: 'r', flier: 'm', swimmer: 'e', anchored: 'M' };

/** The bystander a mark can spread to: the dummy, moved under the tile where the cloud is. */
function bystanderInCloud(s: BattleState, cloudAt: Coord): void {
  const dummy = s.units.find((u) => u.kind === 'enemy' && u.def === 'dummy');
  if (!dummy) throw new Error('board needs a dummy');
  const c = below(cloudAt);
  tileAt(s, c).state = layer('cloud');
  dummy.pos = { ...c };
}

/** Did the hook answer? Read from the event log only. */
function answered(hook: HookId, events: readonly GameEvent[], subject: string): boolean {
  switch (hook) {
    case 'stepJar':
    case 'fuseJar':
      return events.some((e) => e.type === 'jarOpened');
    case 'stain':
      return events.some((e) => e.type === 'marked' && e.unit.id === subject);
    case 'markSpread':
      return events.some((e) => e.type === 'markSpread');
    case 'bindEnters':
    case 'bindPushed':
      return events.some((e) => e.type === 'released' && e.unit.id === subject);
    case 'wax':
      return events.some((e) => e.type === 'markSpent' && e.line === 'wax:fire');
    case 'fire':
      return events.some((e) => e.type === 'damage' && e.source === 'Fire');
  }
}

/** Unit arrivals: the hook's thing waits on the tile the subject comes to (`hookAt`). */
function rigUnit(s: BattleState, hook: HookId, u: Unit, hookAt: Coord): void {
  const tile = tileAt(s, hookAt);
  switch (hook) {
    case 'stepJar':
      tile.jar = jar('step');
      return;
    case 'fuseJar':
      tile.jar = jar('dusk');
      return;
    case 'stain':
      tile.state = layer('stain');
      return;
    case 'markSpread':
      u.mark = mark();
      tile.state = layer('cloud');
      bystanderInCloud(s, hookAt);
      return;
    case 'bindEnters':
      u.mark = mark({ bound: bound('enters') });
      return;
    case 'bindPushed':
      u.mark = mark({ bound: bound('pushed') });
      return;
    case 'wax':
      u.mark = mark({ wax: true });
      tile.state = layer('fire');
      return;
    case 'fire':
      tile.state = layer('fire');
      return;
  }
}

/**
 * Object arrivals (P6): the hook's thing starts on `src` and is moved onto `dest`, under the
 * subject. Returns false when the object can't take part (a cloud doesn't float).
 */
function rigObject(
  s: BattleState,
  hook: HookId,
  u: Unit,
  src: Coord,
  dest: Coord,
  floats: boolean,
): boolean {
  const tile = tileAt(s, src);
  switch (hook) {
    case 'stepJar':
      tile.jar = jar('step');
      return true;
    case 'fuseJar':
      tile.jar = jar('dusk');
      return true;
    case 'stain':
      tile.state = layer('stain');
      return true;
    case 'markSpread':
      if (floats) return false;
      u.mark = mark();
      tile.state = layer('cloud');
      bystanderInCloud(s, dest);
      return true;
    case 'bindEnters':
      u.mark = mark({ bound: bound('enters') });
      tile.state = layer(floats ? 'blot' : 'slick');
      return true;
    case 'bindPushed':
      return false;
    case 'wax':
      u.mark = mark({ wax: true });
      tile.state = layer('fire');
      return true;
    case 'fire':
      tile.state = layer('fire');
      return true;
  }
}

/** A Flow for calling an Action handler directly: the Draughtsman casting with `heading`. */
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

/** Runs one Action rune's handler on `t`, as the Draughtsman's cast would. */
function runAction(ctx: Ctx, rune: 'swap' | 'draw', t: Target, heading: Dir | null): void {
  const step: Step = { role: 'action', rune, auras: [], next: null, at: { x: 0, y: 0 } };
  ACTION_HANDLERS[rune](ctx, t, flowOf(ctx.s, t, heading), step);
}

// ── Causes ──────────────────────────────────────────────

/** A cause run for one trait: the board, where the subject starts, where hooks wait, and the move. */
interface Rig {
  ascii: string;
  subject: string; // label of the subject at the start
  hookAt: string; // the tile the hook's thing waits on (or, for objects, the destination)
  src?: string; // objects only: where the object starts
  run: (ctx: Ctx, u: Unit) => void;
}

const ROWS = (row1: string, row3 = '. . . d'): string => `${row1}\n. . . .\n${row3}`;
const waterRow = (token: string): string => `${token}w> w> w> w>`;
const firstRow = (trait: Trait): string =>
  trait === 'swimmer' ? waterRow(TOKEN.swimmer) : `${TOKEN[trait]} . . .`;

const walkFoe = (path: string[]) => (ctx: Ctx, u: Unit) => {
  if (u.kind !== 'enemy') throw new Error('not a foe');
  enemyWalk(ctx, u, path.map(at));
};
const pushRight = (tiles: number) => (ctx: Ctx, u: Unit) => {
  push(ctx, u, 'right', tiles, null);
};

type Cause =
  | 'walk (member)'
  | 'walk (foe)'
  | 'walk through (foe)'
  | 'push'
  | 'push through'
  | 'slide'
  | 'swap'
  | 'drift'
  | 'restore'
  | 'draw (object)'
  | 'drift (object)';

/** Each cause's rig per trait; a missing trait is a cause that can't move it (named in `NA`). */
const CAUSES: Record<Cause, Partial<Record<Trait, Rig>>> = {
  'walk (member)': {
    land: {
      ascii: ROWS('D . . .'),
      subject: 'A1',
      hookAt: 'B1',
      run: (ctx, u) => {
        if (u.kind !== 'member') throw new Error('not a member');
        moveMember(ctx, u, at('B1'));
      },
    },
  },
  'walk (foe)': {
    land: { ascii: ROWS(firstRow('land')), subject: 'A1', hookAt: 'B1', run: walkFoe(['B1']) },
    flier: { ascii: ROWS(firstRow('flier')), subject: 'A1', hookAt: 'B1', run: walkFoe(['B1']) },
    swimmer: {
      ascii: ROWS(firstRow('swimmer')),
      subject: 'A1',
      hookAt: 'B1',
      run: walkFoe(['B1']),
    },
  },
  // The hook waits mid-path (B1); the walk lands on C1.
  'walk through (foe)': {
    land: {
      ascii: ROWS(firstRow('land')),
      subject: 'A1',
      hookAt: 'B1',
      run: walkFoe(['B1', 'C1']),
    },
    flier: {
      ascii: ROWS(firstRow('flier')),
      subject: 'A1',
      hookAt: 'B1',
      run: walkFoe(['B1', 'C1']),
    },
  },
  push: {
    land: { ascii: ROWS(firstRow('land')), subject: 'A1', hookAt: 'B1', run: pushRight(1) },
    flier: { ascii: ROWS(firstRow('flier')), subject: 'A1', hookAt: 'B1', run: pushRight(1) },
    swimmer: { ascii: ROWS(firstRow('swimmer')), subject: 'A1', hookAt: 'B1', run: pushRight(1) },
    anchored: {
      ascii: ROWS(firstRow('anchored')),
      subject: 'A1',
      hookAt: 'B1',
      run: pushRight(1),
    },
  },
  // Pushed two tiles: the hook waits on the first (B1), the push ends on C1.
  'push through': {
    land: { ascii: ROWS(firstRow('land')), subject: 'A1', hookAt: 'B1', run: pushRight(2) },
    flier: { ascii: ROWS(firstRow('flier')), subject: 'A1', hookAt: 'B1', run: pushRight(2) },
  },
  // Pushed one tile onto a slick at B1, it slides on to C1, where the hook waits.
  slide: {
    land: { ascii: ROWS('r o . .'), subject: 'A1', hookAt: 'C1', run: pushRight(1) },
    swimmer: { ascii: ROWS('ew> w>o w> w>'), subject: 'A1', hookAt: 'C1', run: pushRight(1) },
  },
  // The Draughtsman at A1 swaps with the subject at B1: the subject lands on A1.
  swap: Object.fromEntries(
    (['land', 'flier', 'swimmer', 'anchored'] as const).map((trait) => [
      trait,
      {
        ascii: ROWS(
          trait === 'swimmer' ? `Dw> ${TOKEN.swimmer}w> w> w>` : `D ${TOKEN[trait]} . .`,
          '. . . d',
        ),
        subject: 'B1',
        hookAt: 'A1',
        run: (ctx: Ctx, u: Unit) => {
          const t: Target = { kind: 'unit', unit: u.id };
          runAction(ctx, 'swap', t, null);
        },
      } satisfies Rig,
    ]),
  ),
  // The current carries a land unit off the end of its lane onto B1 (fliers, swimmers and the
  // anchored are never carried, K-9).
  drift: {
    land: { ascii: ROWS('rw> . . .'), subject: 'A1', hookAt: 'B1', run: (ctx) => drift(ctx) },
  },
  // Graphite puts a unit that moved (now on B1) back home on A1. P2: not an arrival.
  restore: Object.fromEntries(
    (['land', 'flier', 'swimmer', 'anchored'] as const).map((trait) => [
      trait,
      {
        ascii: ROWS(trait === 'swimmer' ? `w> ${TOKEN.swimmer}w> w> w>` : `. ${TOKEN[trait]} . .`),
        subject: 'B1',
        hookAt: 'A1',
        run: (ctx: Ctx, u: Unit) =>
          undoBoard(ctx, { tiles: [], units: [{ id: u.id, pos: at('A1') }] }, ORIGIN),
      } satisfies Rig,
    ]),
  ),
  // Draw moves what lies on A1 one tile right, under the subject on B1.
  'draw (object)': Object.fromEntries(
    (['land', 'flier', 'swimmer', 'anchored'] as const).map((trait) => [
      trait,
      {
        ascii: ROWS(trait === 'swimmer' ? `w> ${TOKEN.swimmer}w> w> w>` : `. ${TOKEN[trait]} . .`),
        subject: 'B1',
        src: 'A1',
        hookAt: 'B1',
        run: (ctx: Ctx) => {
          const t: Target = { kind: 'tile', at: at('A1') };
          runAction(ctx, 'draw', t, 'right');
        },
      } satisfies Rig,
    ]),
  ),
  // The current (and Pitch's waiting-on-water drift for jars) floats what lies on A1 onto B1,
  // under the subject. A grate on C1 keeps the subject itself from drifting on.
  'drift (object)': Object.fromEntries(
    (['land', 'flier', 'swimmer', 'anchored'] as const).map((trait) => [
      trait,
      {
        ascii: ROWS(`w> ${trait === 'swimmer' ? TOKEN.swimmer : TOKEN[trait]}w> w>h .`),
        subject: 'B1',
        src: 'A1',
        hookAt: 'B1',
        run: (ctx: Ctx) => {
          drift(ctx);
          driftWaiting(ctx);
        },
      } satisfies Rig,
    ]),
  ),
};

const MOVES: ReadonlySet<GameEvent['type']> = new Set([
  'moved',
  'push',
  'swapped',
  'drift',
  'drawn',
  'moveUndone',
]);

/** Runs one cell: rig the hook, run the cause, report whether the hook answered (null: n/a). */
function cell(cause: Cause, trait: Trait, hook: HookId): boolean | null {
  const rig = CAUSES[cause][trait];
  if (!rig) throw new Error(`${cause} has no ${trait} rig`);
  // Rigged on the start state, not inside the draft, so the run's log projects to its end state
  // (tests/app/projection.test.ts replays every draft the engine suites make).
  const s = structuredClone(board(rig.ascii));
  const subject = unitAt(s, at(rig.subject));
  if (!subject) throw new Error(`no subject at ${rig.subject}`);
  if (rig.src) {
    if (!rigObject(s, hook, subject, at(rig.src), at(rig.hookAt), cause === 'drift (object)')) {
      return null;
    }
  } else rigUnit(s, hook, subject, at(rig.hookAt));
  const subjectId = subject.id;
  const r = draft(s, (ctx) => {
    const u = unitAt(ctx.s, at(rig.subject));
    if (!u) throw new Error(`no subject at ${rig.subject}`);
    rig.run(ctx, u);
  });
  // Guard against a rig that silently does nothing: the subject or the object must have moved.
  const moved = r.events.some((e) => MOVES.has(e.type));
  if (moved === (trait === 'anchored' && cause === 'push')) {
    throw new Error(`${cause} × ${trait} × ${hook}: ${moved ? 'moved' : 'nothing moved'}`);
  }
  return answered(hook, r.events, subjectId);
}

// ── The matrix ──────────────────────────────────────────

/** y = the hook answers, n = it doesn't, - = not applicable (the hook can't be rigged). */
type Today = 'y' | 'n' | '-';
/** A cell where today's code disagrees with a P-rule: what the rule expects, and which rule. */
interface Rule {
  expect: 'y' | 'n';
  rule: string;
}
type Row = {
  cause: Cause;
  trait: Trait;
  today: Record<HookId, Today>;
  rules?: Partial<Record<HookId, Rule>>;
};

const row = (s: string): Record<HookId, Today> => {
  const cells = s.split(' ');
  if (cells.length !== HOOKS.length) throw new Error(`row "${s}" needs ${HOOKS.length} cells`);
  return Object.fromEntries(HOOKS.map((h, i) => [h, cells[i] as Today])) as Record<HookId, Today>;
};

const P1_STAIN: Rule = {
  expect: 'y',
  rule: 'P1: every arrival stains (push and Swap never call stainMarks today)',
};
const P5_FLIER_STAIN: Rule = { expect: 'n', rule: 'P5: fliers skip ground hooks (stain)' };
const P6_DRAW_JAR: Rule = {
  expect: 'y',
  rule: 'P6: a step-jar drawn under a standing unit opens on it, as Pitch drift does',
};
const P7 = (what: string): Rule => ({
  expect: 'y',
  rule: `P7: a drifted unit is a real arrival (${what})`,
});

//                    stepJar fuseJar stain markSpread bindEnters bindPushed wax fire
const MATRIX: readonly Row[] = [
  { cause: 'walk (member)', trait: 'land', today: row('y n y y y n y n') },
  { cause: 'walk (foe)', trait: 'land', today: row('y n y y y n y n') },
  {
    cause: 'walk (foe)',
    trait: 'flier',
    today: row('y n y y y n y n'),
    rules: { stain: P5_FLIER_STAIN },
  },
  { cause: 'walk (foe)', trait: 'swimmer', today: row('y n y y y n y n') },
  // P2: a walk enters only its landing; tiles walked through answer nothing. Bind *enters* rides
  // on the unit, so the landing (C1) answers it.
  { cause: 'walk through (foe)', trait: 'land', today: row('n n n n y n n n') },
  { cause: 'walk through (foe)', trait: 'flier', today: row('n n n n y n n n') },
  { cause: 'push', trait: 'land', today: row('y n n y y y y n'), rules: { stain: P1_STAIN } },
  { cause: 'push', trait: 'flier', today: row('y n n y y y y n') },
  { cause: 'push', trait: 'swimmer', today: row('y n n y y y y n'), rules: { stain: P1_STAIN } },
  // Anchored: held back (a crush), never moves; Bind *pushed* still answers the push attempt.
  { cause: 'push', trait: 'anchored', today: row('n n n n n y n n') },
  // P2: a push enters every tile it moves through.
  { cause: 'push through', trait: 'land', today: row('y n n y y y y n') },
  { cause: 'push through', trait: 'flier', today: row('y n n y y y y n') },
  { cause: 'slide', trait: 'land', today: row('y n n y y y y n'), rules: { stain: P1_STAIN } },
  { cause: 'slide', trait: 'swimmer', today: row('y n n y y y y n'), rules: { stain: P1_STAIN } },
  { cause: 'swap', trait: 'land', today: row('y n n y y n y n'), rules: { stain: P1_STAIN } },
  { cause: 'swap', trait: 'flier', today: row('y n n y y n y n') },
  { cause: 'swap', trait: 'swimmer', today: row('y n n y y n y n'), rules: { stain: P1_STAIN } },
  {
    cause: 'drift',
    trait: 'land',
    // Stain stays exempt for drift (city §5); Bind *pushed* and fire never answer a drift.
    today: row('n n n n n n n n'),
    rules: {
      stepJar: P7('opens the step-jar it lands on'),
      markSpread: P7('spreads its mark into a cloud'),
      bindEnters: P7('answers Bind enters'),
      wax: P7('Wax melts in fire it drifts into: the solvent hook runs first, P3'),
    },
  },
  // P2: Graphite's restore is not an arrival.
  { cause: 'restore', trait: 'land', today: row('n n n n n n n n') },
  { cause: 'restore', trait: 'flier', today: row('n n n n n n n n') },
  { cause: 'restore', trait: 'swimmer', today: row('n n n n n n n n') },
  { cause: 'restore', trait: 'anchored', today: row('n n n n n n n n') },
  // P6: a state arriving under a unit is not that unit arriving; only a step-jar answers.
  {
    cause: 'draw (object)',
    trait: 'land',
    today: row('n n n n n - n n'),
    rules: { stepJar: P6_DRAW_JAR },
  },
  {
    cause: 'draw (object)',
    trait: 'flier',
    today: row('n n n n n - n n'),
    rules: { stepJar: P6_DRAW_JAR },
  },
  {
    cause: 'draw (object)',
    trait: 'swimmer',
    today: row('n n n n n - n n'),
    rules: { stepJar: P6_DRAW_JAR },
  },
  {
    cause: 'draw (object)',
    trait: 'anchored',
    today: row('n n n n n - n n'),
    rules: { stepJar: P6_DRAW_JAR },
  },
  // A cloud doesn't float; a drifting stain doesn't ink the unit it floats under (city §5).
  { cause: 'drift (object)', trait: 'land', today: row('y n n - n - n n') },
  { cause: 'drift (object)', trait: 'flier', today: row('y n n - n - n n') },
  { cause: 'drift (object)', trait: 'swimmer', today: row('y n n - n - n n') },
  { cause: 'drift (object)', trait: 'anchored', today: row('y n n - n - n n') },
];

const word = (v: boolean | null): Today => (v === null ? '-' : v ? 'y' : 'n');

describe('arrival matrix (FD-1): cause × hook × trait', () => {
  for (const r of MATRIX) {
    describe(`${r.cause} × ${r.trait}`, () => {
      for (const hook of HOOKS) {
        const rule = r.rules?.[hook];
        const today = r.today[hook];
        if (!rule) {
          it(`${hook}: ${today}`, () => {
            expect(word(cell(r.cause, r.trait, hook))).toBe(today);
          });
          continue;
        }
        if (rule.expect === today)
          throw new Error(`${r.cause} × ${r.trait} × ${hook}: rule agrees`);
        // Today's result first, so a change that isn't the P-rule's still shows up as a diff.
        it(`${hook}: today ${today}`, () => {
          expect(word(cell(r.cause, r.trait, hook))).toBe(today);
        });
        it.fails(`${hook}: ${rule.expect} by ${rule.rule}`, () => {
          expect(word(cell(r.cause, r.trait, hook))).toBe(rule.expect);
        });
      }
    });
  }
});

describe('arrival matrix: movers that disagree with the P-rules outside the hook cells', () => {
  it('today: the Swap rune moves an anchored lamp-mother', () => {
    const s = board(ROWS('D M . .'));
    const r = draft(s, (ctx) => {
      const u = unitAt(ctx.s, at('B1'));
      if (!u) throw new Error('no lamp-mother');
      const t: Target = { kind: 'unit', unit: u.id };
      runAction(ctx, 'swap', t, null);
    });
    expect(r.events.some((e) => e.type === 'swapped')).toBe(true);
  });

  it.fails('P5 and party §1: an anchored unit is never swapped (it never moves)', () => {
    const s = board(ROWS('D M . .'));
    const r = draft(s, (ctx) => {
      const u = unitAt(ctx.s, at('B1'));
      if (!u) throw new Error('no lamp-mother');
      const t: Target = { kind: 'unit', unit: u.id };
      runAction(ctx, 'swap', t, null);
    });
    expect(r.events.some((e) => e.type === 'swapped')).toBe(false);
  });

  it('fliers, swimmers and the anchored are never carried by the current (K-9, P5)', () => {
    for (const token of ['mw>', 'ew>', 'Mw>']) {
      const r = draft(board(ROWS(`${token} w> . .`)), (ctx) => drift(ctx));
      expect(r.events.some((e) => e.type === 'drift')).toBe(false);
    }
  });
});

describe('arrival matrix: causes and rules that do not exist yet', () => {
  it.todo(
    'pull (AH): enters every tile moved through (P2); stains land units (P1); Bind pushed? (AH decides)',
  );
  it.todo(
    'hop (AH): landing only (P2): hopping over a step-jar does not open it, landing on one does',
  );
  it.todo(
    'basic Swap and a foe swap (AH): landing only, caster then target (P4); fliers and anchored foes cannot be swapped (party §1)',
  );
  it.todo('return to sender (IQ), gargoyle carry (BR): landing only (P2)');
  it.todo('barge cargo and board pieces (DK, CN): object arrivals through objectArrives (P6)');
  it.todo('runaway (party §0d): her Fuse jars also open when she steps onto them');
  it.todo(
    'fire (P8, Q1): no arrival effect; a later "entering fire burns at once" is one hook entry',
  );
  it.todo(
    'interruption (P4): a hook that kills, moves or holds the unit stops the remaining hooks of that arrival (walk runs stainMarks even after a step-jar moved the walker)',
  );
  it.todo(
    "push through a stain (P1 + P2): stain on the first tile entered, or the landing only? (FD-3 sets the stain hook's `answers`)",
  );
  it.todo(
    'habits (AH), writ tiles and district terrain (DK): registered hooks run after the core ones (P3)',
  );
});
