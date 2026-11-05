import type { VariantDef } from '../types';

/**
 * Batch `seam-methods` (plan FN-C8): Conduct, Repeat and Margin, level I and II pairs on their one
 * line each and a capstone pair (text approved in `footnotes-content/seam.md` §3). Bind, Lift,
 * Gallnut and Cinder follow in FN-C9.
 */
export const SEAM_METHODS: readonly VariantDef[] = [
  {
    id: 'conduct-network-scatter',
    subject: 'conduct',
    slot: { line: 'conduct:network', level: 1 },
    text: "Each conducted unit takes its own heading, away from the brass, not the target's.",
  },
  {
    id: 'conduct-network-spare',
    subject: 'conduct',
    slot: { line: 'conduct:network', level: 1 },
    text: 'A conducted action passes over your apprentices on the brass.',
  },
  {
    id: 'conduct-network-collar',
    subject: 'conduct',
    slot: { line: 'conduct:network', level: 2 },
    text: 'Every unit a conduct reaches is collared, so it joins the brass for the next one.',
  },
  {
    id: 'conduct-network-hum',
    subject: 'conduct',
    slot: { line: 'conduct:network', level: 2 },
    text: 'A conduct leaves its brass humming: Spark on it this round deals 1 more.',
  },
  {
    id: 'conduct-cap-mark',
    subject: 'conduct',
    slot: { capstone: true },
    text: 'When the target is marked, every unit the conduct reaches is marked too.',
  },
  {
    id: 'conduct-cap-cloud',
    subject: 'conduct',
    slot: { capstone: true },
    text: 'When no brass touches the target, the action travels the connected cloud instead.',
  },
  {
    id: 'repeat-empty-follow',
    subject: 'repeat',
    slot: { line: 'repeat:empty', level: 1 },
    text: 'A repeat follows the unit it first hit, not the tile, while that unit lives.',
  },
  {
    id: 'repeat-empty-reaim',
    subject: 'repeat',
    slot: { line: 'repeat:empty', level: 1 },
    text: "A repeat points from where its caster stands when it falls due, not the first cast's way.",
  },
  {
    id: 'repeat-empty-dusk',
    subject: 'repeat',
    slot: { line: 'repeat:empty', level: 2 },
    text: 'A repeat falls due at round end, not on your next turn.',
  },
  {
    id: 'repeat-empty-step',
    subject: 'repeat',
    slot: { line: 'repeat:empty', level: 2 },
    text: 'A repeat goes off early if a unit steps onto its tile, or the unit it follows is moved, before it falls due.',
  },
  {
    id: 'repeat-cap-pushed',
    subject: 'repeat',
    slot: { capstone: true },
    text: 'When the target is pushed during your turn, the repeat acts at once on its new tile, and is spent.',
  },
  {
    id: 'repeat-cap-patient',
    subject: 'repeat',
    slot: { capstone: true },
    text: 'When a repeat falls due on an empty tile, it waits one more turn.',
  },
  {
    id: 'margin-empty-follow',
    subject: 'margin',
    slot: { line: 'margin:empty', level: 1 },
    text: 'An echo follows the unit it first hit, not the tile.',
  },
  {
    id: 'margin-empty-wait',
    subject: 'margin',
    slot: { line: 'margin:empty', level: 1 },
    text: 'An echo on an empty tile waits until a unit stands there, up to two turns.',
  },
  {
    id: 'margin-empty-mirror',
    subject: 'margin',
    slot: { line: 'margin:empty', level: 2 },
    text: 'An echo points the opposite way to the first cast.',
  },
  {
    id: 'margin-empty-relay',
    subject: 'margin',
    slot: { line: 'margin:empty', level: 2 },
    text: "An echo falls due on the next apprentice's turn, not yours.",
  },
  {
    id: 'margin-cap-diagonal',
    subject: 'margin',
    slot: { capstone: true },
    text: 'A Margin also reaches the Actions diagonally touching it on the page.',
  },
  {
    id: 'margin-cap-kinds',
    subject: 'margin',
    slot: { capstone: true },
    text: 'A Margin also echoes the Kinds it touches.',
  },
];
