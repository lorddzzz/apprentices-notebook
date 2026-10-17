import { describe, expect, test } from 'vitest';
import { DRAFTS } from '$data';
import { copyLabel, isOwnersHand, ownerHeader, ownerLore } from '../../src/app/owner';

const first = DRAFTS[0];
if (!first) throw new Error('no drafts');
const id = first.id;
const name = first.name;

describe("the owner's mark", () => {
  test("a draft Glyph is in the owner's hand and its label says so", () => {
    expect(isOwnersHand({ draft: id })).toBe(true);
    expect(copyLabel('Lamp, spell Fair copy', { draft: id })).toMatch(/, in the owner's hand$/);
  });
  test('other Glyphs have no mark, header or page', () => {
    expect(isOwnersHand({})).toBe(false);
    expect(copyLabel('Lamp', {})).toBe('Lamp');
    expect(ownerHeader({})).toBeNull();
    expect(ownerLore({})).toBeNull();
  });
  test('the header names the draft and the page shows its lore', () => {
    expect(ownerHeader({ draft: id })).toBe(`in the owner's hand · ${name}`);
    expect(ownerLore({ draft: id })).toBe(first.lore);
  });
});
