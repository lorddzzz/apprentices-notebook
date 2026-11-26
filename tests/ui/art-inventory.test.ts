import { expect, test } from 'vitest';
import { DISTRICTS } from '$data/districts/index';
import { ENEMIES, ENEMY_IDS } from '$data/enemies';
import { RIVALS } from '$data/rivals/index';
import type { DistrictId, EnemyId, LootSpec } from '$data/types';
import {
  BORROWED_FOES,
  BOSS_ART,
  FOE_ART,
  foeArt,
  LOCK_ART,
  LOOT_ART,
  RIVAL_ART,
  refArtId,
} from '../../src/ui/art/inventory';
import { parseArtId } from '../../src/ui/art/spec';

/** Every LootSpec kind (R27: rune, method, ink, solvent, vellum, doorway, key). */
const LOOT_KINDS: readonly LootSpec['kind'][] = [
  'rune',
  'method',
  'ink',
  'solvent',
  'vellum',
  'doorway',
  'key',
];

/** The foes each district's room layouts and threshold board place, by board token. */
function foesPlacedIn(district: DistrictId): Set<EnemyId> {
  const byToken = new Map(ENEMY_IDS.map((id) => [ENEMIES[id].token, id]));
  const d = DISTRICTS[district];
  const boards = [
    ...d.rooms.flatMap((r) => [r.layout, ...r.variants.map((v) => v.layout)]),
    d.threshold?.board ?? '',
  ];
  const found = new Set<EnemyId>();
  for (const board of boards) {
    for (const ch of board.replace(/\{[^}]*\}/g, ' ')) {
      const id = byToken.get(ch);
      if (id) found.add(id);
    }
  }
  return found;
}

test('inventory: every ENEMY_IDS/rival/boss/loot kind/threshold lock maps', () => {
  expect(ENEMY_IDS).toHaveLength(33);
  const unmapped = [
    ...ENEMY_IDS.filter((id) => !FOE_ART[id]).map((id) => `foe ${id}`),
    ...Object.keys(RIVALS)
      .filter((id) => !RIVAL_ART[id as keyof typeof RIVAL_ART])
      .map((id) => `rival ${id}`),
    ...ENEMY_IDS.filter((id) => ENEMIES[id].boss && !BOSS_ART[id]).map((id) => `boss ${id}`),
    ...LOOT_KINDS.filter((k) => !LOOT_ART[k]).map((k) => `loot ${k}`),
    ...Object.values(DISTRICTS)
      .filter((d) => d.threshold && !LOCK_ART[d.id])
      .map((d) => `lock ${d.id}`),
  ];
  expect(unmapped).toEqual([]);
});

test('inventory: only real threshold locks are painted, never a heart door', () => {
  const withThreshold = Object.values(DISTRICTS)
    .filter((d) => d.threshold)
    .map((d) => d.id)
    .sort();
  expect(Object.keys(LOCK_ART).sort()).toEqual(withThreshold);
  expect(withThreshold).toEqual(['bathhouses', 'canals', 'cartographers', 'foundry', 'inkQuarter']);
});

test('inventory: no stray entries (bosses are boss foes; loot kinds and rivals exist)', () => {
  for (const id of Object.keys(BOSS_ART)) expect(ENEMIES[id as EnemyId]?.boss).toBe(true);
  expect(Object.keys(LOOT_ART).sort()).toEqual([...LOOT_KINDS].sort());
  expect(Object.keys(RIVAL_ART).sort()).toEqual(Object.keys(RIVALS).sort());
  expect(Object.keys(FOE_ART).sort()).toEqual([...ENEMY_IDS].sort());
});

test('inventory: every art id follows the path rule and a foe figure sits in its owner scope', () => {
  const refs = [
    ...Object.values(FOE_ART).map((f) => f.ref),
    ...BORROWED_FOES.map((b) => b.ref),
    ...Object.values(RIVAL_ART),
    ...Object.values(BOSS_ART),
    ...Object.values(LOOT_ART),
    ...Object.values(LOCK_ART),
  ];
  for (const ref of refs) {
    if (!ref) continue;
    const id = refArtId(ref);
    if (id !== null) expect(parseArtId(id), id).not.toBeNull();
  }
  for (const [foe, { owner, ref }] of Object.entries(FOE_ART)) {
    if ('art' in ref) expect(parseArtId(ref.art)?.scope, foe).toBe(owner);
  }
});

test('inventory: borrowed foes and name conversions are explicit entries', () => {
  for (const district of Object.keys(DISTRICTS) as DistrictId[]) {
    for (const foe of foesPlacedIn(district)) {
      if (FOE_ART[foe].owner === district) continue;
      const entry = BORROWED_FOES.find((b) => b.foe === foe && b.district === district);
      expect(entry, `${foe} borrowed in ${district}`).toBeDefined();
    }
  }
  for (const b of BORROWED_FOES) {
    expect(foesPlacedIn(b.district).has(b.foe), `${b.foe} in ${b.district}`).toBe(true);
    expect(refArtId(b.ref)).toBe(refArtId(FOE_ART[b.foe].ref));
  }
  expect(foeArt('rat', 'bathhouses')).toEqual({
    alias: 'foes/seam/rat',
    note: 'the Seam rat in the changing rooms',
  });
  expect(foeArt('deadLetter')).toEqual({ art: 'foes/inkQuarter/dead-letter' });
  expect(foeArt('chiefWarden')).toEqual({ art: 'foes/bridges/chief-warden' });
  expect(foeArt('dissolvedBather')).toEqual({ art: 'foes/bathhouses/bather' });
  expect(foeArt('barge')).toMatchObject({ vector: 'canals/CrateArt' });
  expect(foeArt('clockSeal')).toMatchObject({ vector: 'inkQuarter/StaffToken' });
  expect(LOOT_ART.key).toMatchObject({ vector: 'crestFor' });
});
