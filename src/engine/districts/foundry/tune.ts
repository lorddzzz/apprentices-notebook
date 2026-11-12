import { FOUNDRY_TUNING, isTone, TONES, type Tone } from '$data/districts/foundry';
import { type Ctx, emit, ref } from '../../ctx';
import type { Coord } from '../../grid';
import type { GoalDef, Outcome, TrickDef, TrickMark } from '../../rivals/types';
import { createRng, deriveSeed } from '../../rng';
import { settleRules } from '../../rules';
import type { BattleState, EnemyUnit } from '../../types';
import type { KitId } from '../types';
import { isHumming, pulseTiles, ringingBells, ringTone } from './ring';
import {
  type AnswerReason,
  initTune,
  parseTune,
  TUNE_RULE_ID,
  type TuneNoteEvent,
  type TuneState,
} from './types';

/**
 * The tune (foundry-plan P9, P10, P17; BF-9). The pure functions are the plan's contract: a seeded
 * four-note tune, the note called now, the answer that restarts it, and the Great Peal. The
 * Carillonneur's trick (`foundry:playsATune`) is the rival-kit mark that plays it: each enemy phase
 * it shows the called note and the tiles its bells would pulse; at the end of the round it rings
 * that tone (a real ring, through the settle points) or finds it answered. The tune lives on the
 * district rule `foundry:tune`; a board that does not list the rule plays the default tune and
 * writes the rule when the first note resolves.
 */

export const PLAYS_A_TUNE: KitId = 'foundry:playsATune';
export const RING_TRUE_GOAL: KitId = 'foundry:ringTrue';

/** Salts for `deriveSeed`: the first tune comes from the trip seed, each later one from its predecessor. */
const FIRST_SALT = 0x7a11;
const NEXT_SALT = 0x7a12;
/** The tune a board plays when nothing configured a seed (a Lab or test board). */
export const DEFAULT_TUNE_SEED = 0;

// ── Pure functions (P17) ────────────────────────────────

/**
 * P9: four tones, none more than twice, from `seed` (the trip seed; `deriveSeed` makes it
 * independent of every other draw). The same seed gives the same tune.
 */
export function newTune(seed: number): Tone[] {
  const rng = createRng(deriveSeed(seed, FIRST_SALT));
  const out: Tone[] = [];
  while (out.length < FOUNDRY_TUNING.tuneLength) {
    const open = TONES.filter(
      (t) => out.filter((x) => x === t).length < FOUNDRY_TUNING.maxPerToneInTune,
    );
    out.push(open[rng.int(0, open.length - 1)] ?? TONES[0]);
  }
  return out;
}

/** The note called now: the tone at the current index (a state with no tune calls low). */
export const calledNote = (t: TuneState): Tone => t.tune[t.at] ?? TONES[0];

/** P9: a note answered (humming, nothing to ring, or he cannot) restarts the tune at note 1 and is counted. */
export const answerNote = (t: TuneState, _reason: AnswerReason): TuneState => ({
  ...t,
  at: 0,
  answered: t.answered + 1,
});

/**
 * The tune after a Great Peal: a new one seeded from the old tune and the peals rung, so the whole
 * run is a function of the first seed (the state carries no seed of its own).
 */
function afterPeal(t: TuneState): TuneState {
  const stamp = t.tune.reduce((n, tone) => n * TONES.length + TONES.indexOf(tone), 0);
  return { ...t, tune: newTune(deriveSeed(stamp, NEXT_SALT + t.peals)), at: 0, peals: t.peals + 1 };
}

/**
 * P9: the Great Peal rings every tone that is not already humming and has a bell that can ring
 * (`cause: 'peal'`), then settles, so the tones hum and their pulses land. `source` is the ringer's
 * tile (default: the first bell that rings).
 */
export function greatPeal(ctx: Ctx, source?: Coord): void {
  const tones = TONES.filter((t) => !isHumming(ctx.s, t) && ringingBells(ctx.s, t).length > 0);
  emit(ctx, { type: 'foundry:greatPeal', data: { tones } });
  const from = source ?? (tones[0] ? ringingBells(ctx.s, tones[0])[0] : undefined);
  if (!from) return;
  for (const tone of tones) ringTone(ctx, tone, 'peal', null, from);
  settleRules(ctx);
}

// ── The rule's state ────────────────────────────────────

/** A fresh tune state: the trip's seed through `newTune`, or the default seed when none is given. */
export const startTune = (seed: number = DEFAULT_TUNE_SEED): TuneState => ({
  ...initTune(),
  tune: newTune(seed),
});

/** The tune rule's state on `s`; a board that does not list it, or lists it empty, plays the default tune. */
export function tuneOf(s: BattleState): TuneState {
  const own = parseTune(s.rules?.[TUNE_RULE_ID]);
  return own.tune.length === FOUNDRY_TUNING.tuneLength ? own : { ...own, tune: startTune().tune };
}

/**
 * `TUNE_RULE.init`: the config's `seed` (the heart's room setup passes the trip seed) starts the
 * tune; with none the state is empty and `tuneOf` plays the default tune until the first step.
 */
