import type { BoardSpec } from '../notation';
import { notBuilt } from './stub';
import type { GenInput, GenIssue, GenResult, GenSpec } from './types';

/** P8-P10: one room from the trip seed, bot-tested, with the safe fallback. First built by EN-S1, finished by EN-2. */
export function generateRoom(_input: GenInput): GenResult {
  return notBuilt('EN-S1');
}

/** P9: every guardrail as a test oracle; empty means the layout is fair to offer. EN-S1, finished by EN-2. */
export function checkGenerated(_layout: BoardSpec, _spec: GenSpec): GenIssue[] {
  return notBuilt('EN-S1');
}
