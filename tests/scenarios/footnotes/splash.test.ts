import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { type GameEvent, parseLabel } from '$engine';
import { runDraft } from '$engine/ctx';
import { push } from '$engine/push';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { unitAtLabel, withLattices } from '../harness';
import { castWith, hpOf, step, tileAim, where } from './castHelper';

const aimedLine = (events: readonly GameEvent[]) => events.find((e) => e.type === 'aimed')?.line;

/**
 * Splash from D1 onto D2: rats at D1 (above the centre), C2 and D2 (the centre); the caster
 * stands at A2. Shove scatters the area (the unit tiles' default is outward from the centre).
 */
function unitScatter(footnotes: Parameters<typeof castWith>[2]) {
  const s = withLattices('. . . r . . .\nD . r r . . .\n. . . . . . .', {
    draughtsman: 'Splash> Shove',
  });
  const r = castWith(s, tileAim('D2'), footnotes);
  const crushes = r.events.filter((e) => e.type === 'damage' && e.source === 'Crush');
  // A two-tile push into a unit: the pushed one has moved a tile, so the full crush is 2.
  const two = withLattices('. . . . . . .\n. r . r . . .\nD . . . . . .', {
    draughtsman: 'Splash> Shove',
  });
  const area = [unitAtLabel(two, 'B2').id, unitAtLabel(two, 'D2').id];
  const pushed = runDraft(
    two,
    (ctx) => {
      push(ctx, unitAtLabel(ctx.s, 'B2'), 'right', 2, null, { area });
    },
    { footnotes },
  );
  const struck = pushed.events.find((e) => e.type === 'damage' && e.target.id === area[1]);
  return {
    rats: ['rat-1', 'rat-2', 'rat-3'].map((id) => where(r.state, id)),
    crushes: crushes.length,
    struck: struck?.type === 'damage' ? struck.amount : 0,
    line: aimedLine(r.events),
  };
}

test('splash:unit fourCombos: gather or sweep, then ripple or press', () => {
  const runs = fourCombos(
    'splash:unit',
    ['splash-unit-gather', 'splash-unit-sweep'],
    ['splash-unit-ripple', 'splash-unit-press'],
    ({ footnotes }) => unitScatter(footnotes),
  );
  const [gatherRipple, gatherPress, sweepRipple, sweepPress] = runs.map((r) => r.result);
  // gather points the rat above the centre down at it; sweep sends it right with everything else.
  expect(gatherRipple?.rats[0]).toBe('D1');
  expect(sweepRipple?.rats[0]).toBe('E1');
  // ripple: no one is crushed; the blocker moves on (gather: down and right, sweep: right).
  expect(gatherRipple?.crushes).toBe(0);
  expect(sweepRipple?.crushes).toBe(0);
  expect(gatherRipple?.rats).toEqual(['D1', 'D2', 'E3']);
  expect(sweepRipple?.rats).toEqual(['E1', 'C2', 'F2']);
  // press: the units crush each other; a pushed unit that moved a tile crushes its blocker for 2.
  expect(gatherPress?.crushes).toBeGreaterThan(0);
  expect(sweepPress?.crushes).toBeGreaterThan(0);
  expect(gatherPress?.struck).toBe(TUNING.crushBase + TUNING.crushPerTile);
  expect(sweepPress?.struck).toBe(TUNING.crushBase + TUNING.crushPerTile);
  expect(gatherRipple?.struck).toBe(0); // ripple: the blocker moves instead of being struck
  // The cast itself reads under the splash line.
  for (const r of runs) expect(r.result.line).toBe('splash:unit');
});

