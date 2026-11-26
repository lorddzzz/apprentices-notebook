import { LINES, type LineId } from '$data';
import type { GameEvent } from '$engine';
import { namedTitle } from './describe';
import { HOLD_MS, type PlaybackSpeed } from './timing';

export interface KnowledgeSnapshot {
  named: ReadonlySet<string>;
  witnessed: ReadonlySet<LineId> | null;
}

export const NO_FIRSTS: KnowledgeSnapshot = { named: new Set(), witnessed: null };

export type FirstMark = { kind: 'named'; id: string } | { kind: 'line'; id: LineId };

export interface Beat {
  kind: 'ordinary' | 'burst' | 'compound' | 'first';
  name: string;
  first: boolean;
}

export function beatOf(
  event: GameEvent,
  knowledge: KnowledgeSnapshot,
  first: readonly FirstMark[] = event.line &&
  knowledge.witnessed &&
  !knowledge.witnessed.has(event.line)
    ? [{ kind: 'line', id: event.line }]
    : [],
): Beat {
  if (event.type === 'burst') {
    return { kind: 'burst', name: namedTitle(`burst:${event.burst}`), first: first.length > 0 };
  }
  if (event.type === 'mixed') {
    return {
      kind: 'compound',
      name: namedTitle(`compound:${event.compound}`),
      first: first.length > 0,
    };
  }
  const mark = first[0];
  if (mark) {
    const name =
      mark.kind === 'named'
        ? namedTitle(mark.id)
        : (LINES.find(({ id }) => id === mark.id)?.text ?? mark.id);
    return { kind: 'first', name, first: true };
  }
  return { kind: 'ordinary', name: '', first: false };
}

export function holdMs(speed: PlaybackSpeed, scale: number, reduced: boolean): number {
  return (reduced ? HOLD_MS.reduced : HOLD_MS[speed]) * scale;
}
