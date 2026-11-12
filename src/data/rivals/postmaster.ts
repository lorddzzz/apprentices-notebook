import type { RivalDef, RivalPageDef } from './types';

/**
 * The postmaster (district-ink-makers §heart, ink-quarter plan P9, P10; IQ-22): the dead-letter
 * office's rival, behind his counter. His signature trick is the clock writ (`inkQuarter:clockWrit`,
 * `engine/districts/inkQuarter/postmaster.ts`): a seal by him and a stamp by you, due in three
 * rounds, or every mark on the board collects. His kit is the plan's Lab default: *Serve notice*
 * marks and herds, *Collect* levies the marks for a shield. Numbers are the design's starting
 * proposal and the stand-in's (*tune by playing*, IQ-23).
 */

const SERVE_NOTICE = 'Bolt> Ink Sentence';
const COLLECT = 'Splash> Levy';

export const POSTMASTER_RIVAL: RivalDef = {
  id: 'postmaster',
  name: 'Postmaster',
  token: 'p',
  district: 'inkQuarter',
  hp: 14,
  move: 0,
  elite: false,
  habitat: 'any',
  blurb:
    'The postmaster of the dead-letter office, behind his counter. Every letter here is a promise nobody kept; he serves you one with a clock.',
  spells: [
    { id: 'serveNotice', name: 'Serve notice', lattice: SERVE_NOTICE, charges: 5 },
    { id: 'collect', name: 'Collect', lattice: COLLECT, charges: 5 },
  ],
  /**
   * Plan P10's routine, "mark, then herd, then levy when 2+ marks are near him", behind the writ:
   * the first step with an effective plan wins (`engine/rivals/goals.ts`; the district goals are in
   * the ink quarter's `postmaster.ts`). He never walks, so there is no move step.
   */
  routine: [
    // 1. Serve the clock writ whenever he may (none open, the cooldown over).
    { goal: 'inkQuarter:serveWrit', action: { kind: 'trick' } },
    // 2. Serve notice that shoves an apprentice into a hazard (a step-jar, fire, the drop).
    {
      goal: 'herdInto',
      action: { kind: 'spell', spell: 'serveNotice' },
      params: { object: 'hazard' },
    },
    // 3. Collect when two or more marks stand together: he takes a shield per mark.
    {
      goal: 'inkQuarter:collectMarks',
      action: { kind: 'spell', spell: 'collect' },
      params: { marks: 2 },
    },
    // 4. Otherwise mark and push whoever his notice reaches.
    { goal: 'hitParty', action: { kind: 'spell', spell: 'serveNotice' } },
  ],
  trick: 'inkQuarter:clockWrit',
  fallback: { damage: 1 },
  dryStrike: 'line',
  page: 'postmaster:serveNotice',
};

/** His recovered page (P10): *Serve notice*. The note on Sentence (level II) is IQ-F5's. */
export const POSTMASTER_PAGE: RivalPageDef = {
  id: 'postmaster:serveNotice',
  rival: 'postmaster',
  spell: 'serveNotice',
  title: 'Serve notice',
  lattice: SERVE_NOTICE,
  annotation:
    'Ink first, then the Sentence: the mark the Bolt leaves is the debt the push collects, two tiles along the line. Aim it at a stamp or an edge and the notice delivers itself (Bolt, Ink, Sentence).',
  story:
    'His own copy of a notice, ruled for delivery by hand. Under the address, in the counter’s ink: held at the office, recipient not found. The street on the envelope does not join.',
  trial: { board: '. . . . . .\nD . r . . .\n. . . . . .' },
  /** The postmaster's note on Sentence (level II): a third option, built by IQ-F5 (the ink quarter batch). */
  note: { rune: 'sentence', line: 'sentence:mark', variant: 'postmaster:sentence' },
};
