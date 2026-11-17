import { cloneData } from '../../clone';
import type { RuleId } from '../../districts/types';
import { createRng } from '../../rng';
import { CANALS_LANDINGS } from '../../districts/canals/shape';
import type { GenKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, isWater, lay, needsOf, shuffled } from './seam';

/** The canals' kit (EN-S1, moved here unchanged by EN-W1; P34). */

export const CURRENT: RuleId = 'canals:current';

/**
 * The current's stamp (P4: the rule brings its lanes): one or two straight lanes, side by side
 * and flowing one way, across the whole board, then lamps on the banks (the moth needs them). The
 * minimum stamp is one lane and one lamp.
 */
export const currentKit: RuleKit = {
  id: CURRENT,
  brings: [],
  needs: [],
  stamp(layout, seed, minimum) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const vertical = rng.int(0, 1) === 0;
    const lanes = minimum ? 1 : rng.int(1, 2);
    const span = vertical ? out.width : out.height;
    const first = rng.int(1, Math.max(1, span - 1 - lanes));
    const flow = vertical ? (rng.int(0, 1) === 0 ? 'v' : '^') : rng.int(0, 1) === 0 ? '>' : '<';
    for (const c of coords(out)) {
      const line = vertical ? c.x : c.y;
      if (line >= first && line < first + lanes) lay(out, c, `w${flow}`);
    }
    const banks = shuffled(
      coords(out).filter((c) => {
        const t = at(out, c);
        return (
          t !== undefined &&
          isPlain(t) &&
          [
            { x: c.x + 1, y: c.y },
            { x: c.x - 1, y: c.y },
            { x: c.x, y: c.y + 1 },
            { x: c.x, y: c.y - 1 },
          ].some((n) => {
            const nt = at(out, n);
            return nt !== undefined && isWater(nt);
          })
        );
      }),
      rng,
    );
    for (const c of banks.slice(0, minimum ? 1 : rng.int(2, 3))) lay(out, c, 'l');
    return out;
  },
};

/**
 * The landings (P15, P33): the canals' own return rule, lent to drawn districts as it is (home
 * after rooms 1, 3 and 5 that exist), at every length a drawing takes. The shape is the one
 * KIT-R3 already lends, under the id the palette offers.
 */
export const landingsKit: ShapeKit = {
  id: CANALS_LANDINGS.id,
  needs: needsOf(CANALS_LANDINGS.id),
  lengths: [3, 4, 5, 6],
  shape: CANALS_LANDINGS,
};

/** The canals: the current with its lamps, the eel on its lanes and the moth by its lamps. */
export const CANALS_KIT: GenKit = {
  district: 'canals',
  rules: [currentKit],
  pieces: [],
  foes: (['eel', 'moth'] as const).map(foeKit),
  shapes: [landingsKit],
  frames: [],
};
