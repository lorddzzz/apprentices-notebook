import { describe, expect, test } from 'vitest';
import { BRIDGE_HEART } from '$data/districts/bridges';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import {
  type BattleState,
  createBattle,
  FOUNDERS,
  finishEncounter,
  newProfile,
  newSave,
  type Profile,
  type Trip,
} from '$engine';
import { footnoteIds } from '$engine/footnotes';
import { parseLattice } from '$engine/notation';
import { pagesHeld, rivalNoteVisible } from '$engine/rivals/pages';
import { marginOf, writeAt } from '../../src/app/desk';
import { setOut } from '../../src/app/flow';
import { withFootnotes } from '../scenarios/footnoteHarness';
import { castWith } from '../scenarios/footnotes/castHelper';
import { withLattices } from '../scenarios/harness';

/**
 * BR-20 (bridges P16, P17; rivals P11): the Chief Warden is a rival. His page, *Mind the edge*,
 * banks when he is felled in his own district and rides on the profile through a wipe. His right of
 * way is his trick (scenarios in tests/districts/bridges).
 */

const PAGE = 'chiefWarden:mindTheEdge' as const;

const heartFight = () => {
  const save = setOut(
    {
      ...newSave(1),
      profile: (() => {
        const p = newProfile();
        return {
          ...p,
          city: {
            ...p.city,
            heard: [...p.city.heard, 'bridges'],
            open: [...p.city.open, 'bridges'],
          },
        };
      })(),
    },
    'bridges',
  );
  const b = structuredClone(
    createBattle({
      title: 'The great arch',
      board: BRIDGE_HEART.variants[0]?.layout ?? '',
      seed: 1,
      edge: 'drop',
      lineup: FOUNDERS,
    }).state,
  );
  return { save, trip: { ...(save.trip as Trip), encounter: 4 }, b };
};

describe('the rival and his page', () => {
  test('BR-20: the def, the page and the shell agree', () => {
    const def = RIVALS.chiefWarden;
    expect(def).toMatchObject({
      token: 'K',
      district: 'bridges',
      page: PAGE,
      move: 0,
      elite: true,
    });
    expect(RIVAL_PAGES[PAGE]).toMatchObject({ rival: 'chiefWarden', title: 'Mind the edge' });
    expect(RIVAL_PAGES[PAGE]?.note?.rune).toBe('brink');
    for (const sp of def?.spells ?? []) expect(parseLattice(sp.lattice)).toBeDefined();
  });

  test('BR-20: his page banks on a win', () => {
    const { save, trip, b } = heartFight();
    b.phase = 'won';
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    const done = finishEncounter(save.profile, trip, b);
    expect(pagesHeld(done.profile)).toEqual([PAGE]);
  });

  test('BR-20: his page is kept on a wipe', () => {
    const { save, trip, b } = heartFight();
    const held = { ...save.profile, pages: [PAGE] };
    b.phase = 'lost';
    const done = finishEncounter(held, trip, b);
    expect(done.outcome).toBe('wiped');
    expect(pagesHeld(done.profile)).toEqual([PAGE]);
  });
});

describe("the Chief Warden's note on Brink (level II, brink:drop)", () => {
  const NOTE = 'chiefWarden:brink';
  const brinkReady = (pages: Profile['pages']): Profile => ({
    ...newProfile(),
    pages,
    witnessed: ['brink:drop'],
    footnotes: { brink: { points: 200, slots: { 'brink:drop@1': 'brink-drop-near' } } },
    solventsFound: ['mortar'],
    solvents: { ...newProfile().solvents, mortar: 4 },
  });
  const slot = (p: Profile) => marginOf(p, 'brink').lines.find((l) => l.line === 'brink:drop');
  const offered = (p: Profile) =>
    (slot(p)?.frames.find((f) => f.level === 2)?.variants ?? []).map((v) => v.id);

  test('hidden without his page', () => {
    expect(rivalNoteVisible(newProfile(), NOTE)).toBe(false);
    expect(offered(brinkReady([]))).not.toContain(NOTE);
  });

  test('offered once his page is held, credited, and writing it files it in the slot', () => {
    const p = brinkReady([PAGE]);
    expect(rivalNoteVisible(p, NOTE)).toBe(true);
    const frame = slot(p)?.frames.find((f) => f.level === 2);
    expect(frame?.variants.find((v) => v.id === NOTE)?.credit).toBe(
      "Copied from the Chief Warden's day-book.",
    );
    const r = writeAt(p, 'brink', NOTE, { atHome: true });
    if ('error' in r) throw new Error(r.error);
    expect(footnoteIds(r.profile)['brink:drop@2']).toBe(NOTE);
  });

  test("written: a member beside the fog takes a Guard of 1 instead of Brink's rest", () => {
    const run = (fns: string[]) => {
      // The stoker at C1 stands beside the fog at D1; Brink Strike would hit it.
      const s: BattleState = withLattices('D . S _ .\n. . . . .', {
        draughtsman: 'Bolt> Brink Strike',
      });
      const r = castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
      const stoker = r.state.units.find((u) => u.id === 'stoker');
      return {
        hurt: (stoker?.maxHp ?? 0) - (stoker?.hp ?? 0),
        shield: stoker?.shield ?? 0,
        guarded: r.events.find((e) => e.type === 'shieldGained' && e.line === 'brink:drop'),
      };
    };
    expect(run([])).toMatchObject({ hurt: 2, shield: 0, guarded: undefined });
    expect(run([NOTE])).toMatchObject({ hurt: 0, shield: 1 });
    expect(run([NOTE]).guarded).toMatchObject({ amount: 1 });
  });
});
