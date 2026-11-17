import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Chief Warden's frame (P35, EN-K5): the bridges' own `HeartSetup` on a 7 x 9 board. The setup
 * stands him on the keystone, lays piers and a span over every other tile and rings the arch with
 * fog, dropping any fog that would cut a span off from its footing, so no span starts cracked. The
 * frame has no escorts of its own (the setup places the warden and the gargoyle) and no place for
 * the drawing's rule (the collapse is the heart's own). `KIT` is read lazily (see `generate.ts`'s
 * import cycle).
 */

const SIZE = { width: 7, height: 9 } as const;

/**
 * The authored fallback (P10): the great arch, the district's first authored heart with the spans
 * laid over every standing tile, written out. Won by the scripted solve in
 * `tests/drawing/kits-b.scripts.ts`.
 */
const FALLBACK = [
  '_      {span}  {span}  K{keystone} {span}  {span}  _',
  '_      {span}  {span}  {span}      {span}  {span}  _',
  '_      _       {span}  {span}      {span}  _       _',
  '{span} {span}  {span}  {pier}      {span}  {span}  {span}',
  '{span} j{span} {span}  {span}      {span}  y{span} {span}',
  '{span} {pier}  {span}  {span}      {span}  {pier}  {span}',
  '{span} {span}  {span}  {span}      {span}  {span}  {span}',
  'P{span} {span} P{span} {span}      {span}  P{span} {span}',
  '{span} P{span} {span}  {span}      P{span} {span}  {span}',
].join('\n');

let setup: HeartSetup | undefined;

export const CHIEF_WARDEN_FRAME: HeartFrame = {
  master: 'chiefWarden',
  cost: COSTS.hearts.chiefWarden,
  needs: needsOf('chiefWarden'),
  size: SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = KIT.modules.bridges?.heart;
      if (!heart) throw new Error('the bridges have no heart setup');
      setup = heart;
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
