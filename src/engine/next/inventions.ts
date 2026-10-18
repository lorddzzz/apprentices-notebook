import type {
  BindEvent,
  InventionDef,
  InventionId,
  MethodId,
  Role,
  RuneId,
} from '$data/next/types';
import type { Ctx } from './ctx';
import type { Flow, Target } from './model';

export type InventionLibrary = Readonly<Record<InventionId, InventionDef>>;
/** What the household knows: what the Bench may use (design §6.1). */
export interface KnownSet {
  runes: readonly RuneId[];
  methods: readonly MethodId[];
  events: readonly BindEvent[];
  inventions: InventionLibrary;
}

/** Why a combination doesn't fit ("a Shape has nothing to store"), or null if it does (E7). */
export function inventionIssue(_def: InventionDef, _known: KnownSet): string | null {
  throw new Error('not implemented (E7)');
}
export function inventionRole(_def: InventionDef, _lib: InventionLibrary): Role {
  throw new Error('not implemented (E7)');
}
export function headlineOf(_def: InventionDef, _lib: InventionLibrary): string {
  throw new Error('not implemented (E7)');
}
export function inventionInk(_def: InventionDef, _lib: InventionLibrary): number {
  throw new Error('not implemented (E7)');
}
export function runInvention(_ctx: Ctx, _id: InventionId, _t: Target, _flow: Flow): void {
  throw new Error('not implemented (E7)');
}
