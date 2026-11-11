import { type BattleState, findUnit, label } from '$engine';
import { clockState, openClock } from '$engine/districts/inkQuarter/clock';

/**
 * The postmaster's clock writ as the heart's banner words it (IQ-18). Pure, read off the battle
 * state and the log: `open` while a writ stands; afterwards, for as long as he cannot serve
 * again, how it ended (`stunned` while his lost action is still owed).
 */

export type ClockBanner =
  | { kind: 'open'; left: number; seal: string | null; stamp: string; text: string }
  | { kind: 'stunned' | 'answered' | 'collected'; text: string };

type LogEvent = { type: string; data?: unknown };

const lastClockEvent = (log: readonly LogEvent[]): LogEvent | null => {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (
      e &&
      (e.type === 'inkQuarter:clockServed' ||
        e.type === 'inkQuarter:clockLifted' ||
        e.type === 'inkQuarter:clockCollected')
    ) {
      return e;
    }
  }
  return null;
};

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const marksOf = (e: LogEvent): number => {
  const d = e.data;
  return d && typeof d === 'object' && 'marks' in d && typeof d.marks === 'number' ? d.marks : 0;
};

export function clockBanner(s: BattleState, log: readonly LogEvent[] = []): ClockBanner | null {
  const w = openClock(s);
  if (w) {
    const left = Math.max(0, w.deadline - s.round);
    const sealUnit = findUnit(s, w.seal);
    const seal = sealUnit && sealUnit.hp > 0 ? label(sealUnit.pos) : null;
    const stamp = label(w.stamp);
    const when = left === 0 ? 'it collects at dusk' : plural(left, 'round');
    const breakIt = seal ? `break his seal (${seal})` : 'break his seal';
    return {
      kind: 'open',
      left,
      seal,
      stamp,
      text: `The postmaster's writ: ${breakIt} or stand on his stamp (${stamp}) — ${when}`,
    };
  }
  const st = clockState(s);
  if (st.stagger.length > 0) {
    return {
      kind: 'stunned',
      text: 'The postmaster is stunned: his writ was answered, he loses his next action',
    };
  }
  if (!Object.values(st.ready).some((r) => r > s.round)) return null;
  const last = lastClockEvent(log);
  if (last?.type === 'inkQuarter:clockLifted') {
    return { kind: 'answered', text: "The postmaster's writ is answered" };
  }
  if (last?.type === 'inkQuarter:clockCollected') {
    const n = marksOf(last);
    return {
      kind: 'collected',
      text: `The postmaster's writ was collected: ${n === 0 ? 'no marks to pay' : `${plural(n, 'mark')} paid`}`,
    };
  }
  return null;
}
