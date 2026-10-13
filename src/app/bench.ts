import { ASPECTS, RECIPES, RUNE_IDS, type RuneId, SOLVENT_IDS, type SolventId } from '$data';
import {
  type Action,
  type ActionResult,
  type Attempt,
  applyAction,
  createBattle,
  distil,
  inkCost,
  type Profile,
  recordTrial,
  scenarioSpec,
  type TrialResult,
  trial,
  trialKey,
  trialLattice,
} from '$engine';
import type { ShelfSlot } from './study';

/** The Bench's pure reducer: slots, trial, commit (design research-and-mastery §3, §7). */

export type SlotName = 'left' | 'right' | 'solvent';
export const SLOT_NAMES: readonly SlotName[] = ['left', 'right', 'solvent'];

export interface BenchState {
  left: RuneId | null;
  right: RuneId | null;
  solvent: SolventId | null;
  /** The slot whose picker is open. */
  picking: SlotName | null;
  /** The last trial's result; cleared whenever a slot changes. */
  result: TrialResult | null;
}

export const EMPTY_BENCH: BenchState = {
  left: null,
  right: null,
  solvent: null,
  picking: null,
  result: null,
};

// ── The P11 gate ──

/** The Bench shows in the Study once the profile owns a solvent or has any bench progress; it never closes again. */
export function benchUnlocked(p: Profile): boolean {
  return (
    SOLVENT_IDS.some((id) => p.solvents[id] > 0) ||
    p.bench.known.length > 0 ||
    p.bench.trials.length > 0
  );
}

// ── Pickers ──

/** A solvent kind the player has held: owned now, tried in a trial, or written with. */
export function solventSeen(p: Profile, id: SolventId): boolean {
  return (
    p.solvents[id] > 0 ||
    p.bench.trials.some((k) => k.endsWith(`+${id}`)) ||
    RECIPES.some((r) => p.bench.known.includes(r.id) && r.solvent === id)
  );
}

/** Solvents that can go in the slot: owned ones, and kinds seen before (a trial is free). */
export function solventChoices(p: Profile): { id: SolventId; count: number }[] {
  return SOLVENT_IDS.filter((id) => solventSeen(p, id)).map((id) => ({
    id,
    count: p.solvents[id],
  }));
}

/** The rune shelf for the parent picker: every rune, usable when a copy is in the collection. */
export function benchShelf(p: Profile): ShelfSlot[] {
  return RUNE_IDS.map((rune) => {
    const own = p.collection[rune];
    return {
      rune,
      known: own > 0,
      owned: own,
      free: own,
      cost: inkCost(rune),
      usable: own > 0,
      affordable: true,
      reason: own > 0 ? null : 'Not found yet',
    };
  });
}

// ── Slot reducers ──

export function openSlot(s: BenchState, slot: SlotName): BenchState {
  return { ...s, picking: s.picking === slot ? null : slot };
}

export function closePicker(s: BenchState): BenchState {
  return { ...s, picking: null };
}

/** Puts a rune in a parent slot (a copy must be in the collection). Any change clears the result. */
export function pickRune(
  s: BenchState,
  p: Profile,
  slot: 'left' | 'right',
  rune: RuneId,
): BenchState {
  if (p.collection[rune] < 1) return s;
  return { ...s, [slot]: rune, picking: null, result: null };
}

export function pickSolvent(s: BenchState, p: Profile, solvent: SolventId): BenchState {
  if (!solventSeen(p, solvent)) return s;
  return { ...s, solvent, picking: null, result: null };
}

export function clearSlot(s: BenchState, slot: SlotName): BenchState {
  return { ...s, [slot]: null, picking: null, result: null };
}

/** The attempt the slots hold, or null while one is empty. */
export function attemptOf(s: BenchState): Attempt | null {
  if (!s.left || !s.right || !s.solvent) return null;
  return { left: s.left, right: s.right, solvent: s.solvent };
}

