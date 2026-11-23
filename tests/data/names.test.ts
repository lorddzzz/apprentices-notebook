import { describe, expect, test } from 'vitest';
import { APPRENTICES, DISTRICTS } from '$data';
import { HANDOVER_PAGES, OWNER_FULL_NAME } from '$data/ending';
import { RIVALS } from '$data/rivals';

/** names-and-voice.md: the placeholders are gone and the owner is named once, at the end. */
describe('names and voice', () => {
  test('every apprentice has a given name and a trade, and names are unique', () => {
    const all = Object.values(APPRENTICES);
    for (const def of all) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.trade.length).toBeGreaterThan(0);
      expect(def.name).not.toBe(def.trade);
    }
    expect(new Set(all.map((d) => d.name)).size).toBe(all.length);
  });

  test("the owner's full name appears nowhere in the handover pages or the data before the end", () => {
    expect(OWNER_FULL_NAME).toBe('Marit Vos');
    for (const page of HANDOVER_PAGES) expect(page).not.toContain('Marit');
    for (const d of Object.values(DISTRICTS)) {
      expect(d.line).not.toContain('Marit');
      expect(d.barred).not.toContain('Marit');
    }
  });

  test('every district keeps a proper name and a plain label (or says it in the name)', () => {
    for (const d of Object.values(DISTRICTS)) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.plain === '' || d.plain === d.plain.trim()).toBe(true);
    }
  });

  test('named rivals have a person; the Registrar stays faceless', () => {
    expect(RIVALS.registrar?.person).toBeUndefined();
    for (const id of [
      'lamplighter',
      'postmaster',
      'bathSteward',
      'chiefWarden',
      'carillonneur',
    ] as const) {
      expect(RIVALS[id]?.person).toBeTruthy();
    }
  });
});
