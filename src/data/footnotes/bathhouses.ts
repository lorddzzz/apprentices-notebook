import type { VariantDef } from '../types';

/**
 * Batch `bathhouses` (plan FN P8, BH-F3): the Areas runes Vat, Seep and Steep. Margin lines
 * `vat:unit`, `vat:edge`, `seep:edge`, `seep:member`, `steep:spread`, `steep:plate`, two options at
 * level I and two at level II, and a pair of capstones each (Steep's first is the built
 * `steep-diagonal` in the `auras` batch); docs/design/footnotes-content/bathhouses.md §2. The
 * solvents (Bath salt, Fog jar) ship with BH-F4, the Steward's note with BH-17. Effects live in
 * `engine/vat.ts`, `vatPlan.ts`, `runes/flow.ts`, `resolve.ts`, `mix.ts`, `push.ts` and
 * `arrival.ts`, keyed by these ids. `steep-plate-ring` has no Brass ring to bend (no such event
 * outside a hit), so by proposal H4 the option is `steep-plate-seep`.
 */
export const BATHHOUSES: readonly VariantDef[] = [
  // ── Vat ──
  {
    id: 'vat-unit-scatter',
    subject: 'vat',
    slot: { line: 'vat:unit', level: 1 },
    text: 'Your Vat points each tile away from the square’s middle, side to side, so a Shove spreads its units apart.',
  },
  {
    id: 'vat-unit-gather',
    subject: 'vat',
    slot: { line: 'vat:unit', level: 1 },
    text: 'Your Vat points each tile toward the square’s middle, side to side, so a Shove packs its units together.',
  },
  {
    id: 'vat-unit-pour',
    subject: 'vat',
    slot: { line: 'vat:unit', level: 2 },
    text: 'Each empty tile in your Vat pours its share on: the rest acts once more on the first unit in the square, at most twice.',
  },
  {
    id: 'vat-unit-fill',
    subject: 'vat',
    slot: { line: 'vat:unit', level: 2 },
    text: 'Each empty tile in your Vat takes a thin cloud for a round, after the rest.',
  },
  {
    id: 'vat-edge-slide',
    subject: 'vat',
    slot: { line: 'vat:edge', level: 1 },
    text: 'At the room’s edge your Vat slides inward to stay a full 2×2.',
  },
  {
    id: 'vat-edge-press',
    subject: 'vat',
    slot: { line: 'vat:edge', level: 1 },
    text: 'Each tile your Vat loses at the edge makes the rest one step stronger on the tiles left, at most two.',
  },
  {
    id: 'vat-edge-pin',
    subject: 'vat',
    slot: { line: 'vat:edge', level: 2 },
    text: 'A unit your Vat pushes against the room’s edge cannot move until your next turn.',
  },
  {
    id: 'vat-edge-rebound',
    subject: 'vat',
    slot: { line: 'vat:edge', level: 2 },
    text: 'A unit your Vat pushes against the room’s edge bounces one tile back the other way, and collides like any Shove.',
  },
  // ── Seep ──
  {
    id: 'seep-edge-back',
    subject: 'seep',
    slot: { line: 'seep:edge', level: 1 },
    text: 'Each neighbour Seep loses at the room’s edge turns back: the rest acts once more on the target, at most twice.',
  },
  {
    id: 'seep-edge-turn',
    subject: 'seep',
    slot: { line: 'seep:edge', level: 1 },
    text: 'Each neighbour Seep loses at the room’s edge is replaced by the nearest free diagonal neighbour on the board.',
  },
  {
    id: 'seep-edge-wall',
    subject: 'seep',
    slot: { line: 'seep:edge', level: 2 },
    text: 'Seep also loses neighbours that are walls, gates or plates, and they count as lost at the edge.',
  },
  {
    id: 'seep-edge-along',
    subject: 'seep',
    slot: { line: 'seep:edge', level: 2 },
    text: 'A target at the room’s edge makes Seep reach one tile further along the edge, both ways.',
  },
  {
    id: 'seep-member-spare-self',
    subject: 'seep',
    slot: { line: 'seep:member', level: 1 },
    text: 'Seep never reaches you, the caster; your allies beside the target still take it.',
  },
  {
    id: 'seep-member-pass',
    subject: 'seep',
    slot: { line: 'seep:member', level: 1 },
    text: 'A neighbour of yours passes Seep along: the rest also acts on the tile beyond them.',
  },
  {
    id: 'seep-member-away',
    subject: 'seep',
    slot: { line: 'seep:member', level: 2 },
    text: 'A Seep Shove pushes your own party away from the target, not along its heading.',
  },
  {
    id: 'seep-member-guard',
    subject: 'seep',
    slot: { line: 'seep:member', level: 2 },
    text: 'Your own party beside the target takes a Guard from Seep instead of the rest.',
  },
  // ── Steep ──
  {
    id: 'steep-spread-thin',
    subject: 'steep',
    slot: { line: 'steep:spread', level: 1 },
    text: 'A copy takes one round fewer than its source, so the cloud fades as it grows.',
  },
  {
    id: 'steep-spread-once',
    subject: 'steep',
    slot: { line: 'steep:spread', level: 1 },
    text: 'Copies are not steeped: each steeped compound grows one ring and stops.',
  },
  {
    id: 'steep-spread-mix',
    subject: 'steep',
    slot: { line: 'steep:spread', level: 2 },
    text: 'A steeped compound also spreads onto a slick or a plain cloud, mixing with it as a cast would.',
  },
  {
    id: 'steep-spread-spare',
    subject: 'steep',
    slot: { line: 'steep:spread', level: 2 },
    text: 'A steeped compound does not spread onto a tile where your own party stands.',
  },
  {
    id: 'steep-plate-under',
    subject: 'steep',
    slot: { line: 'steep:plate', level: 1 },
    text: 'A spread stopped by a grate or a gate passes under it to the tile beyond.',
  },
  {
    id: 'steep-plate-pool',
    subject: 'steep',
    slot: { line: 'steep:plate', level: 1 },
    text: 'A spread stopped at a plate pools: its source gains a round instead, at most once a round.',
  },
  {
    id: 'steep-plate-wear',
    subject: 'steep',
    slot: { line: 'steep:plate', level: 2 },
    text: 'A steeped compound pressing on a plate wears it by 1 each round.',
  },
  {
    id: 'steep-plate-seep',
    subject: 'steep',
    slot: { line: 'steep:plate', level: 2 },
    text: 'A stopped spread seeps under the plate as a 1-round plain cloud on the tile beyond.',
  },
  // ── Capstones ──
  {
    id: 'vat-cap-room',
    subject: 'vat',
    slot: { capstone: true },
    text: 'When every tile of your Vat holds a cloud, it also acts on the ring around the square, one step weaker.',
  },
  {
    id: 'vat-cap-crowd',
    subject: 'vat',
    slot: { capstone: true },
    text: 'When your Vat holds two or more foes, the rest also strikes each one for 1 per other foe in it, at most 2.',
  },
  {
    id: 'seep-cap-chain',
    subject: 'seep',
    slot: { capstone: true },
    text: 'When Seep’s rest defeats a neighbour, it also acts on that neighbour’s own neighbours, once.',
  },
  {
    id: 'seep-cap-cloud',
    subject: 'seep',
    slot: { capstone: true },
    text: 'When Seep’s target stands on a cloud, it also reaches the 4 diagonal neighbours.',
  },
  {
    id: 'steep-cap-carry',
    subject: 'steep',
    slot: { capstone: true },
    text: 'When a unit steps out of a steeped compound, it also carries a copy onto the tile it steps to.',
  },
];
