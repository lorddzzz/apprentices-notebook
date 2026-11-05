import { tileAt } from '$engine';
import type { TrickDef } from '$engine/rivals/types';
import { type Fixture, fixtureDef } from './harness';

/**
 * Right of way (the bridges' Chief Warden, district-bridges §heart): an **immunity** (`resists`)
 * conditioned on the board. While he stands on his keystone (here a lamp tile, `l`) nothing
 * pushes, holds or drops him: a Shove, a Hold, a Rivet or a wax seal. Off it he is an ordinary
 * target.
 */

export const WAY_ID = 'bridges:fixtureWay';

export const WAY_TRICK: TrickDef<null> = {
  id: WAY_ID,
  name: 'right of way',
  init: () => null,
  resists: (state, unit) => tileAt(state, unit.pos).terrain.lamp,
  draw: (_s, unit) => ({ label: 'right of way', tiles: [{ ...unit.pos }], units: [unit.id] }),
  describe: () => 'cannot be pushed, held or dropped while he stands on the keystone',
};

export const WAY: Fixture = {
  def: fixtureDef('fixtureWay', { trick: WAY_ID }),
  trick: WAY_TRICK,
};
