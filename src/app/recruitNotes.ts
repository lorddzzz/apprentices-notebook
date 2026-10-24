import { APPRENTICES, type ApprenticeId } from '$data';
import type { Profile } from '$engine';
import { noteMilestone } from '$engine/recruits';
import { namedTitle } from './describe';
import { type CardView, cardOf } from './study';

/**
 * RC-7: the note under the attic door and the trip page's "joined" line. The engine decides who
 * knocked (`profile.recruits.notes`) and which milestone she read about (`noteMilestone`); this
 * file only finds the words.
 */

export interface NoteView {
  id: ApprenticeId;
  name: string;
  /** What the note says, in her voice. */
  text: string;
  /** Her card for the welcome sheet; she is not in the household yet, so no seat. */
  card: CardView;
}

/** The note's words (P12): the first named idiom, or the proven invention's own name; fixed text otherwise. */
export function noteText(p: Profile, id: ApprenticeId): string {
  const milestone = noteMilestone(p, id);
  if (milestone === null) return 'I have read your notebook. May I come in?';
  // The Copyist's milestone is a codex key; the exile's is the invention's own name already.
  return milestone.startsWith('idiom:')
    ? `I read about the ${namedTitle(milestone)} you lit. May I come in?`
    : `I read about your ${milestone}. May I come in?`;
}

/** Notes under the door, oldest first. */
export function notesUnderDoor(p: Profile): NoteView[] {
  return (p.recruits?.notes ?? []).map((id) => ({
    id,
    name: APPRENTICES[id].name,
    text: noteText(p, id),
    card: cardOf(p, id),
  }));
}

export interface JoinedHighlight {
  kind: 'joined';
  title: string;
  text: string;
}

/** Trip-page lines for whoever joined the household on this homecoming. */
export function joinedHighlights(ids: readonly ApprenticeId[]): JoinedHighlight[] {
  return ids.map((id) => ({
    kind: 'joined',
    title: 'Someone joined the household',
    text: `${APPRENTICES[id].name} came home with you and waits on the bench.`,
  }));
}

/** Who is in `after` but not `before`. */
export const newcomers = (before: Profile, after: Profile): ApprenticeId[] =>
  after.household.members.filter((m) => !before.household.members.includes(m));
