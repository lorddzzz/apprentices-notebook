import type { Component } from 'svelte';
import type { ApprenticeId } from '$data/apprentices';
import { ENEMIES, ENEMY_IDS } from '$data/enemies';
import { RIVALS } from '$data/rivals';
import type { DistrictId, EnemyId } from '$data/types';
import { foeArt, refArtId } from '$ui/art/inventory';
import type { ArtId } from '$ui/art/registry';
import { DISTRICT_UI } from '$ui/districts';
import type { LayerId } from '../../../app/view';

export type TileKind = LayerId | 'floor' | 'water' | 'grate' | 'gate' | 'lamp' | 'drop' | 'vent';

/** District packs register their fight theme on their own DistrictUi entry. */
export interface DistrictFightTheme {
  id: DistrictId;
  scene?: ArtId;
  /** Focal point as fractions of the source image, from its top-left corner. */
  sceneFocal?: [number, number];
  arena?: ArtId;
  /** Base asset overrides by material. A requested state appends its own suffix. */
  tiles?: Partial<Record<TileKind, ArtId>>;
  /** CSS colour for the vector floor when there is no tile asset. */
  tileTone?: string;
  crest?: Component<{ size: number }>;
}

/**
 * Combat passes its room district and arena flag. Lab and Gallery pass the sample's district.
 * UT's read-only board passes the wiped trip room's district. Without a district the board uses
 * no scene, shared tiles and vector figures.
 */
export interface FightArtContext {
  district?: DistrictId;
  arena?: boolean;
}

export const FIGHT_KITS: Readonly<Partial<Record<DistrictId, DistrictFightTheme>>> =
  Object.fromEntries(
    Object.entries(DISTRICT_UI).flatMap(([id, ui]) =>
      ui?.fightTheme ? [[id, ui.fightTheme]] : [],
    ),
  );

export type FightArtSubject =
  | { kind: 'scene' }
  | { kind: 'tile'; material: TileKind; state?: string; owner?: DistrictId }
  | { kind: 'prop'; def: string; owner: DistrictId; state?: string }
  | { kind: 'member'; def: ApprenticeId }
  | { kind: 'foe'; def: EnemyId };

/** UF-2 owns the foe mapping, including deliberate aliases and vector fallbacks. */
export function enemyArtId(def: EnemyId): ArtId | null {
  return refArtId(foeArt(def));
}

function kebab(id: string): string {
  return id.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

function stateSuffix(state: string | undefined): string {
  return state ? `-${kebab(state)}` : '';
}

/** Candidates in lookup order. Use the first that has an artUrl, then draw the vector fallback. */
export function fightArtIds(
  district: FightArtContext['district'],
  subject: FightArtSubject,
  arena: FightArtContext['arena'] = false,
): readonly ArtId[] {
  switch (subject.kind) {
    case 'scene': {
      if (!district) return [];
      const kit = FIGHT_KITS[district];
      const scene: ArtId = kit?.scene ?? `scenes/${district}/fight`;
      return arena ? [kit?.arena ?? `scenes/${district}/arena`, scene] : [scene];
    }
    case 'tile': {
      const owner = subject.owner ?? district;
      const material = kebab(subject.material);
      const suffix = stateSuffix(subject.state);
      const shared: ArtId = `tiles/shared/${material}${suffix}`;
      if (!owner) return [shared];
      const base = FIGHT_KITS[owner]?.tiles?.[subject.material] ?? `tiles/${owner}/${material}`;
      return [`${base}${suffix}`, shared];
    }
    case 'prop': {
      const name = `${kebab(subject.def)}${stateSuffix(subject.state)}`;
      return [`props/${subject.owner}/${name}`, `props/shared/${name}`];
    }
    case 'member':
      return district ? [`units/shared/${subject.def}`] : [];
    case 'foe': {
      const id = district && enemyArtId(subject.def);
      return id ? [id] : [];
    }
  }
}

/** A rival's own header takes precedence over the boss flag on its board shell. */
export function foeHeaderKind(def: EnemyId): 'rival' | 'boss' | undefined {
  if (Object.hasOwn(RIVALS, def)) return 'rival';
  return ENEMIES[def].boss ? 'boss' : undefined;
}

const LARGE_FIGURES = new Set(
  ENEMY_IDS.flatMap((def) => {
    if (foeHeaderKind(def) !== 'boss' && def !== 'mother' && def !== 'marginalia') return [];
    const id = enemyArtId(def);
    return id ? [id] : [];
  }),
);

const FIGURE = { w: 128, h: 176, feetY: 160 } as const;
const LARGE_FIGURE = { w: 192, h: 256, feetY: 232 } as const;

export function figureSize(assetId: ArtId): {
  readonly w: number;
  readonly h: number;
  readonly feetY: number;
} {
  return LARGE_FIGURES.has(assetId) ? LARGE_FIGURE : FIGURE;
}