// ── Trial and commit ──

/**
 * Resonance for an attempt. Undiscovered recipes are scored as in the design; a recipe already in
 * the notebook still scores 6 when matched exactly, so it can be written again (plan P9).
 */
export function resonance(p: Profile, a: Attempt): TrialResult {
  const fresh = trial(a, RECIPES, p.bench.known);
  if (fresh.score === 6) return fresh;
  const again = trial(a, RECIPES, []);
  return again.score === 6 ? again : fresh;
}

export const alreadyTried = (p: Profile, a: Attempt): boolean =>
  p.bench.trials.includes(trialKey(a));

export interface TrialOutcome {
  state: BenchState;
  profile: Profile;
  /** The attempt was already in `bench.trials` (nothing new recorded). */
  repeat: boolean;
}

/** A free trial: scores the attempt and remembers it. Does nothing until all three slots are filled. */
export function runTrial(s: BenchState, p: Profile): TrialOutcome {
  const a = attemptOf(s);
  if (!a) return { state: s, profile: p, repeat: false };
  return {
    state: { ...s, picking: null, result: resonance(p, a) },
    profile: recordTrial(p, a),
    repeat: alreadyTried(p, a),
  };
}

/** Write in ink: needs an exact trial, a copy of each parent and one solvent. */
export function canCommit(s: BenchState, p: Profile): boolean {
  const a = attemptOf(s);
  return (
    a !== null &&
    s.result?.margin === 'exact' &&
    p.solvents[a.solvent] >= 1 &&
    p.collection[a.left] >= 1 &&
    p.collection[a.right] >= 1
  );
}

export interface CommitOutcome {
  state: BenchState;
  profile: Profile;
  /** The rune written, or null when the commit was refused. */
  rune: RuneId | null;
  /** The recipe was new to the notebook. */
  first: boolean;
}

export function commit(s: BenchState, p: Profile): CommitOutcome {
  const a = attemptOf(s);
  const recipe = RECIPES.find((r) => r.id === s.result?.recipe);
  if (!a || !recipe || !canCommit(s, p)) return { state: s, profile: p, rune: null, first: false };
  return {
    // The slots stay; the result is cleared so Write must be earned again with a fresh trial.
    state: { ...s, result: null },
    profile: distil(p, a),
    rune: recipe.result,
    first: !p.bench.known.includes(recipe.id),
  };
}

// ── Margin line ──

/** The line in the margin for a result: the weakest slot's gap, or the end of the search. */
export function marginLine(r: TrialResult): string {
  if (r.margin === 'exact') return 'it is written';
  if (r.margin === 'none-left') return 'nothing left to find here';
  return ASPECTS[r.margin].margin;
}

// ── The trial stage ──

const TRIAL_MEMBER = 'draughtsman';

/** The stage before both parents are chosen: the caster and a dummy. */
export function emptyStage(): ActionResult {
  return createBattle(
    scenarioSpec(
      { title: 'The bench', board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n') },
      { lab: true },
    ),
  );
}

/** The cast that plays the trial (the source sits at lattice cell 0,1; the dummy is to its right). */
export const TRIAL_CAST: Action = {
  type: 'cast',
  unit: TRIAL_MEMBER,
  spell: '0,1',
  aim: { kind: 'dir', dir: 'right' },
};

/** The trial stage for an attempt: the board and lattice from `trialLattice`, ready to cast. */
export function trialStage(a: Attempt): ActionResult {
  const { board, lattice } = trialLattice(a);
  return createBattle(
    scenarioSpec(
      { title: 'The bench', board, lattices: { [TRIAL_MEMBER]: lattice } },
      { lab: true },
    ),
  );
}

/** Plays the whole trial in one go (tests; the screen animates the same cast). */
export function playTrial(a: Attempt): ActionResult {
  return applyAction(trialStage(a).state, TRIAL_CAST);
}
