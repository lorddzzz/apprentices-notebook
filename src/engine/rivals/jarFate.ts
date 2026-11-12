import type { Ctx } from '../ctx';
import { findUnit } from '../queries';
import type { Jar } from '../types';

/**
 * Notes how a jar left the board on its rival owner, so a wick locked on it names the reason
 * exactly (FU-3). Read by `lockStatus`; a jar with no id (hand-laid) is not noted.
 */
export function noteJarFate(ctx: Ctx, jar: Jar, why: 'opened' | 'crumbled'): void {
  const owner = findUnit(ctx.s, jar.owner);
  if (owner?.kind !== 'enemy' || !owner.rival || jar.id === undefined) return;
  owner.rival.jarsLost = { ...owner.rival.jarsLost, [jar.id]: why };
}
