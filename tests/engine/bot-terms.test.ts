import { describe, expect, test } from 'vitest';
import { BOIL_CAPACITY_PIPS } from '$data/districts/bathhouses/types';
import { KIT } from '$engine/districts';
import { botValue } from '$engine/districts/api';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import type { BattleState } from '$engine/types';
import { board } from '../scenarios/harness';

/** KIT-R3g (platform-closure P6): the bot's district terms ride the modules. */

function bath(ascii: string, pressure: number): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: 2 } });
  s.rules = {
    ...s.rules,
    [BOIL_OVER_RULE_ID]: { ...(s.rules[BOIL_OVER_RULE_ID] as BoilOverState), pressure },
  };
  for (const u of s.units) if (u.kind === 'enemy') u.intent = null;
  return s;
}

describe('KIT-R3 bot terms', () => {
  test("KIT-R3: botValue sums the modules' terms and is 0 off their boards", () => {
    for (const ascii of ['@ . d', '{pier} {span} {span} @', 'D ~ ~ @']) {
      expect(botValue(board(ascii)), ascii).toBe(0);
    }
    // CAL-3 calibrated: 32-pip capacity, so sit 4 quarters short of the boil (was a flat 30).
    const s = bath('D~ ~ . r~\nS . ~ @', BOIL_CAPACITY_PIPS * 4 - 4);
    const sum = Object.values(KIT.modules).reduce((v, m) => v + (m?.bot?.value?.(s) ?? 0), 0);
    expect(sum).not.toBe(0);
    expect(botValue(s)).toBe(sum);
    for (const id of ['seam', 'canals', 'bridges'] as const) {
      expect(KIT.modules[id]?.bot?.value).toBeUndefined();
    }
  });
});
