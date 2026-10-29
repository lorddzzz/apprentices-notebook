import type { EnemyId } from '$data';
import { MOOR_PIECE, MOOR_TOKEN, RIVAL_STAND_INS, RIVALS_LIVE } from '$data/districts/canals';
import type { RivalId } from '$data/rivals/types';
import { hasTrait } from '../arrival';
import { emit, ref } from '../ctx';
import { burnGates, drift, driftPreview } from '../current';
import { findUnit, isAlive } from '../queries';
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
 * CN P5: a floating bystander (the crate) coming to rest on the mooring, by any cause (a drift, a
 * push, a Pull, a Swap), moors there: `moored`, then it is anchored (`unitTraits`) for the room.
 * Anything else stops on it as on water. Passing over it on a push does not moor.
 */
export const MOOR_ARRIVAL: NonNullable<PieceDef['triggers']['onArrive']> = {
  answers: 'landing',
  subjects: ['unit'],
  run(ctx, a) {
    if (a.subject.kind !== 'unit') return 'go';
    const u = findUnit(ctx.s, a.subject.unit);
    if (!u || !isAlive(u) || !u.bystander || u.moored || !hasTrait(u, 'floats')) return 'go';
    u.moored = true;
    emit(ctx, { type: 'moored', unit: ref(u), at: { ...a.at } });
    return 'go';
  },
};

/** CN P4/P5: the mooring (`{moor}`), non-solid, on the barge's lane. */
export const MOOR_DEF: PieceDef<null> = {
  id: MOOR_PIECE,
  token: MOOR_TOKEN,
  solid: 'none',
  triggers: { onArrive: MOOR_ARRIVAL },
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
