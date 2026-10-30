import { describe, expect, it } from 'vitest';
import { CANALS_INTRUSION } from '$data/districts/canals';
import { DISTRICT_KIT } from '$data/districts/index';
import { createBattle, newProfile } from '$engine';
import { KIT } from '$engine/districts';
import { floorLayout, floorListedRules, importedRules } from '$engine/districts/intrusion';
import { checkFloor, floorsFor } from '$engine/districts/lowerSeam';
import { isRuleActive } from '$engine/rules';
import { act } from '../scenarios/harness';

const floor = (i: 0 | 1 | 2) =>
  createBattle({ title: 'floor', seed: 1, board: floorLayout(CANALS_INTRUSION, i) }).state;
const current = () => {
  const r = KIT.rules['canals:current'];
  if (!r) throw new Error('current rule missing');
  return r;
};

describe('DK-10 canals intrusion', () => {
  it('passes checkFloor and is the canals kit entry', () => {
    expect(checkFloor(CANALS_INTRUSION)).toEqual([]);
    expect(DISTRICT_KIT.canals?.intrusion).toBe(CANALS_INTRUSION);
  });

  it('imports only the piece-scoped current and lists no rule for the fight', () => {
    expect(importedRules(CANALS_INTRUSION)).toEqual(['canals:current']);
    expect(floorListedRules()).toEqual([]);
  });

  it('a floor drifts units on the lane with no district-scoped rule', () => {
    const s = floor(0);
    // the board brings the current (initBroughtRules); nothing district-scoped is listed
    expect(Object.keys(s.rules ?? {})).toEqual(['canals:current']);
    expect(isRuleActive(current(), s)).toBe(true);
    const districtRules = Object.values(KIT.rules).filter((r) => r.scope === 'district');
    expect(districtRules.length).toBeGreaterThan(0);
    expect(districtRules.filter((r) => isRuleActive(r, s))).toEqual([]);
    const rat = s.units.find((u) => u.def === 'rat');
    if (!rat) throw new Error('no rat');
    rat.pos = { x: 4, y: 1 };
    const out = act(s, { type: 'endTurn' });
    const after = out.state.units.find((u) => u.id === rat.id);
    expect(after?.pos).not.toEqual({ x: 4, y: 1 });
  });

  it('every floor carries the current from its water', () => {
    for (const i of [0, 1, 2] as const) expect(isRuleActive(current(), floor(i))).toBe(true);
  });

  it('checkFloor rejects a spec that would bring a district-scoped rule', () => {
    const districtRule = Object.values(KIT.rules).find((r) => r.scope === 'district');
    if (!districtRule) throw new Error('no district-scoped rule in the kit');
    const problems = checkFloor({ ...CANALS_INTRUSION, rules: [districtRule.id] });
    expect(problems.filter((p) => p.layout === null)).toEqual([
      { layout: null, message: `Rule '${districtRule.id}' is district-scoped (P9)` },
    ]);
  });

  it('floorsFor lists the canals once opened', () => {
    const p = newProfile();
    const open = [...p.city.open, 'canals' as const];
    expect(floorsFor({ ...p, city: { ...p.city, open } })).toContain('canals');
  });
});
