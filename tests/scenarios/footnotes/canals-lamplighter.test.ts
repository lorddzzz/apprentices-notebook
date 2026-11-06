import { describe, expect, test } from 'vitest';
import { LAMPLIGHTER_PAGE, LAMPLIGHTER_WICK } from '$data/rivals/lamplighter';
import {
  type BattleState,
  type GameEvent,
  type Jar,
  newProfile,
  type Profile,
  parseLabel,
  tileAt,
  unitAt,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { footnoteIds } from '$engine/footnotes';
import { enemyWalk } from '$engine/movement';
import { marginOf, writeAt } from '../../../src/app/desk';
import { withFootnotes } from '../footnoteHarness';
import { board } from '../harness';

/**
 * CN-F5: the Lamplighter's note on Jar (`lamplighter:wick`, RV-20). Hidden without his page,
 * offered in the Jar margin once it is held, credited there, and written in the margin it changes
 * what his walk does: he trips a jar of yours only with the note written.
 */

const at = parseLabel;
const NOTE = LAMPLIGHTER_WICK.id;
const PAGE = LAMPLIGHTER_PAGE.id;

/** A profile that has witnessed the Jar line, reached level I of Jar, and holds one canal solvent. */
const jarReady = (pages: Profile['pages']): Profile => ({
  ...newProfile(),
  pages,
  witnessed: ['jar:unit'],
  footnotes: { jar: { points: 8, slots: {} } },
  solventsFound: ['pitch'],
  solvents: { ...newProfile().solvents, pitch: 2 },
});

const levelOne = (p: Profile) => marginOf(p, 'jar').lines[0]?.frames[0];
const offered = (p: Profile) => (levelOne(p)?.variants ?? []).map((v) => v.id);

/** The Draughtsman's step-jar on B1: a Strike on whoever opens it. */
const strikeJar = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});

/** The Lamplighter walks from C1 onto the jar on B1, with the given footnotes written. */
const rivalWalk = (written: readonly string[]) => {
  const s: BattleState = structuredClone(board('D . L'));
  tileAt(s, at('B1')).jar = strikeJar();
  const r = runDraft(
    s,
    (ctx) => {
      const u = unitAt(ctx.s, at('C1'));
      if (u?.kind !== 'enemy') throw new Error('no rival');
      enemyWalk(ctx, u, [at('B1')]);
    },
    { footnotes: withFootnotes(written) },
  );
  return r.events.filter((e): e is GameEvent & { type: 'jarOpened' } => e.type === 'jarOpened');
};

describe('CN-F5: the Lamplighter’s note on Jar', () => {
  test('hidden without his page: not in the Jar margin, and his walk leaves the jar shut', () => {
    const p = jarReady([]);
    expect(offered(p)).not.toContain(NOTE);
    expect(rivalWalk([])).toHaveLength(0);
  });

  test('offered once his page is held: listed on level I, credited to the Lamplighter', () => {
    const frame = levelOne(jarReady([PAGE]));
    expect(frame?.variants.map((v) => v.id)).toContain(NOTE);
    expect(frame?.variants.find((v) => v.id === NOTE)?.credit).toBe(
      "Copied from the Lamplighter's route sheet.",
    );
  });

  test('written in the margin with his page, it is the slot’s note and changes his walk', () => {
    const r = writeAt(jarReady([PAGE]), 'jar', NOTE, { atHome: true });
    if ('error' in r) throw new Error(r.error);
    expect(footnoteIds(r.profile)['jar:unit@1']).toBe(NOTE);
    expect(rivalWalk([NOTE])).toHaveLength(1);
  });
});
