import { INTERACTION_IDS, type ScenarioDef } from '$data';
import { createBattle, scenarioSpec } from '$engine';
import { BattleSession } from './battle.svelte';
import { fallbackLattices, resolveScenario } from './lab';

/** The Lab: free play on any scenario, charges never spent. U5 adds board and lattice editing. */
export class LabStore {
  session = $state.raw<BattleSession | null>(null);
  scenario = $state.raw<ScenarioDef | null>(null);

  /** Loads a scenario by id. Returns the id it could not find (the sandbox loads instead), or null. */
  load(id: string): string | null {
    const { def, unknown } = resolveScenario(id);
    this.session?.dispose();
    const init = createBattle(scenarioSpec(def, { lab: true, lattices: fallbackLattices() }));
    // The Lab is the workshop: every interaction is named in previews.
    this.session = new BattleSession(init, 'lab', { known: () => INTERACTION_IDS, intro: true });
    this.scenario = def;
    return unknown;
  }

  reset(): void {
    if (this.scenario) this.load(this.scenario.id);
  }
}
