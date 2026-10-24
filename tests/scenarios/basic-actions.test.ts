import { describe, expect, test } from 'vitest';
import type { BasicActionId } from '$data';
import {
  type Action,
  type BattleState,
  type Dir,
  IllegalActionError,
  isLegal,
  type Jar,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import { act, board, expectLog, unitAtLabel } from './harness';

/**
 * The basic actions Pull, Hop and Swap (actions-habits plan P1–P8, party.md §1), played as a
 * member's uncharged action. Each lands through the arrival pipeline (FD-3); geometry decides
 * legality, temporary states fizzle with a line (P2).
 */

type Member = 'draughtsman' | 'stoker';
const kit = (action: BasicActionId, who: Member = 'draughtsman') => ({
  kits: { [who]: { action } },
});
const basic = (type: BasicActionId, dir: Dir, unit: Member = 'draughtsman'): Action =>
  ({ type, unit, dir }) as Action;
const at = parseLabel;
const stepJar = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: null,
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
/** A copy of the battle to rig before acting (the harness hands out the created state). */
const rig = (s: BattleState, fn: (s: BattleState) => void): BattleState => {
  const c = structuredClone(s);
  fn(c);
  return c;
};
const illegal = (s: BattleState, a: Action): string => {
  expect(() => act(s, a)).toThrow(IllegalActionError);
  return isLegal(s, a) ?? '';
};
const lines = (r: { events: readonly { line?: string }[] }) =>
  r.events.flatMap((e) => (e.line ? [e.line] : []));

describe('Pull (P4)', () => {
  test('pull-to-adjacent: a unit two tiles away comes one tile toward the caster', () => {
    const r = act(board('D . r .', kit('pull')), basic('pull', 'right'));
    expectLog(r.events, ['Draughtsman pulls rat at C1', 'rat at C1 is pulled left to B1']);
    expect(r.events[1]).toMatchObject({ type: 'push', cause: 'pull' });
    expect(unit(r.state, 'rat-1').pos).toEqual(at('B1'));
    expect(unit(r.state, 'draughtsman')).toMatchObject({ pos: at('A1'), acted: true });
  });

  test('pull-ally-out-of-telegraph: the Stoker is pulled out of the rat bite', () => {
    const s = board('D . S r', { ...kit('pull'), intents: { D1: 'left' } });
    const r = act(s, basic('pull', 'right'));
    expect(unit(r.state, 'stoker').pos).toEqual(at('B1'));
    const end = act(r.state, { type: 'endTurn' });
    expect(end.events.some((e) => e.type === 'damage' && e.target.id === 'stoker')).toBe(false);
  });

  test('pull-into-canal: a minion is gone, an elite takes 4 and is stunned', () => {
    const minion = act(board('D w> r d', kit('pull')), basic('pull', 'right'));
    expectLog(minion.events, [
      'Draughtsman pulls rat at C1',
      'rat at C1 drops at B1',
      'rat at C1 dies',
    ]);
    expect(minion.events[1]).toMatchObject({ line: 'pull:drop' });
    const elite = act(board('D w> S d', kit('pull')), basic('pull', 'right'));
    expectLog(elite.events, [
      'Draughtsman pulls Stoker',
      'Stoker drops at B1',
      'Drop hits Stoker for 4',
      'Stoker is stunned',
    ]);
  });

  test('pull-blocked-by-plate: no crush, the unit stays', () => {
    const r = act(board('D = r', kit('pull')), basic('pull', 'right'));
    expectLog(r.events, ['Draughtsman pulls rat at C1', 'Pull hits nothing']);
    expect(lines(r)).toEqual(['pull:plate']);
    expect(unit(r.state, 'rat-1')).toMatchObject({ pos: at('C1'), hp: 2 });
  });

  test('pull-held: a held unit stays, and the action is spent', () => {
    const s = rig(board('D . r', kit('pull')), (c) => {
      unitAtLabel(c, 'C1').held = 1;
    });
    const r = act(s, basic('pull', 'right'));
    expectLog(r.events, ['Draughtsman pulls rat at C1', 'rat at C1 is held']);
    expect(lines(r)).toEqual(['pull:held']);
    expect(unit(r.state, 'draughtsman')).toMatchObject({ acted: true });
  });

  test('pull-eel-stays: a swimmer is not pulled out of the water', () => {
    const r = act(board('D . ew>', kit('pull')), basic('pull', 'right'));
    expectLog(r.events, ['Draughtsman pulls eel at C1', 'Pull hits nothing']);
    expect(lines(r)).toEqual(['pull:water']);
  });

  test('pull-moth-over-drop: a flier is pulled over the drop and never falls', () => {
    const r = act(board('D _ m', kit('pull')), basic('pull', 'right'));
    expectLog(r.events, [
      'Draughtsman pulls lamp-moth at C1',
      'lamp-moth at C1 is pulled left to B1',
    ]);
    expect(lines(r)).toEqual(['pull:flier']);
    expect(unit(r.state, 'moth-1')).toMatchObject({ pos: at('B1'), hp: 1 });
  });

  test('pull-not-past-a-unit: the hook would catch the adjacent one first (illegal)', () => {
    expect(illegal(board('D r r', kit('pull')), basic('pull', 'right'))).toMatch(/in the way/);
  });

  test('pull-not-anchored: an anchored foe never moves (illegal)', () => {
    expect(illegal(board('D . M', kit('pull')), basic('pull', 'right'))).toMatch(/can't be moved/);
  });

  test('pull-onto-step-jar and pull-into-stain: the landing answers as an arrival', () => {
    const jar = rig(board('D . r .', kit('pull')), (c) => {
      tileAt(c, at('B1')).jar = stepJar();
    });
    expect(act(jar, basic('pull', 'right')).events.some((e) => e.type === 'jarOpened')).toBe(true);
    const r = act(board('D {stain} r', kit('pull')), basic('pull', 'right'));
    expectLog(r.events, [
      'Draughtsman pulls rat at C1',
      'rat at C1 is pulled left to B1',
      'rat at B1 is marked',
    ]);
  });
});

describe('Hop (P3, P5)', () => {
  test('hop-over-rat: she leaps two tiles, over the unit between', () => {
    const r = act(board('D r .', kit('hop')), basic('hop', 'right'));
    expectLog(r.events, ['Draughtsman hops right', 'Draughtsman moves to C1']);
    expect(r.events[1]).toMatchObject({ type: 'moved', cause: 'hop', path: [at('C1')] });
    expect(unit(r.state, 'draughtsman')).toMatchObject({
      pos: at('C1'),
      acted: true,
      moved: false,
      lastMove: 'right',
    });
  });

  test('hop-over-canal: water and the drop are cleared in between', () => {
    const r = act(board('D w> .', kit('hop')), basic('hop', 'right'));
    expect(lines(r)).toEqual(['hop:water']);
    expect(unit(r.state, 'draughtsman').pos).toEqual(at('C1'));
    const drop = act(board('D _ .', kit('hop')), basic('hop', 'right'));
    expect(unit(drop.state, 'draughtsman')).toMatchObject({ pos: at('C1'), hp: 6 });
  });

  test('hop-onto-own-jar: landing on a jar opens it; hopping over one does not', () => {
    const onto = rig(board('D . .', kit('hop')), (c) => {
      tileAt(c, at('C1')).jar = stepJar();
    });
    expect(act(onto, basic('hop', 'right')).events.some((e) => e.type === 'jarOpened')).toBe(true);
    const over = rig(board('D . .', kit('hop')), (c) => {
      tileAt(c, at('B1')).jar = stepJar();
    });
    const r = act(over, basic('hop', 'right'));
    expect(r.events.some((e) => e.type === 'jarOpened')).toBe(false);
    expect(lines(r)).toEqual(['hop:jar']);
  });

  test('hop-not-over-plate: a tile that blocks units can not be hopped over (illegal)', () => {
    expect(illegal(board('D = .', kit('hop')), basic('hop', 'right'))).toMatch(/hop over/);
    expect(illegal(board('D {wall} .', kit('hop')), basic('hop', 'right'))).toMatch(/hop over/);
    expect(illegal(board('D . r', kit('hop')), basic('hop', 'right'))).toMatch(/land/);
    expect(illegal(board('D . w>', kit('hop')), basic('hop', 'right'))).toMatch(/land/);
  });

  test('hop-then-move: Hop spends the action, not the move', () => {
    const r = act(board('D . . . . . . r', kit('hop')), basic('hop', 'right'));
    const m = act(r.state, { type: 'move', unit: 'draughtsman', to: at('F1') });
    expect(unit(m.state, 'draughtsman').pos).toEqual(at('F1'));
    expect(isLegal(m.state, basic('hop', 'left'))).toMatch(/already acted/);
  });

  test('hop-shackled-refused: a shackled or held apprentice can not hop', () => {
    expect(illegal(board('D$ . .', kit('hop')), basic('hop', 'right'))).toMatch(/by herself/);
    const held = rig(board('D . .', kit('hop')), (c) => {
      unitAtLabel(c, 'A1').held = 1;
    });
    expect(isLegal(held, basic('hop', 'right'))).toMatch(/by herself/);
  });
});

describe('Swap (P6)', () => {
  test('swap-foe-onto-slick: the rat takes her slick tile, she takes its tile', () => {
    const r = act(board('Do r', kit('swap')), basic('swap', 'right'));
    expectLog(r.events, [
      'Draughtsman swaps with rat at B1',
      'Draughtsman and rat at B1 swap places',
    ]);
    expect(r.events[1]).toMatchObject({ type: 'swapped', cause: 'swap' });
    expect(unit(r.state, 'rat-1').pos).toEqual(at('A1'));
    expect(tileAt(r.state, at('A1')).state).toMatchObject({ id: 'slick' });
    expect(unit(r.state, 'draughtsman')).toMatchObject({ pos: at('B1'), lastMove: 'right' });
  });

  test('swap-ally-out-of-telegraph: the Stoker leaves the bite, the Draughtsman takes it', () => {
    const s = board('D S r', { ...kit('swap'), intents: { C1: 'left' } });
    const r = act(s, basic('swap', 'right'));
    const end = act(r.state, { type: 'endTurn' });
    const hit = end.events.flatMap((e) => (e.type === 'damage' ? [e.target.id] : []));
    expect(hit).toContain('draughtsman');
    expect(hit).not.toContain('stoker');
  });

  test('swap-both-arrivals-order: the caster arrives first, then the target', () => {
    const r = act(board('D{stain} r{stain}', kit('swap')), basic('swap', 'right'));
    const marked = r.events.flatMap((e) => (e.type === 'marked' ? [e.unit.id] : []));
    expect(marked).toEqual(['draughtsman', 'rat-1']);
  });

  test('swap-held-fizzles: a held target (or caster) will not change tiles', () => {
    const s = rig(board('D r', kit('swap')), (c) => {
      unitAtLabel(c, 'B1').held = 1;
    });
    const r = act(s, basic('swap', 'right'));
    expectLog(r.events, ['Draughtsman swaps with rat at B1', 'rat at B1 is held']);
    expect(lines(r)).toEqual(['swap:held']);
    expect(unit(r.state, 'draughtsman')).toMatchObject({ pos: at('A1'), acted: true });
  });

  test('swap-flier-refused: fliers and anchored foes can not be swapped (illegal)', () => {
    expect(illegal(board('D m', kit('swap')), basic('swap', 'right'))).toMatch(/swapped/);
    expect(illegal(board('D M', kit('swap')), basic('swap', 'right'))).toMatch(/swapped/);
  });

  test('swap-eel-refused: a swimmer never leaves the water, a land body never enters it', () => {
    expect(illegal(board('D ew>', kit('swap')), basic('swap', 'right'))).toMatch(/stand there/);
  });

  test('a shackled caster can not swap; a shackled target can', () => {
    expect(illegal(board('D$ r', kit('swap')), basic('swap', 'right'))).toMatch(/by herself/);
    const r = act(board('D r$', kit('swap')), basic('swap', 'right'));
    expect(unit(r.state, 'rat-1').pos).toEqual(at('A1'));
  });
});

describe('the gate and the turn (P1, HC P14)', () => {
  test('only-own-action: an apprentice takes only her own basic action', () => {
    const s = board('D . r', kit('pull'));
    expect(isLegal(s, basic('shove', 'right'))).toMatch(/can't shove/);
    expect(isLegal(s, basic('hop', 'right'))).toMatch(/can't hop/);
    expect(isLegal(s, basic('pull', 'right'))).toBeNull();
    const plain = board('D r . S', {});
    expect(isLegal(plain, basic('shove', 'right'))).toBeNull();
    for (const a of ['pull', 'hop', 'swap'] as const) {
      expect(isLegal(plain, basic(a, 'right'))).toMatch(new RegExp(`can't ${a}`));
    }
  });

  test('a basic action clears earlier move undos, as cast and shove do', () => {
    const s = board('D . . r . S', kit('pull', 'stoker'));
    const moved = act(s, { type: 'move', unit: 'draughtsman', to: at('B1') });
    expect(isLegal(moved.state, { type: 'undoMove', unit: 'draughtsman' })).toBeNull();
    const pulled = act(moved.state, basic('pull', 'left', 'stoker'));
    expect(isLegal(pulled.state, { type: 'undoMove', unit: 'draughtsman' })).toMatch(/no move/);
  });

  test('a kit habit reaches the spawned member (PartyInit.habit)', () => {
    const s = board('D . .', { kits: { draughtsman: { action: 'hop', habit: null } } });
    expect(unit(s, 'draughtsman')).toMatchObject({ action: 'hop', lean: { habit: null } });
  });
});
