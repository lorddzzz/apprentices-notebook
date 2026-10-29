import { BURSTS, MIXES } from './chemistry';
import { IDIOMS } from './idioms';
import { METHOD_IDS, METHODS } from './methods';
import { RUNE_IDS, RUNES } from './runes';
import { SOLVENT_IDS, SOLVENTS } from './solvents';
import type { BurstId, CodexEntryDef, CompoundId, MethodId, RuneId, SolventId } from './types';

/**
 * The codex (P6, D7): rune pages, compounds and bursts (named when first made), methods, solvents
 * and idioms. Every entry has the owner's margin note; `text` is the page's one-sentence fact.
 */

const RUNE_NOTES: Record<RuneId, string> = {
  bolt: 'Straight and honest. Mind what stands in the way.',
  splash: 'Do not stand near the one who casts it. I learned this twice.',
  touch: 'Put your own hand on it. The only one you can trust.',
  strike: 'Two to the face. Nothing clever, nothing lost.',
  shove: 'Pushing is cheap. Where the thing lands is never cheap.',
  guard: 'A shield is not armour, my teacher said. It still stops a blow.',
  ink: 'What I mark, the next rune finds. Ask the Draughtsman.',
  oil: 'Never in a room with a Stoker. Always in a room with a Stoker.',
  steam: 'Hides a man. Hides a rat. Does not hide from a spark.',
  brass: 'Cold to the touch until the spark finds it.',
  spark: 'Small, quick, and everywhere the right things touch.',
  fork: 'Left first. Always left first. Remember it.',
  bend: 'The page turns; so does the flow.',
  jar: 'Seal the rest and walk away. Someone always steps in it.',
  fuse: 'Light it and be far enough off when it goes.',
  afterglow: 'The light stays on a while after you leave the room.',
  sentence: 'A debt paid in a straight line. Collect it before it sours.',
  levy: 'Everyone pays the levy. The Notary keeps the shield.',
  tally: 'Count first. Two things, then it is worth the ink.',
  vat: 'A broad pan. Keep the edges where you can see them.',
  seep: 'It spreads to the neighbours, like gossip in a bathhouse.',
  steep: 'Let it sit and it soaks outward, a tile at a time.',
  hold: 'Keep it still. A still thing is an easy thing.',
  brink: 'Stand near the edge and the rest takes notice.',
  lay: 'Once laid, it stays. Mind what you lay down.',
  toll: 'Ring the same note in every tile it touches.',
  coil: 'Tighten it and the effect reaches a little further.',
  unison: 'Two apprentices, one target, one moment. Worth the wait.',
  swap: 'Trade places and see who is surprised.',
  draw: 'Pull the tile along the heading, and what sits on it comes too.',
  erase: 'Rub it out. Whatever was written in the margin goes with it.',
};

const RUNE_HINTS: Partial<Record<RuneId, string>> = {
  bolt: 'What flies straight is the easiest thing to learn, and the hardest to stop.',
  splash: 'Some things burst. Keep your own feet out of the mess.',
  ink: 'The first mark. Put it on something and see who notices.',
  oil: 'Pour it on the floor, then watch what the floor does to whatever crosses it.',
  spark: 'It jumps to the next thing, if the next thing will hold it.',
  steam: 'Hot and wet. Find out what it does to a fire.',
  brass: 'Solid, cold metal. Ask what passes through it, and what does not.',
  bend: 'A line can take a corner and keep its speed.',
  fork: 'Two roads from one. Which one goes first is a matter of habit.',
};

/** Compounds (design §4.2): what each one is, once it lingers. */
const COMPOUNDS: Record<CompoundId, { name: string; text: string; note: string }> = {
  deepMark: {
    name: 'Deep Mark',
    text: 'A mark that takes two sparks to clear.',
    note: 'Ink that has settled in. Be patient with it.',
  },
  stain: {
    name: 'Stain',
    text: 'Marks any unit that ends its move on it.',
    note: 'Walk carefully across my floor.',
  },
  brandCloud: {
    name: 'Brand Cloud',
    text: 'A cloud that marks every unit inside it at round end.',
    note: 'Everyone who breathes it goes home with a mark.',
  },
  shackle: {
    name: 'Shackle',
    text: 'A brass-bound unit that cannot move by itself for a while.',
    note: 'Pinned, not beaten. Good enough for a Tuesday.',
  },
  pool: {
    name: 'Pool',
    text: 'Slick on the tile and its four neighbours.',
    note: 'Too much oil for one tile. Spread it thin, or do not spread it.',
  },
  greaseFog: {
    name: 'Grease Fog',
    text: 'A cloud in which pushed units slide until they leave it.',
    note: 'You cannot see your feet, and neither can they.',
  },
  skidPlate: {
    name: 'Skid Plate',
    text: 'A plate that slides when shoved, until it hits something.',
    note: 'It goes where it is sent. Sending it is the trick.',
  },
  bank: {
    name: 'Bank',
    text: 'A thick cloud that lasts longer than the others.',
    note: 'Like a savings account. Pays out late, and more.',
  },
  kettle: {
    name: 'Kettle',
    text: 'A hot plate; units beside it at round end take 1.',
    note: 'Never touch it. I know a man who touched it.',
  },
  wall: {
    name: 'Wall',
    text: 'A plate that takes two hits to break.',
    note: 'The one thing in the Seam that stays where you put it.',
  },
};

