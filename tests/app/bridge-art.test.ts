import { describe, expect, test } from 'vitest';
import { BRIDGE_ROOMS_12 } from '$data/districts/bridges';
import { type Action, applyAction, type BattleState, scenarioBattle } from '$engine';
import { cracksOf } from '$engine/districts/bridges/support';
import { fallenTiles } from '../../src/app/describe';
import { fxFor } from '../../src/app/fx';
import { BRIDGE_LAB_ROOMS, fallbackLattices } from '../../src/app/lab';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';
import { BRIDGES_UI, isBridgeDef } from '../../src/ui/districts/bridges';
import { bridgeArtOf, crackedTiles, hasBridges } from '../../src/ui/districts/bridges/board';
import { carryArrow, chalkOf, perimeter } from '../../src/ui/districts/bridges/view';

/** BR-14: the bridges' board art reads the same floor the engine does. */

const lab = (board: string): BattleState =>
  scenarioBattle({ board }, { lab: true, lattices: fallbackLattices() });
const keys = (cs: readonly { x: number; y: number }[]) => cs.map((c) => `${c.x},${c.y}`);
const endTurn: Action = { type: 'endTurn' };

describe('the view carries the stone and the cracks', () => {
  const boards = [
    ...BRIDGE_ROOMS_12.flatMap((r) => r.variants.map((v) => [v.name, v.layout] as const)),
    ...BRIDGE_LAB_ROOMS.map((s) => [s.id, s.board] as const),
  ];
  test.each(boards)('%s: the view’s cracked set equals the engine’s', (_name, board) => {
    const s = lab(board);
    const v = viewOf(s);
    expect(hasBridges(v)).toBe(true);
    expect(keys(crackedTiles(v))).toEqual(keys(cracksOf(s)));
  });

  test('a board with no bridge pieces is untouched', () => {
    expect(hasBridges(viewOf(lab('D . . .\n. . . S')))).toBe(false);
  });

  test('stone reads from the piece data: sound is full, a lone cut-off tile is cracked', () => {
    const v = viewOf(lab('{span:2} _ {span:1}\n_ _ _'));
    const sound = bridgeArtOf(v.tiles[0]?.piece?.data);
    expect(sound).toMatchObject({ stone: 2, max: 2, cracked: true });
    const thin = bridgeArtOf(v.tiles[2]?.piece?.data);
    expect(thin).toMatchObject({ stone: 1, max: 1, cracked: true });
    // beside a pier a span is held up
    const held = bridgeArtOf(viewOf(lab('{pier} {span:2}')).tiles[1]?.piece?.data);
    expect(held.cracked).toBe(false);
  });
});

describe('playback keeps the view in step with the engine', () => {
  const board = ['{pier} {span} {span} _', '_ _ _ _', 'D{span} {span} {span} S{span}'].join('\n');

  test('a collapse at dusk drops the cracked tiles to fog in the projected view', () => {
    const before = lab(board);
    const first = viewOf(before);
    expect(keys(crackedTiles(first)).length).toBe(4);
    const r = applyAction(before, endTurn);
    const fell = r.events.find((e) => e.type === 'bridges:collapse');
    expect(fell).toBeDefined();
    const projected = r.events.reduce<BoardView>((v, e) => projectWith(v, e), first);
    const after = viewOf(r.state);
    const shape = (v: BoardView) =>
      v.tiles.map((t) => [t.drop === true, t.piece?.id ?? null, crackedTiles(v).length]);
    expect(shape(projected)).toEqual(shape(after));
  });

  test('a collapse event plays as a fall fx over exactly its tiles', () => {
    const r = applyAction(lab(board), endTurn);
    const e = r.events.find((x) => x.type === 'bridges:collapse');
    if (!e) throw new Error('no collapse');
    const fx = fxFor(e, viewOf(lab(board)));
    expect(fx).toHaveLength(1);
    expect(fx[0]).toMatchObject({ kind: 'fall' });
    expect(fallenTiles(e)).toEqual(fx[0]?.kind === 'fall' ? fx[0].cells : []);
    expect(fallenTiles({ type: 'bathhouses:boilOver', data: { tiles: [{ x: 1, y: 1 }] } })).toEqual(
      [],
    );
  });
});

describe('worn stone is projected as it happens', () => {
  test('a crush chips both span tiles: the projected view equals the engine’s', () => {
    const s = lab(
      ['{pier} {span} {span} {span} _', 'S{span} r{span} r{span} {span} {span}'].join('\n'),
    );
    const first = viewOf(s);
    const r = applyAction(s, { type: 'shove', unit: 'stoker', dir: 'right' });
    expect(r.events.some((e) => e.type === 'bridges:stoneWorn')).toBe(true);
    const projected = r.events.reduce<BoardView>((v, e) => projectWith(v, e), first);
    const stones = (v: BoardView) => v.tiles.map((t) => bridgeArtOf(t.piece?.data));
    expect(stones(projected)).toEqual(stones(viewOf(r.state)));
    expect(stones(projected).some((a) => a.stone === 1 && a.max === 2)).toBe(true);
  });
});

describe('the board readers', () => {
  test('the outline of a section is its outer edge only', () => {
    const one = perimeter([{ x: 0, y: 0 }]);
    expect((one.match(/M/g) ?? []).length).toBe(4);
    const two = perimeter([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect((two.match(/M/g) ?? []).length).toBe(6);
  });

  test('a carry draws an arrow from the victim to the landing tile, chalk a ring on the victim', () => {
    const arrow = carryArrow({ x: 0, y: 0 }, { x: 2, y: 0 });
    expect(arrow.line).toMatch(/^M\d/);
    expect(arrow.head.startsWith('M')).toBe(true);
    const unit = (label: string, tiles: { x: number; y: number }[]) =>
      ({
        id: 'u',
        alive: true,
        pos: { x: 3, y: 3 },
        intent: {
          kind: 'behaviour',
          id: 'bridges:x',
          order: 1,
          telegraph: { label, tiles, units: [] },
        },
      }) as unknown as BoardView['units'][number];
    expect(chalkOf([unit('chalk', [{ x: 1, y: 1 }])])).toMatchObject([
      { kind: 'chalk', from: { x: 3, y: 3 }, to: { x: 1, y: 1 } },
    ]);
    expect(
      chalkOf([
        unit('carry', [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      ]),
    ).toMatchObject([{ kind: 'carry', from: { x: 1, y: 1 }, to: { x: 2, y: 1 } }]);
    expect(chalkOf([unit('mend', [{ x: 1, y: 1 }])])).toEqual([]);
  });

  test('the module registers the three pieces and draws the three foes', () => {
    expect(Object.keys(BRIDGES_UI.pieceArt ?? {}).sort()).toEqual([
      'bridges:keystone',
      'bridges:pier',
      'bridges:span',
    ]);
    for (const d of ['warden', 'gargoyle', 'mason']) expect(isBridgeDef(d)).toBe(true);
    expect(isBridgeDef('rat')).toBe(false);
  });
});
