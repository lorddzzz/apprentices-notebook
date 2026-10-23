import { expect, test } from 'vitest';
import { describe, type GameEvent, isSilent, namedIn, type UnitRef } from '$engine';

const at = (x: number, y: number) => ({ x, y });
const draughtsman: UnitRef = { id: 'draughtsman', name: 'Draughtsman', at: at(0, 0), member: true };
const stoker: UnitRef = { id: 'stoker', name: 'Stoker', at: at(4, 6), member: true };
const rat: UnitRef = { id: 'rat-1', name: 'rat', at: at(2, 1), member: false };
const sentry: UnitRef = { id: 'sentry-1', name: 'sentry', at: at(0, 0), member: false };
const intent = { kind: 'attack', attack: 'line', dir: 'right', order: 1 } as const;

type Fixture<T extends GameEvent['type']> = [Extract<GameEvent, { type: T }>, string | null];
/** One fixture per variant; the Record makes a missing variant a type error. */
const FIXTURES: { [T in GameEvent['type']]: Fixture<T>[] } = {
  battleStart: [[{ type: 'battleStart', title: 'Three rats' }, 'Encounter: Three rats']],
  round: [[{ type: 'round', round: 2 }, 'Round 2']],
  phase: [
    [{ type: 'phase', phase: 'resolve' }, 'Enemies act'],
    [{ type: 'phase', phase: 'enemy' }, 'Enemies move'],
    [{ type: 'phase', phase: 'player' }, 'Your turn'],
  ],
  won: [[{ type: 'won' }, 'The party wins']],
  lost: [[{ type: 'lost' }, 'The party is wiped out']],
  moved: [
    [
      { type: 'moved', unit: stoker, to: at(1, 6), path: [at(3, 6), at(2, 6), at(1, 6)] },
      'Stoker moves to B7',
    ],
    [{ type: 'moved', unit: rat, to: at(3, 1), path: [at(3, 1)] }, 'rat at C2 moves to D2'],
  ],
  moveUndone: [
    [{ type: 'moveUndone', unit: draughtsman, to: at(0, 0) }, 'Draughtsman steps back to A1'],
  ],
  pull: [[{ type: 'pull', by: stoker, target: rat, dir: 'left' }, 'Stoker pulls rat at C2']],
  hop: [[{ type: 'hop', unit: stoker, dir: 'right' }, 'Stoker hops right']],
  swapWith: [
    [{ type: 'swapWith', by: stoker, target: rat, dir: 'right' }, 'Stoker swaps with rat at C2'],
  ],
  unharmed: [
    [
      { type: 'unharmed', unit: stoker, source: 'Storm', harm: 'steam' },
      'Storm leaves Stoker unharmed',
    ],
  ],
  shove: [
    [{ type: 'shove', by: stoker, target: rat, dir: 'right' }, 'Stoker shoves rat at C2 right'],
  ],
  cast: [
    [
      {
        type: 'cast',
        caster: draughtsman,
        spell: 'Bolt',
        aim: { kind: 'dir', dir: 'down' },
        aimText: 'down',
      },
      'Draughtsman casts Bolt down',
    ],
  ],
  lands: [[{ type: 'lands', source: 'Bolt', at: at(5, 0), path: [] }, 'Bolt lands at F1']],
  stopped: [
    [
      { type: 'stopped', source: 'Bolt', at: at(2, 0), by: 'cloud', path: [] },
      'Bolt is stopped by the cloud at C1',
    ],
    [
      { type: 'stopped', source: 'Line', at: at(2, 0), by: 'brass plate', path: [] },
      'Line is stopped by the brass plate at C1',
    ],
  ],
  damage: [
    [
      { type: 'damage', target: rat, amount: 2, source: 'Strike', bonus: [], hpLeft: 0 },
      'Strike hits rat at C2 for 2',
    ],
  ],
  shieldAbsorbs: [
    [
      { type: 'shieldAbsorbs', unit: stoker, absorbed: 1, left: 1 },
      "Stoker's shield absorbs 1 (1 left)",
    ],
  ],
  shieldGained: [[{ type: 'shieldGained', unit: stoker, amount: 2 }, 'Stoker gains a shield of 2']],
  died: [
    [{ type: 'died', unit: rat }, 'rat at C2 dies'],
    [{ type: 'died', unit: stoker }, 'Stoker is down'],
  ],
  telegraph: [
    [{ type: 'telegraph', unit: sentry, intent, verb: 'fire' }, 'sentry at A1 will fire right'],
  ],
  idle: [[{ type: 'idle', unit: rat }, 'rat at C2 waits']],
  attack: [[{ type: 'attack', unit: sentry, intent, verbs: 'fires' }, 'sentry at A1 fires right']],
  miss: [[{ type: 'miss', source: 'Line' }, 'Line hits nothing']],
  drift: [
    [
      {
        type: 'drift',
        floats: [{ from: at(0, 0), to: at(1, 0) }],
        units: [{ unit: rat, from: at(2, 1), to: at(3, 1) }],
      },
      'the current carries A1 → B1; rat at C2 drifts to D2',
    ],
  ],
  gateBurns: [[{ type: 'gateBurns', at: at(2, 7) }, 'the lock gate at C8 burns']],
  vent: [[{ type: 'vent', at: at(2, 2) }, 'the vent at C3 puffs steam']],
  snuff: [[{ type: 'snuff', by: rat, tiles: [at(1, 1)] }, 'rat at C2 snuffs the fire at B2']],
  foeBursts: [[{ type: 'foeBursts', unit: rat, at: at(2, 1) }, 'rat at C2 bursts']],
  summon: [
    [{ type: 'summon', by: sentry, unit: rat, at: at(2, 1) }, 'sentry at A1 calls rat at C2'],
  ],
  flare: [[{ type: 'flare', by: sentry }, 'sentry at A1 flares']],
  trace: [
    [
      { type: 'trace', caster: draughtsman, spell: '0,0', cells: [], meaningful: true, spans: [] },
      null,
    ],
  ],
  aimed: [
    [
      {
        type: 'aimed',
        source: 'bolt',
        targets: [{ kind: 'unit', unit: 'rat-1' }],
        heading: 'right',
      },
      'bolt aims at rat-1',
    ],
  ],
  landed: [
    [{ type: 'landed', kind: 'oil', at: at(1, 0), makes: 'slick' }, 'oil lands at B1 as slick'],
    [
      { type: 'landed', kind: 'ink', at: at(2, 1), unit: rat, makes: 'mark' },
      'ink lands on rat at C2 as mark',
    ],
  ],
  mixed: [[{ type: 'mixed', at: at(1, 0), compound: 'greaseFog' }, 'B1: grease fog']],
  washed: [
    [
      { type: 'washed', at: at(1, 0), was: 'stain', now: 'cloud' },
      'the stain at B1 washes out to cloud',
    ],
  ],
  burst: [
    [
      { type: 'burst', burst: 'storm', at: at(1, 0), tiles: [at(1, 0)], units: [rat] },
      'storm bursts at B1, hitting rat at C2',
    ],
    [
      { type: 'burst', burst: 'page:skidPlate', at: at(1, 0), tiles: [], units: [] },
      'skid plate bursts at B1',
    ],
  ],
  stateFades: [[{ type: 'stateFades', tiles: [at(2, 0), at(3, 0)] }, 'the board fades at C1, D1']],
  spreadState: [
    [{ type: 'spreadState', from: at(1, 1), to: [at(1, 0)] }, 'it spreads from B2 to B1'],
  ],
  push: [
    [
      { type: 'push', unit: rat, dir: 'right', path: [at(3, 1), at(4, 1)], slid: 1 },
      'rat at C2 is pushed right to E2 (slides 1)',
    ],
  ],
  crush: [
    [
      { type: 'crush', unit: rat, into: 'wall', damage: 2 },
      'rat at C2 is crushed against the wall for 2',
    ],
    [
      { type: 'crush', unit: rat, into: sentry, damage: 1 },
      'rat at C2 is crushed against sentry at A1 for 1',
    ],
  ],
  dropped: [[{ type: 'dropped', unit: rat, at: at(2, 2), elite: false }, 'rat at C2 drops at C3']],
  stunned: [[{ type: 'stunned', unit: sentry }, 'sentry at A1 is stunned']],
  held: [[{ type: 'held', unit: rat }, 'rat at C2 is held']],
  swapped: [[{ type: 'swapped', a: stoker, b: rat }, 'Stoker and rat at C2 swap places']],
  drawn: [
    [
      { type: 'drawn', from: at(0, 0), to: at(1, 0), what: 'slick' },
      'the slick is drawn from A1 to B1',
    ],
  ],
  erased: [[{ type: 'erased', at: at(0, 0), what: 'mark' }, 'the mark at A1 is erased']],
  marked: [
    [{ type: 'marked', unit: rat, deep: true, bound: null }, 'rat at C2 is deeply marked'],
    [
      { type: 'marked', unit: rat, deep: false, bound: 'inv:recoil' },
      'rat at C2 is marked (holding recoil)',
    ],
  ],
  collared: [[{ type: 'collared', unit: rat }, 'rat at C2 is collared in brass']],
  markSpread: [
    [
      { type: 'markSpread', from: rat, to: [sentry] },
      'the mark spreads from rat at C2 to sentry at A1',
    ],
  ],
  markSpent: [
    [{ type: 'markSpent', unit: rat, released: true }, "rat at C2's mark is spent and released"],
  ],
  markLifted: [
    [
      { type: 'markLifted', from: rat, to: sentry },
      'the mark moves from rat at C2 to sentry at A1',
    ],
  ],
  released: [[{ type: 'released', unit: rat, action: 'shove' }, "rat at C2's mark releases shove"]],
  conducted: [
    [{ type: 'conducted', action: 'strike', units: [] }, 'strike travels the brass to no one'],
  ],
  jarSealed: [
    [
      { type: 'jarSealed', at: at(1, 1), owner: draughtsman, event: 'dusk' },
      'Draughtsman seals a jar at B2 (opens at dusk)',
    ],
  ],
  jarOpened: [
    [{ type: 'jarOpened', at: at(1, 1), by: rat }, 'the jar at B2 opens under rat at C2'],
  ],
  jarCrumbles: [[{ type: 'jarCrumbles', at: at(1, 1) }, 'the jar at B2 crumbles empty']],
  scheduled: [[{ type: 'scheduled', kind: 'repeat', at: at(1, 1) }, 'repeat waits at B2']],
  repeated: [[{ type: 'repeated', action: 'strike' }, 'strike happens again']],
  triggered: [[{ type: 'triggered', rune: 'tally', passed: false }, 'tally: the chain stops']],
  fizzles: [[{ type: 'fizzles', reason: 'cap' }, 'the chain runs too long and fizzles']],
  named: [[{ type: 'named', what: 'compound', id: 'stain' }, null]],
};

test('describe covers every variant', () => {
  for (const list of Object.values(FIXTURES)) {
    for (const [event, line] of list) expect(describe(event), event.type).toBe(line);
  }
});

test('trace and named are silent', () => {
  for (const list of Object.values(FIXTURES)) {
    for (const [event, line] of list) expect(isSilent(event)).toBe(line === null);
  }
});

test('namedIn: named results, first-seen order, deduplicated', () => {
  const events: GameEvent[] = [
    { type: 'named', what: 'compound', id: 'stain' },
    { type: 'damage', target: rat, amount: 1, source: 'Strike', bonus: [], hpLeft: 1 },
    { type: 'named', what: 'burst', id: 'fire' },
    { type: 'named', what: 'compound', id: 'stain' },
  ];
  expect(namedIn(events)).toEqual(['compound:stain', 'burst:fire']);
});
