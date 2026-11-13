import { describe, expect, it } from 'vitest';
import { ENEMIES } from '$data';
import { CARTOGRAPHERS_FOE_TOKENS } from '$data/districts/cartographers/types';
import { type BattleState, type GameEvent, tileAt } from '$engine';
import { enemyPhase } from '$engine/ai';
import { behaviourPreview } from '$engine/behaviours';
import { KIT } from '$engine/districts';
import { CARTOGRAPHERS_FOES, ERASER_FOE, SURVEYOR_FOE } from '$engine/districts/cartographers/foes';
import { BLANK_PIECE, PENCIL_PIECE } from '$engine/districts/cartographers/types';
import type { EnemyUnit, Unit } from '$engine/types';
import { act, board, draft, parseLabel } from '../../scenarios/harness';

/**
 * CG-5 and CG-6: the guild's hands (cartographers-plan P7-P9). Tokens: `A` the surveyor, `F` the
 * eraser, `I` the tracer. Round 1 telegraphs without moving, so a board's first intent is planned
 * where the foes stand; `endTurn` resolves it. A pencil under a unit is written `d{pencil:rub@1}`.
 */

const at = parseLabel;
const foe = (s: BattleState, def: string): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (u?.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const telegraphOf = (e: EnemyUnit) => (e.intent?.kind === 'behaviour' ? e.intent.telegraph : null);
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
/** Plans the foes again on a board a test just changed (round 1 telegraphs without moving). */
const replan = (s: BattleState): BattleState =>
  draft(structuredClone(s), (ctx) => enemyPhase(ctx, { move: false })).state;
const clone = (s: BattleState): BattleState => structuredClone(s);

describe('registration', () => {
  it('the three hands are foes on the behaviour registry, with their tokens and sizes', () => {
    expect(CARTOGRAPHERS_FOES).toEqual([SURVEYOR_FOE, ERASER_FOE]);
    for (const f of CARTOGRAPHERS_FOES) expect(KIT.foes[f.id]).toBe(f);
    expect(ENEMIES.surveyor).toMatchObject({ token: 'A', move: 2, hp: 3, attack: null });
    expect(ENEMIES.eraser).toMatchObject({ token: 'F', move: 2, hp: 3, attack: null });
    for (const [id, token] of Object.entries(CARTOGRAPHERS_FOE_TOKENS).slice(0, 2)) {
      expect(ENEMIES[id as keyof typeof ENEMIES].token).toBe(token);
      expect(ENEMIES[id as keyof typeof ENEMIES].behaviour).toBe(`cartographers:${id}`);
      expect(ENEMIES[id as keyof typeof ENEMIES].elite).toBe(false);
    }
  });
});

describe('CG-5 the surveyor', () => {
  // The surveyor at A1; the only apprentice (S, D3) and the only other foe are within 3 of him.
  const ROW = 'A d . S . . . .';

  it('plans a swap of the nearest apprentice and the farthest foe, and swaps them', () => {
    const s = board(ROW);
    const tg = telegraphOf(foe(s, 'surveyor'));
    expect(tg).toEqual({
      label: 'swap',
      tiles: [at('D1'), at('B1')],
      units: ['stoker', foe(s, 'dummy').id],
    });
    expect(behaviourPreview(s).map((p) => p.kind)).toEqual(['ghost', 'ghost']);
    const r = act(s, { type: 'endTurn' });
    expect(ofType(r.events, 'swapped')).toHaveLength(1);
    expect(unit(r.state, 'stoker').pos).toEqual(at('B1'));
    expect(unit(r.state, foe(s, 'dummy').id).pos).toEqual(at('D1'));
  });

  it('CG-5: a swap out of range fails', () => {
    const s = board(ROW);
    const moved = act(s, { type: 'move', unit: 'stoker', to: at('E1') }).state;
    const r = act(moved, { type: 'endTurn' });
    expect(ofType(r.events, 'swapped')).toHaveLength(0);
    const miss = ofType(r.events, 'miss');
    expect(miss).toHaveLength(1);
    expect(miss[0]).toMatchObject({ type: 'miss', source: 'Swap' });
    expect(miss[0]).not.toHaveProperty('line');
    expect(unit(r.state, 'stoker').pos).toEqual(at('E1'));
    expect(unit(r.state, foe(s, 'dummy').id).pos).toEqual(at('B1'));
  });

  it("CG-5: a held unit refuses the surveyor's swap", () => {
    const s = clone(board(ROW));
    unit(s, 'stoker').held = 1;
    const r = act(s, { type: 'endTurn' });
    expect(ofType(r.events, 'swapped')).toHaveLength(0);
    expect(ofType(r.events, 'miss')).toHaveLength(1);
    expect(unit(r.state, 'stoker').pos).toEqual(at('D1'));
    // Held at plan time, it is not named at all: the pair needs two swappable units.
    expect(telegraphOf(foe(replan(s), 'surveyor'))).toBeNull();
  });

  it('CG-5: swap onto rub-due pencil then erased', () => {
    // The dummy stands on pencil that rubs out at this round's end; the apprentice is swapped onto it.
    const s = board('d{pencil:rub@1} A . D . . . S');
    expect(telegraphOf(foe(s, 'surveyor'))).toMatchObject({
      label: 'swap',
      units: [foe(s, 'dummy').id, 'draughtsman'],
    });
    const r = act(s, { type: 'endTurn' });
    expect(ofType(r.events, 'swapped')).toHaveLength(1);
    const rubbed = ofType(r.events, 'cartographers:rubbedOut');
    expect(rubbed).toHaveLength(1);
    expect(rubbed[0]).toMatchObject({ at: at('A1'), data: { units: ['draughtsman'] } });
    expect(unit(r.state, 'draughtsman')).toMatchObject({ out: 'erased' });
    expect(tileAt(r.state, at('A1')).piece?.id).toBe(BLANK_PIECE);
    expect(unit(r.state, 'stoker').hp).toBeGreaterThan(0);
  });

  it('prefers a pair that puts an apprentice beside blank when no pencil is due', () => {
    // Without the blank the routine falls to the nearest apprentice and the farthest foe (the
    // first of two equally far); with it, the pair that sets the apprentice at D1, beside it.
    const plain = '. d A d D . . .\n. . . . . . . .';
    expect(telegraphOf(foe(board(plain), 'surveyor'))?.tiles).toEqual([at('E1'), at('B1')]);
    const s = board('. d A d D . . .\n. . . {blank} . . . .');
    expect(telegraphOf(foe(s, 'surveyor'))?.tiles).toEqual([at('D1'), at('E1')]);
  });

  it('idles with no apprentice in range', () => {
    expect(telegraphOf(foe(board('A d . . . . S'), 'surveyor'))).toBeNull();
  });
});

describe('CG-5 the eraser', () => {
  it('CG-5: the eraser rubs a jar', () => {
    const s0 = clone(board('S F . . d'));
    tileAt(s0, at('A1')).jar = {
      owner: 'stoker',
      event: 'step',
      rest: null,
      heading: null,
      origin: { caster: 'stoker', spell: 'x', cast: 0 },
    };
    const s = replan(s0);
    expect(telegraphOf(foe(s, 'eraser'))).toEqual({
      label: 'erase',
      tiles: [at('A1')],
      units: ['stoker'],
    });
    expect(behaviourPreview(s)).toEqual([{ kind: 'tile', at: at('A1'), tone: 'erased' }]);
    const r = act(s, { type: 'endTurn' });
    expect(ofType(r.events, 'erased')).toMatchObject([{ at: at('A1'), what: 'jar' }]);
    expect(tileAt(r.state, at('A1')).jar).toBeNull();
    expect(r.state.erased ?? null).toBeNull(); // no record: Erase's restore cannot bring it back
    expect(unit(r.state, 'stoker').out ?? null).toBeNull(); // not pencil: nobody is erased
  });

  it("rubs an apprentice's mark before a jar further off", () => {
    const s = board('S! . F . . d');
    expect(telegraphOf(foe(s, 'eraser'))).toMatchObject({ tiles: [at('A1')], units: ['stoker'] });
    const r = act(s, { type: 'endTurn' });
    expect(ofType(r.events, 'erased')).toMatchObject([{ what: 'mark' }]);
    expect(unit(r.state, 'stoker').mark).toBeNull();
  });

  it('CG-5: the eraser un-draws pencil under an apprentice who stayed', () => {
    const s = board('S{pencil} . F . d D');
    expect(telegraphOf(foe(s, 'eraser'))).toEqual({
      label: 'erase',
      tiles: [at('A1')],
      units: ['stoker'],
    });
    const r = act(s, { type: 'endTurn' });
    const undrawn = ofType(r.events, 'cartographers:undrawn');
    expect(undrawn).toHaveLength(1);
    expect(undrawn[0]).toMatchObject({
      at: at('A1'),
      data: { by: 'eraser', was: 'pencil', units: ['stoker'] },
    });
    expect(tileAt(r.state, at('A1')).piece?.id).toBe(BLANK_PIECE);
    expect(unit(r.state, 'stoker')).toMatchObject({ out: 'erased' });
    expect(ofType(r.events, 'outOfRoom')).toMatchObject([{ cause: 'erased' }]);
  });

  it('un-draws the pencil all the same when the apprentice has stepped off', () => {
    const s = board('S{pencil} . F . d D');
    const moved = act(s, { type: 'move', unit: 'stoker', to: at('B1') }).state;
    const r = act(moved, { type: 'endTurn' });
    expect(tileAt(r.state, at('A1')).piece?.id).toBe(BLANK_PIECE);
    expect(unit(r.state, 'stoker').out ?? null).toBeNull();
    expect(ofType(r.events, 'cartographers:undrawn')[0]).toMatchObject({ data: { units: [] } });
  });

  it('leaves inked paper and an empty tile alone: it idles with nothing to rub', () => {
    expect(telegraphOf(foe(board('S . F . d'), 'eraser'))).toBeNull();
    const pencil = board('. . F . d{pencil} D');
    expect(tileAt(pencil, at('E1')).piece?.id).toBe(PENCIL_PIECE);
    expect(telegraphOf(foe(pencil, 'eraser'))).toBeNull(); // pencil under a foe is not its aim
  });
});
