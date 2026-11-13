import { describe, expect, it } from 'vitest';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  makePiece,
  memberById,
  newProfile,
  startTrip,
  tileAt,
  unitAt,
} from '$engine';
import { BASIC_ACTIONS } from '$engine/basicActions';
import { checkEnd } from '$engine/ctx';
import { kill } from '$engine/damage';
import { KIT } from '$engine/districts';
import {
  BLANK_PIECE,
  OUTLINE_PIECE,
  PENCIL_PIECE,
  type PencilData,
} from '$engine/districts/cartographers/types';
import { landOnTile } from '$engine/mix';
import { parseBoard, serializeBoard } from '$engine/notation';
import { pieceVoid } from '$engine/pieces';
import { push } from '$engine/push';
import { legalMoves } from '$engine/queries';
import { act, board, cast, draft, parseLabel, withLattices } from '../../scenarios/harness';

/**
 * CG-1: the paper pieces (cartographers-plan P1, P2). `{blank}` is no tile: a void that erases
 * what a push, slide or pull carries onto it (the bridges' fall rule, `removeFromRoom`), solid to
 * walks, foe paths and shots, and it holds nothing. `{pencil}` is standable paper with an optional
 * fate and due round in its notation.
 */

const at = parseLabel;
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const shoveRight = (s: BattleState, who = 'draughtsman') =>
  act(s, { type: 'shove', unit: who, dir: 'right' });
const pieceAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).piece;

