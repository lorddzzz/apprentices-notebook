import { RUNE_IDS, RUNES } from './runes';
import type { CodexEntryDef, InteractionId, RuneId } from './types';

export const INTERACTION_IDS: readonly InteractionId[] = [
  'ignite',
  'conduct',
  'arc',
  'detonate',
  'extinguish',
  'slide',
  'diffuse',
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
];
