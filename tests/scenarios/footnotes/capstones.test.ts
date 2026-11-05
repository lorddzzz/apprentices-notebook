import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { type Aim, parseLabel } from '$engine';
import { tileAt } from '$engine/queries';
import { withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, hpOf, step, tileAim, where } from './castHelper';

/** FN-C6 capstones (Seam level III): each runs once without and once with its variant written. */
const at = parseLabel;
const right: Aim = { kind: 'dir', dir: 'right' };
const stateAt = (r: { state: Parameters<typeof tileAt>[0] }, l: string) =>
  tileAt(r.state, at(l)).state?.id ?? null;
const shieldOf = (r: { state: { units: { id: string; shield: number }[] } }, id: string) =>
  r.state.units.find((u) => u.id === id)?.shield;

test('bolt-cap-onward: when the target dies, the rest acts on the next unit along the line', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D r r . .', { draughtsman: 'Bolt> Strike Strike' });
    const r = castWith(s, right, withFootnotes(ids));
    return [hpOf(r.state, 'rat-1'), hpOf(r.state, 'rat-2')];
  };
  expect(run([])).toEqual([0, 2]);
  expect(run(['bolt-cap-onward'])).toEqual([0, 0]);
});

test('bolt-cap-front: a Bolt that reaches a unit also acts on the tile before it', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D . . r', { draughtsman: 'Bolt> Oil' });
    return castWith(s, right, withFootnotes(ids));
  };
  expect(stateAt(run([]), 'C1')).toBeNull();
  expect(stateAt(run(['bolt-cap-front']), 'C1')).toBe('slick');
});

test('splash-cap-heart: a unit at the centre is acted on twice', () => {
  const run = (ids: string[]) => {
    const s = withLattices('. . . . . .\nD . . r . .\n. . . . . .', {
      draughtsman: 'Splash> Shove',
    });
    const r = castWith(s, tileAim('D2'), withFootnotes(ids));
    return where(r.state, 'rat-1');
  };
  expect(run([])).toBe('E2');
  expect(run(['splash-cap-heart'])).toBe('F2');
});

test('splash-cap-trail: a kind also lands on the tiles between you and the centre', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D . . . . r', { draughtsman: 'Splash> Oil' });
    return castWith(s, tileAim('D1'), withFootnotes(ids));
  };
  const plain = run([]);
  const trail = run(['splash-cap-trail']);
  expect(stateAt(plain, 'B1')).toBeNull(); // the 3x3 around D1 starts at C1
  expect(stateAt(trail, 'B1')).toBe('slick');
});

test('touch-cap-behind: a neighbouring unit and the unit behind it are both acted on', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D r r', { draughtsman: 'Touch> Strike' });
    const r = castWith(s, tileAim('B1'), withFootnotes(ids));
    return [hpOf(r.state, 'rat-1'), hpOf(r.state, 'rat-2')];
  };
  expect(run([])).toEqual([0, 2]);
  expect(run(['touch-cap-behind'])).toEqual([0, 0]);
});

test('touch-cap-wake: Touch on yourself also acts on the tile you stepped from', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D . . . r', { draughtsman: 'Touch> Oil' });
    const moved = step(s, { type: 'move', unit: 'draughtsman', to: at('B1') });
    return castWith(moved.state, { kind: 'self' }, withFootnotes(ids));
  };
  expect(stateAt(run([]), 'A1')).toBeNull();
  expect(stateAt(run(['touch-cap-wake']), 'A1')).toBe('slick');
});

test('strike-cap-finish: a Strike that kills hands the rest to the nearest unit beside it', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D r r', { draughtsman: 'Touch> Strike Strike' });
    const r = castWith(s, tileAim('B1'), withFootnotes(ids));
    return hpOf(r.state, 'rat-2');
  };
  expect(run([])).toBe(2);
  expect(run(['strike-cap-finish'])).toBe(0);
});

