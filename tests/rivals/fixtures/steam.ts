import { byReadingOrder, type Coord, cloudNet, isCloud, sameCoord, tileAt, unitAt } from '$engine';
import type { TrickDef } from '$engine/rivals/types';
import { type Fixture, fixtureDef } from './harness';

/**
 * Steams away (the bathhouses' Bath-Steward, district-bathhouses §heart): a **reaction**
 * (`beforeHarm`). Hit while standing in a cloud, he disperses and re-forms on the free tile of
 * that connected cloud farthest from where he was (ties in reading order); the hit does not land.
 * Out of the cloud, or with no free cloud tile, it lands. Cut the cloud to hurt him.
 */

export const STEAM_ID = 'bathhouses:fixtureSteam';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const STEAM_TRICK: TrickDef<null> = {
  id: STEAM_ID,
  name: 'steams away',
  init: () => null,
  beforeHarm(ctx, unit, harm) {
    if (harm.kind !== 'hit' || !isCloud(tileAt(ctx.s, unit.pos))) return { kind: 'pass' };
    const free = cloudNet(ctx.s, unit.pos)
      .filter((c) => !sameCoord(c, unit.pos) && !unitAt(ctx.s, c))
      .sort((a, b) => manhattan(b, unit.pos) - manhattan(a, unit.pos) || byReadingOrder(a, b));
    const to = free[0];
    // A district would name its own cause (`bathhouses:steam`) in its module's `causes`.
    return to ? { kind: 'relocate', to, cause: 'hop' } : { kind: 'pass' };
  },
  draw: () => ({ label: 'steams away', tiles: [], units: [] }),
  describe: () => 'turns to steam when struck in a cloud and re-forms across it',
};

export const STEAM: Fixture = {
  def: fixtureDef('fixtureSteam', { trick: STEAM_ID }),
  trick: STEAM_TRICK,
};
