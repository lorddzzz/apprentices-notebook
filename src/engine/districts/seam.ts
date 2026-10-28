import { CODEX, type KindId } from '$data';
import { MARGINALIA_HANDS } from '$data/districts/seam';
import type { Profile } from '../types';
import type { DistrictModule, StepId } from './types';

/** The Seam's module: empty. A plain district needs no rules, pieces or trip hooks (P1). */
export const SEAM_MODULE: DistrictModule = { id: 'seam' };

// ── The Marginalia's hands (SM P2; SM-1 registers the steps) ──
/** A hand's step id: `seam:write:<kind>`. */
export type HandStepId = `seam:write:${KindId}`;
export const handStep = (kind: KindId): HandStepId => `seam:write:${kind}`;
/** The Marginalia's script, in cycle order (`EnemyScript.steps`, `standIn: false`). */
export const MARGINALIA_STEPS: readonly (HandStepId & StepId)[] = MARGINALIA_HANDS.map(handStep);

// ── The margins answer (SM P12; SM-12 builds the triggers) ──
/** The note a codex page shows: the first, or the owner's answer once it has come. */
export interface NoteView {
  text: string;
  answered: boolean;
}
/**
 * The note to show on a codex page. Nothing answers before the Marginalia falls; then a page's
 * `answer` shows once its `when` holds. Until SM-12, always the first note.
 */
export function noteFor(_p: Profile, entryId: string): NoteView {
  const entry = CODEX.find((e) => e.id === entryId);
  if (!entry) throw new Error(`noteFor: unknown codex entry '${entryId}'`);
  return { text: entry.ownerNote, answered: false };
}