/** Bursts (design §4.3): what Spark does to each layer. The page entries are `page:<compound>`. */
const BURST_PAGES: Record<BurstId, { name: string; text: string; note: string }> = {
  detonation: {
    name: 'Detonation',
    text: 'Spark on a mark: 3 to the marked unit, and the mark is spent.',
    note: 'A small bang, and a large amount of mess.',
  },
  fire: {
    name: 'Fire',
    text: 'Spark on oil: 2 now, and the fire runs along the connected oil.',
    note: 'Wide, then wet, then lit. In that order or not at all.',
  },
  storm: {
    name: 'Storm',
    text: 'Spark on a cloud: 2 to every unit in the connected cloud.',
    note: 'The whole room gets wet at once.',
  },
  conduct: {
    name: 'Conduct',
    text: 'Spark on brass: 2 to every unit on or touching the connected brass.',
    note: 'Metal remembers. Stand off it.',
  },
  surge: {
    name: 'Surge',
    text: 'Spark on a fire: 3 to the unit in it, and an arc of 1 to the nearest other unit.',
    note: 'Two sparks for the price of one fire.',
  },
  'page:deepMark': {
    name: 'Clearing',
    text: 'Spark on a deep mark: 3 damage, and it is left a plain mark.',
    note: 'It does not come off all at once. Neither does the bill.',
  },
  'page:stain': {
    name: 'Inkfire',
    text: 'Spark on a stain: fire that marks whoever it hits.',
    note: 'Ink burns, and the smoke gets on everyone.',
  },
  'page:brandCloud': {
    name: 'Brand Storm',
    text: 'Spark on a brand cloud: a storm that hits marked units twice.',
    note: 'Marked is marked. Twice is twice.',
  },
  'page:shackle': {
    name: 'Snapping',
    text: 'Spark on a shackle: 3 damage, and the unit is thrown one tile.',
    note: 'The chain goes. The unit goes with it.',
  },
  'page:pool': {
    name: 'Flare-up',
    text: 'Spark on a pool: the whole of it goes up at once, for 3.',
    note: 'One match, one room, no second chances.',
  },
  'page:greaseFog': {
    name: 'Flashover',
    text: 'Spark on grease fog: a storm, then every fog tile burns for a round.',
    note: 'The fog was hiding something. Now it is hiding nothing.',
  },
  'page:skidPlate': {
    name: 'Skid Shot',
    text: 'Spark on a skid plate: it shoots along the heading for 3 damage and a push.',
    note: 'Aim it before you light it.',
  },
  'page:bank': {
    name: 'Thunderhead',
    text: 'Spark on a bank: a storm now, and another at round end.',
    note: 'It keeps its promises, and its timing.',
  },
  'page:kettle': {
    name: 'Blowout',
    text: 'Spark on a kettle: 2 to the units beside it, and it leaves steam.',
    note: 'The steam is the only thing left of the argument.',
  },
  'page:wall': {
    name: 'Ringing',
    text: 'Spark on a wall: it rings, and everyone touching it takes 1 and is pushed a tile away.',
    note: 'Loud enough to be heard in the next district.',
  },
};

