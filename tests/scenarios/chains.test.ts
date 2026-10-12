import { expect, test } from 'vitest';
import { parseLabel, tileAt } from '$engine';
import { cast, expectLog, unitAtLabel, withLattices } from './harness';

/** Whole chains cast through real lattices (DESIGN §9.5 rules; plan §7.4 logs). */

test('ink-spark-detonation', () => {
  const s0 = withLattices('D . . d . .\n. . . . . .\n. . . S . .', {
    draughtsman: 'Bolt> Ink',
    stoker: 'Spark\nBolt^', // the flow leaves in the arrow's direction
  });
  const r1 = cast(s0, 'draughtsman', 'right');
  expectLog(r1.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at D1 for 2',
    'dummy at D1 is inked',
    'ink pools at C1, E1, C2, D2, E2',
  ]);
  const r2 = cast(r1.state, 'stoker', 'up');
  expectLog(r2.events, [
    'Stoker casts Bolt up',
    'Bolt hits dummy at D1 for 3 (inked +1)',
    'Spark hits dummy at D1 for 3 (inked +1)',
    'the ink on dummy at D1 detonates',
    'Detonation hits dummy at D1 for 2',
  ]);
  const dummy = unitAtLabel(r2.state, 'D1');
  expect(dummy.hp).toBe(2);
  expect(dummy.inked).toBe(false);
});

test('oil-chain', () => {
  const s = withLattices('. . . . . d\nS . ro o ro o', { stoker: 'Bolt> Spark' });
  const r = cast(s, 'stoker', 'right');
  expectLog(r.events, [
    'Stoker casts Bolt right',
    'Bolt hits rat at C2 for 2',
    'rat at C2 dies',
    'oil at C2 ignites, fire spreads to D2, E2, F2',
    'Fire hits rat at E2 for 2 (oil-soaked +1)',
    'rat at E2 dies',
  ]);
  for (const l of ['C2', 'D2', 'E2', 'F2']) expect(tileAt(r.state, parseLabel(l)).fire).toBe(2);
});

test('brass-conduction', () => {
  const s = withLattices('S . = = b\n. . . . r&', { stoker: 'Bolt> Spark' });
  expectLog(cast(s, 'stoker', 'right').events, [
    'Stoker casts Bolt right',
    'Bolt is stopped by the brass plate at C1',
    'Spark conducts through the brass from C1 (4 tiles)',
    'Spark hits sentry at E1 for 2',
    'Spark hits rat at E2 for 2',
    'rat at E2 dies',
  ]);
});

test('steam-arc', () => {
  const s = withLattices('D . ~ ~ ~\n. . r~ . f~', { draughtsman: 'Bolt> Spark' });
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'Bolt is stopped by the steam at C1',
    'Spark arcs through the steam from C1 (5 tiles)',
    'Spark hits rat at C2 for 1',
    'Spark hits familiar at E2 for 1',
    'familiar at E2 dies',
  ]);
});

test('on-kill-burst', () => {
  const s = withLattices('. . . r .\nD . . r r\n. . . . .', {
    draughtsman: 'Bolt> OnKill Spark',
  });
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at D2 for 2',
    'rat at D2 dies',
    'On Kill: bursts from D2',
    'Spark hits rat at D1 for 1',
    'Spark hits rat at E2 for 1',
  ]);
});

test('fork-order: left branch (oil) before right (spark)', () => {
  const s = withLattices('D . d .', {
    draughtsman: '.     Oil   .\nBolt> Fork  .\n.     Spark .',
  });
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'oil coats C1',
    'Spark hits dummy at C1 for 1',
    'oil at C1 ignites',
    'Fire hits dummy at C1 for 1',
  ]);
});

test('fork-order mirrored: spark first, oil stays unlit', () => {
  const s = withLattices('D . d .', {
    draughtsman: '.     Spark .\nBolt> Fork  .\n.     Oil   .',
  });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'Spark hits dummy at C1 for 1',
    'oil coats C1',
  ]);
  expect(tileAt(r.state, parseLabel('C1')).fire).toBe(0);
});

test('amplify', () => {
  const s = withLattices('D . d', { draughtsman: 'Amp   .\nBolt> Spark\n.     Amp' });
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 3',
    'Spark hits dummy at C1 for 2',
  ]);
});

