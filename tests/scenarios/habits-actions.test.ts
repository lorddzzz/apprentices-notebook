import { describe, expect, test } from 'vitest';
import type { ActionRuneId, HabitId } from '$data';
import { type BattleState, type Dir, type GameEvent, parseLabel } from '$engine';
import { cloneData } from '$engine/clone';
import { snapshotOf } from '$engine/resolve';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { type Flow, type Jar, type Step, type Target, targetKey, type Unit } from '$engine/types';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';
import { board, cast, draft, unitAtLabel, withLattices } from './harness';

/**
 * The action-rune habits (actions-habits plan P15, P18; party.md §2): the warden's `holdTwo`
 * (each Hold also holds the first unit beside the target, Fork's scan order) and the exile's
 * `restoreErase` (her Erase on an empty target puts back what the last Erase took there).
 */

type Ev = GameEvent & { habit?: string; line?: string };
const STEP: Step = { at: { x: 1, y: 0 }, role: 'action', rune: 'erase', auras: [], next: null };
const unit = (id: string): Target => ({ kind: 'unit', unit: id });
const tile = (lbl: string): Target => ({ kind: 'tile', at: parseLabel(lbl) });
const find = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const tileOf = (s: BattleState, lbl: string) => {
  const { x, y } = parseLabel(lbl);
  const t = s.tiles[y * s.width + x];
  if (!t) throw new Error(`no tile ${lbl}`);
  return t;
};
const kit = (habit: HabitId) => ({ kits: { draughtsman: { habit } } });
const held = (events: readonly Ev[]) =>
  events.filter((e) => e.type === 'held').map((e) => (e.type === 'held' ? e.unit.id : ''));
const lines = (events: readonly Ev[]) => events.flatMap((e) => (e.line ? [e.line] : []));

interface RunOpts {
  caster?: string;
  heading?: Dir | null;
  habit?: HabitId | null;
  cast?: number;
}
/** One Action's handler over targets with a hand-built Flow, as `actions.test.ts` does. */
function run(s: BattleState, rune: ActionRuneId, targets: Target[], opts: RunOpts = {}) {
  return draft(s, (ctx) => {
    const caster = opts.caster ?? 'draughtsman';
    const flow: Flow = {
      caster,
      origin: { caster, spell: '0,0', cast: opts.cast ?? 1 },
      snapshot: snapshotOf(ctx.s),
      headings: new Map(targets.map((t) => [targetKey(t), opts.heading ?? null])),
      lay: false,
      gifted: false,
      solvent: null,
      habit: opts.habit ?? null,
      depth: 0,
      auras: [],
    };
    for (const t of targets) ACTION_HANDLERS[rune](ctx, t, flow, STEP);
  });
}
const restoring = { caster: 'draughtsman', habit: 'restoreErase' } as const;

/** What playback draws of the board, compared with the engine's own state after the events. */
function expectProjects(before: BattleState, events: readonly GameEvent[], after: BattleState) {
  const drawn = (v: BoardView) => ({
    tiles: v.tiles.map((t) => ({ state: t.state, jar: t.jar })),
    units: v.units.map((u) => ({ id: u.id, mark: u.mark, collar: u.collar, born: u.born })),
  });
  const got = events.reduce((v, e) => projectWith(v, e), viewOf(before));
  expect(drawn(got)).toEqual(drawn(viewOf(after)));
}