test('strike-cap-crack: a Strike on a wall breaks it', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D {wall}', { draughtsman: 'Touch> Strike' });
    return castWith(s, tileAim('B1'), withFootnotes(ids));
  };
  expect(stateAt(run([]), 'B1')).toBe('wall');
  expect(stateAt(run(['strike-cap-crack']), 'B1')).toBeNull();
});

test('shove-cap-chain: the unit crushed against is shoved one tile too', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D r r . .', { draughtsman: 'Touch> Shove' });
    const r = castWith(s, tileAim('B1'), withFootnotes(ids));
    return [where(r.state, 'rat-1'), where(r.state, 'rat-2')];
  };
  expect(run([])).toEqual(['B1', 'C1']);
  expect(run(['shove-cap-chain'])).toEqual(['B1', 'D1']);
});

test('shove-cap-oily: a unit that slid on oil leaves a slick where it stops', () => {
  const tiles = TUNING.shoveTiles;
  const run = (ids: string[]) => {
    const row = Array.from({ length: 9 }, (_, i) =>
      i === 0 ? 'D' : i === 1 ? 'r' : i === 1 + tiles ? 'o' : '.',
    ).join(' ');
    const s = withLattices(row, { draughtsman: 'Touch> Shove' });
    return castWith(s, tileAim('B1'), withFootnotes(ids));
  };
  const stop = `${String.fromCharCode(65 + 2 + tiles)}1`;
  expect(stateAt(run([]), stop)).toBeNull();
  expect(stateAt(run(['shove-cap-oily']), stop)).toBe('slick');
});

test('guard-cap-share: Guarding someone else shields you for 1 too', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D S', { draughtsman: 'Touch> Guard' });
    return shieldOf(castWith(s, tileAim('B1'), withFootnotes(ids)), 'draughtsman');
  };
  expect(run([])).toBe(0);
  expect(run(['guard-cap-share'])).toBe(1);
});

test('guard-cap-brace: a Guarded unit holds its ground and its shield loses 1', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D r+ . .', { draughtsman: 'Touch> Shove' });
    const r = castWith(s, tileAim('B1'), withFootnotes(ids));
    return [where(r.state, 'rat-1'), shieldOf(r, 'rat-1')];
  };
  expect(run([])[0]).not.toBe('B1');
  expect(run(['guard-cap-brace'])).toEqual(['B1', 0]);
});

const GUARDS = '. Guard\nTouch> Fork\n. Guard';
const FORK = '. Shove\nTouch> Fork\n. Shove';

test('fork-cap-pinch: when both branches push units, they push toward the target', () => {
  const run = (ids: string[]) => {
    const s = withLattices('. . .\n. . .\n. r .\nD . .\n. r .\n. . .\n. . .', {
      draughtsman: FORK,
    });
    const r = castWith(s, tileAim('B4'), withFootnotes(ids));
    return [where(r.state, 'rat-1'), where(r.state, 'rat-2')];
  };
  expect(run([])).toEqual(['C3', 'C5']);
  expect(run(['fork-cap-pinch'])[0]).toBe('B4');
});

test('fork-cap-behind: an empty branch acts on the tile behind the target instead', () => {
  const run = (ids: string[]) => {
    const s = withLattices('. . . r\n. . .\n. . .\nD . .\n. . .\n. . .', { draughtsman: GUARDS });
    const r = castWith(s, tileAim('B4'), withFootnotes(ids));
    return shieldOf(r, 'draughtsman');
  };
  expect(run([])).toBe(0);
  expect(run(['fork-cap-behind'])).toBe(TUNING.guardShield); // the left branch only: the right is dropped
});

test('bend-cap-turn and bend-cap-back: the runes after a Bend take the turned or reversed heading', () => {
  const run = (ids: string[]) => {
    const s = withLattices('. . .\nD r .\n. . .', { draughtsman: 'Touch> Bendv\n. Shove' });
    const r = castWith(s, tileAim('B2'), withFootnotes(ids));
    return where(r.state, 'rat-1');
  };
  expect(run([])).toBe('C2');
  expect(run(['bend-cap-turn'])).toBe('B3');
  expect(run(['bend-cap-back'])).toBe('B2'); // pushed back into the caster: crushed, stays
});
