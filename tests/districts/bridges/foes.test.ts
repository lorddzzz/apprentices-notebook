import { describe, expect, test } from 'vitest';
import { ENEMIES, ENEMY_IDS } from '$data';
import { BRIDGE_FOE_TUNING } from '$data/districts/bridges/enemies';
import { BRIDGE_FOE_TOKENS, BRIDGE_TUNING } from '$data/districts/bridges/types';
import { KIT } from '$engine/districts';
import { GARGOYLE_FOE, WARDEN_FOE } from '$engine/districts/bridges/foes';

/** BR-5 data: the Warden and Gargoyle use the design's numbers and register their behaviours. */
describe('BR-5 data and registration', () => {
  test('numbers come from the design (P8): warden 4 HP move 2 elite, gargoyle 3 HP move 3 flier', () => {
    expect(ENEMIES.warden).toMatchObject({ hp: 4, move: 2, elite: true, flies: false, token: 'j' });
    expect(ENEMIES.gargoyle).toMatchObject({
      hp: 3,
      move: 3,
      elite: false,
      flies: true,
      token: 'y',
    });
    expect(BRIDGE_FOE_TOKENS.warden).toBe(ENEMIES.warden.token);
    expect(BRIDGE_TUNING.chalkRange).toBe(3);
    expect(BRIDGE_TUNING.carrySteps).toBe(2);
    expect(BRIDGE_FOE_TUNING.chalkRounds).toBe(2);
    expect(ENEMY_IDS).toContain('warden');
    expect(ENEMY_IDS).toContain('gargoyle');
  });

  test('both behaviours are on the kit, and the district is still drawing', () => {
    expect(KIT.foes['bridges:warden']).toBe(WARDEN_FOE);
    expect(KIT.foes['bridges:gargoyle']).toBe(GARGOYLE_FOE);
    expect(ENEMIES.warden.behaviour).toBe('bridges:warden');
    expect(ENEMIES.gargoyle.behaviour).toBe('bridges:gargoyle');
    expect(WARDEN_FOE.describe?.({ label: 'chalk', tiles: [{ x: 2, y: 0 }], units: [] })).toBe(
      'chalk circle on C1',
    );
  });
});