describe('holdTwo: each Hold also holds one unit beside the target (P15)', () => {
  const page = { draughtsman: 'Bolt> Hold' };

  test('the scan goes ahead, then left, then right, then behind', () => {
    // The Bolt flies right into the rat at B2: ahead C2, left B1, right B3, behind A2 (herself).
    const all = withLattices('. r .\nD r r\n. r .', page, kit('holdTwo'));
    const ids = (lbl: string) => unitAtLabel(all, lbl).id;
    const first = cast(all, 'draughtsman', 'right');
    expect(held(first.events)).toEqual([ids('B2'), ids('C2')]);
    const second = first.events.filter((e) => e.type === 'held')[1] as Ev;
    expect(second).toMatchObject({ habit: 'holdTwo' });
    expect(second.line).toBeUndefined();
    expect(find(first.state, ids('C2')).held).toBe(find(first.state, ids('B2')).held);

    const noAhead = withLattices('. r .\nD r .\n. r .', page, kit('holdTwo'));
    expect(held(cast(noAhead, 'draughtsman', 'right').events)[1]).toBe(
      unitAtLabel(noAhead, 'B1').id,
    );
    const rightOnly = withLattices('. . .\nD r .\n. r .', page, kit('holdTwo'));
    expect(held(cast(rightOnly, 'draughtsman', 'right').events)[1]).toBe(
      unitAtLabel(rightOnly, 'B3').id,
    );
    // Only herself behind: she is skipped, so the Hold holds one.
    const alone = withLattices('. . .\nD r .\n. . .', page, kit('holdTwo'));
    expect(held(cast(alone, 'draughtsman', 'right').events)).toHaveLength(1);
  });

  test('with no heading the scan is up, right, down, left', () => {
    const s = board('. r .\nr r r\n. r .\nD . .');
    const r = run(s, 'hold', [tile('B2')], { habit: 'holdTwo' });
    expect(held(r.events)).toEqual([unitAtLabel(s, 'B2').id, unitAtLabel(s, 'B1').id]);
    const noUp = board('. . .\nr r r\n. r .\nD . .');
    expect(held(run(noUp, 'hold', [tile('B2')], { habit: 'holdTwo' }).events)[1]).toBe(
      unitAtLabel(noUp, 'C2').id,
    );
  });

  test('without the habit Hold holds the target alone', () => {
    const s = withLattices('. r .\nD r r\n. r .', page);
    const r = cast(s, 'draughtsman', 'right');
    expect(held(r.events)).toHaveLength(1);
    expect((r.events.find((e) => e.type === 'held') as Ev).habit).toBeUndefined();
  });

  test('holdTwo:member: an ally beside the target is caught and kept in place', () => {
    const s = withLattices('D r S', page, kit('holdTwo'));
    const r = cast(s, 'draughtsman', 'right');
    expect(held(r.events)).toEqual(['rat-1', 'stoker']);
    expect(r.events.filter((e) => e.type === 'held')[1]).toMatchObject({
      habit: 'holdTwo',
      line: 'holdTwo:member',
    });
    expect(find(r.state, 'stoker').held).toBeGreaterThan(0);
    expect(lines(r.events)).toEqual(['holdTwo:member']);
  });

  test('Splash Hold: the second holds skip every unit the same Hold holds anyway', () => {
    // The square around C3 holds C3 and D3; the only unit beside them it does not hold is E3.
    const s = withLattices(
      '. . D . .\n. . . . .\n. . r r r\n. . . . .',
      { draughtsman: 'Splash> Hold' },
      kit('holdTwo'),
    );
    const r = cast(s, 'draughtsman', { kind: 'tile', at: parseLabel('C3') });
    const ids = ['C3', 'D3', 'E3'].map((l) => unitAtLabel(s, l).id);
    expect([...held(r.events)].sort()).toEqual([...ids].sort());
    expect(r.events.filter((e) => e.type === 'held' && (e as Ev).habit)).toHaveLength(1);
    expect(lines(r.events)).not.toContain('hold:held');
  });
});

const jar = (owner: string, cast = 1): Jar => ({
  owner,
  event: 'step',
  rest: null,
  heading: null,
  origin: { caster: owner, spell: '0,0', cast },
});