test('self-combo: Ink → On Inked → Spark', () => {
  const s = withLattices('S . d', { stoker: 'Bolt> Ink OnInked Spark' });
  expectLog(cast(s, 'stoker', 'right').events, [
    'Stoker casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'dummy at C1 is inked',
    'On Inked: a target is inked',
    'Spark hits dummy at C1 for 3 (inked +1)',
    'the ink on dummy at C1 detonates',
    'Detonation hits dummy at C1 for 2',
  ]);
});

test('diffuse', () => {
  const s = withLattices('S . ~ r~ .', { stoker: 'Bolt> Ink' });
  expectLog(cast(s, 'stoker', 'right').events, [
    'Stoker casts Bolt right',
    'Bolt is stopped by the steam at C1',
    'ink diffuses through the steam at C1',
    'rat at D1 is inked',
  ]);
});

test('on-inked fails without ink', () => {
  const s = withLattices('S . d', { stoker: 'Bolt> OnInked Spark' });
  expectLog(cast(s, 'stoker', 'right').events, [
    'Stoker casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'On Inked: no inked target, the chain stops',
  ]);
});

test('on-kill fails when nothing died', () => {
  const s = withLattices('S . d', { stoker: 'Bolt> OnKill Spark' });
  expectLog(cast(s, 'stoker', 'right').events, [
    'Stoker casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'On Kill: nothing died, the chain stops',
  ]);
});

test('on-kill counts chain-reaction kills', () => {
  const s = withLattices(
    'D . = r&\n. . . d',
    { draughtsman: 'Bolt> Spark OnKill Steam' },
    { hp: { D1: 1 } },
  );
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'Bolt is stopped by the brass plate at C1',
    'Spark conducts through the brass from C1 (2 tiles)',
    'Spark hits rat at D1 for 1',
    'rat at D1 dies',
    'On Kill: bursts from D1',
    'steam rises at D1, D2',
  ]);
});

test('splash friendly fire', () => {
  const s = withLattices('D . . .\n. r S .', { draughtsman: 'Splash>' });
  expectLog(cast(s, 'draughtsman', { kind: 'tile', at: parseLabel('B2') }).events, [
    'Draughtsman casts Splash at B2',
    'Splash bursts at B2',
    'Splash hits Draughtsman for 1',
    'Splash hits rat at B2 for 1',
    'Splash hits Stoker for 1',
  ]);
});

test('brass rune: a plate where the bolt lands, a coat on a unit', () => {
  const edge = withLattices('D . . . . .\n. . . . . d', { draughtsman: 'Bolt> Brass' });
  const r1 = cast(edge, 'draughtsman', 'right');
  expectLog(r1.events, [
    'Draughtsman casts Bolt right',
    'Bolt lands at F1',
    'a brass plate rises at F1',
  ]);
  expect(tileAt(r1.state, parseLabel('F1')).plate).toBe(true);

  const onRat = withLattices('D . r', { draughtsman: 'Bolt> Brass' }, { hp: { C1: 5 } });
  const r2 = cast(onRat, 'draughtsman', 'right');
  expectLog(r2.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is coated in brass',
  ]);
  expect(unitAtLabel(r2.state, 'C1').brass).toBe(true);
});

test('steam on fire puts it out, the oil stays', () => {
  const s = withLattices('D . *\n. . d', { draughtsman: 'Bolt> Steam' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt lands at C1',
    'steam rises at C1',
    'steam puts out the fire at C1',
  ]);
  const t = tileAt(r.state, parseLabel('C1'));
  expect([t.fire, t.oil, t.steam]).toEqual([0, true, 2]);
});

test('ward shields an ally and the path applies at its tile', () => {
  const s = withLattices('. . S D\nr . . .', { draughtsman: 'Ward> Steam' });
  const r = cast(s, 'draughtsman', { kind: 'ally', unit: 'stoker' });
  expectLog(r.events, [
    'Draughtsman casts Ward on Stoker',
    'Stoker gains a shield of 2',
    'steam rises at C1',
  ]);
  expect(unitAtLabel(r.state, 'C1').shield).toBe(2);
});

test('win mid-cast: the cast finishes, then the party wins', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Spark' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 dies',
    'The party wins',
  ]);
  expect(r.state.phase).toBe('won');
});
