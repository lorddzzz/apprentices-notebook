/**
 * What art each game subject uses (R27): every foe, rival, boss, loot offer kind and real
 * threshold lock maps to an ArtId of its own, a shared alias (another subject's asset) or an
 * intentional vector fallback. Art is keyed by the OWNING definition (FT-D7): a borrowed foe
 * resolves its owner's asset. The lists come from the UA briefs; game data is never changed.
 */

import type { RivalId } from '$data/rivals/types';
import type { DistrictId, EnemyId, LootSpec } from '$data/types';
import type { ArtId } from './spec';

export type ArtRef =
  /** The subject's own asset. */
  | { art: ArtId }
  /** Another subject's asset, reused on purpose. */
  | { alias: ArtId; note: string }
  /** Drawn by a vector component on purpose (no art planned). */
  | { vector: string; note: string };

const art = (id: ArtId): ArtRef => ({ art: id });

export interface FoeArt {
  /** The district whose definition owns the foe (its art scope). */
  owner: DistrictId;
  ref: ArtRef;
}

/** Every `ENEMY_IDS` entry; kebab-case subjects where the id is camelCase. */
export const FOE_ART: Readonly<Record<EnemyId, FoeArt>> = {
  rat: { owner: 'seam', ref: art('foes/seam/rat') },
  sentry: { owner: 'seam', ref: art('foes/seam/sentry') },
  familiar: { owner: 'seam', ref: art('foes/seam/familiar') },
  dummy: { owner: 'seam', ref: art('foes/seam/dummy') },
  marginalia: { owner: 'seam', ref: art('foes/seam/marginalia') },
  eel: { owner: 'canals', ref: art('foes/canals/eel') },
  snuffer: { owner: 'canals', ref: art('foes/canals/snuffer') },
  moth: { owner: 'canals', ref: art('foes/canals/moth') },
  mother: { owner: 'canals', ref: art('foes/canals/mother') },
  lamplighter: { owner: 'canals', ref: art('foes/canals/lamplighter') },
  barge: {
    owner: 'canals',
    ref: { vector: 'canals/CrateArt', note: 'the barge stays a drawn district piece (UA pack E)' },
  },
  deadLetter: { owner: 'inkQuarter', ref: art('foes/inkQuarter/dead-letter') },
  sorter: { owner: 'inkQuarter', ref: art('foes/inkQuarter/sorter') },
  sealer: { owner: 'inkQuarter', ref: art('foes/inkQuarter/sealer') },
  letter: { owner: 'inkQuarter', ref: art('foes/inkQuarter/letter') },
  postmaster: { owner: 'inkQuarter', ref: art('foes/inkQuarter/postmaster') },
  clockSeal: {
    owner: 'inkQuarter',
    ref: {
      vector: 'inkQuarter/StaffToken',
      note: 'the clock seal stays a drawn staff token (UA pack M)',
    },
  },
  attendant: { owner: 'bathhouses', ref: art('foes/bathhouses/attendant') },
  boilerman: { owner: 'bathhouses', ref: art('foes/bathhouses/boilerman') },
  dissolvedBather: { owner: 'bathhouses', ref: art('foes/bathhouses/bather') },
  bathSteward: { owner: 'bathhouses', ref: art('foes/bathhouses/bath-steward') },
  warden: { owner: 'bridges', ref: art('foes/bridges/warden') },
  gargoyle: { owner: 'bridges', ref: art('foes/bridges/gargoyle') },
  mason: { owner: 'bridges', ref: art('foes/bridges/mason') },
  chiefWarden: { owner: 'bridges', ref: art('foes/bridges/chief-warden') },
  carillonneur: { owner: 'foundry', ref: art('foes/foundry/carillonneur') },
  ringer: { owner: 'foundry', ref: art('foes/foundry/ringer') },
  detuner: { owner: 'foundry', ref: art('foes/foundry/detuner') },
  clapper: { owner: 'foundry', ref: art('foes/foundry/clapper') },
  surveyor: { owner: 'cartographers', ref: art('foes/cartographers/surveyor') },
  eraser: { owner: 'cartographers', ref: art('foes/cartographers/eraser') },
  tracer: { owner: 'cartographers', ref: art('foes/cartographers/tracer') },
  registrar: { owner: 'cartographers', ref: art('foes/cartographers/registrar') },
};

/** Foes that appear in a district other than their owner's: they keep the owner's asset. */
export const BORROWED_FOES: readonly { district: DistrictId; foe: EnemyId; ref: ArtRef }[] = [
  {
    district: 'canals',
    foe: 'rat',
    ref: { alias: 'foes/seam/rat', note: 'the Seam rat on the canal lock' },
  },
  {
    district: 'bathhouses',
    foe: 'rat',
    ref: { alias: 'foes/seam/rat', note: 'the Seam rat in the changing rooms' },
  },
];

/** Header chip portraits (192²) for every rival. */
export const RIVAL_ART: Readonly<Record<RivalId, ArtRef>> = {
  lamplighter: art('portraits/canals/lamplighter'),
  postmaster: art('portraits/inkQuarter/postmaster'),
  bathSteward: art('portraits/bathhouses/bath-steward'),
  chiefWarden: art('portraits/bridges/chief-warden'),
  carillonneur: art('portraits/foundry/carillonneur'),
  registrar: art('portraits/cartographers/registrar'),
};

/** Header chip portraits for every boss foe (`boss: true`, shown by name with an HP bar). */
export const BOSS_ART: Readonly<Partial<Record<EnemyId, ArtRef>>> = {
  marginalia: art('portraits/seam/marginalia'),
  mother: art('portraits/canals/mother'),
  postmaster: art('portraits/inkQuarter/postmaster'),
  bathSteward: art('portraits/bathhouses/bath-steward'),
  chiefWarden: art('portraits/bridges/chief-warden'),
  carillonneur: art('portraits/foundry/carillonneur'),
  registrar: art('portraits/cartographers/registrar'),
};

/** Offer cards' finds, one per `LootSpec` kind. */
export const LOOT_ART: Readonly<Record<LootSpec['kind'], ArtRef>> = {
  rune: art('finds/shared/rune-a'),
  method: art('finds/shared/method-a'),
  ink: art('finds/shared/ink-a'),
  solvent: art('finds/shared/solvent-a'),
  vellum: art('finds/shared/vellum-a'),
  doorway: art('finds/shared/doorway-a'),
  key: {
    vector: 'crestFor',
    note: 'a key offer shows its district crest, which stays vector (UD/FT-4)',
  },
};

/** The real threshold locks only (districts with a threshold spec); no heart doors are painted. */
export const LOCK_ART: Readonly<Partial<Record<DistrictId, ArtRef>>> = {
  canals: art('scenes/canals/threshold'),
  inkQuarter: art('scenes/inkQuarter/threshold'),
  bathhouses: art('scenes/bathhouses/threshold'),
  foundry: art('scenes/foundry/threshold'),
  cartographers: art('scenes/cartographers/threshold'),
};

/** The figure for a foe met in `district`: the borrowed entry when there is one, else its own. */
export function foeArt(foe: EnemyId, district?: DistrictId): ArtRef {
  const borrowed = BORROWED_FOES.find((b) => b.foe === foe && b.district === district);
  return borrowed ? borrowed.ref : FOE_ART[foe].ref;
}

/** The ArtId a ref resolves to, or null for a vector fallback. */
export function refArtId(ref: ArtRef): ArtId | null {
  if ('art' in ref) return ref.art;
  if ('alias' in ref) return ref.alias;
  return null;
}