/** The draughtsman steps A2 -> B2 and Splashes her own tile. */
function memberScenarios(footnotes: Parameters<typeof castWith>[2]) {
  // Strike: the caster, an ally at C2 and a rat at B3 are all in the 3×3.
  const a = withLattices('. . . . .\nD . S . .\n. r . . .', { draughtsman: 'Splash> Strike' });
  const stepped = step(a, { type: 'move', unit: 'draughtsman', to: parseLabel('B2') }, footnotes);
  const struck = castWith(stepped.state, tileAim('B2'), footnotes);
  // Shove: a rat in the corner C1; the caster's own tile and the corners take the way of her step.
  const b = withLattices('. . . . .\nD . . . .\n. . . . r', { draughtsman: 'Splash> Shove' });
  const bStepped = step(b, { type: 'move', unit: 'draughtsman', to: parseLabel('B2') }, footnotes);
  const pushed = castWith(bStepped.state, tileAim('B2'), footnotes);
  const corner = withLattices('. . r . .\nD . . . .\n. . . . r', { draughtsman: 'Splash> Shove' });
  const cStepped = step(
    corner,
    { type: 'move', unit: 'draughtsman', to: parseLabel('B2') },
    footnotes,
  );
  const cornered = castWith(cStepped.state, tileAim('B2'), footnotes);
  return {
    caster: hpOf(struck.state, 'draughtsman'),
    casterBefore: hpOf(stepped.state, 'draughtsman'),
    ally: hpOf(struck.state, 'stoker'),
    allyBefore: hpOf(stepped.state, 'stoker'),
    rat: hpOf(struck.state, 'rat-1'),
    ridden: where(pushed.state, 'draughtsman'),
    corner: where(cornered.state, 'rat-1'),
    line: aimedLine(pushed.events),
    strikeLine: aimedLine(struck.events),
  };
}

test('splash:member fourCombos: spared or ride, then friendly or step', () => {
  const runs = fourCombos(
    'splash:member',
    ['splash-member-spared', 'splash-member-ride'],
    ['splash-member-friendly', 'splash-member-step'],
    ({ footnotes }) => memberScenarios(footnotes),
  );
  const [sparedFriendly, sparedStep, rideFriendly, rideStep] = runs.map((r) => r.result);
  const dmg = 2;
  // spared: you are passed over; ride leaves you in it, and you take the Strike like anyone.
  expect(sparedFriendly?.caster).toBe(sparedFriendly?.casterBefore);
  expect(rideFriendly?.caster).toBe((rideFriendly?.casterBefore ?? 0) - dmg);
  // friendly: your ally is passed over by Strike; step does not (so the ally is struck).
  expect(sparedFriendly?.ally).toBe(sparedFriendly?.allyBefore);
  expect(rideFriendly?.ally).toBe(rideFriendly?.allyBefore);
  expect(sparedStep?.ally).toBe((sparedStep?.allyBefore ?? 0) - dmg);
  expect(rideStep?.ally).toBe((rideStep?.allyBefore ?? 0) - dmg);
  // The rat is never spared.
  for (const r of runs) expect(r.result.rat).toBeLessThan(2);
  // ride: the caster in her own Splash takes the way of her step (right); spared leaves her be.
  expect(rideFriendly?.ridden).toBe('C2');
  expect(sparedFriendly?.ridden).toBe('B2');
  // step: a Splash on your own tile points its corner the way you stepped (right); otherwise none.
  expect(sparedStep?.corner).toBe('D1');
  expect(rideStep?.corner).toBe('D1');
  expect(rideFriendly?.corner).toBe('C1');
  expect(sparedFriendly?.corner).toBe('C1');
  // splash:noHeading stops firing once step gives the centre a way; the member line stays.
  expect(rideStep?.line).toBe('splash:member');
  expect(rideFriendly?.line).toBe('splash:noHeading');
  expect(sparedFriendly?.strikeLine).toBe('splash:noHeading');
});

test('splash-member-friendly: a Spark in your Splash passes over allies but still lands', () => {
  const s = withLattices('. . . . .\nD . S . .\n. . . . r', { draughtsman: 'Splash> Spark' });
  const moved = step(s, { type: 'move', unit: 'draughtsman', to: parseLabel('B2') });
  const before = hpOf(moved.state, 'stoker');
  const plain = castWith(moved.state, tileAim('B2'), {});
  const kind = castWith(moved.state, tileAim('B2'), withFootnotes(['splash-member-friendly']));
  expect(hpOf(plain.state, 'stoker')).toBe((before ?? 0) - TUNING.sparkDamage);
  expect(hpOf(kind.state, 'stoker')).toBe(before);
  // The caster herself is still a Splash target.
  expect(hpOf(kind.state, 'draughtsman')).toBeLessThan(hpOf(moved.state, 'draughtsman') ?? 0);
});
