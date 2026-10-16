import { ASPECT_IDS, ASPECTS, SOLVENTS } from './aspects';
import { IDIOMS } from './idioms';
import { RECIPES } from './recipes';
import { RUNE_IDS, RUNES } from './runes';
import type { Aspect, CodexEntryDef, InteractionId, RuneId } from './types';

export const INTERACTION_IDS: readonly InteractionId[] = [
  'ignite',
  'conduct',
  'arc',
  'detonate',
  'extinguish',
  'slide',
  'diffuse',
  'heat',
  'stain',
];

const RUNE_NOTES: Record<RuneId, string> = {
  bolt: 'Straight and honest. Mind what stands in the way.',
  splash: 'Do not stand near the one who casts it. I learned this twice.',
  ward: 'It holds exactly as long as you believe it will. Two points, no more.',
  ink: 'What I mark, the next rune finds. Ask the Draughtsman.',
  oil: 'Never in a room with a Stoker. Always in a room with a Stoker.',
  spark: 'Small, quick, and everywhere the right things touch.',
  steam: 'Hides a man. Hides a rat. Does not hide from a spark.',
  brass: 'Cold to the touch until the spark finds it.',
  bend: 'The page turns; so does the flow.',
  fork: 'Left first. Always left first. Remember it.',
  onInked: 'A door that opens only for the marked.',
  onKill: 'Where one falls, three more shall feel it.',
  amplify: 'Loud neighbours make loud spells.',
  echo: 'I swear I only cast it once.',
  quill: 'A bolt that writes where it lands.',
  smear: 'Touch one, and the whole crowd wears it.',
  torch: 'Why wait for the spark? Bring it with you.',
  fog: 'A wet floor under a wet sky.',
  mist: 'The cloud remembers every face, then forgets itself.',
  brand: 'A mark that wants to burn.',
  pierce: 'Through the first, and stopped only by the second.',
  onIgnite: 'Let the fire decide where the next one goes.',
  thrift: 'Waste nothing. Least of all a charge.',
  scald: 'Hot water in a closed room. Keep your hands out of it.',
  etch: 'The acid bites where the ink has been. The brass keeps the mark.',
  kiln: 'Fired, not forged. It stays warm for a while.',
};

const RUNE_HINTS: Record<RuneId, string> = {
  bolt: 'What flies straight is the easiest thing to learn, and the hardest to stop.',
  splash: 'Some things burst. Keep your own feet out of the mess.',
  ward: 'Something small that keeps the blow off somebody who is not you.',
  ink: 'The first mark. Put it on something and see who notices.',
  oil: 'Pour it on the floor, then watch what the floor does to whatever crosses it.',
  spark: 'It jumps to the next thing, if the next thing will hold it.',
  steam: 'Hot and wet. Find out what it does to a fire.',
  brass: 'Solid, cold metal. Ask what passes through it, and what does not.',
  bend: 'A line can take a corner and keep its speed.',
  fork: 'Two roads from one. Which one goes first is a matter of habit.',
  onInked: 'A gate that opens only for the marked. Look for what the mark already did.',
  onKill: 'Some things carry on after the last blow.',
  amplify: 'Some things grow louder in company. Try them in a crowd.',
  echo: 'A spell that says the same thing twice, a turn later.',
  quill: 'Something writes as it flies. Ask what it leaves behind.',
  smear: 'Ink that will not stay on one unit. Find out who it passes to.',
  torch: 'Oil that lights itself as it lands. Lay it in a line.',
  fog: 'Two things that do not mix well. Mix them anyway, slowly.',
  mist: 'Steam with a memory. Watch what it leaves on whoever it touched.',
  brand: 'A mark that the fire will come looking for.',
  pierce: 'A line that does not stop at the first thing it meets.',
  onIgnite: 'It waits to see whether the floor has caught before it moves.',
  thrift: 'Some things get cheaper the second time you use them.',
  scald: 'Hot, wet air that does not go away on its own.',
  etch: 'Something that eats into metal and stays. Ink knows the way in.',
  kiln: 'Clay in a fire, but for metal. What comes out is already warm.',
};

