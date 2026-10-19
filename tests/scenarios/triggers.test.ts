import { describe, expect, test } from 'vitest';
import { type BattleState, describeLog, parseLabel } from '$engine';
import { castWith, fakes } from './fake-runes';
import { expectLogIncludes, withLattices } from './harness';

/**
 * Design R8 and plan P26: a Trigger reads the board as it stood when the cast began, never the
 * board the cast has made since. The Actions and Kinds are fakes (`fake-runes.ts`).
 */

const unit = (state: BattleState, id: string) => state.units.find((u) => u.id === id);
const triggered = (events: readonly { type: string }[]) =>
  events.filter((e) => e.type === 'triggered');

describe('Tally (two or more things on the target and its tile)', () => {
  test('own-cast-cannot-satisfy-tally', () => {
    const f = fakes();
    // The cast itself marks the rat and oils its tile: two things by the time Tally looks.
    const r = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Ink Oil Tally Strike' }),
      'draughtsman',
      'right',
    );
    expect(unit(r.state, 'rat-1')?.mark).not.toBeNull();
    expect(r.state.tiles[2]?.state?.id).toBe('slick');
    expect(f.calls).toEqual(['ink@C1', 'oil@C1']);
    expectLogIncludes(r.events, ['tally: the chain stops']);
  });

  test('the same two things from an earlier turn let the rest through', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . r!o', { draughtsman: 'Bolt> Tally Strike' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['strike@C1']);
    expectLogIncludes(r.events, ['tally: the rest happens', 'Strike hits rat at C1 for 2']);
  });

  test('one thing is not enough; a collar counts; a jar counts', () => {
    const one = fakes();
    castWith(
      one,
      withLattices('D . r!', { draughtsman: 'Bolt> Tally Strike' }),
      'draughtsman',
      'right',
    );
    expect(one.calls).toEqual([]);

    const collar = fakes();
    castWith(
      collar,
      withLattices('D . r&o', { draughtsman: 'Bolt> Tally Strike' }),
      'draughtsman',
      'right',
    );
    expect(collar.calls).toEqual(['strike@C1']);

    // A tile target (empty line) with a state and a jar on it.
    const start = structuredClone(withLattices('D . . . .', { draughtsman: 'Bolt> Tally Oil' }));
    const tile = start.tiles[4];
    if (tile) {
      tile.state = { id: 'blot', rounds: 0, origin: null };
      tile.jar = {
        owner: 'stoker',
        event: 'step',
        rest: null,
        heading: null,
        origin: { caster: 'stoker', spell: 'x', cast: 0 },
      };
    }
    const jar = fakes();
    castWith(jar, start, 'draughtsman', 'right');
    expect(jar.calls).toEqual(['oil@E1']);
  });

  test('failed-trigger-keeps-earlier', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Ink Tally Strike Oil' }),
      'draughtsman',
      'right',
    );
    // The Ink already landed and stays; nothing after the Tally ran.
    expect(f.calls).toEqual(['ink@C1']);
    expect(unit(r.state, 'rat-1')?.mark).not.toBeNull();
    expect(unit(r.state, 'rat-1')?.hp).toBe(unit(withLattices('D . r', {}), 'rat-1')?.hp);
    expect(triggered(r.events)).toEqual([
      { type: 'triggered', rune: 'tally', passed: false, origin: expect.anything() },
    ]);
    // The trace lists the cells that actually fired: the Strike and the Oil did not.
    const trace = r.events.find((e) => e.type === 'trace');
    expect(trace?.type === 'trace' ? trace.cells.map((c) => c.rune) : null).toEqual([
      'bolt',
      'ink',
      'tally',
    ]);
  });

  test('in a Splash each target is judged on its own', () => {
    const f = fakes();
    const board = '. . D . .\n. r!o . . .\n. . . r .\n. . . . .';
    const r = castWith(
      f,
      withLattices(board, { draughtsman: 'Splash> Tally Strike' }),
      'draughtsman',
      {
        kind: 'tile',
        at: parseLabel('C3'),
      },
    );
    // Only the marked rat on a slick passes. (Tiles with nothing on them fail too.)
    expect(f.calls).toEqual(['strike@B2']);
    expect(triggered(r.events)).toHaveLength(1);
    expect(describeLog(r.events)).toContain('tally: the rest happens');
  });
});

