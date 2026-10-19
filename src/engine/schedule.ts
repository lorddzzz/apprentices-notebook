import type { Ctx } from './ctx';
import type { Scheduled } from './types';

/** The scheduled queue (E6): repeats, Wick, Graphite, Filings, Thunderhead, Pitch. */
export function schedule(_ctx: Ctx, _s: Scheduled): void {
  throw new Error('not implemented (E6)');
}
export function runScheduled(_ctx: Ctx, _when: Scheduled['when'], _owner?: string): void {
  throw new Error('not implemented (E6)');
}