const INTERACTIONS: Record<InteractionId, { title: string; text: string; ownerNote: string }> = {
  ignite: {
    title: 'Ignite',
    text: 'A spark or fire next to oil lights it. Fire spreads through connected oil and burns what stands on it for 2 rounds.',
    ownerNote: 'The whole puddle goes at once. I lost a good coat to this.',
  },
  conduct: {
    title: 'Conduct',
    text: 'Spark runs through connected brass: plates, brass sentries and coated units.',
    ownerNote: 'Brass remembers every touch. It passes it on.',
  },
  arc: {
    title: 'Arc',
    text: 'Spark leaps through a whole steam cloud, hitting every unit inside it.',
    ownerNote: 'Fog is only a slow lightning rod.',
  },
  detonate: {
    title: 'Detonate',
    text: 'Spark or fire on an inked unit that survives sets the ink off for 2 damage, consuming the mark.',
    ownerNote: 'Mark first, then burn. The order matters.',
  },
  extinguish: {
    title: 'Extinguish',
    text: 'Steam puts out fire. The oil underneath stays, ready for next time.',
    ownerNote: 'Water wins, but only for an afternoon.',
  },
  slide: {
    title: 'Slide',
    text: 'A shoved unit keeps sliding while it stands on oil, until it hits a blocker or dry floor.',
    ownerNote: 'The floor does half the work. Shove, and let it go.',
  },
  diffuse: {
    title: 'Diffuse',
    text: 'Ink thrown into steam spreads through the whole cloud and marks every unit in it.',
    ownerNote: 'Even the shy ones get marked in the end.',
  },
  heat: {
    title: 'Heat',
    text: 'Fire next to brass, or under it, heats that plate or unit for 2 rounds. At the end of each round, hot brass deals 1 to every unit beside it.',
    ownerNote: 'It keeps the heat a while, and shares it with whoever stands close.',
  },
  stain: {
    title: 'Stain',
    text: 'Ink landing on oil stains the puddle. A unit that ends a move on a stained tile is inked. Fire burns the stain away with the oil.',
    ownerNote: 'A trap is only a puddle someone forgot to walk around.',
  },
  drift: {
    title: 'Drift',
    text: 'At round end, whatever floats on a water lane moves one tile downstream: oil, fire on oil, ink. Units in the water drift too.',
    ownerNote: 'Put it in upstream and wait.',
  },
};

const INTERACTION_HINTS: Record<InteractionId, string> = {
  ignite: 'Some floors only need a reason.',
  conduct: 'The metal keeps passing it along, plate to plate.',
  arc: 'Something jumps the gap when the gap is full of the right air.',
  detonate: 'A mark is patient, until something hot comes to visit.',
  extinguish: 'Something cold and wet makes fire go quiet, for a while.',
  slide: 'Push something across the right floor, then let go.',
  diffuse: 'Ink dropped into a cloud does not stay in one place.',
  heat: 'Warm metal stays warm longer than you would think.',
  stain: 'Ink on a puddle does not stay on the surface.',
  drift: 'The water does not stay still, and neither does what is on it.',
};

/** Recipes with a torn solvent get no hint (their torn sentence is the hint). */
const RECIPE_HINTS: Record<string, string> = {
  fog: 'I wanted the floor and the air both against them at once.',
  quill: 'A shot that leaves something behind where it lands.',
  brand: 'A mark the fire would know from across the room.',
  scald: 'A cloud that does not only hide them. It hurts.',
  etch: 'A mark the metal keeps long after the ink is dry.',
  kiln: 'A wall that comes up already too hot to touch.',
};

