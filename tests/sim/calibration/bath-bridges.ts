import { spanVariantPool } from '$data/districts/bridges';
import type { Adapter } from './runner';

export const baths: Adapter = { name: 'baths', district: 'bathhouses', axes: ['authored'] };
export const bridges: Adapter = {
  name: 'bridges',
  district: 'bridges',
  axes: ['sound', 'crumbling'],
  variants: (room, axis) => spanVariantPool(room, axis === 'sound' ? 'sound' : 'crumbling'),
};
