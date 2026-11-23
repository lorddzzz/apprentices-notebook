/**
 * The handover's text (EN-10, EN-11): approved as drafted at EN-G2, 2026-11-18. Copied word for
 * word from docs/design/ending-text.md; the owner's hand. The name is signed once, under the last page, and in the credits
 * (names-and-voice.md): nowhere earlier.
 */

/** The owner's full name, revealed at the end only. */
export const OWNER_FULL_NAME = 'Marit Vos';

/** The scene, six pages tapped through. */
export const HANDOVER_PAGES: readonly string[] = [
  'You found the handle. I wondered which of you would. Sit down, the stool is older than the guild and it has held worse than you. I have been writing to you for a long time. It is good to do it across a desk instead of across a join.',
  "This is the join: the place where the guild's drawings of the city meet and do not agree. They only ever anchored whole streets, so nobody hung a lamp here or cast a bell for it. The baths' page overlaps this one, which is why the Thermae's chimney comes up through my floor. The wardens built a span toward it from a plan the guild had already given up on.",
  'I told the guild a join left alone will tear. They answered politely, on good paper, several times. You have read those letters: the expulsion, and the reasons they gave for it. I kept studying it anyway. The baths still have my name in their ledger, I went there to watch the seam from the warm side.',
  'When it began to tear I went in and held it. I tried ink first. The hands that climbed your pages and the Marginalia were mine once: attempts that stayed after I stopped needing them. I am sorry about those. Then I tried simply staying, and that worked, so I stayed. It has been some years.',
  'It does not need holding now. You inked it shut from the other side, one district at a time, without being asked. So here is the last line I will write in this book: *the join holds, and it was not me who made it hold.*',
  'The pen is yours. So is the notebook, for good, and the page under this one, which I never drew. I am coming upstairs with two pages of my own, in case your household lacks them, and I will take a seat on the bench like anyone else. Draw something. I would like to see what you put there.',
];

/** The credits' headings and fixed lines; `tally` takes `{trips}`, `{casts}`, and `chain` takes `{chain}`, `{caster}`, `{name}`. */
export const CREDITS_LINES = {
  household: 'Kept by',
  districts: 'Inked shut, in this order',
  idioms: 'Named in these pages',
  noIdioms: 'Nothing named yet. There is time.',
  counts: 'For the record',
  tally: '{trips} trips. {casts} casts.',
  chain: 'The longest chain: {chain}, by {caster}, with {name}.',
  close: 'The rest is yours to draw.',
};

/** The door on the map and its lines (ending-text §1, §4). */
export const ENDING_LINES = {
  door: "The owner's door",
  doorSub: 'It is unlatched. Come down when you like; there is nothing to fight.',
  desk: "Visit the owner's desk",
  deskSub: 'Read it again.',
  inTrip: 'The door stands open. You can visit it from home.',
  blankPage: 'the rest is mine to draw',
};

/** The line under a gifted page in the scene's close. */
export const GIFT_LINE = "from the owner's own pages";
