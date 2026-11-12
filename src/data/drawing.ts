import type { MasterId } from './types';

/**
 * The drawing table's numbers (EN P5, P6, P7, P13, P23): element costs on the pen and the
 * compatibility table. Kits and heart frames read `NEEDS[id]` so each reason is written once.
 */

/** One need: any one of `anyOf` (a rule or piece id) must be on the drawing; `reason` is its sentence. */
export interface NeedRow {
  anyOf: readonly string[];
  reason: string;
}

/** Element costs on the pen (ending §1.3); heart costs per P13. */
export const COSTS = {
  rule: 3,
  minion: 1,
  elite: 2,
  piece: 1,
  shape: 2,
  /** Per encounter beyond `BASE_LENGTH`. */
  lengthStep: 1,
  hearts: {
    marginalia: 2,
    mother: 2,
    lamplighter: 3,
    postmaster: 3,
    bathSteward: 3,
    chiefWarden: 3,
    carillonneur: 3,
    registrar: 4,
  } satisfies Record<MasterId, number>,
} as const;

export const BASE_LENGTH = 3;

/** P7: light up to `light`, medium up to `medium`, heavy above. */
export const WEIGHT_BANDS = { light: 9, medium: 14 } as const;

const CURRENT = ['canals:current'];
const BELLS = ['foundry:bells', 'foundry:bell'];

/** P5: needs by element id (foe, heart or shape). Ids named in `anyOf` are rules and pieces. */
export const NEEDS: Readonly<Record<string, readonly NeedRow[]>> = {
  eel: [{ anyOf: CURRENT, reason: 'The eel needs water: draw the current.' }],
  moth: [
    {
      anyOf: CURRENT,
      reason: 'The lamp-moth needs lamps: draw the current, which lights its lanes.',
    },
  ],
  mother: [
    { anyOf: CURRENT, reason: 'The lamp-mother needs water: draw the current.' },
    {
      anyOf: CURRENT,
      reason: 'The lamp-mother needs lamps: draw the current, which lights its lanes.',
    },
  ],
  postmaster: [
    { anyOf: ['inkQuarter:writs'], reason: 'The postmaster needs writs: draw the writs.' },
  ],
  bathSteward: [
    { anyOf: ['bathhouses:boilOver'], reason: 'The Bath-Steward needs vents: draw boil-over.' },
  ],
  chiefWarden: [
    {
      anyOf: ['bridges:collapse'],
      reason: 'The Chief Warden needs a collapsing span: draw collapse.',
    },
  ],
  carillonneur: [{ anyOf: BELLS, reason: 'The Carillonneur needs bells: draw sympathetic bells.' }],
  'bathhouses:heat': [
    { anyOf: ['bathhouses:boilOver'], reason: 'Rising heat needs boil-over: draw boil-over.' },
  ],
  'bridges:span': [
    { anyOf: ['bridges:collapse'], reason: 'A span choice needs collapse: draw collapse.' },
  ],
  'foundry:peal': [{ anyOf: BELLS, reason: 'A peal needs bells: draw sympathetic bells.' }],
};
