import { expect, test } from 'vitest';
import { act, board } from '../../scenarios/harness';

test("FU-6: a thermae floor's vents puff at dusk", async () => {
  // The harness loads the engine first; the data and Seam modules form an import cycle otherwise.
  const { BATH_INTRUSION } = await import('$data/districts/bathhouses');
  const { DISTRICT_KIT } = await import('$data/districts/index');
  const { checkFloor } = await import('$engine/districts/lowerSeam');
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
