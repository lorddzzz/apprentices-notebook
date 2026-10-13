import {
  type Aspect,
  type RecipeDef,
  RUNES,
  type RuneFamily,
  type RuneId,
  SOLVENTS,
  type SolventId,
} from '$data';
import { inkCost } from './lattice';

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
export function trialKey(a: Attempt): string {
  const [first, second] = [a.left, a.right].sort();
  return `${first}+${second}+${a.solvent}`;
}

type Slot = 'left' | 'right' | 'solvent';
const SLOT_ORDER: readonly Slot[] = ['left', 'right', 'solvent'];

interface Scored {
  slots: Record<Slot, number>;
  total: number;
  attempt: Attempt;
}

function scoreParent(rune: RuneId, target: RuneId): number {
  if (rune === target) return 2;
  const have = RUNES[rune].aspects;
  return RUNES[target].aspects.some((x) => have.includes(x)) ? 1 : 0;
}

function scoreSolvent(solvent: SolventId, recipe: RecipeDef): number {
  if (solvent === recipe.solvent) return 2;
  return RUNES[recipe.result].aspects.includes(SOLVENTS[solvent].aspect) ? 1 : 0;
}

function scoreAssignment(a: Attempt, recipe: RecipeDef): Scored {
  const slots = {
    left: scoreParent(a.left, recipe.left),
    right: scoreParent(a.right, recipe.right),
    solvent: scoreSolvent(a.solvent, recipe),
  };
  return { slots, total: slots.left + slots.right + slots.solvent, attempt: a };
}

/** Both parent assignments; the better one wins, ties keep the unswapped. */
function bestAssignment(a: Attempt, recipe: RecipeDef): Scored {
  const straight = scoreAssignment(a, recipe);
  const swapped = scoreAssignment({ ...a, left: a.right, right: a.left }, recipe);
  return swapped.total > straight.total ? swapped : straight;
}

/** The first aspect of the slot's target that the ingredient lacks (the target's first if none). */
function gapAspect(scored: Scored, recipe: RecipeDef, slot: Slot): Aspect {
  const target = slot === 'solvent' ? RUNES[recipe.result].aspects : RUNES[recipe[slot]].aspects;
  const carried: readonly Aspect[] =
    slot === 'solvent'
      ? [SOLVENTS[scored.attempt.solvent].aspect]
      : RUNES[scored.attempt[slot]].aspects;
  return target.find((x) => !carried.includes(x)) ?? target[0];
}

export function trial(
  a: Attempt,
  recipes: readonly RecipeDef[],
  known: readonly string[],
): TrialResult {
  let best: { scored: Scored; recipe: RecipeDef } | null = null;
  for (const recipe of recipes) {
    if (known.includes(recipe.id)) continue;
    const scored = bestAssignment(a, recipe);
    if (best === null || scored.total > best.scored.total) best = { scored, recipe };
  }
  if (best === null) return { score: 0, margin: 'none-left', recipe: null };
  const { scored, recipe } = best;
  if (scored.total === 6) return { score: 6, margin: 'exact', recipe: recipe.id };
  let weakest: Slot = 'left';
  for (const slot of SLOT_ORDER) if (scored.slots[slot] < scored.slots[weakest]) weakest = slot;
  return { score: scored.total, margin: gapAspect(scored, recipe, weakest), recipe: recipe.id };
}

function tornSentence(recipe: RecipeDef): string | null {
  if (recipe.torn === null) return null;
  const parts: Record<Slot, string> = {
    left: RUNES[recipe.left].name,
    right: RUNES[recipe.right].name,
    solvent: SOLVENTS[recipe.solvent].name,
  };
  parts[recipe.torn] = '??';
  return `${parts.left} + ${parts.right} + ${parts.solvent}`;
}

export function silhouettes(recipes: readonly RecipeDef[], known: readonly string[]): Silhouette[] {
  return recipes
    .filter((r) => !known.includes(r.id))
    .map((r) => ({
      recipe: r.id,
      family: RUNES[r.result].family,
      aspects: RUNES[r.result].aspects,
      ink: inkCost(r.result),
      parents: [RUNES[r.left].family, RUNES[r.right].family] as const,
      torn: tornSentence(r),
    }));
}

const TRIAL_WIDTH = 5;

function isSource(id: RuneId): boolean {
  return RUNES[id].family === 'source';
}

function isAreaRune(id: RuneId): boolean {
  return id === 'splash' || RUNES[id].scale === 'footprint';
}

function token(id: RuneId): string {
  return RUNES[id].token + (RUNES[id].arrow ? '>' : '');
}

/**
 * The trial stage (plan P8): the caster at the left edge, a dummy two tiles away (a column of three
 * for area runes), and the Draughtsman's 5x3 lattice with the pair wired after the source.
 * A Source parent leads (the left one if both are); otherwise a Bolt leads.
 */
export function trialLattice(a: Attempt): { board: string; lattice: string } {
  const spell: RuneId[] =
    isSource(a.right) && !isSource(a.left)
      ? [a.right, a.left]
      : isSource(a.left)
        ? [a.left, a.right]
        : ['bolt', a.left, a.right];
  const area = spell.some(isAreaRune);
  const board = [0, 1, 2]
    .map((y) =>
      Array.from({ length: TRIAL_WIDTH }, (_, x) => {
        if (x === 0 && y === 1) return 'D';
        if (x === 2 && (y === 1 || area)) return 'd';
        return '.';
      }).join(' '),
    )
    .join('\n');
  const middle = [...spell.map(token), ...Array<string>(TRIAL_WIDTH - spell.length).fill('.')];
  const lattice = ['. . . . .', middle.join(' '), 'x . . . x'].join('\n');
  return { board, lattice };
}
