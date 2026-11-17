import type { Drawing, EnemyId, MasterId, Meets } from '$data';
import { DISTRICT_IDS, ENEMY_IDS, RUNES } from '$data';
import type { Profile } from '$engine';
import { KIT } from '$engine/districts/kit';
import { type GeneratedRoom, generateRoom, specFor } from '$engine/drawing';
import type { GenInput, GenSpec } from '$engine/drawing/types';
import { sampleHousehold, sampleParty } from '../../src/app/dev/samples';

/**
 * EN-W1: the drawings, households and heart rooms the acceptance tests of Packs E to K share. The
 * fixtures are plain Seam, the current with eel and moth, lengths 3 and 6, hearts marginalia and
 * mother (ending-plan §5, Pack E).
 */

export const FIXTURE_DRAWINGS: readonly Drawing[] = [
  {
    name: 'Plain Seam',
    rule: null,
    foes: ['rat', 'familiar', 'sentry'],
    pieces: [],
    shape: 'plain',
    length: 3,
    heart: 'marginalia',
  },
  {
    name: 'The wet room',
    rule: 'canals:current',
    foes: ['eel', 'moth'],
    pieces: [],
    shape: 'plain',
    length: 4,
    heart: 'mother',
  },
  {
    name: 'Long Seam',
    rule: null,
    foes: ['rat', 'sentry'],
    pieces: [],
    shape: 'plain',
    length: 6,
    heart: 'marginalia',
  },
  {
    name: 'Long current',
    rule: 'canals:current',
    foes: ['eel', 'rat'],
    pieces: [],
    shape: 'plain',
    length: 6,
    heart: 'mother',
  },
];

/** A household past the handover with a pen of at least 3: the plain Seam page is drawable. */
export function handoverProfile(): Profile {
  const p = sampleHousehold();
  return {
    ...p,
    ending: { handover: true, creditsSeen: false },
    foesMet: ['rat', 'familiar', 'sentry'],
    city: { ...p.city, open: ['seam', 'canals'], hearts: ['seam'] },
    known: [...new Set([...p.known, ...(Object.keys(RUNES) as Profile['known'])])],
  };
}

/** Every district open, every heart cleared, everything met: what a finished household can offer (P3). */
export function fullHousehold(): Profile {
  const p = handoverProfile();
  const met = [
    ...Object.values(KIT.rules).flatMap((r) => (r.met === undefined ? [] : [r.met])),
    ...Object.values(KIT.pieces).flatMap((d) => (d.bench === undefined ? [] : [d.bench.met])),
  ] as Meets[];
  return {
    ...p,
    met: [...new Set(met)],
    foesMet: [...ENEMY_IDS] as EnemyId[],
    pages: ['lamplighter:lantern'],
    city: {
      ...p.city,
      open: DISTRICT_IDS.filter((d) => d !== 'lowerSeam' && d !== 'inkedPage'),
      hearts: DISTRICT_IDS.filter((d) => d !== 'lowerSeam' && d !== 'inkedPage'),
    },
  };
}

/** One drawing per master, with the rule and a foe its heart needs (`NEEDS`, P5). */
const HEART_EDITS: Record<MasterId, Partial<Drawing>> = {
  marginalia: { foes: ['rat'] },
  mother: { rule: 'canals:current', foes: ['eel'] },
  lamplighter: { rule: 'canals:current', foes: ['eel'] },
  postmaster: { rule: 'inkQuarter:writs', foes: ['rat'] },
  bathSteward: { rule: 'bathhouses:boilOver', foes: ['rat'] },
  chiefWarden: { rule: 'bridges:collapse', foes: ['rat'] },
  carillonneur: { rule: 'foundry:bells', foes: ['rat'] },
  registrar: { foes: ['rat'] },
};

export const heartDrawing = (master: MasterId): Drawing => ({
  name: `Heart of ${master}`,
  rule: null,
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: master,
  foes: ['rat'],
  ...HEART_EDITS[master],
});

/** The generator's input for room `room` of a drawing (default: its heart), a pair of founders. */
export function inputFor(drawing: Drawing, seed: number, room = drawing.length - 1): GenInput {
  return { profile: sampleHousehold(), drawing, party: sampleParty(2), seed, room };
}

/** The heart's spec: the drawing's last room, flagged as the heart. */
export const heartSpec = (input: GenInput): GenSpec => ({
  ...specFor(input, input.seed),
  heart: true,
});

/**
 * The heart room of `master` at `seed`, and whether the master stands on the board (a heart is
 * drawn from its frame, P35: until the frame is used, the room is an ordinary one).
 */
export function heartRoom(
  master: MasterId,
  seed: number,
): { input: GenInput; room: GeneratedRoom; masterOnBoard: boolean } {
  const input = inputFor(heartDrawing(master), seed);
  const room = generateRoom(input);
  const masterOnBoard = room.layout.units.some((u) => u.kind === 'enemy' && u.def === master);
  return { input, room, masterOnBoard };
}
