import type { IdiomDef } from './types';

/** Idioms: aspect shapes along one branch of a spell (shapes skipped). Design doc §4.6. */
export const IDIOMS: readonly IdiomDef[] = [
  {
    id: 'cashingIn',
    name: 'Cashing In',
    // Source → Mark-gate → Heat/Charge payload
    steps: [
      { family: 'source' },
      { family: 'trigger', aspects: ['mark'] },
      { aspects: ['heat', 'charge'] },
    ],
    ownerNote: 'Mark it, then collect. The trigger sees what the same cast just did.',
  },
  {
    id: 'bonfire',
    name: 'Bonfire',
    // Reach-area → Slick → Heat
    steps: [
      { family: 'source', aspects: ['vapor'] },
      { family: 'material', aspects: ['slick'] },
      { family: 'material', aspects: ['heat'] },
    ],
    ownerNote: 'Wide, then wet, then lit. In that order or not at all.',
  },
  {
    id: 'undertaker',
    name: 'Undertaker',
    // Source → Return(kill) → area payload
    steps: [
      { family: 'source' },
      { family: 'trigger', aspects: ['vapor'] },
      { family: 'material' },
    ],
    ownerNote: 'Every one that falls carries the spell to its neighbours.',
  },
];
