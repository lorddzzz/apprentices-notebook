import { MEMBER_IDS, MEMBERS, type MemberId, SCENARIOS, type ScenarioDef } from '$data';
import { applyAction, createBattle } from './battle';
import { describeLog, type GameEvent } from './events';
import { compileLattice } from './lattice';
import { parseLattice } from './notation';
import type { ActionResult, BattleSpec, BattleState, Lattice, PartyInit, Spell } from './types';

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
  lattices?: Partial<Record<MemberId, Lattice>>; // fallback for members the scenario leaves out
}

export function spellsFor(member: MemberId, lattice: Lattice | string): Spell[] {
  const l = typeof lattice === 'string' ? parseLattice(lattice) : lattice;
  return compileLattice(l, {}, {}, MEMBERS[member].lean).spells;
}

/** The BattleSpec a scenario stands for (use `createBattle` on it for the creation events). */
export function scenarioSpec(def: ScenarioSpec, opts: ScenarioOptions = {}): BattleSpec {
  const party: Partial<Record<MemberId, PartyInit>> = { ...('party' in def ? def.party : {}) };
  for (const m of MEMBER_IDS) {
    const lattice = def.lattices?.[m] ?? opts.lattices?.[m];
    if (lattice !== undefined) party[m] = { ...party[m], spells: spellsFor(m, lattice) };
  }
  const spec: BattleSpec = {
    title: def.title ?? 'Lab',
    board: def.board,
    seed: opts.seed ?? ('seed' in def && def.seed !== undefined ? def.seed : 1),
    party,
    lab: opts.lab ?? ('lab' in def ? def.lab : false),
  };
  if (def.hp) spec.hp = def.hp;
  if (def.intents) spec.intents = def.intents;
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
  const spells = spellsFor(member, lattice);
  const s = structuredClone(state);
  const m = s.units.find((u) => u.kind === 'member' && u.def === member);
  if (m?.kind !== 'member') throw new Error(`${MEMBERS[member].name} is not on the board`);
  m.spells = spells;
  m.charges = Object.fromEntries(spells.map((sp) => [sp.key, sp.charges]));
  return s;
}
