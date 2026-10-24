import { describe, expect, test } from 'vitest';
import {
  applyAction,
  beginEncounter,
  finishEncounter,
  isAlive,
  isLegal,
  memberById,
  newProfile,
  startTrip,
  unitAt,
} from '$engine';
import { checkEnd } from '$engine/ctx';
import { kill } from '$engine/damage';
import { removeFromRoom } from '$engine/districts/api';
import { act, board, draft, expectLog, parseLabel } from './harness';

/**
 * Out of the room (district kit P11; bridges §0 fall, Cartographers §0 erase): a member leaves the
 * board until the room ends, a minion is gone, an elite takes 4 and loses its next action.
 */

const unit = (s: ReturnType<typeof board>, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

describe('a member out of the room', () => {
  test('member-falls-out: off the board, untargetable, out of the turn order', () => {
    const r = draft(board('D S . . r', { hp: { B1: 6 } }), (ctx) =>
      removeFromRoom(ctx, 'stoker', 'fell'),
    );
    expectLog(r.events, ['Stoker falls out of the room']);
    const stoker = unit(r.state, 'stoker');
    expect(stoker).toMatchObject({ out: 'fell', hp: 6 });
    expect(isAlive(stoker)).toBe(false);
    expect(unitAt(r.state, parseLabel('B1'))).toBeNull();
    expect(r.state.phase).toBe('player');
    // She can't act; the other apprentice still can.
    expect(isLegal(r.state, { type: 'move', unit: 'stoker', to: parseLabel('C1') })).toBe(
      'Stoker is down',
    );
    expect(
      isLegal(r.state, { type: 'move', unit: 'draughtsman', to: parseLabel('B1') }),
    ).toBeNull();
  });

  test('foes-ignore-the-fallen: a rat beside the fallen tile does not attack it', () => {
    const s = board('S r . . . . D', { hp: { A1: 3 } });
    const out = draft(s, (ctx) => removeFromRoom(ctx, 'stoker', 'erased')).state;
    const after = act(out, { type: 'endTurn' });
    expect(unit(after.state, 'stoker').hp).toBe(3);
    const rat = unit(after.state, 'rat-1');
    const aimsLeft = (u: typeof rat) =>
      u.kind === 'enemy' && u.intent?.kind === 'attack' && u.intent.dir === 'left';
    expect(aimsLeft(rat)).toBe(false);
    // Control: in the room, the rat would aim at her.
    expect(aimsLeft(unit(act(s, { type: 'endTurn' }).state, 'rat-1'))).toBe(true);
  });

  test('all-out-is-a-wipe: no member alive and in the room loses it', () => {
    const r = draft(board('D S . . r'), (ctx) => {
      removeFromRoom(ctx, 'stoker', 'fell');
      expect(checkEnd(ctx)).toBe(false);
      removeFromRoom(ctx, 'draughtsman', 'erased');
      checkEnd(ctx);
    });
    expect(r.state.phase).toBe('lost');
    expect(r.lines.at(-1)).toBe('The party is wiped out');
  });

  test('out-then-win: the trip hauls her back at 1 HP', () => {
    const p = newProfile();
    const t = startTrip(p, 7);
    const b = beginEncounter(p, t).state;
    const [first, second] = t.party;
    if (!first || !second) throw new Error('needs two apprentices');
    const r = draft(b, (ctx) => {
      removeFromRoom(ctx, first, 'fell');
      // Through `died` events, so the UI's replay agrees with the state.
      for (const u of ctx.s.units)
        if (u.kind === 'enemy' && u.hp > 0) {
          u.hp = 0;
          kill(ctx, u, false);
        }
      checkEnd(ctx);
    });
    expect(r.state.phase).toBe('won');
    const done = finishEncounter(p, t, r.state);
    expect(done.outcome).toBe('won');
    expect(done.trip?.hp[first]).toBe(1);
    expect(done.trip?.hp[second]).toBe(memberById(b, second).hp);
  });
});

describe('a foe out of the room', () => {
  test('minion-is-gone: it dies off the board without a burst, and the room can be won', () => {
    const r = draft(board('D . . r'), (ctx) => {
      removeFromRoom(ctx, 'rat-1', 'fell');
      checkEnd(ctx);
    });
    expectLog(r.events, ['rat at D1 falls out of the room', 'rat at D1 dies', 'The party wins']);
    expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 0, out: 'fell' });
    expect(r.events.some((e) => e.type === 'foeBursts')).toBe(false);
  });

  test('elite-stunned: an elite stays, takes 4 and loses its next action', () => {
    const r = draft(board('D . b'), (ctx) => removeFromRoom(ctx, 'sentry-1', 'erased'));
    expectLog(r.events, ['Erase hits sentry at C1 for 4', 'sentry at C1 is stunned']);
    expect(unit(r.state, 'sentry-1')).toMatchObject({ hp: 1, stunned: true });
    const next = applyAction(r.state, { type: 'endTurn' });
    expect(next.events.some((e) => e.type === 'attack')).toBe(false);
    expect(unit(next.state, 'sentry-1')).toMatchObject({ stunned: false, pos: { x: 2, y: 0 } });
  });
});