describe('CG-1 paper pieces', () => {
  it('CG-1: notation round-trips pencil, blank and fixed fates', () => {
    const ascii = '{pencil} {pencil:ink} {pencil:rub} {pencil:rub@2} {blank} {outline:eraser@3}';
    const spec = parseBoard(ascii);
    expect(spec.tiles.map((t) => t.piece?.id)).toEqual([
      PENCIL_PIECE,
      PENCIL_PIECE,
      PENCIL_PIECE,
      PENCIL_PIECE,
      BLANK_PIECE,
      OUTLINE_PIECE,
    ]);
    expect(spec.tiles.slice(0, 4).map((t) => t.piece?.data)).toEqual([
      { fate: null, due: null },
      { fate: 'ink', due: null },
      { fate: 'rub', due: null },
      { fate: 'rub', due: 2 },
    ] satisfies PencilData[]);
    expect(spec.tiles[5]?.piece?.data).toEqual({ foe: 'eraser', due: 3 });
    const norm = (t: string) => t.replace(/ +/g, ' ');
    expect(norm(serializeBoard(spec))).toBe(norm(ascii));
    expect(serializeBoard(parseBoard(serializeBoard(spec)))).toBe(serializeBoard(spec));
    // `{pencil:rub@2}` through `makePiece` is the same piece the parser built.
    expect(makePiece(PENCIL_PIECE, { fate: 'rub', due: 2 })).toEqual(spec.tiles[3]?.piece);
    for (const bad of ['{pencil:mend}', '{pencil:rub@0}', '{pencil:@2}', '{outline:@2}']) {
      expect(() => parseBoard(bad)).toThrow(/cannot read/);
    }
    expect(KIT.tokens.blank?.void).toBe('erased');
  });

  it('CG-1: shove onto blank erases a member and gives 1 HP back on a win', () => {
    const s = board('D S {blank} . . r', { hp: { B1: 6 } });
    const r = shoveRight(s);
    const stoker = unit(r.state, 'stoker');
    expect(stoker).toMatchObject({ out: 'erased', hp: 6 });
    expect(stoker.pos).toEqual(at('B1')); // it stays on the last tile it entered
    expect(unitAt(r.state, at('B1'))).toBeNull();
    expect(r.events.find((e) => e.type === 'outOfRoom')).toMatchObject({
      unit: { id: 'stoker' },
      cause: 'erased',
    });
    expect(r.events.some((e) => e.type === 'dropped')).toBe(false);
    expect(pieceAt(r.state, 'C1')?.id).toBe(BLANK_PIECE); // the paper is untouched
    expect(r.state.phase).toBe('player'); // the Draughtsman still holds the room

    // The trip hauls her back at 1 HP once the room is won.
    const p = newProfile();
    const t = startTrip(p, 7);
    const b = beginEncounter(p, t).state;
    const [first, second] = t.party;
    if (!first || !second) throw new Error('needs two apprentices');
    const m = memberById(b, first);
    const dir = (['right', 'left', 'down', 'up'] as const).find((d) => {
      const n = {
        x: m.pos.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0),
        y: m.pos.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0),
      };
      return (
        n.x >= 0 &&
        n.y >= 0 &&
        n.x < b.width &&
        n.y < b.height &&
        !unitAt(b, n) &&
        !tileAt(b, n).state &&
        !tileAt(b, n).terrain.drop &&
        !tileAt(b, n).terrain.water
      );
    });
    if (!dir) throw new Error('no free tile beside the first apprentice');
    const to = {
      x: m.pos.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0),
      y: m.pos.y + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0),
    };
    const won = draft(b, (ctx) => {
      tileAt(ctx.s, to).piece = makePiece(BLANK_PIECE);
      push(ctx, memberById(ctx.s, first), dir, 1, null);
      for (const u of ctx.s.units)
        if (u.kind === 'enemy' && u.hp > 0) {
          u.hp = 0;
          kill(ctx, u, false);
        }
      checkEnd(ctx);
    });
    expect(memberById(won.state, first)).toMatchObject({ out: 'erased' });
    expect(won.state.phase).toBe('won');
    const done = finishEncounter(p, t, won.state);
    expect(done.trip?.hp[first]).toBe(1);
    expect(done.trip?.hp[second]).toBe(memberById(b, second).hp);
  });

  it('CG-1: a minion pushed onto blank is gone', () => {
    const r = shoveRight(board('D r {blank} . . r'));
    const rat = unit(r.state, 'rat-1');
    expect(rat).toMatchObject({ hp: 0, out: 'erased' });
    expect(rat.pos).toEqual(at('B1'));
    expect(r.events.some((e) => e.type === 'foeBursts')).toBe(false);
    expect(r.events.some((e) => e.type === 'crush')).toBe(false);
    expect(r.lines.join('\n')).toMatch(/out of the room/);
    expect(pieceAt(r.state, 'C1')?.id).toBe(BLANK_PIECE);
  });

  it('CG-1: an elite pushed onto blank takes the drop damage and loses its action', () => {
    const r = shoveRight(board('D b {blank} . . r'));
    const sentry = unit(r.state, 'sentry-1');
    expect(sentry).toMatchObject({ hp: 1, stunned: true });
    expect(sentry.out ?? null).toBeNull(); // an elite stays on the board
    expect(sentry.pos).toEqual(at('B1'));
    expect(r.events.find((e) => e.type === 'damage')).toMatchObject({
      target: { id: 'sentry-1' },
      amount: 4,
    });
    const next = act(r.state, { type: 'endTurn' });
    expect(next.events.some((e) => e.type === 'attack')).toBe(false);
  });

  it('CG-1: walking and foe paths avoid blank', () => {
    const s = board('D {blank} .\n. . .\n. . r');
    const moves = legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`);
    expect(moves).not.toContain('1,0');
    expect(moves).toContain('1,1');
    // Foes walk round it too, over several rounds.
    let state = board('r {blank} D\n. . .\n. . .');
    for (let i = 0; i < 4; i++) {
      state = act(state, { type: 'endTurn' }).state;
      expect(unitAt(state, at('B1'))).toBeNull();
      expect(pieceAt(state, 'B1')?.id).toBe(BLANK_PIECE);
    }
    expect(unit(state, 'rat-1').hp).toBeGreaterThan(0);
  });

  it('CG-1: a flier pushed at blank crushes against it', () => {
    const r = shoveRight(board('D m {blank} . . r'));
    const moth = unit(r.state, 'moth-1');
    expect(moth.out ?? null).toBeNull();
    expect(moth.pos).toEqual(at('B1'));
    expect(r.events.find((e) => e.type === 'crush')).toMatchObject({
      unit: { id: 'moth-1' },
      into: 'plate',
    });
    expect(r.events.some((e) => e.type === 'outOfRoom')).toBe(false);
    expect(pieceAt(r.state, 'C1')?.id).toBe(BLANK_PIECE);
  });

  it('CG-1: blank holds no state, jar or mark', () => {
    // Every plain kind that lands on it misses and leaves the tile bare.
    for (const kind of ['ink', 'oil', 'steam', 'brass'] as const) {
      const r = draft(board('D . {blank}'), (ctx) => landOnTile(ctx, kind, at('C1'), null));
      expect(tileAt(r.state, at('C1')).state).toBeNull();
      expect(r.events.find((e) => e.type === 'miss')).toMatchObject({ source: kind });
    }
    // A Splash covering it seals no jar there and lands no ink (its neighbours still take theirs).
    const jars = withLattices('D . {blank} r', { draughtsman: 'Splash> Fuse Strike' });
    const sealed = cast(jars, 'draughtsman', { kind: 'tile', at: at('C1') });
    expect(tileAt(sealed.state, at('C1')).jar).toBeNull();
    expect(tileAt(sealed.state, at('B1')).jar ?? tileAt(sealed.state, at('D1')).jar).toBeTruthy();
    expect(sealed.events.some((e) => e.type === 'jarCrumbles')).toBe(true);
    const ink = withLattices('D . {blank} r', { draughtsman: 'Splash> Ink' });
    const inked = cast(ink, 'draughtsman', { kind: 'tile', at: at('C1') });
    expect(tileAt(inked.state, at('C1')).state).toBeNull();
    expect(tileAt(inked.state, at('B1')).state?.id).toBe('blot');
    // Nobody can stand on it to be marked: a placement onto it is refused by the notation.
    expect(() => parseBoard('r{blank}')).toThrow(/cannot stand on a solid piece/);
  });

  it('CG-1: a pull across blank takes the unit out as the pull:drop fall does', () => {
    const r = draft(board('D {blank} r . . r'), (ctx) =>
      BASIC_ACTIONS.pull.apply(ctx, 'draughtsman', 'right'),
    );
    expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 0, out: 'erased' });
    expect(r.events.find((e) => e.type === 'outOfRoom')).toMatchObject({ line: 'pull:drop' });
  });

  it('CG-1: pieceVoid reads the def: blank erases, pencil and outline are not voids', () => {
    const s = board('{pencil} {blank} {outline:eraser}');
    expect(['A1', 'B1', 'C1'].map((l) => pieceVoid(tileAt(s, at(l))))).toEqual([
      null,
      'erased',
      null,
    ]);
  });
});
