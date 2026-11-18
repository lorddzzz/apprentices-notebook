import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Registrar's frame (P35, EN-K7): the hall's own `HeartSetup` on a 7 x 9 board. The setup
 * stands the Registrar, his Tracer and the outlines of the guild's hands and scatters pencil over
 * about two in five of the tiles above the bottom two rows, so the frame has no escorts of its own
 * (the Tracer is the setup's, not a palette foe) and no place for the drawing's rule (the pencil
 * is the heart's). The guild's hand is listed by the doorway shape (`kits/cartographers.ts`).
 * `KIT` is read lazily (see `generate.ts`'s import cycle).
 */

const SIZE = { width: 7, height: 9 } as const;

/**
 * The authored fallback (P10): the district's first authored heart written out (the register, his
 * Tracer and two outlines, pencil about the paper), so a change to the hall's heart cannot change
 * what the safe fallback is. Won by the scripted solve in `tests/drawing/kits-c.scripts.ts`.
 */
const FALLBACK = [
  '{pencil} {pencil} {pencil} . {pencil} {pencil} {pencil}',
  '{pencil} . . Y . . {pencil}',
  '{pencil} . {pencil} {pencil} {pencil} {pencil} .',
  '{pencil} {pencil} . {outline:surveyor} . {pencil} {pencil}',
  '. {pencil} . . . {pencil} .',
  '{pencil} {pencil} . I . {pencil} {pencil}',
  '{pencil} . . {outline:eraser} . . {pencil}',
  'P . . . . . P',
  '. P . . . P .',
].join('\n');

let setup: HeartSetup | undefined;

export const REGISTRAR_FRAME: HeartFrame = {
  master: 'registrar',
  cost: COSTS.hearts.registrar,
  needs: needsOf('registrar'),
  size: SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = KIT.modules.cartographers?.heart;
      if (!heart) throw new Error('the cartographers have no heart setup');
      setup = heart;
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
