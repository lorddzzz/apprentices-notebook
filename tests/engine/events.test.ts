import { expect, test } from 'vitest';
import { describe, discoveriesIn, type GameEvent, type UnitRef } from '$engine';

const at = (x: number, y: number) => ({ x, y });
const draughtsman: UnitRef = { id: 'draughtsman', name: 'Draughtsman', at: at(0, 0), member: true };
const stoker: UnitRef = { id: 'stoker', name: 'Stoker', at: at(4, 6), member: true };
const rat: UnitRef = { id: 'rat-1', name: 'rat', at: at(2, 1), member: false };
const sentry: UnitRef = { id: 'sentry-1', name: 'sentry', at: at(0, 0), member: false };
const intent = { attack: 'line', dir: 'right', order: 1 } as const;

const fixtures: [GameEvent, string][] = [
  [{ type: 'battleStart', title: 'Three rats' }, 'Encounter: Three rats'],
  [{ type: 'round', round: 2 }, 'Round 2'],
  [{ type: 'phase', phase: 'resolve' }, 'Enemies act'],
  [{ type: 'phase', phase: 'enemy' }, 'Enemies move'],
  [{ type: 'phase', phase: 'player' }, 'Your turn'],
  [{ type: 'won' }, 'The party wins'],
  [{ type: 'lost' }, 'The party is wiped out'],
  [
    { type: 'moved', unit: stoker, to: at(1, 6), path: [at(3, 6), at(2, 6), at(1, 6)] },
    'Stoker moves to B7',
  ],
  [{ type: 'moved', unit: rat, to: at(3, 1), path: [at(3, 1)] }, 'rat at C2 moves to D2'],
  [{ type: 'moveUndone', unit: draughtsman, to: at(0, 0) }, 'Draughtsman steps back to A1'],
  [{ type: 'shove', by: stoker, target: rat, dir: 'right' }, 'Stoker shoves rat at C2 right'],
  [{ type: 'pushed', unit: rat, to: at(3, 1) }, 'rat at C2 is pushed to D2'],
  [{ type: 'bump', unit: rat, into: 'the edge' }, 'rat at C2 bumps into the edge'],
  [{ type: 'bump', unit: rat, into: 'sentry at A1' }, 'rat at C2 bumps into sentry at A1'],
  [
    { type: 'slide', unit: rat, to: at(4, 1), path: [at(3, 1), at(4, 1)] },
    'rat at C2 slides across the oil to E2',
  ],
  [
    {
      type: 'cast',
      caster: draughtsman,
      spell: 'Bolt',
      aim: { kind: 'dir', dir: 'right' },
      aimText: 'right',
      echo: false,
    },
    'Draughtsman casts Bolt right',
  ],
  [
    {
      type: 'cast',
      caster: draughtsman,
      spell: 'Splash',
      aim: { kind: 'tile', at: at(3, 3) },
      aimText: 'at D4',
      echo: false,
    },
    'Draughtsman casts Splash at D4',
  ],
  [
    {
      type: 'cast',
      caster: draughtsman,
      spell: 'Ward',
      aim: { kind: 'ally', unit: 'stoker' },
      aimText: 'on Stoker',
      echo: false,
    },
    'Draughtsman casts Ward on Stoker',
  ],
  [
    {
      type: 'cast',
      caster: draughtsman,
      spell: 'Bolt',
      aim: { kind: 'dir', dir: 'right' },
      aimText: 'right',
      echo: true,
    },
    "Echo: Draughtsman's Bolt repeats right at half strength",
  ],
  [{ type: 'echoQueued', caster: draughtsman }, "Echo: Draughtsman's spell will repeat next turn"],
  [{ type: 'echoFizzles', caster: draughtsman }, "Echo: Draughtsman's spell fizzles"],
  [{ type: 'lands', source: 'Bolt', at: at(5, 0), path: [at(1, 0), at(5, 0)] }, 'Bolt lands at F1'],
  [
    { type: 'stopped', source: 'Bolt', at: at(2, 0), by: 'steam', path: [at(1, 0), at(2, 0)] },
    'Bolt is stopped by the steam at C1',
  ],
  [
    { type: 'stopped', source: 'Line', at: at(2, 0), by: 'brass plate', path: [at(2, 0)] },
    'Line is stopped by the brass plate at C1',
  ],
  [{ type: 'splash', center: at(1, 1), tiles: [at(0, 0)] }, 'Splash bursts at B2'],
  [
    { type: 'damage', target: rat, amount: 2, source: 'Bolt', bonus: [], hpLeft: 0 },
    'Bolt hits rat at C2 for 2',
  ],
  [
    { type: 'damage', target: rat, amount: 3, source: 'Bolt', bonus: ['inked +1'], hpLeft: 0 },
    'Bolt hits rat at C2 for 3 (inked +1)',
  ],
  [
    {
      type: 'damage',
      target: rat,
      amount: 3,
      source: 'Fire',
      bonus: ['oil-soaked +1', 'inked +1'],
      hpLeft: 0,
    },
    'Fire hits rat at C2 for 3 (oil-soaked +1, inked +1)',
  ],
  [
    { type: 'shieldAbsorbs', unit: stoker, absorbed: 2, left: 0 },
    "Stoker's shield absorbs 2 (0 left)",
  ],
  [{ type: 'shieldGained', unit: stoker, amount: 2 }, 'Stoker gains a shield of 2'],
  [{ type: 'died', unit: draughtsman }, 'Draughtsman is down'],
  [{ type: 'died', unit: rat }, 'rat at C2 dies'],
  [{ type: 'inked', unit: rat, via: 'mark' }, 'rat at C2 is inked'],
  [{ type: 'inked', unit: draughtsman, via: 'puddle' }, 'Draughtsman steps in ink and is inked'],
  [{ type: 'puddle', tiles: [at(2, 0), at(4, 0)] }, 'ink pools at C1, E1'],
  [{ type: 'diffuse', at: at(2, 0), tiles: [at(2, 0)] }, 'ink diffuses through the steam at C1'],
  [{ type: 'oiled', tiles: [at(2, 1), at(3, 1)] }, 'oil coats C2, D2'],
  [{ type: 'steam', tiles: [at(3, 3), at(3, 4)] }, 'steam rises at D4, D5'],
  [{ type: 'plates', tiles: [at(5, 0)] }, 'a brass plate rises at F1'],
  [{ type: 'plates', tiles: [at(5, 0), at(5, 1)] }, 'brass plates rise at F1, F2'],
  [{ type: 'coated', unit: rat }, 'rat at C2 is coated in brass'],
  [{ type: 'detonate', unit: rat }, 'the ink on rat at C2 detonates'],
  [{ type: 'ignite', at: at(2, 1), tiles: [at(2, 1)] }, 'oil at C2 ignites'],
  [
    { type: 'ignite', at: at(2, 1), tiles: [at(2, 1), at(3, 1), at(4, 1)] },
    'oil at C2 ignites, fire spreads to D2, E2',
  ],
  [{ type: 'extinguish', tiles: [at(4, 0)] }, 'steam puts out the fire at E1'],
  [
    { type: 'arc', from: at(2, 0), tiles: [at(2, 0), at(3, 0), at(4, 0), at(2, 1), at(4, 1)] },
    'Spark arcs through the steam from C1 (5 tiles)',
  ],
  [
    { type: 'conduct', from: at(2, 0), tiles: [at(2, 0), at(3, 0), at(4, 0), at(4, 1)] },
    'Spark conducts through the brass from C1 (4 tiles)',
  ],
  [{ type: 'trigger', rune: 'onInked', passed: true }, 'On Inked: a target is inked'],
  [
    { type: 'trigger', rune: 'onInked', passed: false },
    'On Inked: no inked target, the chain stops',
  ],
  [{ type: 'trigger', rune: 'onKill', passed: true, at: at(3, 1) }, 'On Kill: bursts from D2'],
  [{ type: 'trigger', rune: 'onKill', passed: false }, 'On Kill: nothing died, the chain stops'],
  [{ type: 'telegraph', unit: sentry, intent, verb: 'fire' }, 'sentry at A1 will fire right'],
  [{ type: 'idle', unit: rat }, 'rat at C2 waits'],
  [{ type: 'attack', unit: sentry, intent, verbs: 'fires' }, 'sentry at A1 fires right'],
  [{ type: 'miss', source: 'Line' }, 'Line hits nothing'],
  [{ type: 'fireOut', tiles: [at(2, 0), at(3, 0)] }, 'the fire at C1, D1 burns out'],
  [{ type: 'steamFades', tiles: [at(2, 0)] }, 'the steam at C1 fades'],
  [{ type: 'vent', at: at(2, 2) }, 'the vent at C3 puffs steam'],
];

