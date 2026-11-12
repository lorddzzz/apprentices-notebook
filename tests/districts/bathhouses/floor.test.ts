import { expect, test } from 'vitest';
import { newProfile } from '$engine';
import { BATH_INTRUSION } from '$data/districts/bathhouses';
import { DISTRICT_KIT } from '$data/districts/index';
import { checkFloor } from '$engine/districts/lowerSeam';
import { act, board } from '../../scenarios/harness';

test("FU-6: a thermae floor's vents puff at dusk", () => {
  expect(newProfile()).toBeDefined();
  expect(DISTRICT_KIT.bathhouses?.intrusion).toBe(BATH_INTRUSION);
  expect(checkFloor(BATH_INTRUSION)).toEqual([]);
  for (const layout of BATH_INTRUSION.rooms) {
    const s = board(layout.replaceAll('P', '.'), {});
    const vents = s.tiles.flatMap((t, i) => (t.terrain.vent ? [i] : []));
    expect(vents.length).toBe(2);
    const r = act(s, { type: 'endTurn' });
    for (const i of vents) expect(r.state.tiles[i]?.state?.id).toBe('cloud');
  }
});
