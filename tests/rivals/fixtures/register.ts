import { chebyshev, type EnemyUnit, findUnit, isAlive, members, sameCoord } from '$engine';
import { removeFromRoom } from '$engine/outOfRoom';
import { makeTrickObject, removeTrickObject } from '$engine/rivals/tricks';
import type { TrickDef } from '$engine/rivals/types';
import { type Fixture, fixtureDef } from './harness';
import { str } from './json';

/**
 * Strike from the register (the cartographers' Registrar, district-cartographers §heart): a
 * **per-round mark** before the enemy actions, **trick-owned objects** (pencil circles), a
 * **round-end** erase and **onDeath**. Each round he marks the tiles of apprentices within
 * `REGISTER_RANGE`; whoever still stands there when the mark resolves is circled, and at round end
 * a circled apprentice still on the circle is erased from the fight. Step away, or kill him (his
 * circles go with him).
 */

export const REGISTER_ID = 'cartographers:fixtureRegister';
export const REGISTER_RANGE = 2;

const circlesOf = (u: EnemyUnit) => u.rival?.objects.filter((o) => o.trick === REGISTER_ID) ?? [];

export const REGISTER_TRICK: TrickDef<null> = {
  id: REGISTER_ID,
  name: 'the register',
  init: () => null,
  mark: {
    timing: 'beforeActions',
    plan(state, unit) {
      const near = members(state).filter(
        (m) => isAlive(m) && !m.out && chebyshev(m.pos, unit.pos) <= REGISTER_RANGE,
      );
      if (!near.length) return null;
      return { data: { units: near.map((m) => m.id) }, tiles: near.map((m) => ({ ...m.pos })) };
    },
    resolve(ctx, unit, mark, own) {
      for (const at of mark.tiles) {
        const m = members(ctx.s).find((x) => isAlive(x) && sameCoord(x.pos, at));
        if (m) makeTrickObject(ctx, unit, at, { unit: m.id });
      }
      return own;
    },
  },
  roundEnd: {
    slot: 'late',
    step(ctx, unit, own) {
      for (const c of circlesOf(unit)) {
        const id = str(c.data, 'unit');
        const m = id ? findUnit(ctx.s, id) : null;
        const still = m && isAlive(m) && !m.out && c.at && sameCoord(m.pos, c.at);
        removeTrickObject(ctx, c.id, still ? 'opened' : 'gone');
        if (still && m) removeFromRoom(ctx, m, 'erased');
      }
      return own;
    },
  },
  onDeath(ctx, unit, own) {
    for (const c of circlesOf(unit)) removeTrickObject(ctx, c.id, 'gone');
    return own;
  },
  draw(state, _unit, shown) {
    const tiles = 'tiles' in shown ? shown.tiles : [];
    const units = members(state)
      .filter((m) => tiles.some((t) => sameCoord(t, m.pos)))
      .map((m) => m.id);
    return { label: 'register', tiles, units };
  },
  describe: () => 'circles names in the register; at dusk they are struck out',
};

export const REGISTER: Fixture = {
  def: fixtureDef('fixtureRegister', { trick: REGISTER_ID }),
  trick: REGISTER_TRICK,
};