test('describe covers every variant', () => {
  for (const [event, line] of fixtures) expect(describe(event)).toBe(line);
  const covered = new Set(fixtures.map(([e]) => e.type));
  const all: GameEvent['type'][] = [
    'battleStart',
    'round',
    'phase',
    'won',
    'lost',
    'moved',
    'moveUndone',
    'shove',
    'pushed',
    'bump',
    'slide',
    'cast',
    'echoQueued',
    'echoFizzles',
    'lands',
    'stopped',
    'splash',
    'damage',
    'shieldAbsorbs',
    'shieldGained',
    'died',
    'inked',
    'puddle',
    'diffuse',
    'oiled',
    'steam',
    'plates',
    'coated',
    'detonate',
    'ignite',
    'extinguish',
    'arc',
    'conduct',
    'trigger',
    'telegraph',
    'idle',
    'attack',
    'miss',
    'fireOut',
    'steamFades',
    'vent',
  ];
  for (const t of all) expect(covered.has(t), t).toBe(true);
});

test('discoveriesIn maps and dedups', () => {
  const events: GameEvent[] = [
    { type: 'damage', target: rat, amount: 1, source: 'Bolt', bonus: [], hpLeft: 1 },
    { type: 'ignite', at: at(0, 0), tiles: [at(0, 0)] },
    { type: 'detonate', unit: rat },
    { type: 'ignite', at: at(1, 0), tiles: [at(1, 0)] },
    { type: 'slide', unit: rat, to: at(2, 0), path: [at(2, 0)] },
    { type: 'conduct', from: at(0, 0), tiles: [] },
    { type: 'arc', from: at(0, 0), tiles: [] },
    { type: 'extinguish', tiles: [] },
    { type: 'diffuse', at: at(0, 0), tiles: [] },
  ];
  expect(discoveriesIn(events)).toEqual([
    'ignite',
    'detonate',
    'slide',
    'conduct',
    'arc',
    'extinguish',
    'diffuse',
  ]);
});
