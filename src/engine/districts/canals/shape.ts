import { policyAllows } from '../../trip/ret';
import type { TripShapeDef } from '../types';

/**
 * The canals' return rule lent to drawn districts (platform-closure P5): home after every even
 * 0-based room below the heart, and at the heart. It matches the canals' own `ret: landings`, which
 * stays in data; the canals register no `trip`, so their saves carry no kit.
 */
export const CANALS_LANDINGS: TripShapeDef<null> = {
  id: 'canals:landings',
  parseState: () => null,
  initState: () => null,
  returnBlocks: (input) => {
    const heart = input.length - 1;
    const after = Array.from({ length: Math.ceil(heart / 2) }, (_, i) => i * 2);
    return policyAllows({ kind: 'landings', after }, input.room, heart)
      ? []
      : [{ why: 'No landing here.' }];
  },
};
