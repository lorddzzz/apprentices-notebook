import { MEMBER_IDS, MEMBERS, type MemberId, SCENARIOS, type ScenarioDef } from '$data';
import { applyAction, createBattle } from './battle';
import { cloneData } from './clone';
import { describeLog, type GameEvent } from './events';
import { assertImportStructure, importBudget } from './importPolicy';
import { assertCompilationWork, compileLattice } from './lattice';
import { parseBoard, parseLattice } from './notation';
import type {
  ActionResult,
  BattleSpec,
  BattleState,
  InventionLibrary,
  Lattice,
  PartyInit,
  Spell,
} from './types';

/**
 * Lab and scenario battles: a board plus per-member lattices (ASCII), compiled with each member's
 * lean. Scenario lattices win; `opts.lattices` (the profile's, in the Lab) fill the rest.
 */

export type ScenarioSpec =
  | ScenarioDef
  | (Partial<BattleSpec> & { board: string; lattices?: Partial<Record<MemberId, string>> });

export interface ScenarioOptions {
  lab?: boolean; // charges are not spent
  seed?: number;
  inventions?: InventionLibrary; // the household's inventions (compiled in, and run from the battle)
  lattices?: Partial<Record<MemberId, Lattice>>; // fallback for members the scenario leaves out
}

export function spellsFor(
  member: MemberId,
  lattice: Lattice | string,
  inventions: InventionLibrary = {},
): Spell[] {
  const budget = typeof lattice === 'string' ? importBudget() : undefined;
  const l = typeof lattice === 'string' ? parseLattice(lattice, { inventions }, budget) : lattice;
  if (budget) assertCompilationWork(l, {}, inventions, budget);
  return compileLattice(l, {}, inventions, MEMBERS[member].lean).spells;
}

/** The BattleSpec a scenario stands for (use `createBattle` on it for the creation events). */
export function scenarioSpec(def: ScenarioSpec, opts: ScenarioOptions = {}): BattleSpec {
  const budget = importBudget();
  assertImportStructure(def, budget);
  // Options are trusted engine context; profile fallback pages are not external imports.
  parseBoard(def.board, budget);
  const party: Partial<Record<MemberId, PartyInit>> = { ...('party' in def ? def.party : {}) };
  const inventions = opts.inventions ?? ('inventions' in def ? def.inventions : undefined);
  const lattices: Partial<Record<MemberId, Lattice>> = {};
  for (const m of MEMBER_IDS) {
    const lattice = def.lattices?.[m] ?? opts.lattices?.[m];
    if (lattice !== undefined) {
      lattices[m] =
        typeof lattice === 'string' ? parseLattice(lattice, { inventions }, budget) : lattice;
    }
  }
  // Finish preflight of every external page before retaining any compiled output.
  for (const m of MEMBER_IDS) {
    const lattice = lattices[m];
    if (lattice && def.lattices?.[m] !== undefined)
      assertCompilationWork(lattice, {}, inventions ?? {}, budget);
  }
  // Trusted fallback pages have no external work limit.
  for (const m of MEMBER_IDS) {
    const lattice = lattices[m];
    if (lattice) party[m] = { ...party[m], spells: spellsFor(m, lattice, inventions) };
  }
  const spec: BattleSpec = {
    title: def.title ?? 'Lab',
    board: def.board,
    seed: opts.seed ?? ('seed' in def && def.seed !== undefined ? def.seed : 1),
    party,
    lab: opts.lab ?? ('lab' in def ? def.lab : false),
  };
  if (inventions) spec.inventions = inventions;
  if (def.hp) spec.hp = def.hp;
  if (def.intents) spec.intents = def.intents;
  if ('pins' in def && def.pins) spec.pins = def.pins;
  if ('edge' in def && def.edge) spec.edge = def.edge;
  return spec;
}

/** A battle ready to play from a scenario or Lab spec. */
export function scenarioBattle(def: ScenarioSpec, opts: ScenarioOptions = {}): BattleState {
  return createBattle(scenarioSpec(def, opts)).state;
}

/**
 * Plays a scenario's demo actions (Lab mode by default). `events`/`lines` cover the demo only,
 * which is what `ScenarioDef.expected` lists.
 */
export function runScenario(
  def: ScenarioDef,
  opts: ScenarioOptions = {},
): { state: BattleState; events: GameEvent[]; lines: string[] } {
  let state = scenarioBattle(def, { lab: true, ...opts });
  const events: GameEvent[] = [];
  for (const action of def.demo) {
    const r: ActionResult = applyAction(state, action);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events, lines: describeLog(events) };
}

export function scenarioById(id: string): ScenarioDef | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}

/** Lab edit: swaps a member's lattice, recompiles its spells and refills every charge. */
export function labSetLattice(
  state: BattleState,
  member: MemberId,
  lattice: Lattice | string,
): BattleState {
  const spells = spellsFor(member, lattice, state.inventions);
  const s = cloneData(state);
  const m = s.units.find((u) => u.kind === 'member' && u.def === member);
  if (m?.kind !== 'member') throw new Error(`${MEMBERS[member].name} is not on the board`);
  m.spells = spells;
  m.charges = Object.fromEntries(spells.map((sp) => [sp.key, sp.charges]));
  return s;
}
