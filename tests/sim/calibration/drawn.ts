import type { Drawing } from '$data';
import { weightBand } from '$engine/drawing/cost';
import { inkRoom, missingKit } from '$engine/drawing/generate';
import type { Adapter } from './runner';

// Fixed, kit-backed fixtures: cost bands come from production's cost function.
const drawings: Drawing[] = [
  {
    name: 'CAL light',
    rule: null,
    foes: ['rat'],
    pieces: [],
    shape: 'plain',
    length: 3,
    heart: 'marginalia',
  },
  {
    name: 'CAL medium',
    rule: null,
    foes: ['rat', 'sentry', 'familiar'],
    pieces: [],
    shape: 'plain',
    length: 6,
    heart: 'registrar',
  },
  {
    name: 'CAL heavy',
    rule: 'foundry:bells',
    foes: ['rat', 'sentry', 'familiar'],
    pieces: ['foundry:rope'],
    shape: 'plain',
    length: 6,
    heart: 'registrar',
  },
];
function drawingFor(axis: string): Drawing {
  const d = drawings.find((d) => weightBand(d) === axis);
  if (!d || missingKit(d))
    throw new Error(`Missing drawing/kit for ${axis}: ${d ? missingKit(d) : 'no fixture'}`);
  return d;
}
export const drawn: Adapter = {
  name: 'drawn',
  district: 'inkedPage',
  axes: ['light', 'medium', 'heavy'],
  depth: (axis) => drawingFor(axis).length,
  profile: (p, axis) => ({
    ...p,
    footnotes: { ...p.footnotes, bind: { points: 100, slots: {}, capstone: 'bind-cap-rearm' } },
    foesMet: ['rat', 'sentry', 'familiar'],
    met: [...p.met, 'bell', 'rope'],
    city: { ...p.city, hearts: [...p.city.open] },
    ending: { handover: true, creditsSeen: false },
    drawings: [drawingFor(axis), null, null],
  }),
  prepare: (p, t) => inkRoom(p, t),
};
