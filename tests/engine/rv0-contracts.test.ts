import { describe, expect, test } from 'vitest';
import { APPRENTICES, ENEMIES } from '$data';
import { DISTRICT_TOKENS, tokenCollisions } from '$data/districts/index';
import { RIVAL_PAGES, RIVAL_TOKENS, RIVALS, type RivalDef } from '$data/rivals';
import type { Telegraph as KitTelegraph } from '$engine/districts/types';
import { compileLattice } from '$engine/lattice';
import { parseBoard, parseLattice } from '$engine/notation';
import { holdsPage, pagesHeld, rivalNoteVisible, type Telegraph } from '$engine/rivals';
import type { Intent, RivalIntent } from '$engine/types';

/** RV-W0: the rival contracts compile, claim `L`, and change nothing yet. */

/** The Lamplighter's proposed kit (rivals §2), as a def the contracts must accept. */
const SHAPE: RivalDef = {
  id: 'lamplighter',
  name: 'Lamplighter',
  token: 'L',
  district: 'canals',
  hp: 6,
  move: 1,
  elite: true,
  habitat: 'land',
  blurb: 'Checks his route with an improbably long taper.',
  spells: [
    { id: 'lantern', name: 'Leave a lantern', lattice: 'Bolt> Jar Oil Spark', charges: 5 },
    { id: 'herd', name: 'Drive them toward it', lattice: 'Bolt> Oil Shove', charges: 5 },
  ],
  routine: [
    { goal: 'herdInto', action: { kind: 'spell', spell: 'herd' }, params: { object: 'jar' } },
    { goal: 'openOwnObject', action: { kind: 'trick' } },
    { goal: 'herdInto', action: { kind: 'move' }, params: { object: 'jar' } },
    { goal: 'placeObjectNear', action: { kind: 'spell', spell: 'lantern' } },
  ],
  trick: 'canals:longWick',
  fallback: { damage: 1 },
  dryStrike: 'bite',
  page: 'lamplighter:lantern',
};

describe('RV-W0 contracts', () => {
  test('L is claimed for the Lamplighter and collides with no foe, roster, district or board char', () => {
    expect(RIVAL_TOKENS.map((t) => t.token)).toEqual(['L']);
    const builtIn = [
      ...Object.values(ENEMIES).map((e) => e.token),
      ...Object.values(APPRENTICES).map((a) => a.token),
      ...'DSRNBWTCE', // the household roster letters (HC P3)
      ...'Piow~=#*hgl@_{!&$+>^v<.', // board notation characters
    ];
    expect(tokenCollisions([...DISTRICT_TOKENS, ...RIVAL_TOKENS], [...new Set(builtIn)])).toEqual(
      [],
    );
    expect(() => parseBoard('L')).toThrow(); // not parsed until RV-1
  });

  test('the proposed kit lattices compile as ordinary spells', () => {
    for (const s of SHAPE.spells) {
      expect(compileLattice(parseLattice(s.lattice)).spells).toHaveLength(1);
    }
  });

  test('no rival, page or held page exists yet', () => {
    expect(RIVALS).toEqual({});
    expect(RIVAL_PAGES).toEqual({});
    expect(pagesHeld({})).toEqual([]);
    expect(holdsPage({ pages: ['lamplighter:lantern'] }, 'lamplighter:lantern')).toBe(true);
    expect(holdsPage({}, 'lamplighter:lantern')).toBe(false);
    expect(rivalNoteVisible({ pages: ['lamplighter:lantern'] }, 'x')).toBe(false);
  });

  test('DK telegraphs are the rival draw descriptor; rival intents stay out of Intent', () => {
    const t: Telegraph = { label: 'opens this jar', tiles: [], units: [], objects: [] };
    const k: KitTelegraph = t;
    expect(k.label).toBe('opens this jar');
    const cast: RivalIntent = {
      kind: 'cast',
      spell: 'herd',
      aim: { kind: 'dir', dir: 'left' },
      fallback: null,
      order: 1,
    };
    // @ts-expect-error RV-2 joins RivalIntent into Intent with its switch sites
    const joined: Intent = cast;
    expect(joined.kind).toBe('cast');
  });
});
