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
  pierce: 'TODO(D1)',
  onIgnite: 'TODO(D1)',
  thrift: 'TODO(D1)',
  scald: 'TODO(D1)',
  etch: 'TODO(D1)',
  kiln: 'TODO(D1)',
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
    text: 'TODO(D1): fire next to brass heats it; hot brass scalds its neighbours at the end of the round.',
    ownerNote: 'TODO(D1)',
  },
  stain: {
    title: 'Stain',
    text: 'TODO(D1): ink on oil stains it; whoever ends a move there is inked.',
    ownerNote: 'TODO(D1)',
  },
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

const IDIOM_TEXT: Record<string, string> = {
  cashingIn: 'A source, a trigger that reads Mark, then a payload with Heat or Charge.',
  bonfire: 'An area source with Vapor, then a Slick material, then a Heat material.',
  undertaker: 'A source, then a Return trigger with Vapor (On Kill), then an area material.',
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
    }),
  ),
  ...INTERACTION_IDS.map(
    (id): CodexEntryDef => ({
      id: `interaction:${id}`,
      kind: 'interaction',
      ref: id,
      ...INTERACTIONS[id],
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
    }),
  ),
];
