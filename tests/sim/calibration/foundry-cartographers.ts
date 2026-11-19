import type { Adapter } from './runner';

export const foundry: Adapter = {
  name: 'foundry',
  district: 'foundry',
  axes: ['0', '1', '2', '3', '4'],
  tripAxis: (axis) => (axis === '0' ? 'earned' : null),
  prepare: (_p, t, axis, fresh) =>
    fresh && t.kit
      ? {
          ...t,
          kit: {
            ...t.kit,
            state: {
              rung: Array.from({ length: Number(axis) }, (_, room) => ({ room, note: room + 1 })),
            },
          },
        }
      : t,
};
export const academy: Adapter = { name: 'academy', district: 'cartographers', axes: ['authored'] };
