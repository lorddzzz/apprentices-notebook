import type { EnemyId } from '$data';
import { MOOR_PIECE, MOOR_TOKEN, RIVAL_STAND_INS, RIVALS_LIVE } from '$data/districts/canals';
import type { RivalId } from '$data/rivals/types';
import { burnGates, drift, driftPreview } from '../current';
import { driftWaiting } from '../solvents';
import type { BoardRule, DistrictModule, PieceDef, PreviewShape } from './types';

/**
 * The canals' engine module (DK-3): the current and the lock gates as round-end board rules.
 * Both are piece-scoped and brought by their terrain (P9), so water drifts and gates burn on any
 * board that has them, a Lab board or a lower-Seam intrusion included.
 */

/** K-8, K-9: the current carries floats, then units, then what waits on the water (jars, Pitch). */
export const CURRENT_RULE: BoardRule<null> = {
  id: 'canals:current',
  slot: 'carry',
  order: 0,
  scope: 'piece',
  activatedBy: { kind: 'terrain', flag: 'water' },
  init: () => null,
  step(ctx, own) {
    drift(ctx);
    driftWaiting(ctx);
    return own;
  },
  preview(state): PreviewShape[] {
    const p = driftPreview(state);
    return [
      ...p.floats.map((f): PreviewShape => ({ kind: 'float', from: f.from, to: f.to })),
      ...p.units.map(
        (u): PreviewShape => ({ kind: 'ghost', unit: u.unit, from: u.from, to: u.to }),
      ),
    ];
  },
};

/** K-11: a wooden gate next to fire burns, after the round's chemistry. */
export const GATES_RULE: BoardRule<null> = {
  id: 'canals:gates',
  slot: 'afterChemistry',
  order: 0,
  scope: 'piece',
  activatedBy: { kind: 'terrain', flag: 'gate' },
  init: () => null,
  step(ctx, own) {
    burnGates(ctx);
    return own;
  },
};

/**
 * CN P4/P5: the mooring (`{moor}`), non-solid, on the barge's lane. CN-2 adds its arrival hook
 * (the crate arriving by any cause emits `moored` and anchors it); until then it does nothing.
 */
export const MOOR_DEF: PieceDef<null> = {
  id: MOOR_PIECE,
  token: MOOR_TOKEN,
  solid: 'none',
  triggers: {},
  art: 'canal-moor',
};

/** CN P6: the foe a rival's slot spawns as: the rival while live, else its stand-in. */
export const rivalSlot = (
  rival: RivalId,
  live: Readonly<Record<RivalId, boolean>> = RIVALS_LIVE,
): EnemyId => (live[rival] ? rival : RIVAL_STAND_INS[rival]);

export const CANALS_MODULE: DistrictModule = {
  id: 'canals',
  rules: [CURRENT_RULE, GATES_RULE],
  pieces: [MOOR_DEF],
};
