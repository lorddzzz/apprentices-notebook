import type { Aspect, RecipeDef, RuneFamily, RuneId, SolventId } from '$data';

/**
 * The Bench (design research-and-mastery §3): resonance scoring of a two-rune + solvent attempt
 * against the undiscovered recipes. Pure and deterministic, no RNG.
 */

export interface Attempt {
  left: RuneId;
  right: RuneId;
  solvent: SolventId;
}

export interface TrialResult {
  score: number; // 0..6, shown as pips
  margin: Aspect | 'exact' | 'none-left'; // the weakest slot's gap aspect
  recipe: string | null; // the best-scoring undiscovered recipe (never shown to the player unless exact)
}

export interface Silhouette {
  recipe: string;
  family: RuneFamily; // the result's family
  aspects: readonly [Aspect, Aspect];
  ink: number;
  parents: readonly [RuneFamily, RuneFamily];
  torn: string | null; // the owner's sentence with one slot torn out: "Oil + Spark + ??"
}

/** "left+right+solvent" with the parents sorted, so swapped parents share a key. */
export function trialKey(_a: Attempt): string {
  throw new Error('not implemented (A3)');
}

export function trial(
  _a: Attempt,
  _recipes: readonly RecipeDef[],
  _known: readonly string[],
): TrialResult {
  throw new Error('not implemented (A3)');
}

export function silhouettes(
  _recipes: readonly RecipeDef[],
  _known: readonly string[],
): Silhouette[] {
  throw new Error('not implemented (A3)');
}

/** The trial stage (plan P8) as board and lattice ASCII, ready for `scenarioSpec`-style use. */
export function trialLattice(_a: Attempt): { board: string; lattice: string } {
  throw new Error('not implemented (A3)');
}
