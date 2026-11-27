import { newSave } from '$engine';
import type { Fixture } from '../fixtures';
import { RECIPE_SEED } from '../recipes';

/**
 * FT-17/19 fixtures: a chain frozen part-way through its playback, in the Lab (the Lab plays a
 * scenario's authored demo through the real animation; `step` is FT-3's `freezeAt` ordinal).
 * Own file; registered in `fixtures.ts` with one spread. The Lab marks every discovery as a
 * first (it hands the session no `named` list), so both beats show the gold card.
 */

export type PlaybackFixtureId = 'fight-chain' | 'fight-burst-beat' | 'fight-first-beat';

const lab = (scenario: string, step: number) => ({ scenario, demo: '1', step: String(step) });

export const PLAYBACK_FIXTURES: Record<PlaybackFixtureId, Fixture> = {
  'fight-chain': {
    id: 'fight-chain',
    route: 'lab',
    params: lab('oil-then-spark', 3),
    save: () => newSave(RECIPE_SEED),
    expect: 'readout',
    note: 'Oil then Spark, frozen at shown step 3: markers 1 to 3 on the board, "Step 3 of 7" in the readout.',
  },
  'fight-burst-beat': {
    id: 'fight-burst-beat',
    route: 'lab',
    params: lab('peal', 3),
    save: () => newSave(RECIPE_SEED),
    expect: 'beat-card',
    note: 'A burst (conduct) held mid-chain: board dimmed 30%, the name card, markers 1 to 3 over the dim.',
  },
  'fight-first-beat': {
    id: 'fight-first-beat',
    route: 'lab',
    params: lab('oil-then-spark', 6),
    save: () => newSave(RECIPE_SEED),
    expect: 'beat-card',
    note: 'The Fire burst as a first discovery: the gold card, flourish and ring.',
  },
};
