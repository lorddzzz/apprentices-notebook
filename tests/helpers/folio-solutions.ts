import { DRAFTS, type DraftDef } from '$data';
import { draftInside, type GlyphInside } from '$engine';
import { both, moveCell, patchCell, place, type Tweak } from './folio';

/**
 * The intended solution of every folio (BL-14), one inside per page, each built on the page before
 * (F2). The fixes live in the tests only; tests/run/folios-*.test.ts prove them.
 */

const draft = (id: string): DraftDef => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};

// C1: the tutorial folios.
const SHALLOW: Record<string, GlyphInside[]> = (() => {
  // Lamplighter: turn the corner; then Oil goes in before the Spark, with an Amp beside the Spark.
  const l0 = patchCell([1, 0], { dir: 'down' })(draftInside(draft('lamplighter')));
  const l1 = both(moveCell([1, 1], [1, 2]), place([1, 1], 'oil'), place([2, 2], 'amplify'))(l0);
  // Collection: swap the gate and the mark; then Pierce ahead of the mark, an Amp under the Spark.
  const c0 = both(
    patchCell([1, 0], { rune: 'ink' }),
    patchCell([2, 0], { rune: 'onInked' }),
  )(draftInside(draft('collection')));
  const c1 = both(
    moveCell([3, 0], [4, 0]),
    moveCell([2, 0], [3, 0]),
    moveCell([1, 0], [2, 0]),
    place([1, 0], 'pierce'),
    place([4, 1], 'amplify'),
  )(c0);
  return { lamplighter: [l0, l1], collection: [c0, c1] };
})();

// C2: the deep and heart folios.
/** Each page's intended solution, every one built on the page before (F2: one working page). */
const STEPS: Record<string, Tweak[]> = {
  'wet-work': [
    // Page 1: a Bend carries the Fork's right hand to the stranded Spark.
    place([1, 1], 'bend', 'right'),
    // Page 2: On Ignite and a second Spark follow the fire into the puddle.
    both(place([3, 1], 'onIgnite'), place([4, 1], 'spark')),
    // Page 3: both Amplifies on the first Spark, which only ever hits the target.
    both(place([2, 0], 'amplify'), place([2, 2], 'amplify')),
  ],
  'left-hand-first': [
    // Page 1: Oil and Ink on the left (first) hand, the Spark on the right.
    both(
      patchCell([1, -1], { rune: 'oil' }),
      patchCell([1, 1], { rune: 'spark' }),
      place([1, -2], 'ink'),
    ),
    // Page 2: On Inked guards the Spark, so a miss lights nothing.
    both(patchCell([1, 1], { rune: 'onInked' }), place([1, 2], 'spark')),
    // Page 3: a Bend folds the Ink beside the Oil, and one Amplify feeds both.
    both(
      patchCell([1, -2], { rune: 'bend', dir: 'right' }),
      place([2, -2], 'ink'),
      place([2, -1], 'amplify'),
    ),
  ],
  'foundry-bell': [
    // Page 1: the drawer's Amplify on the Splash, so the rats drop.
    place([0, 1], 'amplify'),
    // Page 2: a second Bend turns the flow back over the top; the Spark lands under the old
    // Amplify, which now feeds it (and the Ink).
    both(place([3, -1], 'bend', 'left'), moveCell([3, 1], [2, -1])),
    // Page 3: Smear instead of Ink, and the Amplify moves up so it feeds only the Spark.
    both(patchCell([1, 0], { rune: 'smear' }), moveCell([1, -1], [2, -2])),
    // Page 4: Etch after the Smear shifts the tail one cell right; the last Amplify on the Splash.
    both(
      moveCell([2, -2], [3, -2]),
      moveCell([3, -1], [4, -1]),
      moveCell([3, 0], [4, 0]),
      moveCell([2, -1], [3, -1]),
      moveCell([2, 0], [3, 0]),
      place([2, 0], 'etch'),
      place([0, -1], 'amplify'),
    ),
  ],
};

function solutions(id: string): GlyphInside[] {
  const d = draft(id);
  const out: GlyphInside[] = [];
  let cur = draftInside(d);
  for (const step of STEPS[id] ?? []) {
    cur = step(cur);
    out.push(cur);
  }
  return out;
}

const DEEP: Record<string, GlyphInside[]> = {
  'wet-work': solutions('wet-work'),
  'left-hand-first': solutions('left-hand-first'),
  'foundry-bell': solutions('foundry-bell'),
};

export const SOLUTIONS: Record<string, readonly GlyphInside[]> = { ...SHALLOW, ...DEEP };

/** The intended final page of a folio. */
export function finalPage(id: string): GlyphInside {
  const last = SOLUTIONS[id]?.at(-1);
  if (!last) throw new Error(`no solution for ${id}`);
  return last;
}
