import { describe, expect, it } from 'vitest';
import { type BattleState, type GameEvent, parseLabel, tileAt } from '$engine';
import { OUTLINE_PIECE } from '$engine/districts/cartographers/types';
import { act, board, cast, withLattices } from '../../scenarios/harness';

/** CG-4: outlines ink in at their due round end (cartographers-plan P6). */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const ratsOf = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy' && u.def === 'rat');

describe('CG-4 drawn-in reinforcements', () => {
  it('CG-4: an outline inks at its due round', () => {
    const first = endTurn(board('D . {outline:rat@2} . . r'));
    // Not due yet: the outline stands, no foe.
    expect(tileAt(first.state, at('C1')).piece?.id).toBe(OUTLINE_PIECE);
    expect(ratsOf(first.state)).toHaveLength(1);
    expect(ofType(first.events, 'cartographers:drawnIn')).toHaveLength(0);
    const second = endTurn(first.state);
    expect(tileAt(second.state, at('C1')).piece).toBeNull();
    expect(ratsOf(second.state)).toHaveLength(2);
    expect(ofType(second.events, 'cartographers:drawnIn')[0]).toMatchObject({
      at: at('C1'),
      data: { foe: 'rat' },
    });
    const drawn = ofType(second.events, 'cartographers:drawnIn')[0] as { unit?: { id: string } };
    expect(ratsOf(second.state).map((u) => u.id)).toContain(drawn.unit?.id);
  });

  it('CG-4: a standing unit delays the inking a round', () => {
    // Notation refuses a unit on a solid piece, so the apprentice is placed there (a Lab edit).
    const s = structuredClone(board('D {outline:rat@1} . . r'));
    const d0 = s.units.find((u) => u.id === 'draughtsman');
    if (!d0) throw new Error('no draughtsman');
    d0.pos = at('B1');
    const first = endTurn(s);
    expect(tileAt(first.state, at('B1')).piece).toEqual({
      id: OUTLINE_PIECE,
      data: { foe: 'rat', due: 2 },
    });
    expect(ratsOf(first.state)).toHaveLength(1);
    expect(ofType(first.events, 'cartographers:drawnIn')).toHaveLength(0);
    // Once the apprentice steps off, it inks at its next due round.
    const moved = structuredClone(first.state);
    const d = moved.units.find((u) => u.id === 'draughtsman');
    if (!d) throw new Error('no draughtsman');
    d.pos = at('A1');
    const second = endTurn(moved);
    expect(tileAt(second.state, at('B1')).piece).toBeNull();
    expect(ofType(second.events, 'cartographers:drawnIn')).toHaveLength(1);
    expect(ratsOf(second.state)).toHaveLength(2);
  });

  it('CG-4: erase un-draws an outline foe', () => {
    const s = withLattices('D {outline:rat@1} . . r', { draughtsman: 'Touch> Erase' });
    const erased = cast(s, 'draughtsman', { kind: 'tile', at: at('B1') });
    const next = endTurn(erased.state);
    expect(ratsOf(next.state)).toHaveLength(1);
    expect(ofType(next.events, 'cartographers:drawnIn')).toHaveLength(0);
    expect(tileAt(next.state, at('B1')).piece).toMatchObject({ data: { fate: null, due: null } });
  });
});