describe('Brink (beside an edge or a canal)', () => {
  test('brink-reads-cast-start', () => {
    // The rat starts beside the drop (B1 under it); the Shove moves it away. Brink remembers.
    const away = fakes();
    const a = castWith(
      away,
      withLattices('. _ .\nD r .', { draughtsman: 'Bolt> Shove Brink Strike' }),
      'draughtsman',
      'right',
    );
    expect(away.calls).toEqual(['shove@B2', 'strike@C2']);
    expectLogIncludes(a.events, ['brink: the rest happens']);

    // The rat starts away from it; the Shove brings it beside the drop. Brink still says no.
    const near = fakes();
    const b = castWith(
      near,
      withLattices('D r . .\n. . _ .', { draughtsman: 'Bolt> Shove Brink Strike' }),
      'draughtsman',
      'right',
    );
    expect(near.calls).toEqual(['shove@B1']);
    expectLogIncludes(b.events, ['brink: the chain stops']);
  });

  test('a board edge counts only where the district edge is a drop (P3); water counts always', () => {
    const lattice = { draughtsman: 'Bolt> Brink Strike' };
    const wall = fakes();
    castWith(wall, withLattices('D r', lattice), 'draughtsman', 'right');
    expect(wall.calls).toEqual([]);

    const drop = fakes();
    // (`scenarioSpec` doesn't pass `edge` on yet, so set it on the state.)
    const dropBoard = { ...structuredClone(withLattices('D r', lattice)), edge: 'drop' as const };
    castWith(drop, dropBoard, 'draughtsman', 'right');
    expect(drop.calls).toEqual(['strike@B1']);

    const water = fakes();
    castWith(water, withLattices('D r w>\n. . .', lattice), 'draughtsman', 'right');
    expect(water.calls).toEqual(['strike@B1']);
  });
});

describe('Unison (another apprentice landed on this target this turn)', () => {
  const BOARD = 'S . r . D';
  const lattices = { stoker: 'Bolt> Oil', draughtsman: 'Bolt> Unison Strike' };

  test('unison-needs-other-apprentice', () => {
    // Alone, it fails.
    const alone = fakes();
    const r = castWith(alone, withLattices(BOARD, lattices), 'draughtsman', 'left');
    expect(alone.calls).toEqual([]);
    expectLogIncludes(r.events, ['unison: the chain stops']);

    // After the Stoker's cast reached the same rat, it passes.
    const f = fakes();
    const first = castWith(f, withLattices(BOARD, lattices), 'stoker', 'right');
    expect(first.state.landed).toEqual([{ caster: 'stoker', targets: ['u:rat-1'] }]);
    const second = castWith(f, first.state, 'draughtsman', 'left');
    expect(f.calls).toEqual(['oil@C1', 'strike@C1']);
    expectLogIncludes(second.events, ['unison: the rest happens', 'Strike hits rat at C1 for 2']);
  });

  test('a foe landing on the target does not count', () => {
    const start = structuredClone(withLattices(BOARD, lattices));
    start.landed.push({ caster: 'rat-1', targets: ['u:rat-1'] });
    const f = fakes();
    castWith(f, start, 'draughtsman', 'left');
    expect(f.calls).toEqual([]);
  });

  test('any step target counts, not only the first: a Seep neighbour', () => {
    const board = 'S r . . .\n. r . . D';
    const f = fakes();
    const first = castWith(
      f,
      withLattices(board, { stoker: 'Bolt> Seep Oil', draughtsman: 'Bolt> Unison Strike' }),
      'stoker',
      'right',
    );
    // rat-2 (B2) was a neighbour of the target rat-1 (B1).
    expect(first.state.landed[0]?.targets).toContain('u:rat-2');
    const g = fakes();
    castWith(g, first.state, 'draughtsman', 'left');
    expect(g.calls).toEqual(['strike@B2']);
  });
});
