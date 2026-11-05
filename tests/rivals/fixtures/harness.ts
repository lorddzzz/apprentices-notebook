import type { MemberId } from '$data';
import { RIVALS, type RivalDef, type RivalId } from '$data/rivals';
import type { BattleSpec, BattleState, EnemyUnit } from '$engine';
import { runDraft } from '$engine/ctx';
import { registerGoal } from '$engine/rivals/goals';
import { rivalAct } from '$engine/rivals/resolve';
import { registerTrick } from '$engine/rivals/tricks';
import type { GoalDef, TrickDef } from '$engine/rivals/types';
import { spawnRival } from '$engine/rivals/unit';
import { board, withLattices } from '../../scenarios/harness';

/**
 * RV-14: the five test-only fixture rivals, each written only through the public authoring API
 * (`registerTrick`, `registerGoal`, a `RivalDef`). A real district instead lists its trick in its
 * engine module's `tricks`, its goals in `goals`, and its def in `RIVALS` with an `ENEMIES` shell
 * and a token; a fixture cannot add data, so it borrows the Lamplighter's board shell (`L`) and
 * swaps the rival state for its own def's (`fixtureBoard`).
 */

/** A fixture rival's whole authoring: its def, its trick and any district goals. */
export interface Fixture {
  def: RivalDef;
  trick: TrickDef;
  goals?: readonly GoalDef[];
}

/** A rival def with no kit: the trick is the whole fight (spells and routine may be added). */
export function fixtureDef(
  id: string,
  over: Partial<RivalDef> & Pick<RivalDef, 'trick'>,
): RivalDef {
  return {
    id: id as RivalId,
    name: id,
    token: 'L',
    district: 'canals',
    hp: 6,
    move: 0,
    elite: true,
    habitat: 'any',
    blurb: 'A test-only fixture rival (RV-14).',
    spells: [],
    routine: [],
    fallback: { damage: 1 },
    dryStrike: 'bite',
    page: null,
    ...over,
  };
}

/** Registers a fixture (trick, goals, def) and returns the undo, for `beforeAll`/`afterAll`. */
export function install(f: Fixture): () => void {
  const undo = [registerTrick(f.trick), ...(f.goals ?? []).map(registerGoal)];
  const table = RIVALS as Record<string, RivalDef>;
  table[f.def.id] = f.def;
  return () => {
    for (const u of undo) u();
    delete table[f.def.id];
  };
}

export const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u?.rival) throw new Error('no rival on the board');
  return u;
};

/**
 * A battle whose `L` is the fixture rival: its def's state (spells, `TrickDef.init`) and HP, and
 * its round-1 telegraph and mark planned again under that def. `lattices` arm the apprentices.
 */
export function fixtureBoard(
  ascii: string,
  def: RivalDef,
  opts: Partial<BattleSpec> & { lattices?: Partial<Record<MemberId, string>> } = {},
): BattleState {
  const { lattices, ...spec } = opts;
  const start = lattices ? withLattices(ascii, lattices, spec) : board(ascii, spec);
  return runDraft(start, (ctx) => {
    const e = rivalOf(ctx.s);
    e.rival = spawnRival(def);
    e.hp = def.hp;
    e.maxHp = def.hp;
    e.intent = null;
    rivalAct(ctx, e, 1, false);
  }).state;
}