/** Methods (design §6.2): the text is the method's fact, the headline template is in methods.ts. */
const METHOD_PAGES: Record<MethodId, { text: string; note: string }> = {
  conduct: {
    text: 'An Action that travels the connected brass the target touches, reaching each unit on it once.',
    note: 'Brass is a good conductor of anything, including bad news.',
  },
  repeat: {
    text: 'An Action that happens now and once more next turn, on the same tile.',
    note: 'Say it twice. The second time it lands harder.',
  },
  margin: {
    text: 'Turns a Repeat into an aura: Actions on touching paths repeat next turn.',
    note: 'The echo of an echo is still an echo.',
  },
  bind: {
    text: 'A mark that holds an Action until its bearer is hit, enters a tile, is pushed or dies.',
    note: 'Sign it, seal it, and let the bearer find out later.',
  },
  lift: {
    text: "An Action on a unit that moves the target's mark, with whatever it holds, to an adjacent unit.",
    note: 'The debt was never the bearer. It was always the mark.',
  },
};

const SOLVENT_NOTES: Record<SolventId, string> = {
  gallnut: 'It stains everything it touches, including the man who mixed it.',
  cinder: 'Keep it out of the oil. The oil is impatient.',
  pitch: 'It floats, which is more than I can say for my notes.',
  wick: 'Give it a round to think about it.',
  wax: 'It holds its shape until the fire tells it otherwise.',
  sand: 'Sand gets in everything, and the everything gets back at you.',
  bathSalt: 'The good salt. Use it in the bathhouse, not in the kitchen.',
  fogJar: 'Seal the fog in a jar, and it keeps its manners.',
  mortar: 'It holds the bridge together and gives the push a bit more reach.',
  chalk: 'Mark the reach before you go. It helps with the walk home.',
  rivet: 'Hold it fast. A riveted thing is a thing that stays put.',
  filings: 'A pinch of metal for the ring. Use less than you think.',
  quicksilver: 'It runs both ways across the board. Count your fingers after.',
  graphite: 'Write it in pencil. Things undo themselves, eventually.',
};

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** The distinct compounds the mix table makes, in table order. */
export const COMPOUND_IDS: readonly CompoundId[] = [...new Set(MIXES.map((m) => m.makes))];

/** Every burst the burst table names: the five plain bursts and the ten burst-page entries. */
export const BURST_IDS: readonly BurstId[] = BURSTS.map((b) => b.burst);

export const CODEX: readonly CodexEntryDef[] = [
  ...RUNE_IDS.map(
    (id): CodexEntryDef => ({
      id: `rune:${id}`,
      kind: 'rune',
      ref: id,
      title: RUNES[id].name,
      text: RUNES[id].headline,
      ownerNote: RUNE_NOTES[id],
      ...(RUNE_HINTS[id] ? { hint: RUNE_HINTS[id] } : {}),
    }),
  ),
  ...COMPOUND_IDS.map(
    (id): CodexEntryDef => ({
      id: `compound:${id}`,
      kind: 'compound',
      ref: id,
      title: COMPOUNDS[id].name,
      text: COMPOUNDS[id].text,
      ownerNote: COMPOUNDS[id].note,
    }),
  ),
  ...BURST_IDS.map(
    (id): CodexEntryDef => ({
      id: `burst:${id}`,
      kind: 'burst',
      ref: id,
      title: BURST_PAGES[id].name,
      text: BURST_PAGES[id].text,
      ownerNote: BURST_PAGES[id].note,
    }),
  ),
  ...METHOD_IDS.map(
    (id): CodexEntryDef => ({
      id: `method:${id}`,
      kind: 'method',
      ref: id,
      title: METHODS[id].name,
      text: METHOD_PAGES[id].text,
      ownerNote: METHOD_PAGES[id].note,
    }),
  ),
  ...SOLVENT_IDS.map(
    (id): CodexEntryDef => ({
      id: `solvent:${id}`,
      kind: 'solvent',
      ref: id,
      title: SOLVENTS[id].name,
      text: `Bends the invention so that ${lowerFirst(SOLVENTS[id].rule)}`,
      ownerNote: SOLVENT_NOTES[id],
    }),
  ),
  ...IDIOMS.map(
    (i): CodexEntryDef => ({
      id: `idiom:${i.id}`,
      kind: 'idiom',
      ref: i.id,
      title: i.name,
      text: i.rule,
      ownerNote: i.ownerNote,
    }),
  ),
];

/**
 * The rival's personal trick as the page shows it (rivals P12): named, and marked as his alone.
 * The trick is never part of a recovered page or its Bench trial (rivals §3).
 */
export const RIVAL_TRICK_TEXT: Readonly<Record<string, { name: string; text: string }>> = {
  'canals:longWick': {
    name: 'The long wick',
    text: 'He opens his jar from afar. His alone, not in the trial.',
  },
};
