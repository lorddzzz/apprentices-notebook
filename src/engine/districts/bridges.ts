import { collapseStep, FALL_CAUSE, fallenBrassOf, spendFallenBrassOf } from './bridges/collapse';
import { markFootingOf, setMortarOf } from './bridges/wear';
import { BRIDGE_FOES } from './bridges/foes';
import { BRIDGE_OFFERS } from './bridges/guarantee';
import { CHIEF_FOE, HEART_STEPS } from './bridges/heart';
import { BRIDGES_HEART } from './bridges/heartFrame';
import { BRIDGE_TRICKS } from './bridges/keystoneRight';
import { previewCollapse } from './bridges/preview';
import { cracksOf, scanBridges } from './bridges/support';
import { BRIDGE_TRIP_HOOKS } from './bridges/trip';
import {
  BRIDGE_EVENT_TYPES,
  BRIDGE_PIECES,
  BRIDGE_SHAPE,
  type BridgesState,
  type BridgeTripState,
  COLLAPSE_RULE_ID,
  initBridgeState,
  KEYSTONE_PIECE,
  PIER_PIECE,
  parseBridgeState,
  SPAN_PIECE,
} from './bridges/types';
import type { BoardRule, DistrictEventDef, DistrictModule, TripShapeDef } from './types';

/**
 * The bridges' engine module, assembled from `bridges/`. BR-0 registers the contracts only: the
 * three pieces (no triggers), the collapse rule (a no-op step), the events' lines and the trip
 * state's reader. The district stays `gate: 'drawing'` with no rooms, so no trip carries this shape
 * and no board carries these pieces. BR-1 adds the support model, BR-2 the wear, BR-3 the fall.
 */

const LINES: Record<(typeof BRIDGE_EVENT_TYPES)[number], string> = {
  'bridges:stoneWorn': 'The stone wears.',
  'bridges:cracked': 'The span cracks.',
  'bridges:collapse': 'The span falls.',
  'bridges:keystoneBreaks': 'The keystone breaks.',
  'bridges:mended': 'The mason mends the span.',
  'bridges:pierLaid': 'The mason lays a pier.',
};
const events: readonly DistrictEventDef[] = BRIDGE_EVENT_TYPES.map((type) => ({
  type,
  describe: () => LINES[type],
}));

/** P4: dusk, after the snuffers (`late`); brought by a span, pier or keystone on the board. */
export const COLLAPSE_RULE: BoardRule<BridgesState> = {
  id: COLLAPSE_RULE_ID,
  slot: 'late',
  order: 20,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [SPAN_PIECE, PIER_PIECE, KEYSTONE_PIECE] },
  init: (state) => scanBridges(state),
  step: (ctx, own) => collapseStep(ctx, own),
  preview: (s, own) => previewCollapse(s, own),
  met: 'span',
};

const shape: TripShapeDef<BridgeTripState> = {
  id: BRIDGE_SHAPE,
  parseState: parseBridgeState,
  initState: initBridgeState,
  ...BRIDGE_TRIP_HOOKS,
};

export const BRIDGES_MODULE: DistrictModule = {
  id: 'bridges',
  events,
  pieces: BRIDGE_PIECES,
  rules: [COLLAPSE_RULE],
  unsupported: (s) => cracksOf(s),
  fallenBrass: fallenBrassOf,
  spendFallenBrass: spendFallenBrassOf,
  markFooting: markFootingOf,
  setMortar: setMortarOf,
  tricks: BRIDGE_TRICKS,
  steps: HEART_STEPS,
  foes: [...BRIDGE_FOES, CHIEF_FOE],
  ...BRIDGE_OFFERS,
  trip: shape,
  heart: BRIDGES_HEART,
  bot: {},
  causes: { [FALL_CAUSE]: 'landing' },
};
