import type { Coord } from '$engine';
import type { Json } from '$engine/districts/types';

/** Reading a trick's plain `Json` state and data back (what a district's trick file would keep). */

export const obj = (j: Json | undefined): { readonly [k: string]: Json } =>
  j && typeof j === 'object' && !Array.isArray(j) ? (j as { readonly [k: string]: Json }) : {};

export const num = (j: Json | undefined, k: string, or = 0): number => {
  const v = obj(j)[k];
  return typeof v === 'number' ? v : or;
};

export const str = (j: Json | undefined, k: string): string | null => {
  const v = obj(j)[k];
  return typeof v === 'string' ? v : null;
};

export const coordOf = (j: Json | undefined): Coord | null => {
  const { x, y } = obj(j);
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

export const json = (c: Coord): Json => ({ x: c.x, y: c.y });
