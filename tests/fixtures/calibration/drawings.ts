import {
  type ApprenticeId,
  type Drawing,
  type Meets,
  PLAYABLE_DISTRICTS,
  RUNE_IDS,
  VARIANTS,
} from '$data';
import { joinHousehold, newProfile, type Profile, setSlot } from '$engine';
import { KIT } from '$engine/districts/kit';
import { GEN_KITS, paletteOf } from '$engine/drawing';
import profiles from './profiles.json';

export const CAL_PARTIES = {
  solo: ['draughtsman'],
  pair: ['draughtsman', 'stoker'],
  trio: ['draughtsman', 'stoker', 'runaway'],
} as const satisfies Record<string, readonly ApprenticeId[]>;

export const CAMPAIGN_PROFILES = profiles;
export type CalibrationProfile = (typeof profiles)[number];

/** Synthetic campaign milestones with the founding lattices and the recruit's starter page. */
export function campaignProfile(snapshot: CalibrationProfile): Profile {
  const base = joinHousehold(newProfile(), 'runaway');
  const open = PLAYABLE_DISTRICTS.slice(0, snapshot.districts);
  const known = RUNE_IDS.slice(0, snapshot.pages ?? RUNE_IDS.length);
  const capstones = VARIANTS.filter(
    (v) => 'capstone' in v.slot && RUNE_IDS.some((id) => id === v.subject && known.includes(id)),
  );
  const footnotes: Profile['footnotes'] = {};
  for (const subject of snapshot.capstones) {
    const capstone = capstones.find((v) => v.subject === subject);
    if (!capstone) throw new Error(`Missing calibration capstone ${subject}`);
    footnotes[capstone.subject] = { points: 100, slots: {}, capstone: capstone.id };
  }
  const met = open.flatMap((id) => {
    const m = KIT.modules[id];
    return [
      ...(m?.rules ?? []).flatMap((r) => (r.met === undefined ? [] : [r.met])),
      ...(m?.pieces ?? []).flatMap((p) => (p.bench === undefined ? [] : [p.bench.met])),
    ];
  });
  return {
    ...base,
    known,
    met: [...new Set([...base.met, ...(met as Meets[])])],
    foesMet: GEN_KITS.filter((kit) => open.includes(kit.district)).flatMap((kit) =>
      kit.foes.map((foe) => foe.id),
    ),
    pages: open.includes('canals') ? ['lamplighter:lantern'] : [],
    city: { ...base.city, heard: open, open, hearts: open },
    ending: { handover: open.length === PLAYABLE_DISTRICTS.length, creditsSeen: false },
    footnotes,
  };
}

export function calibrationProfile(party: readonly ApprenticeId[]): Profile {
  const snapshot = profiles.find((p) => p.id === 'full-palette');
  if (!snapshot) throw new Error('Missing the full-palette snapshot');
  let p = campaignProfile(snapshot);
  p = setSlot(setSlot(setSlot(p, 0, null), 1, null), 2, null);
  if (party[0]) p = setSlot(p, 0, party[0]);
  if (party[1]) p = setSlot(p, 1, party[1]);
  if (party[2]) p = setSlot(p, 2, party[2]);
  return p;
}

type Recipe = readonly [
  name: string,
  heart: Drawing['heart'],
  length: Drawing['length'],
  rule: Drawing['rule'],
  shape: Drawing['shape'],
  foes: Drawing['foes'],
  pieces?: Drawing['pieces'],
];

