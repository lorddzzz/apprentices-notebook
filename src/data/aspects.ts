import type { Aspect, AspectDef, SolventDef, SolventId } from './types';

export const ASPECT_IDS: readonly Aspect[] = [
  'reach',
  'mark',
  'slick',
  'heat',
  'charge',
  'vapor',
  'hold',
  'return',
];

export const ASPECTS: Record<Aspect, AspectDef> = {
  reach: {
    id: 'reach',
    name: 'Reach',
    glyph: '☍',
    solvent: 'chalk',
    margin: 'nothing to carry it',
  },
  mark: { id: 'mark', name: 'Mark', glyph: '◈', solvent: 'gallnut', margin: 'it wants a witness' },
  slick: { id: 'slick', name: 'Slick', glyph: '≋', solvent: 'pitch', margin: 'too dry' },
  heat: { id: 'heat', name: 'Heat', glyph: '♨', solvent: 'cinder', margin: 'too cold' },
  charge: {
    id: 'charge',
    name: 'Charge',
    glyph: 'ϟ',
    solvent: 'quicksilver',
    margin: 'nothing to wake it',
  },
  vapor: {
    id: 'vapor',
    name: 'Vapor',
    glyph: '☁',
    solvent: 'fogJar',
    margin: 'too narrow, it wants air',
  },
  hold: { id: 'hold', name: 'Hold', glyph: '▣', solvent: 'rivet', margin: 'it will not stay' },
  return: {
    id: 'return',
    name: 'Return',
    glyph: '⟳',
    solvent: 'wax',
    margin: 'it happens only once',
  },
};

export const SOLVENT_IDS: readonly SolventId[] = [
  'chalk',
  'gallnut',
  'pitch',
  'cinder',
  'quicksilver',
  'fogJar',
  'rivet',
  'wax',
];

export const SOLVENTS: Record<SolventId, SolventDef> = {
  chalk: {
    id: 'chalk',
    name: 'Chalk',
    aspect: 'reach',
    blurb: 'Dust from the guild archives. It makes things travel.',
  },
  gallnut: {
    id: 'gallnut',
    name: 'Gallnut',
    aspect: 'mark',
    blurb: 'The ink-makers’ bitter nut. It makes things single out.',
  },
  pitch: {
    id: 'pitch',
    name: 'Pitch',
    aspect: 'slick',
    blurb: 'Black and sticky from the canal side. It makes things spread.',
  },
  cinder: {
    id: 'cinder',
    name: 'Cinder',
    aspect: 'heat',
    blurb: 'Still warm from the Seam’s fires. It makes things burn.',
  },
  quicksilver: {
    id: 'quicksilver',
    name: 'Quicksilver',
    aspect: 'charge',
    blurb: 'It will not sit still. It makes things conduct.',
  },
  fogJar: {
    id: 'fogJar',
    name: 'Fog jar',
    aspect: 'vapor',
    blurb: 'A bathhouse cloud in a stoppered jar. It makes things fill a room.',
  },
  rivet: {
    id: 'rivet',
    name: 'Rivet',
    aspect: 'hold',
    blurb: 'A brass rivet, cold and stubborn. It makes things hold.',
  },
  wax: {
    id: 'wax',
    name: 'Wax',
    aspect: 'return',
    blurb: 'Seal wax, warm in the hand. It makes things come back.',
  },
};

/** The solvents the Seam drops in this slice. */
export const SEAM_SOLVENTS: readonly SolventId[] = ['gallnut', 'pitch', 'cinder'];
