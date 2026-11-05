import { DIRS, inBoard, isAlive, members, step, unitAt } from '$engine';
import { dealDamage } from '$engine/damage';
import type { Json } from '$engine/districts/types';
import type { TrickDef } from '$engine/rivals/types';
import { type Fixture, fixtureDef } from './harness';
import { num } from './json';

/**
 * Plays a tune (the bell foundry's Carillonneur, district-bell-foundry §heart): a **per-round
 * mark** after the enemy actions. Each round he shows the next note of a four-note tune on one of
 * his neighbours (`DIRS` order, note 1 above him). A unit standing on the shown tile mutes it and
 * the tune starts over; the fourth note rings the Great Peal on every apprentice. The tune is the
 * countdown, kept in his trick state.
 */

export const TUNE_ID = 'foundry:fixtureTune';
export const TUNE_NOTES = 4;
export const PEAL_DAMAGE = 2;

type TuneState = { note: number };
const noteOf = (own: Json): number => num(own, 'note');

export const TUNE_TRICK: TrickDef<TuneState> = {
  id: TUNE_ID,
  name: 'plays a tune',
  init: () => ({ note: 0 }),
  mark: {
    timing: 'afterActions',
    plan(state, unit, own) {
      const at = step(unit.pos, DIRS[noteOf(own) % DIRS.length] ?? 'up');
      return { data: { note: noteOf(own) + 1 }, tiles: inBoard(state, at) ? [at] : [] };
    },
    resolve(ctx, _unit, mark, own) {
      const at = mark.tiles[0];
      if (at && unitAt(ctx.s, at)) return { note: 0 }; // muted: the tune starts over
      const note = noteOf(own) + 1;
      if (note < TUNE_NOTES) return { note };
      for (const m of members(ctx.s).filter(isAlive))
        dealDamage(ctx, m, PEAL_DAMAGE, 'the Great Peal');
      return { note: 0 };
    },
  },
  draw(_state, _unit, shown) {
    const tiles = 'tiles' in shown ? shown.tiles : [];
    const n = 'tiles' in shown ? num(shown.data, 'note', 1) : 1;
    return { label: 'tune', tiles, units: [], sequence: [n, TUNE_NOTES] };
  },
  describe: () => 'sounds the next note of his tune',
};

export const TUNE: Fixture = {
  def: fixtureDef('fixtureTune', { trick: TUNE_ID }),
  trick: TUNE_TRICK,
};