const recipes: readonly Recipe[] = [
  ['Light Marginalia', 'marginalia', 3, null, 'plain', ['rat']],
  ['Light Mother', 'mother', 3, 'canals:current', 'canals:landings', ['eel']],
  ['Light Lamplighter', 'lamplighter', 4, 'canals:current', 'plain', ['moth']],
  ['Light Postmaster', 'postmaster', 3, 'inkQuarter:writs', 'inkQuarter:terms', ['deadLetter']],
  ['Light Steward', 'bathSteward', 3, 'bathhouses:boilOver', 'plain', ['attendant']],
  ['Light Warden', 'chiefWarden', 3, 'bridges:collapse', 'bridges:span', ['rat']],
  ['Light Carillonneur', 'carillonneur', 3, 'foundry:bells', 'foundry:peal', ['rat']],
  ['Light Registrar', 'registrar', 3, null, 'cartographers:doorway', ['tracer']],

  ['Medium Marginalia', 'marginalia', 5, 'cartographers:pencil', 'plain', ['familiar', 'sentry']],
  [
    'Medium Mother',
    'mother',
    4,
    'canals:current',
    'canals:landings',
    ['eel', 'moth'],
    ['cartographers:blank'],
  ],
  [
    'Medium Lamplighter',
    'lamplighter',
    5,
    'canals:current',
    'plain',
    ['eel', 'snuffer'],
    ['cartographers:blank'],
  ],
  [
    'Medium Postmaster',
    'postmaster',
    5,
    'inkQuarter:writs',
    'inkQuarter:terms',
    ['deadLetter', 'sorter'],
  ],
  [
    'Medium Steward',
    'bathSteward',
    5,
    'bathhouses:boilOver',
    'bathhouses:heat',
    ['attendant', 'boilerman'],
  ],
  [
    'Medium Warden',
    'chiefWarden',
    4,
    'bridges:collapse',
    'bridges:span',
    ['gargoyle', 'warden'],
    ['bridges:pier'],
  ],
  [
    'Medium Carillonneur',
    'carillonneur',
    6,
    'foundry:bells',
    'plain',
    ['rat', 'sentry'],
    ['foundry:rope'],
  ],
  ['Medium Registrar', 'registrar', 6, null, 'plain', ['rat', 'sentry', 'familiar']],

  [
    'Heavy Marginalia',
    'marginalia',
    6,
    'foundry:bells',
    'foundry:peal',
    ['rat', 'sentry', 'familiar'],
    ['foundry:rope', 'bridges:pier'],
  ],
  [
    'Heavy Mother',
    'mother',
    6,
    'canals:current',
    'canals:landings',
    ['eel', 'moth', 'snuffer'],
    ['cartographers:pencil', 'bridges:pier'],
  ],
  [
    'Heavy Lamplighter',
    'lamplighter',
    6,
    'canals:current',
    'canals:landings',
    ['eel', 'moth', 'snuffer'],
    ['cartographers:outline', 'cartographers:blank'],
  ],
  [
    'Heavy Postmaster',
    'postmaster',
    6,
    'inkQuarter:writs',
    'inkQuarter:terms',
    ['deadLetter', 'sorter', 'sealer'],
    ['inkQuarter:order', 'inkQuarter:return'],
  ],
  [
    'Heavy Steward',
    'bathSteward',
    6,
    'bathhouses:boilOver',
    'bathhouses:heat',
    ['attendant', 'boilerman', 'dissolvedBather'],
    ['bridges:pier', 'cartographers:blank'],
  ],
  [
    'Heavy Warden',
    'chiefWarden',
    6,
    'bridges:collapse',
    'bridges:span',
    ['warden', 'gargoyle', 'mason'],
    ['bridges:pier', 'bridges:span'],
  ],
  [
    'Heavy Carillonneur',
    'carillonneur',
    6,
    'foundry:bells',
    'foundry:peal',
    ['rat', 'sentry', 'familiar'],
    ['foundry:rope', 'foundry:bell'],
  ],
  [
    'Heavy Registrar',
    'registrar',
    6,
    'cartographers:pencil',
    'cartographers:doorway',
    ['surveyor', 'eraser', 'tracer'],
    ['cartographers:blank', 'cartographers:outline'],
  ],
];

export const CAL_DRAWINGS: readonly Drawing[] = recipes.map(
  ([name, heart, length, rule, shape, foes, pieces = []]) => ({
    name,
    heart,
    length,
    rule,
    shape,
    foes,
    pieces,
  }),
);

export const CAL_PALETTE = paletteOf(calibrationProfile(CAL_PARTIES.pair));
