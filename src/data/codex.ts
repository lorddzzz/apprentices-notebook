import { IDIOMS } from './idioms';
import { METHOD_IDS, METHODS } from './methods';
import { RUNE_IDS, RUNES } from './runes';
import type { CodexEntryDef, RuneId } from './types';

/**
 * The codex (P6): rune pages, method pages and idioms. Named results (compounds, bursts) and
 * per-rune fine print come with U6 and C1; runes without a note yet get theirs from C1.
 */

const RUNE_NOTES: Partial<Record<RuneId, string>> = {
  bolt: 'Straight and honest. Mind what stands in the way.',
  splash: 'Do not stand near the one who casts it. I learned this twice.',
  ink: 'What I mark, the next rune finds. Ask the Draughtsman.',
  oil: 'Never in a room with a Stoker. Always in a room with a Stoker.',
  spark: 'Small, quick, and everywhere the right things touch.',
  steam: 'Hides a man. Hides a rat. Does not hide from a spark.',
  brass: 'Cold to the touch until the spark finds it.',
  bend: 'The page turns; so does the flow.',
  fork: 'Left first. Always left first. Remember it.',
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

export const CODEX: readonly CodexEntryDef[] = [
  ...RUNE_IDS.map(
    (id): CodexEntryDef => ({
      id: `rune:${id}`,
      kind: 'rune',
      ref: id,
      title: RUNES[id].name,
      text: RUNES[id].headline,
      ownerNote: RUNE_NOTES[id] ?? '',
      ...(RUNE_HINTS[id] ? { hint: RUNE_HINTS[id] } : {}),
    }),
  ),
  ...METHOD_IDS.map(
    (id): CodexEntryDef => ({
      id: `method:${id}`,
      kind: 'method',
      ref: id,
      title: METHODS[id].name,
      text: METHODS[id].headline,
      ownerNote: '',
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
