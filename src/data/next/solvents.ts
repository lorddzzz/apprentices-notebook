import type { SolventDef, SolventId } from './types';

export const SOLVENT_IDS = [
  'gallnut',
  'cinder',
  'pitch',
  'wick',
  'wax',
  'sand',
  'bathSalt',
  'fogJar',
  'mortar',
  'chalk',
  'rivet',
  'filings',
  'quicksilver',
  'graphite',
] as const satisfies readonly SolventId[];

function solvent(id: SolventId, name: string, district: SolventDef['district'], rule: string) {
  return { id, name, district, rule };
}

/** Design §6.3: each bends any method one way. The rules are drafts (P38). */
export const SOLVENTS: Record<SolventId, SolventDef> = {
  gallnut: solvent('gallnut', 'Gallnut', 'seam', 'Whoever it reaches is also marked.'),
  cinder: solvent('cinder', 'Cinder', 'seam', 'It leaves the tile hot: oil there catches fire.'),
  pitch: solvent('pitch', 'Pitch', 'canals', 'It floats: on water it drifts with the current.'),
  wick: solvent('wick', 'Wick', 'canals', 'It waits one round before it acts.'),
  wax: solvent('wax', 'Wax', 'inkQuarter', 'It never spreads, and fire melts it unspent.'),
  sand: solvent(
    'sand',
    'Sand',
    'inkQuarter',
    'It turns back: it acts on whoever set it off instead.',
  ),
  bathSalt: solvent('bathSalt', 'Bath salt', 'bathhouses', 'It also reaches the connected cloud.'),
  fogJar: solvent(
    'fogJar',
    'Fog jar',
    'bathhouses',
    "It also acts on the target's neighbours, one step weaker.",
  ),
  mortar: solvent('mortar', 'Mortar', 'bridges', 'Pushes in it go 1 tile further.'),
  chalk: solvent('chalk', 'Chalk', 'bridges', 'It reaches 1 tile further.'),
  rivet: solvent('rivet', 'Rivet', 'foundry', "What it reaches can't move until your next turn."),
  filings: solvent('filings', 'Filings', 'foundry', 'On brass, it rings once more next round.'),
  quicksilver: solvent(
    'quicksilver',
    'Quicksilver',
    'cartographers',
    'It also acts on the tile mirrored across the board.',
  ),
  graphite: solvent(
    'graphite',
    'Graphite',
    'cartographers',
    'What it changes is undone a round later.',
  ),
};
