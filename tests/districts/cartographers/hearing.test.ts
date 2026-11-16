import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { RIVAL_PAGES } from '$data/rivals';
import { newProfile, type Profile } from '$engine';
import { ownerDoor } from '$engine/districts/lowerSeam';
import { conditionHolds } from '$engine/hearing';

/**
 * CG-14 (cartographers-plan P17, P18): the hall is heard at five recovered pages (the Lamplighter's
 * and the four middle masters', never the Registrar's) and its cleared heart turns the owner's door.
 * The set is the `except` form of the `pages` condition (DK-8 has no `of` filter).
 */

const PAGES = Object.keys(RIVAL_PAGES) as Profile['pages'];
const REGISTRAR = PAGES.filter((p) => p.startsWith('registrar'));
const OTHERS = PAGES.filter((p) => !p.startsWith('registrar'));
const pages = DISTRICTS.cartographers.hear.find((c) => c.kind === 'pages');
if (!pages) throw new Error('no pages hearing');
const heardWith = (held: Profile['pages']): boolean =>
  conditionHolds(pages, {
    profile: { ...newProfile(), pages: held },
    district: 'seam',
    party: [],
    log: [],
  });

describe('CG-14 hearing', () => {
  test('CG-14: the hearing meets at five pages', () => {
    expect(OTHERS).toHaveLength(5);
    expect(heardWith(OTHERS)).toBe(true);
    expect(heardWith([...OTHERS, ...REGISTRAR])).toBe(true);
    expect(DISTRICTS.cartographers.gate.kind).toBe('threshold');
  });

  test("CG-14: the hearing misses at four pages or with the Registrar's", () => {
    expect(heardWith(OTHERS.slice(0, 4))).toBe(false);
    expect(heardWith([...OTHERS.slice(0, 4), ...REGISTRAR])).toBe(false);
    expect(heardWith([])).toBe(false);
  });

  test("CG-14: SM's gate reads cartographers in city.hearts", () => {
    const p = newProfile();
    const seen = { ...p, city: { ...p.city, doorSeen: true } };
    expect(ownerDoor(seen)).toBe('sealed');
    const cleared = {
      ...seen,
      city: { ...seen.city, hearts: [...seen.city.hearts, 'cartographers' as const] },
    };
    expect(ownerDoor(cleared)).toBe('open');
    // The door line is the heart room's paper, filed on the Registrar's fall.
    const heart = DISTRICTS.cartographers.rooms.at(-1);
    const struck = DISTRICTS.cartographers.papers?.find((x) => x.id === heart?.lore);
    expect(struck?.text).toContain('Below the Seam, a lock turns.');
  });
});
