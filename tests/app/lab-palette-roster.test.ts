import { expect, test } from 'vitest';
import { APPRENTICE_IDS, APPRENTICES } from '$data';
import { newProfile } from '$engine';
import { labRoster, paletteOf } from '../../src/app/lab';

const tokens = (roster?: readonly (typeof APPRENTICE_IDS)[number][]) =>
  new Set(paletteOf(undefined, 'lab', roster).map((e) => e.item));

test('BL-133: the campaign Lab palette names only the roster; default keeps everyone', () => {
  const roster = labRoster(newProfile(), false);
  const unmet = APPRENTICE_IDS.filter((id) => !roster.includes(id));
  expect(unmet.length).toBeGreaterThan(0);
  const campaign = tokens(roster);
  for (const id of roster) expect(campaign.has(APPRENTICES[id].token), id).toBe(true);
  for (const id of unmet) expect(campaign.has(APPRENTICES[id].token), id).toBe(false);
  const all = tokens();
  for (const id of APPRENTICE_IDS) expect(all.has(APPRENTICES[id].token), id).toBe(true);
});
