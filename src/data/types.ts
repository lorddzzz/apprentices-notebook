import type { Dir } from '$engine/grid';
import type { Action } from '$engine/types';

export type RuneFamily = 'source' | 'material' | 'shape' | 'trigger' | 'aura';
export type SourceRuneId = 'bolt' | 'splash' | 'ward';
export type MaterialRuneId = 'ink' | 'oil' | 'spark' | 'steam' | 'brass';
export type ShapeRuneId = 'bend' | 'fork';
export type TriggerRuneId = 'onInked' | 'onKill';
export type AuraRuneId = 'amplify' | 'echo';
export type RuneId = SourceRuneId | MaterialRuneId | ShapeRuneId | TriggerRuneId | AuraRuneId;
export type MaterialId = MaterialRuneId; // affinity talks about these
export type MemberId = 'draughtsman' | 'stoker';
export type EnemyId = 'rat' | 'sentry' | 'familiar' | 'dummy';
export type AttackId = 'bite' | 'line' | 'spit';
export type InteractionId =
  | 'ignite'
  | 'conduct'
  | 'arc'
  | 'detonate'
  | 'extinguish'
  | 'slide'
  | 'diffuse';
export type Rarity = 'common' | 'uncommon' | 'rare';
/** What "magnitude" means for this rune. footprint: radius = magnitude − 1 (Chebyshev square). */
export type Scale = 'damage' | 'shield' | 'footprint' | 'none';

export interface RuneDef {
  id: RuneId;
  name: string; // 'Bolt', 'On Inked'
  token: string; // lattice ASCII token: 'Bolt', 'OnInked', 'Amp'
  family: RuneFamily;
  rule: string; // one-line rule (codex + tooltip)
  arrow: boolean; // true for sources + bend (absolute, rotatable arrow)
  base: number; // base magnitude (0 for shape/trigger/aura)
  scale: Scale;
  charges: number; // per trip, sources only; 0 otherwise
  rarity: Rarity;
}

export interface MemberDef {
  id: MemberId;
  name: string;
  token: string; // board token 'D' / 'S'
  hp: number;
  move: number;
  affinity: readonly MaterialId[];
  shape: string; // lattice ASCII: '.' socket, 'x' hole
  startLattice: string; // lattice ASCII, same dims/holes as shape
  blurb: string;
}

export interface AttackDef {
  id: AttackId;
  name: string; // damage source label: 'Bite' | 'Line' | 'Spit'
  verb: string; // 'bite' | 'fire' | 'spit'
  verbs: string; // 'bites' | 'fires' | 'spits'
  kind: 'adjacent' | 'projectile';
  range: number; // 1, 99 (unlimited), 2
  damage: number;
  inks: boolean;
}

export type EnemyAi = 'chaser' | 'liner' | 'spitter' | 'idle';
export interface EnemyDef {
  id: EnemyId;
  name: string; // lowercase: 'rat' | 'sentry' | 'familiar' | 'dummy'
  token: string;
  hp: number;
  move: number;
  attack: AttackId | null;
  ai: EnemyAi;
  brass: boolean;
  oilSoaked: boolean;
  oilTrail: boolean;
  blurb: string;
}

export type LootTableId = 'shallow' | 'deep' | 'heart';
export interface EncounterDef {
  id: string;
  title: string;
  depth: number; // 1..4
  layout: string; // board ASCII, 6×8, includes D and S
  loot: LootTableId;
  picks: number; // heart: 2
  heart: boolean;
}

export type LootSpec =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink' } // member chosen when rolled
  | { kind: 'research'; amount: number };
export interface LootEntry {
  spec: LootSpec;
  weight: number;
}
export interface LootTableDef {
  id: LootTableId;
  entries: readonly LootEntry[];
}

export interface CodexEntryDef {
  id: string; // 'rune:bolt', 'interaction:ignite'
  kind: 'rune' | 'interaction';
  ref: RuneId | InteractionId;
  title: string;
  text: string; // the rule
  ownerNote: string; // previous owner's cryptic margin note
}

export interface ScenarioDef {
  id: string;
  title: string;
  note: string;
  board: string; // board ASCII
  lattices?: Partial<Record<MemberId, string>>; // omitted member → Lab uses profile lattice; tests use none
  hp?: Readonly<Record<string, number>>; // by cell label 'C1'
  intents?: Readonly<Record<string, Dir>>; // by cell label; listed enemies telegraph this dir, others idle
  demo: readonly Action[];
  expected: readonly string[]; // describeLog of all demo events concatenated
}

export interface Tuning {
  grid: { width: number; height: number };
  inkCost: Record<RuneFamily, number>;
  startInk: number;
  inkReserve: number;
  affinityBonus: number;
  inkedBonus: number;
  detonateDamage: number;
  bumpDamage: number;
  fireDamage: number;
  oilSoakedBonus: number;
  fireRounds: number;
  steamRounds: number;
  splashRange: number;
  splashRadius: number;
  echoDivisor: number;
  reviveHp: number;
  offersPerWin: number;
}
