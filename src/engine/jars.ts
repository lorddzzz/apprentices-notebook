import type { Ctx } from './ctx';
import type { Coord } from './grid';
import type { Hook } from './hooks';
import type { Jar } from './types';

/** Jars (E6): one per owner, opened by a step or at dusk (design §7). */
export function sealJar(_ctx: Ctx, _at: Coord, _jar: Jar): void {
  throw new Error('not implemented (E6)');
}
export function openJar(_ctx: Ctx, _at: Coord): void {
  throw new Error('not implemented (E6)');
}
/** Opens step-jars when a unit enters their tile. No-op until E6. */
export function onHook(_ctx: Ctx, _h: Hook): void {}
