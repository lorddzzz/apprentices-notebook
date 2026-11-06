import { describe, expect, test } from 'vitest';
import { DISTRICT_KIT } from '$data/districts/index';
import { INK_INTRUSION } from '$data/districts/inkQuarter/floor';
import { createBattle, parseLabel, unitAt } from '$engine';
import { KIT } from '$engine/districts';
import { floorLayout, importedRules } from '$engine/districts/intrusion';
import { checkFloor } from '$engine/districts/lowerSeam';
import { enemyWalk } from '$engine/movement';
import { isRuleActive } from '$engine/rules';
import { draft } from '../scenarios/harness';

/** IQ-12: the ink-makers' lower-Seam floor (ink-quarter plan P12). */
const INDEXES = [0, 1, 2] as const;

const floor = (i: 0 | 1 | 2) =>
  createBattle({ title: 'floor', seed: 1, board: floorLayout(INK_INTRUSION, i) }).state;

describe('IQ-12 ink floor', () => {
  test('passes checkFloor and is the ink quarter kit entry', () => {
    expect(checkFloor(INK_INTRUSION)).toEqual([]);
    expect(DISTRICT_KIT.inkQuarter?.intrusion).toBe(INK_INTRUSION);
  });

  test('brings the piece and its piece-scoped rule, never a district rule', () => {
    expect(importedRules(INK_INTRUSION)).toEqual(['inkQuarter:writs']);
    for (const i of INDEXES) {
      const s = floor(i);
      expect(Object.keys(s.rules ?? {})).toEqual(['inkQuarter:writs']);
      const stamps = s.tiles.filter((t) => t.piece?.id === 'inkQuarter:return').length;
      expect(stamps).toBe(2);
      const districtActive = Object.values(KIT.rules).filter(
        (r) => r.scope === 'district' && isRuleActive(r, s),
      );
      expect(districtActive).toEqual([]);
    }
  });

  test('a foe landing on a floor stamp is sent back', () => {
    const s = structuredClone(floor(0));
    const rat = s.units.find((u) => u.def === 'rat');
    if (!rat) throw new Error('no rat');
    const home = { ...rat.pos };
    // B2 is a stamp on layout 0; walk the rat there from the tile beside it.
    rat.pos = parseLabel('C2');
    const r = draft(s, (ctx) => {
      const u = ctx.s.units.find((v) => v.id === rat.id);
      if (u?.kind !== 'enemy') throw new Error('rat');
      enemyWalk(ctx, u, [parseLabel('B2')]);
    });
    expect(r.events.some((e) => e.type === 'inkQuarter:sentBack')).toBe(true);
    expect(unitAt(r.state, home)?.id).toBe(rat.id);
  });
});
