import { expect, it } from 'vitest';
import type { Drawing } from '$data';
import {
  baseBudget,
  checkGenerated,
  GEN_KITS,
  generateRoom,
  partyReach,
  specFor,
} from '$engine/drawing';
import { strandedBy } from '$engine/drawing/kits/bridges';
import type { GenSpec } from '$engine/drawing/types';
import { type BoardSpec, parseBoard } from '$engine/notation';
import { CAL_DRAWINGS, CAL_PARTIES, calibrationProfile } from '../fixtures/calibration/drawings';
import { inputFor } from './fixtures';

/** CAL-5G: the generator's walk and its reach rule. */

// An eel on a board with no lanes has nowhere to stand: every attempt is held back by the guardrails.
const NO_LANES: Drawing = {
  name: 'Eel without lanes',
  rule: null,
  foes: ['eel'],
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: 'marginalia',
};

it('CAL-5G: a held-back attempt keeps its budget', () => {
  const input = inputFor(NO_LANES, 1, 1);
  const room = generateRoom(input);
  const walk = room.trials.filter((t) => t.attempt <= 4);
  expect(walk.length).toBe(4);
  expect(walk.every((t) => t.won === null)).toBe(true);
  expect(walk.map((t) => t.budget)).toEqual(Array(4).fill(baseBudget(input)));
});

// ── One reach rule (G1) ────────────────────────────────────────────────────────────────────────

const PLAIN: Drawing = {
  name: 'Plain reach',
  rule: null,
  foes: ['rat'],
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: 'marginalia',
};

const board = (...rows: string[]): BoardSpec => parseBoard(rows.join('\n'));
const kitPiece = (id: string) => {
  const piece = GEN_KITS.flatMap((k) => k.pieces).find((p) => p.id === id);
  if (!piece) throw new RangeError(`No piece ${id}`);
  return piece;
};
const specOver = (layout: BoardSpec, drawing: Drawing = PLAIN): GenSpec => ({
  ...specFor(inputFor(drawing, 1, 0), 1),
  size: { width: layout.width, height: layout.height },
});
const issues = (layout: BoardSpec, drawing?: Drawing) =>
  checkGenerated(layout, specOver(layout, drawing)).filter(
    (i) => i.guardrail === 'reach' || i.guardrail === 'kit',
  );

it('CAL-5G: an eel in a lane beside the shore is reached by the generator, the paper and the pier alike', () => {
  const eel = { ...PLAIN, foes: ['eel' as const] };
  const open = board('P . . . wv', '. . . . wv', '. . . . ew>', '. . . . wv');
  expect(partyReach(open)).toEqual({ startsJoined: true, unreached: [] });
  expect(issues(open, eel)).toEqual([]);
  expect(strandedBy(open)).toBeNull();
  const paper = board('P . . . wv', '. . . . wv', '. . . . ew>', '{blank} . . . wv');
  expect(kitPiece('cartographers:blank').valid(paper)).toBe(true);
  expect(issues(paper, { ...eel, pieces: ['cartographers:blank'] })).toEqual([]);
});

it('CAL-5G: a flyer across a drop is reached at 4 cast tiles and not at 5', () => {
  const near = board('P . _ _ _ f .', '. . _ _ _ . .', '. . _ _ _ . .');
  expect(partyReach(near).unreached).toEqual([]);
  expect(issues(near, { ...PLAIN, foes: ['familiar'] })).toEqual([]);
  const far = board('P . _ _ _ . f', '. . _ _ _ . .', '. . _ _ _ . .');
  expect(partyReach(far).unreached).toEqual([{ x: 6, y: 0 }]);
  expect(issues(far, { ...PLAIN, foes: ['familiar'] })).toEqual([
    expect.objectContaining({ guardrail: 'reach', at: { x: 6, y: 0 } }),
  ]);
});

it('CAL-5G: a foe beyond water with no cast line is unreached by every check', () => {
  const lane = 'w> w> w> w> w>';
  const cut = board(`P . ${lane} r`, `. . ${lane} .`, `. . ${lane} .`);
  expect(partyReach(cut)).toEqual({ startsJoined: true, unreached: [{ x: 7, y: 0 }] });
  // The generator used to walk through the water and call the rat reached.
  expect(issues(cut)).toEqual([
    expect.objectContaining({ guardrail: 'reach', at: { x: 7, y: 0 } }),
  ]);
  expect(strandedBy(cut)).toBe('A foe is cut off from the party');
  const paper = board(`P . ${lane} r`, `. . ${lane} .`, `{blank} . ${lane} .`);
  expect(kitPiece('cartographers:blank').valid(paper)).toBe(false);
});

it('CAL-5G: reach is judged after unsupported spans fall', () => {
  const water = 'w> w> w> w> w> w> w> w>';
  const row = (mid: string) => `P . {span} {span} ${mid} {span} {span} r`;
  // No pier: the whole bridge drops at the first dusk and the rat is a river away.
  const cracked = board(row('{span}'), water, water);
  expect(partyReach(cracked).unreached).toEqual([{ x: 7, y: 0 }]);
  expect(strandedBy(cracked)).toBe('A foe is cut off from the party');
  // One pier holds the network up: the party walks the bridge to the rat.
  const held = board(row('{pier}'), water, water);
  expect(partyReach(held)).toEqual({ startsJoined: true, unreached: [] });
  expect(strandedBy(held)).toBeNull();
});

it('CAL-5G: the minimum fallback validates only the selected pieces on its board', () => {
  const lane = 'w> w> w> w> w>';
  const drawing = { ...PLAIN, pieces: ['cartographers:blank' as const] };
  const bare = board(`P . ${lane} r`, `. . ${lane} .`, `. . ${lane} .`);
  expect(checkGenerated(bare, specOver(bare, drawing)).map((i) => i.guardrail)).not.toContain(
    'kit',
  );
  const laid = board(`P . ${lane} r`, `. . ${lane} .`, `{blank} . ${lane} .`);
  expect(checkGenerated(laid, specOver(laid, drawing)).map((i) => i.guardrail)).toContain('kit');
});

it.each(['Medium Lamplighter', 'Heavy Mother'])(
  'CAL-5G: Medium Lamplighter and Heavy Mother offer no invalid piece at any ordinary depth (pair, seed 1): %s',
  (name) => {
    const drawing = CAL_DRAWINGS.find((d) => d.name === name);
    if (!drawing) throw new RangeError(`No fixture ${name}`);
    const profile = calibrationProfile(CAL_PARTIES.pair);
    for (let room = 0; room < drawing.length - 1; room++) {
      const input = { profile, drawing, party: CAL_PARTIES.pair, seed: 1, room };
      const made = generateRoom(input);
      const bad = checkGenerated(made.layout, specFor(input, 1)).filter(
        (i) => i.guardrail === 'kit' || i.guardrail === 'reach',
      );
      expect(bad, `${name} depth ${room + 1}`).toEqual([]);
    }
  },
  300_000,
);
