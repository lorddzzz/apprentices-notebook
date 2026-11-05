import type { VariantDef } from '../types';

/**
 * Batch `seam-solvents` (plan FN-C9): Bind, Lift, Gallnut and Cinder, level I and II pairs on their
 * lines and a capstone pair each (text approved in `footnotes-content/seam.md` §3 and §4).
 */
export const SEAM_SOLVENTS: readonly VariantDef[] = [
  {
    id: 'bind-mark-recoil',
    subject: 'bind',
    slot: { line: 'bind:mark', level: 1 },
    text: 'A released action always points from the hitter toward the bearer.',
  },
  {
    id: 'bind-mark-fixed',
    subject: 'bind',
    slot: { line: 'bind:mark', level: 1 },
    text: 'A released action always points the way the Bind was cast.',
  },
  {
    id: 'bind-mark-lastword',
    subject: 'bind',
    slot: { line: 'bind:mark', level: 2 },
    text: 'A hit that kills the bearer still releases its "is hit" mark.',
  },
  {
    id: 'bind-mark-layered',
    subject: 'bind',
    slot: { line: 'bind:mark', level: 2 },
    text: 'A deep mark holds two bound actions and releases them one per event.',
  },
  {
    id: 'bind-cloud-kin',
    subject: 'bind',
    slot: { line: 'bind:cloud', level: 1 },
    text: "A bound mark spreads only to units on its bearer's side.",
  },
  {
    id: 'bind-cloud-late',
    subject: 'bind',
    slot: { line: 'bind:cloud', level: 1 },
    text: 'A bound mark spreads at round end, not at once.',
  },
  {
    id: 'bind-cloud-chorus',
    subject: 'bind',
    slot: { line: 'bind:cloud', level: 2 },
    text: 'When one copy releases, every copy in the same cloud releases too.',
  },
  {
    id: 'bind-cloud-haunt',
    subject: 'bind',
    slot: { line: 'bind:cloud', level: 2 },
    text: 'A cloud a bound mark spread through keeps the action: a unit that walks in later is marked with it.',
  },
  {
    id: 'bind-cap-rearm',
    subject: 'bind',
    slot: { capstone: true },
    text: 'When a bound mark releases, its bearer is left with a plain mark.',
  },
  {
    id: 'bind-cap-snare',
    subject: 'bind',
    slot: { capstone: true },
    text: 'Bind on an empty tile binds the blot: the first unit to step onto it is marked with the action.',
  },
  {
    id: 'lift-unit-far',
    subject: 'lift',
    slot: { line: 'lift:unit', level: 1 },
    text: 'A lifted mark can travel two tiles along the heading to the first unit there.',
  },
  {
    id: 'lift-unit-aside',
    subject: 'lift',
    slot: { line: 'lift:unit', level: 1 },
    text: 'With no unit ahead, a lifted mark goes to a unit beside the target instead, left first.',
  },
  {
    id: 'lift-unit-spread',
    subject: 'lift',
    slot: { line: 'lift:unit', level: 2 },
    text: 'A lifted mark spreads on arrival if its new bearer stands in a cloud.',
  },
  {
    id: 'lift-unit-deepen',
    subject: 'lift',
    slot: { line: 'lift:unit', level: 2 },
    text: 'A mark lifted onto a marked unit deepens its mark instead of being refused.',
  },
  {
    id: 'lift-cap-trade',
    subject: 'lift',
    slot: { capstone: true },
    text: 'When the receiving unit is marked, the two marks trade places.',
  },
  {
    id: 'lift-cap-drop',
    subject: 'lift',
    slot: { capstone: true },
    text: 'When no unit can take the mark, it is left on the tile as a stain.',
  },
  {
    id: 'gallnut-unit-deep',
    subject: 'gallnut',
    slot: { line: 'gallnut:unit', level: 1 },
    text: 'Gallnut deepens the mark of a unit that already carries one.',
  },
  {
    id: 'gallnut-unit-blot',
    subject: 'gallnut',
    slot: { line: 'gallnut:unit', level: 1 },
    text: 'Gallnut also leaves a blot under each unit it marks.',
  },
  {
    id: 'gallnut-unit-every',
    subject: 'gallnut',
    slot: { line: 'gallnut:unit', level: 2 },
    text: 'A Gallnut repeat marks on every pass, not only the first.',
  },
  {
    id: 'gallnut-unit-heavy',
    subject: 'gallnut',
    slot: { line: 'gallnut:unit', level: 2 },
    text: 'A unit marked by Gallnut does not slide on oil until its mark is spent.',
  },
  {
    id: 'gallnut-cap-bloom',
    subject: 'gallnut',
    slot: { capstone: true },
    text: 'When the invention reaches a unit in a cloud, the connected cloud becomes a brand cloud.',
  },
  {
    id: 'gallnut-cap-stain',
    subject: 'gallnut',
    slot: { capstone: true },
    text: 'When the invention reaches a unit on a slick, the slick becomes a stain.',
  },
  {
    id: 'cinder-slick-long',
    subject: 'cinder',
    slot: { line: 'cinder:slick', level: 1 },
    text: 'A hot tile stays hot for three rounds.',
  },
  {
    id: 'cinder-slick-follow',
    subject: 'cinder',
    slot: { line: 'cinder:slick', level: 1 },
    text: 'The heat follows a pushed target: the tile it ends on is hot too.',
  },
  {
    id: 'cinder-slick-trails',
    subject: 'cinder',
    slot: { line: 'cinder:slick', level: 2 },
    text: "A rat's oil trail over a hot tile catches too.",
  },
  {
    id: 'cinder-slick-steam',
    subject: 'cinder',
    slot: { line: 'cinder:slick', level: 2 },
    text: 'A cloud on a hot tile scalds the units in it for 1 at round end.',
  },
  {
    id: 'cinder-cap-spread',
    subject: 'cinder',
    slot: { capstone: true },
    text: 'When a hot tile catches, the tiles beside it become hot.',
  },
  {
    id: 'cinder-cap-brass',
    subject: 'cinder',
    slot: { capstone: true },
    text: 'When the invention reaches brass, the whole connected brass is hot: units on it at round end take 1.',
  },
];
