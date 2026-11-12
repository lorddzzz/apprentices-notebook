import { expect, test } from 'vitest';
import { CHEMISTRY, TUNING } from '$data';
import { type BattleState, parseLabel, tileAt } from '$engine';
import { runDraft } from '$engine/ctx';
import { crackedTiles } from '$engine/districts/api';
import { landKind } from '$engine/mix';
import { flowFor, heading, tile } from '../chemHarness';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { board } from '../harness';
import { step } from './castHelper';

/** BR-19a: Lay's one margin line (`lay:cracked`) and its two capstones. */

const at = parseLabel;
const FLOOR = 'D . . . .\n{span} {span} . . .\n. . . . d';

/** Lays `kind` on `where`, heading right, with Lay upstream. */
function lay(s: BattleState, kind: 'brass' | 'steam', where: string, fns: readonly string[]) {
  return runDraft(
    s,
    (ctx) =>
      landKind(
        ctx,
        kind,
        tile(where),
        flowFor(s, { lay: true, headings: new Map([heading(tile(where), 'right')]) }),
      ),
    { footnotes: withFootnotes(fns) },
  );
}

const layerOf = (s: BattleState, l: string) => {
  const st = tileAt(s, at(l)).state;
  return st ? { id: st.id, hits: st.hits, rounds: st.rounds, set: st.set === true } : null;
};

test('lay:cracked fourCombos: spent or both, then cloud or last', () => {
  const runs = fourCombos(
    'lay:cracked',
    ['lay-cracked-spent', 'lay-cracked-both'],
    ['lay-cracked-cloud', 'lay-cracked-last'],
    ({ l1, l2 }) => {
      const fns = [l1, l2];
      // A plate set on the cracked B2, then the dusk with a burning rat on the cracked A2.
      const laid = lay(board(FLOOR), 'brass', 'B2', fns);
      const s = board(FLOOR);
      s.units.push({
        ...structuredClone(board('r . . . .').units[0] as BattleState['units'][number]),
        pos: at('A2'),
      });
      tileAt(s, at('A2')).state = { id: 'fire', rounds: 0, set: true, origin: null };
      const dusk = step(s, { type: 'endTurn' }, withFootnotes(fns));
      return {
        plate: layerOf(laid.state, 'B2'),
        copy: layerOf(laid.state, 'B1'),
        burned: dusk.events.some(
          (e) => e.type === 'damage' && e.source === 'Fire' && e.line === 'lay:cracked',
        ),
        cloud: dusk.events.some(
          (e) => e.type === 'landed' && e.makes === 'cloud' && e.line === 'lay:cracked',
        ),
      };
    },
  );
  const [spentCloud, spentLast, bothCloud, bothLast] = runs.map((r) => r.result);
  const plain = CHEMISTRY.plateHits;
  expect(spentCloud?.plate).toMatchObject({ set: true, hits: plain + 1 });
  expect(spentCloud?.copy).toBeNull();
  expect(spentCloud).toMatchObject({ cloud: true, burned: false });
  expect(spentLast).toMatchObject({ cloud: false, burned: true });
  // both: the copy stands on the nearest standing tile (B1), set, at the plate's own strength.
  expect(bothCloud?.plate).toMatchObject({ set: true, hits: plain });
  expect(bothCloud?.copy).toMatchObject({ id: 'plate', set: true, hits: plain });
  expect(bothLast).toMatchObject({ cloud: false, burned: true });
});

test('lay-cap-footing: a plate Lay sets into a span tile counts as a pier for that tile', () => {
  const ascii = 'D . . . .\n{span} {span} {span} . .\n. . . . d';
  const crackedAfter = (fns: string[]) => {
    const laid = lay(board(ascii), 'brass', 'B2', fns);
    const dusk = step(laid.state, { type: 'endTurn' }, withFootnotes(fns));
    return {
      cracked: crackedTiles(laid.state).length,
      fell: dusk.events.some((e) => e.type === 'bridges:collapse'),
    };
  };
  expect(crackedAfter([])).toEqual({ cracked: 3, fell: true });
  expect(crackedAfter(['lay-cap-footing'])).toEqual({ cracked: 0, fell: false });
});

test('lay-cap-trail: Lay also sets a copy one round shorter into the tile behind the target', () => {
  const run = (fns: string[]) => lay(board(FLOOR), 'steam', 'C2', fns).state;
  expect(layerOf(run([]), 'B2')).toBeNull();
  const trail = run(['lay-cap-trail']);
  expect(layerOf(trail, 'C2')).toMatchObject({ id: 'cloud', set: true });
  expect(layerOf(trail, 'B2')).toMatchObject({
    id: 'cloud',
    set: false,
    rounds: TUNING.cloudRounds - 1,
  });
});
