import { afterEach, describe, expect, test } from 'vitest';
import {
  type Aim,
  applyAction,
  createBattle,
  legalAims,
  memberById,
  parseLabel,
  parseLattice,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import {
  changedKits,
  fallbackLattices,
  fieldLineup,
  kitOf,
  labSpec,
  nativeKit,
  paintApprentice,
  setKit,
  withKit,
} from '../../src/app/lab';
import { LabStore } from '../../src/app/lab.svelte';
import { memoryBackend } from '../../src/app/save';

/** Lab kits (AH-7): any action and habit on any apprentice, carried by every way one is fielded. */

const lattices = { ...fallbackLattices(), draughtsman: parseLattice('Touch> Strike') };
const lab = (kits = {}) =>
  createBattle(
    labSpec(
      {
        id: 'k',
        title: 'Kits',
        note: '',
        board: 'D r d . .\n. . . . .\n. . r . .',
        demo: [],
        expected: [],
      },
      { lattices, inventions: {}, lineup: ['draughtsman'], kits },
    ).spec,
  ).state;

describe('Lab kits (pure)', () => {
  test('setKit keeps only what differs from the registry', () => {
    let kits = setKit({}, 'draughtsman', { action: 'hop' });
    expect(kits).toEqual({ draughtsman: { action: 'hop' } });
    kits = setKit(kits, 'draughtsman', { habit: 'longTouch' });
    expect(kitOf('draughtsman', kits)).toEqual({ action: 'hop', habit: 'longTouch' });
    expect(changedKits(kits)).toEqual(['draughtsman']);
    kits = setKit(kits, 'draughtsman', nativeKit('draughtsman'));
    expect(kits).toEqual({});
    expect(setKit({}, 'draughtsman', { habit: null })).toEqual({ draughtsman: { habit: null } });
  });

  test('the Draughtsman given Hop and long Touch plays both', () => {
    const s = lab({ draughtsman: { action: 'hop', habit: 'longTouch' } });
    const me = memberById(s, 'draughtsman');
    expect(me.action).toBe('hop');
    expect(me.lean.habit).toBe('longTouch');
    // Touch reaches the dummy on C1, two tiles away past the rat, only with the habit.
    const c1: Aim = { kind: 'tile', at: parseLabel('C1') };
    expect(legalAims(s, 'draughtsman', '0,0')).toContainEqual(c1);
    expect(legalAims(lab(), 'draughtsman', '0,0')).not.toContainEqual(c1);
    const touched = applyAction(s, { type: 'cast', unit: 'draughtsman', spell: '0,0', aim: c1 });
    expect(touched.events.some((e) => e.type === 'aimed' && e.habit === 'longTouch')).toBe(true);
    // Hop down two tiles to A3; the Draughtsman's own Shove would have had nothing there to do.
    const hop = applyAction(s, { type: 'hop', unit: 'draughtsman', dir: 'down' });
    expect(hop.events.some((e) => e.type === 'hop')).toBe(true);
    expect(memberById(hop.state, 'draughtsman').pos).toEqual(parseLabel('A3'));
  });

  test('withKit rewrites a unit already on the board, and leaves the input alone', () => {
    const s = lab();
    const kits = setKit({}, 'draughtsman', { action: 'swap', habit: null });
    const next = withKit(s, 'draughtsman', kits);
    expect(memberById(next, 'draughtsman')).toMatchObject({
      action: 'swap',
      lean: { habit: null },
    });
    expect(memberById(s, 'draughtsman').action).toBe('shove');
    expect(withKit(s, 'stoker', kits)).toBe(s);
  });

  test('painted and fielded apprentices carry the kit', () => {
    const kits = setKit({}, 'stoker', { action: 'pull' });
    const s = lab();
    const painted = paintApprentice(s, parseLabel('E3'), 'stoker', lattices, kits);
    expect(painted && memberById(painted, 'stoker').action).toBe('pull');
    const fielded = fieldLineup(
      s,
      [parseLabel('A2'), parseLabel('B2')],
      ['draughtsman', 'stoker'],
      1,
      lattices,
      kits,
    );
    expect(memberById(fielded, 'stoker').action).toBe('pull');
    expect(memberById(fielded, 'draughtsman').action).toBe('shove');
  });
});

describe('Lab kits in the store', () => {
  let labs: LabStore[] = [];
  afterEach(() => {
    for (const l of labs) l.session?.dispose();
    labs = [];
  });
  const newLab = (): LabStore => {
    const l = new LabStore(new GameStore(memoryBackend(), () => 0));
    labs.push(l);
    l.load('sandbox');
    l.session?.skip();
    return l;
  };

  test('giving the Draughtsman Hop and long Touch lets him play both; undo takes them back', async () => {
    const l = newLab();
    const session = l.session;
    if (!session) throw new Error('no session');
    l.setKit('draughtsman', { action: 'hop' });
    l.setKit('draughtsman', { habit: 'longTouch' });
    expect(l.kitFor('draughtsman')).toEqual({ action: 'hop', habit: 'longTouch' });
    expect(l.kitsChanged).toBe(1);
    const me = () => memberById(l.session?.state ?? session.state, 'draughtsman');
    expect(me()).toMatchObject({ action: 'hop', lean: { habit: 'longTouch' } });
    const from = me().pos;
    await l.session?.dispatch({ type: 'hop', unit: 'draughtsman', dir: 'right' });
    expect(me().pos).toEqual({ x: from.x + 2, y: from.y });
    l.undo();
    expect(me().pos).toEqual(from);
    l.undo();
    expect(l.kitFor('draughtsman').habit).toBe(nativeKit('draughtsman').habit);
    expect(me().lean.habit).toBe('twoJars');
    l.undo();
    expect(l.kitsChanged).toBe(0);
    expect(me().action).toBe('shove');
  });

  test('kits survive a reset, and a demo replays with each apprentice’s own kit', () => {
    const l = newLab();
    l.setKit('draughtsman', { action: 'swap' });
    l.reset();
    expect(memberById(l.session?.state ?? lab(), 'draughtsman').action).toBe('swap');
    l.resetKit('draughtsman');
    expect(l.kitsChanged).toBe(0);
    l.setKit('stoker', { habit: null });
    l.load('hop-basic', { demo: true });
    expect(l.kitsChanged).toBe(0);
    expect(memberById(l.session?.state ?? lab(), 'copyist').action).toBe('hop');
  });
});
