import type { VariantDef } from '../types';
import type { RivalDef, RivalPageDef } from './types';

/**
 * The Lamplighter (rivals §2–3, plan RV-5): the canal rival with the long wick. He leaves a
 * lantern (a step-jar of oil and spark) where the party will stand, drives them back onto it, and
 * opens it from afar. Numbers are the design's starting proposal (*tune by playing*).
 */

const LANTERN = 'Bolt> Jar Oil Spark';
const HERD = 'Bolt> Oil Shove';

export const LAMPLIGHTER: RivalDef = {
  id: 'lamplighter',
  name: 'Lamplighter',
  token: 'L',
  district: 'canals',
  hp: 6,
  move: 1,
  elite: true,
  habitat: 'any',
  blurb:
    'A lamplighter checking his route, with an improbably long taper. He leaves a light where it will be needed.',
  spells: [
    { id: 'lantern', name: 'Lantern', lattice: LANTERN, charges: 5 },
    { id: 'herd', name: 'Herd', lattice: HERD, charges: 5 },
  ],
  /**
   * Rivals §2 rows 1–4 as P5 goal steps; the first step with an effective plan wins. Rows 1–3 only
   * find plans while he owns a jar (own-jar herding, the wick, a herding position), so without
   * one he falls through to row 4. No step opens the jar unless it hurts an apprentice and not
   * him (`openOwnObject`), so he never detonates harmlessly.
   */
  routine: [
    // 1. Shove an apprentice into his jar, without catching himself.
    { goal: 'herdInto', action: { kind: 'spell', spell: 'herd' } },
    // 2. Open the jar from afar when it would harm an apprentice and not him.
    { goal: 'openOwnObject', action: { kind: 'trick' } },
    // 3. Keep the jar: a useful shove into any visible hazard, else walk to a herding position.
    { goal: 'herdInto', action: { kind: 'spell', spell: 'herd' }, params: { object: 'hazard' } },
    { goal: 'herdInto', action: { kind: 'move' } },
    // 4. Without a jar: lay a lantern near the party; else approach, else shove rather than idle.
    { goal: 'placeObjectNear', action: { kind: 'spell', spell: 'lantern' } },
    { goal: 'approach', action: { kind: 'move' } },
    { goal: 'hitParty', action: { kind: 'spell', spell: 'herd' } },
  ],
  trick: 'canals:longWick',
  fallback: { damage: 1 },
  dryStrike: 'bite',
  page: 'lamplighter:lantern',
};

/** His recovered page (rivals §3, P15): Leave a lantern, with a note on how the shove helps it. */
export const LAMPLIGHTER_PAGE: RivalPageDef = {
  id: 'lamplighter:lantern',
  rival: 'lamplighter',
  spell: 'lantern',
  title: 'Leave a lantern',
  lattice: LANTERN,
  annotation:
    'Seal the light first and the flame waits in the jar until someone steps in. If they will not come to it, oil them and push: a slick boot finds the lantern on its own (Bolt, Oil, Shove).',
  story:
    'A route sheet for the canal lamps, every stop ticked. In the margin, in a hurried hand: the lamps keep the drawn streets in place, so never leave a corner dark.',
  trial: { board: '. . . . .\nD . . . r\n. . . . .' },
  /** The Jar note (footnotes §1 "Rival notes"); RV-20 authors the variant in FN's format. */
  note: { rune: 'jar', line: 'jar:unit', variant: 'lamplighter:wick' },
};

/**
 * The Jar note (footnotes §1 "Rival notes", RV-20): a third level I option on `jar:unit`, in FN's
 * variant shape. Hidden until his page is held (`rivalNoteVisible`); not yet in `BATCHES`, see the
 * RV-20 report. Its effect needs an engine handler keyed by this id, not yet written.
 */
export const LAMPLIGHTER_WICK: VariantDef = {
  id: 'lamplighter:wick',
  subject: 'jar',
  slot: { line: 'jar:unit', level: 1 },
  text: 'The wick does not care who lit it: a jar that opens also harms the units beside its tile.',
  rival: 'lamplighter',
};