export function initTuneRule(config: unknown): TuneState {
  const seed = (config as { seed?: unknown } | null | undefined)?.seed;
  return typeof seed === 'number' ? startTune(seed) : initTune();
}

/** `TUNE_RULE.step`: a listed rule whose tune is missing or malformed starts the default one; else nothing. */
export function tuneStep(own: TuneState): TuneState {
  const t = parseTune(own);
  return t.tune.length === FOUNDRY_TUNING.tuneLength ? own : { ...t, tune: startTune().tune };
}

const writeTune = (ctx: Ctx, t: TuneState): void => {
  ctx.s.rules = { ...ctx.s.rules, [TUNE_RULE_ID]: t };
};

// ── The trick (P9, P10) ─────────────────────────────────

type NoteMark = { index: number; tone: Tone };
const noteOf = (m: TrickMark): NoteMark | null => {
  const d = m.data;
  if (typeof d !== 'object' || d === null || Array.isArray(d)) return null;
  const { index, tone } = d as { readonly [k: string]: unknown };
  return typeof index === 'number' && isTone(tone) ? { index, tone } : null;
};

/** P9: he cannot ring while stunned or held (silenced); death ends his marks already. */
const cannotRing = (e: EnemyUnit): boolean => e.stunned || e.held > 0;

/** Why the called `tone` is answered now, or null when it rings. */
function answerReason(s: BattleState, e: EnemyUnit, tone: Tone): AnswerReason | null {
  if (cannotRing(e)) return 'cannotRing';
  if (isHumming(s, tone)) return 'humming';
  return ringingBells(s, tone).length === 0 ? 'nothingToRing' : null;
}

function tuneNote(ctx: Ctx, e: EnemyUnit, index: number, tone: Tone, why: AnswerReason | null) {
  const ev: TuneNoteEvent = {
    type: 'foundry:tuneNote',
    unit: ref(e),
    data: { index, tone, answered: why },
  };
  emit(ctx, ev);
}

/**
 * A note resolved at the end of the round (after the foes act, before the round-end rules clear the
 * hum): answered, so the tune restarts; or rung through the settle points, so a ring of the tone
 * that came first this round has already made it hum. The fourth rung note is followed by the
 * Great Peal and a new tune.
 */
function playNote(ctx: Ctx, e: EnemyUnit): void {
  const t = tuneOf(ctx.s);
  const tone = calledNote(t);
  const why = answerReason(ctx.s, e, tone);
  tuneNote(ctx, e, t.at, tone, why);
  if (why) {
    writeTune(ctx, answerNote(t, why));
    return;
  }
  ringTone(ctx, tone, 'note', null, e.pos);
  settleRules(ctx);
  if (t.at + 1 < FOUNDRY_TUNING.tuneLength) {
    writeTune(ctx, { ...t, at: t.at + 1 });
    return;
  }
  greatPeal(ctx, e.pos);
  writeTune(ctx, afterPeal(t));
}

export const PLAYS_A_TUNE_TRICK: TrickDef<null> = {
  id: PLAYS_A_TUNE,
  name: 'plays a tune',
  init: () => null,
  mark: {
    timing: 'afterActions',
    /** The called note, always shown: the tiles its bells would pulse if it rang now. */
    plan(s) {
      const t = tuneOf(s);
      const tone = calledNote(t);
      return { data: { index: t.at, tone }, tiles: pulseTiles(s, tone) };
    },
    resolve(ctx, unit, _mark, own) {
      playNote(ctx, unit);
      return own;
    },
  },
  draw(state, _unit, shown) {
    const mark = 'tiles' in shown ? noteOf(shown) : null;
    const t = tuneOf(state);
    const tone = mark?.tone ?? calledNote(t);
    return {
      label: `note:${tone}`,
      tiles: 'tiles' in shown ? shown.tiles : [],
      units: [],
      sequence: [(mark?.index ?? t.at) + 1, FOUNDRY_TUNING.tuneLength],
    };
  },
  describe(shown) {
    const tone = 'tiles' in shown ? noteOf(shown)?.tone : null;
    return tone ? `rings the ${tone} note of his tune` : 'rings the next note of his tune';
  },
};

export const FOUNDRY_TRICKS: readonly TrickDef[] = [PLAYS_A_TUNE_TRICK];

// ── His routine goal ────────────────────────────────────

const parties = (o: Outcome): boolean => o.partyHarm > 0 || o.entered.length > 0;

/**
 * Ring true: a cast that lands on an apprentice (harm or a push) and costs neither him nor his own
 * friends anything. The ring a cast strikes is simulated whole, so a bell that would pulse a Ringer
 * or the Detuner makes the cast `allyHarm` and it is not chosen.
 */
const ringTrue: GoalDef = {
  id: RING_TRUE_GOAL,
  accepts: (o) => o.effect && o.selfHarm === 0 && o.allyHarm === 0 && parties(o),
  score: (o) => o.partyHarm + o.entered.length,
};

export const FOUNDRY_GOALS: readonly GoalDef[] = [ringTrue];
