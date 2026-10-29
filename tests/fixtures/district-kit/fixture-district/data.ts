import type { EncounterDef, EncounterVariant, LootTableId } from '$data';
import type { DistrictData } from '$data/districts/index';
import type { EnemyScript } from '$engine/districts/types';

/**
 * The fixture district's data: the file a district build adds as `src/data/districts/<id>.ts`
 * and lists in `src/data/districts/index.ts` (DISTRICTS, DISTRICT_IDS). Test only: the fixture
 * borrows the bridges' id (a stub with no rooms and no module), so a real district swaps
 * `bridges` for its own id everywhere, `KitId`s included.
 *
 * Four rooms: the approach, a span choice, the far side, the heart.
 */

const board = (rows: readonly string[]): string => rows.join('\n');

/**
 * Each start point `P` has a `{plank}` to its right and a `{gap}` below, so the walk can act
 * from either start point whichever apprentice draws it. The rat waits far off.
 */
const SPAN = board([
  'P {plank} . . . .',
  '{gap} . . . . .',
  '. . . . . r',
  'P {plank} . . . .',
  '{gap} . . . . .',
]);

/** The heart: the stand-in `d` (a scripted dummy) and the plank its step drops a stone on. */
const HEART = board(['P . . . . .', '. . {plank} . d .', 'P . . . . .']);

/** One room from its variants (as `canals.ts` does); `layout` is the first variant's board. */
function room(
  id: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: LootTableId,
  heart = false,
): EncounterDef {
  const title = variants[0]?.name ?? id;
  const layout = variants[0]?.layout ?? '';
  return { id, title, depth, layout, variants, loot, picks: heart ? 2 : 1, heart };
}

export const FIXTURE_ROOMS: readonly EncounterDef[] = [
  room('fx-1', 1, [{ name: 'The approach', layout: SPAN }], 'shallow'),
  // Span choice: the Crossroads before this room fixes the variant pool (`choices`, P4).
  room(
    'fx-2',
    2,
    [
      { name: 'The high span', layout: SPAN },
      { name: 'The low span', layout: SPAN },
    ],
    'shallow',
  ),
  room('fx-3', 3, [{ name: 'The far side', layout: SPAN }], 'deep'),
  room('fx-heart', 4, [{ name: 'The keystone', layout: HEART }], 'heart', true),
];

export const FIXTURE_DATA: DistrictData = {
  id: 'bridges',
  name: 'The fixture span',
  guild: 'The fixture wardens',
  // Edge rule (P3): `drop` pushes off the board edge; the gap piece is the kit's own fall.
  edge: 'wall',
  rooms: FIXTURE_ROOMS,
  // Return policy (P3): home after rooms 0 and 1, then none until the heart.
  ret: { kind: 'until', after: 1 },
  // Checkpoint (P5): the doorway after room 1; later trips may start past it, with no way back.
  checkpoint: { after: 1, name: 'The doorway' },
  // Hearing (P12): conditions over core kinds; a module's own kinds are not read yet (see test).
  hear: [{ kind: 'trips', atLeast: 1, voice: 'rumour' }],
  gate: { kind: 'drawing' },
  map: { x: 75, y: 43, label: 'above' },
  lean: { lean: 'height', text: 'Height, the drop' },
  line: 'a fixture to copy',
  barred: 'The page is still being drawn.',
};

/**
 * The stand-in heart's script (P14), data on the heart's foe (`EnemyDef.script`): the module's
 * `bridges:stone` step every round; `standIn` clears the heart without a rival page. A district
 * adds its own foe in `src/data/enemies.ts`; the fixture lends it to the dummy.
 */
export const STAND_IN: EnemyScript = { steps: ['bridges:stone'], standIn: true };
