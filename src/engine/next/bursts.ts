import type { Coord } from '../grid';
import type { Ctx } from './ctx';
import type { Flow } from './model';

/** Spark bursts what's on a layer of a tile (E2, design §4.3). */
export function burstAt(_ctx: Ctx, _at: Coord, _layer: 'unit' | 'tile', _flow: Flow | null): void {
  throw new Error('not implemented (E2)');
}
