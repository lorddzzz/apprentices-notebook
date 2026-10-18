import type { BindEvent, DistrictId, MethodDef, MethodId } from './types';

export const METHOD_IDS = [
  'conduct',
  'repeat',
  'margin',
  'bind',
  'lift',
] as const satisfies readonly MethodId[];

/** Design §6.2. Ink per P33. Headline templates are drafts; E7 derives the final text. */
export const METHODS: Record<MethodId, MethodDef> = {
  conduct: {
    id: 'conduct',
    name: 'Conduct',
    district: 'seam',
    ink: 2,
    makes: 'action',
    slots: [{ accepts: 'instantAction', label: 'an Action that resolves at once' }],
    headline: '{0} travels the connected brass the target touches, reaching each unit on it once.',
  },
  repeat: {
    id: 'repeat',
    name: 'Repeat',
    district: 'canals',
    ink: 2,
    makes: 'action',
    slots: [{ accepts: 'instantAction', label: 'an Action that resolves at once' }],
    headline: '{0} now, and once more next turn on the same tile.',
  },
  margin: {
    id: 'margin',
    name: 'Margin',
    district: 'canals',
    ink: 1,
    makes: 'aura',
    slots: [{ accepts: 'repeat', label: 'a Repeat invention' }],
    headline: 'Actions on touching paths repeat next turn, as {0} does.',
  },
  bind: {
    id: 'bind',
    name: 'Bind',
    district: 'inkQuarter',
    ink: 2,
    makes: 'kind',
    slots: [
      { accepts: 'carrier', label: 'Ink' },
      { accepts: 'action', label: 'an Action' },
    ],
    events: ['hit', 'enters', 'pushed', 'dies'],
    headline: 'Lands a mark that holds {1} until its bearer {event}.',
  },
  lift: {
    id: 'lift',
    name: 'Lift',
    district: 'inkQuarter',
    ink: 1,
    makes: 'action',
    slots: [{ accepts: 'movingAction', label: 'an Action that moves a unit' }],
    headline: "{0} moves the target's mark instead, with whatever it holds, to an adjacent unit.",
  },
};

/** Where each Bind event is learned (design §6.2: hit and enters with Bind; the bridges, the Cartographers). */
export const BIND_EVENT_DISTRICT: Record<BindEvent, DistrictId> = {
  hit: 'inkQuarter',
  enters: 'inkQuarter',
  pushed: 'bridges',
  dies: 'cartographers',
};

/** The `{event}` phrase in Bind's headline. */
export const BIND_EVENT_PHRASE: Record<BindEvent, string> = {
  hit: 'is hit',
  enters: 'enters a tile',
  pushed: 'is pushed',
  dies: 'dies',
};
