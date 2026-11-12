import { ENEMIES, type EnemyId, type MasterId, type ShapeId } from '$data';
import { RIVALS } from '$data/rivals';
import { DISTRICT_MODULES, KIT } from '../districts/kit';
import { holdsPage } from '../rivals/pages';
import type { Profile } from '../types';
import { MASTER_IDS, type Palette, type Pen } from './types';

const isMaster = (id: string): id is MasterId => (MASTER_IDS as readonly string[]).includes(id);

/** A foe a drawing may use: not a boss, rival, stand-in or bystander. */
function isPlainFoe(id: EnemyId): boolean {
  const def = ENEMIES[id];
  return !def.boss && !def.bystander && !def.script?.standIn && !Object.hasOwn(RIVALS, id);
}

/**
 * P3: what the household has met (rules fought under, foes met, pieces, shapes of opened
 * districts, masters beaten). Derived, never stored.
 */
export function paletteOf(p: Profile): Palette {
  const met: readonly string[] = p.met;
  const rules = Object.values(KIT.rules)
    .filter((r) => r.met !== undefined && met.includes(r.met))
    .map((r) => r.id);
  const pieces = Object.values(KIT.pieces)
    .filter((d) => d.bench !== undefined && met.includes(d.bench.met))
    .map((d) => d.id);
  const shapes: ShapeId[] = DISTRICT_MODULES.flatMap((m) =>
    m.trip && m.id !== 'lowerSeam' && p.city.open.includes(m.id) ? [m.trip.id] : [],
  );
  const masters: MasterId[] = p.city.hearts.flatMap((d) => {
    const foe = KIT.modules[d]?.heart?.foe;
    return foe !== undefined && isMaster(foe) ? [foe] : [];
  });
  if (holdsPage(p, 'lamplighter:lantern')) masters.push('lamplighter');
  return {
    rules,
    foes: p.foesMet.filter(isPlainFoe),
    pieces,
    shapes,
    masters: [...new Set(masters)],
  };
}

/** P6: 1 per heart cleared, 1 per four known rune pages, 1 per level-III capstone. */
export function penOf(p: Profile): Pen {
  const parts = {
    hearts: p.city.hearts.length,
    pages: Math.floor(p.known.length / 4),
    capstones: Object.values(p.footnotes).filter((e) => e?.capstone !== undefined).length,
  };
  return { total: parts.hearts + parts.pages + parts.capstones, parts };
}