describe('restoreErase: her Erase puts back what the last Erase took (P18)', () => {
  test('a state comes back with its own origin, and the record is used up', () => {
    const s = cloneData(board('D . o\nS . .'));
    const layer = tileOf(s, 'C1').state;
    if (layer) layer.origin = { caster: 'stoker', spell: '1,0', cast: 3 };
    const erased = run(s, 'erase', [tile('C1')], { caster: 'stoker' });
    expect(erased.state.erased).toMatchObject({
      by: 'stoker',
      entries: [{ target: tile('C1'), parts: [{ kind: 'state' }] }],
    });
    const back = run(erased.state, 'erase', [tile('C1')], restoring);
    expect(tileOf(back.state, 'C1').state).toEqual(tileOf(s, 'C1').state);
    expect(back.events).toEqual([
      expect.objectContaining({
        type: 'landed',
        makes: 'slick',
        habit: 'restoreErase',
        origin: { caster: 'stoker', spell: '1,0', cast: 3 },
      }),
    ]);
    expect(back.state.erased).toBeNull();
    expectProjects(erased.state, back.events, back.state);
  });

  test('without the habit an Erase on an empty target does nothing', () => {
    const erased = run(board('D . o'), 'erase', [tile('C1')], { caster: 'stoker' });
    const again = run(erased.state, 'erase', [tile('C1')]);
    expect(again.events).toEqual([]);
    expect(tileOf(again.state, 'C1').state).toBeNull();
  });

  test('restoreErase:jar: a restored jar is its owner’s newest, so the older one crumbles', () => {
    const s = cloneData(board('D . . .\nS . . .'));
    tileOf(s, 'C1').jar = jar('stoker');
    const erased = { state: cloneData(run(s, 'erase', [tile('C1')], { caster: 'stoker' }).state) };
    tileOf(erased.state, 'D1').jar = { ...jar('stoker', 2), id: 7, seq: 7 };
    erased.state.nextJar = 8;
    const back = run(erased.state, 'erase', [tile('C1')], restoring);
    expect(back.events.map((e) => e.type)).toEqual(['jarCrumbles', 'jarSealed']);
    expect(back.events).toEqual([
      expect.objectContaining({ type: 'jarCrumbles', line: 'restoreErase:jar' }),
      expect.objectContaining({
        type: 'jarSealed',
        habit: 'restoreErase',
        line: 'restoreErase:jar',
      }),
    ]);
    expect(tileOf(back.state, 'D1').jar).toBeNull();
    expect(tileOf(back.state, 'C1').jar).toMatchObject({ owner: 'stoker', id: 8, seq: 8 });
    expect(tileOf(back.state, 'C1').jar?.origin).toEqual(jar('stoker').origin);
    expectProjects(erased.state, back.events, back.state);
    // With room to spare it simply comes back, no fine print.
    const roomy = run(
      run(s, 'erase', [tile('C1')], { caster: 'stoker' }).state,
      'erase',
      [tile('C1')],
      restoring,
    );
    expect(lines(roomy.events)).toEqual([]);
    expect(tileOf(roomy.state, 'C1').jar).not.toBeNull();
  });

  test('a mark, collar and shackle come back to the unit that bore them', () => {
    const s = cloneData(board('D r!&$\nS . .'));
    find(s, 'rat-1').collar = { caster: 'stoker', spell: '0,0', cast: 1 };
    const before = find(s, 'rat-1');
    const erased = run(s, 'erase', [unit('rat-1')], { caster: 'stoker' });
    expect(find(erased.state, 'rat-1')).toMatchObject({ mark: null, collar: false, shackle: 0 });
    const back = run(erased.state, 'erase', [unit('rat-1')], restoring);
    expect(back.events.map((e) => e.type)).toEqual(['mixed', 'collared', 'marked']);
    expect(back.events.every((e) => (e as Ev).habit === 'restoreErase')).toBe(true);
    expect(find(back.state, 'rat-1')).toMatchObject({
      mark: before.mark,
      collar: before.collar,
      shackle: before.shackle,
    });
    expectProjects(erased.state, back.events, back.state);
  });

  test('restoreErase:mark: a mark never comes back to someone else', () => {
    // The Erase took the rat's mark through its tile; the rat walks off and a sentry stands there.
    const s = board('D r! .\nS . b');
    const erased = run(s, 'erase', [tile('B1')], { caster: 'stoker' });
    const moved = cloneData(erased.state);
    find(moved, 'rat-1').pos = { x: 2, y: 0 };
    const sentry = find(moved, 'sentry-1');
    sentry.pos = { x: 1, y: 0 };
    sentry.collar = false; // nothing on it to erase
    const back = run(moved, 'erase', [tile('B1')], restoring);
    expect(back.events).toEqual([
      expect.objectContaining({ type: 'miss', habit: 'restoreErase', line: 'restoreErase:mark' }),
    ]);
    expect(find(back.state, 'sentry-1').mark).toBeNull();
    expect(find(back.state, 'rat-1').mark).toBeNull();
    expect(back.state.erased).toBeNull();
  });

  test('restoreErase:unit: a plate cannot come back under a unit on its tile', () => {
    const first = run(board('D . #\nS . r'), 'erase', [tile('C1')], { caster: 'stoker' });
    const erased = { state: cloneData(first.state) };
    find(erased.state, 'rat-1').pos = { x: 2, y: 0 };
    const back = run(erased.state, 'erase', [tile('C1')], restoring);
    expect(back.events).toEqual([
      expect.objectContaining({ type: 'miss', habit: 'restoreErase', line: 'restoreErase:unit' }),
    ]);
    expect(tileOf(back.state, 'C1').state).toBeNull();
  });

  test('blocked: a target that holds something is erased as usual, and that replaces the record', () => {
    const erased = run(board('D . o i\nS . . .'), 'erase', [tile('C1')], { caster: 'stoker' });
    const r = run(erased.state, 'erase', [tile('D1')], restoring);
    expect(r.events).toEqual([expect.objectContaining({ type: 'erased', what: 'blot' })]);
    expect((r.events[0] as Ev).habit).toBeUndefined();
    expect(r.state.erased).toMatchObject({ by: 'draughtsman', entries: [{ target: tile('D1') }] });
    // The slick's entry is gone with the old record.
    const old = run(r.state, 'erase', [tile('C1')], restoring);
    expect(old.events).toEqual([]);
    expect(tileOf(old.state, 'C1').state).toBeNull();
  });

  test('a replaced record: the newest Erase that removed anything is the one remembered', () => {
    const s = board('D . o i .\nS . . . .');
    const first = run(s, 'erase', [tile('C1')], { caster: 'stoker', cast: 1 });
    // An Erase that removes nothing leaves the record alone.
    const empty = run(first.state, 'erase', [tile('E1')], { caster: 'stoker', cast: 2 });
    expect(empty.state.erased).toEqual(first.state.erased);
    const second = run(empty.state, 'erase', [tile('D1')], { caster: 'stoker', cast: 3 });
    expect(second.state.erased?.entries.map((e) => e.target)).toEqual([tile('D1')]);
    const back = run(second.state, 'erase', [tile('C1'), tile('D1')], restoring);
    expect(tileOf(back.state, 'C1').state).toBeNull();
    expect(tileOf(back.state, 'D1').state?.id).toBe('blot');
  });

  test('one Erase over several targets is one record, and each target restores alone', () => {
    const erased = run(board('D . o i\nS . . .'), 'erase', [tile('C1'), tile('D1')], {
      caster: 'stoker',
    });
    expect(erased.state.erased?.entries.map((e) => e.target)).toEqual([tile('C1'), tile('D1')]);
    const one = run(erased.state, 'erase', [tile('D1')], restoring);
    expect(tileOf(one.state, 'D1').state?.id).toBe('blot');
    expect(one.state.erased?.entries.map((e) => e.target)).toEqual([tile('C1')]);
  });

  test('the record survives a cast through the real pipeline and a later turn', () => {
    const s = withLattices('D r! . .', { draughtsman: 'Bolt> Erase' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.state.erased).toMatchObject({ by: 'draughtsman', cast: r.state.castSeq });
    expect(r.state.erased?.entries[0]?.parts).toEqual([
      expect.objectContaining({ kind: 'mark', unit: 'rat-1' }),
    ]);
  });
});