const ASPECT_READS: Record<Aspect, string> = {
  reach: 'Travels, lands at a distance.',
  mark: 'Singles out a target.',
  slick: 'Coats the floor, spreads, slides.',
  heat: 'Burns, ignites.',
  charge: 'Conducts, empowers.',
  vapor: 'Fills an area.',
  hold: 'Blocks, shields, holds back.',
  return: 'Repeats, branches, reacts.',
};

const ASPECT_NOTES: Record<Aspect, string> = {
  reach: 'It was never the arrow. It was the distance.',
  mark: 'Whoever is marked is already spoken for.',
  slick: 'Nothing stays put on it, and nothing wants to.',
  heat: 'It remembers being warm. Ask the Stoker.',
  charge: 'It wants to go somewhere. Let it, carefully.',
  vapor: 'Fill the room and nobody can say where it began.',
  hold: 'Hold it long enough and it becomes a wall.',
  return: 'Every road in this spell comes back to the start.',
};

const ASPECT_HINTS: Record<Aspect, string> = {
  reach: 'The thing that lets a spell go further than your hand.',
  mark: 'What the ink does before anything else happens.',
  slick: 'Something you cannot stand still on.',
  heat: 'What is warm, and what makes other things warm.',
  charge: 'What the brass and the spark both carry.',
  vapor: 'The thing that fills a room and forgets its edges.',
  hold: 'What stops a thing from going where it wants.',
  return: 'A spell that comes back to where it started.',
};

const IDIOM_TEXT: Record<string, string> = {
  cashingIn: 'A source, a trigger that reads Mark, then a payload with Heat or Charge.',
  bonfire: 'An area source with Vapor, then a Slick material, then a Heat material.',
  undertaker: 'A source, then a Return trigger with Vapor (On Kill), then an area material.',
};

const IDIOM_HINTS: Record<string, string> = {
  cashingIn: 'The trigger needs to see a mark the same cast just made.',
  bonfire: 'Some arrangements of area and oil go up all at once.',
  undertaker: 'Look at what happens after the last blow, then at what sits next to it.',
};

export const CODEX: readonly CodexEntryDef[] = [
  ...RUNE_IDS.map(
    (id): CodexEntryDef => ({
      id: `rune:${id}`,
      kind: 'rune',
      ref: id,
      title: RUNES[id].name,
      text: RUNES[id].rule,
      ownerNote: RUNE_NOTES[id],
      hint: RUNE_HINTS[id],
    }),
  ),
  ...INTERACTION_IDS.map(
    (id): CodexEntryDef => ({
      id: `interaction:${id}`,
      kind: 'interaction',
      ref: id,
      ...INTERACTIONS[id],
      hint: INTERACTION_HINTS[id],
    }),
  ),
  ...RECIPES.map(
    (r): CodexEntryDef => ({
      id: `recipe:${r.id}`,
      kind: 'recipe',
      ref: r.id,
      title: RUNES[r.result].name,
      text: `${RUNES[r.left].name} + ${RUNES[r.right].name} + ${SOLVENTS[r.solvent].name}: ${RUNES[r.result].rule}`,
      ownerNote: r.ownerNote,
      ...(r.torn === null ? { hint: RECIPE_HINTS[r.id] } : {}),
    }),
  ),
  ...IDIOMS.map(
    (i): CodexEntryDef => ({
      id: `idiom:${i.id}`,
      kind: 'idiom',
      ref: i.id,
      title: i.name,
      text: IDIOM_TEXT[i.id] ?? '',
      ownerNote: i.ownerNote,
      hint: IDIOM_HINTS[i.id],
    }),
  ),
  ...ASPECT_IDS.map(
    (a): CodexEntryDef => ({
      id: `aspect:${a}`,
      kind: 'aspect',
      ref: a,
      title: `${ASPECTS[a].glyph} ${ASPECTS[a].name}`,
      text: `${ASPECT_READS[a]} Carried by ${SOLVENTS[ASPECTS[a].solvent].name}.`,
      ownerNote: ASPECT_NOTES[a],
      hint: ASPECT_HINTS[a],
    }),
  ),
];
