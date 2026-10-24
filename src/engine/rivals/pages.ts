import type { DistrictId } from '$data';
import { RIVAL_PAGES, RIVALS, type RivalPageId } from '$data/rivals';
import type { BattleState, EnemyUnit, Profile } from '../types';

/** The pages a profile holds (P11), in recovered order. Read by DK-8's `pages` hearing kind. */
export const pagesHeld = (p: Pick<Profile, 'pages'>): readonly RivalPageId[] => p.pages;

export const holdsPage = (p: Pick<Profile, 'pages'>, id: RivalPageId): boolean =>
  pagesHeld(p).includes(id);

/** A rival-note footnote variant shows only once its page is held (footnotes §1, FN-8). */
export const rivalNoteVisible = (p: Pick<Profile, 'pages'>, variant: string): boolean =>
  pagesHeld(p).some((id) => RIVAL_PAGES[id]?.note?.variant === variant);

/**
 * Banks the page of every rival this won fight beat (rivals §3): a rival unit downed in its home
 * district, never a stand-in (P14). Knowledge, not loot: it costs no pick and rides on the profile,
 * so a later wipe keeps it, and a repeat win adds nothing. Call on a won battle only. `awardsPage`
 * (`standIn.ts`) is passed in, not imported: hearing reaches this file from the kit's own load.
 */
export function bankPages(
  p: Profile,
  b: Pick<BattleState, 'units'>,
  district: DistrictId,
  awardsPage: (e: EnemyUnit) => boolean,
): Profile {
  const earned: RivalPageId[] = [];
  for (const u of b.units) {
    if (u.kind !== 'enemy' || !u.rival || u.hp > 0 || !awardsPage(u)) continue;
    const def = RIVALS[u.rival.rival];
    if (!def || def.district !== district || !def.page) continue;
    if (!p.pages.includes(def.page) && !earned.includes(def.page)) earned.push(def.page);
  }
  return earned.length ? { ...p, pages: [...p.pages, ...earned] } : p;
}
