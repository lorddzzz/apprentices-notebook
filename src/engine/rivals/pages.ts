import { RIVAL_PAGES, type RivalPageId } from '$data/rivals';
import type { Profile } from '../types';

/** The pages a profile holds (P11): absent reads as none. Read by DK-8's `pages` hearing kind. */
export const pagesHeld = (p: Pick<Profile, 'pages'>): readonly RivalPageId[] => p.pages ?? [];

export const holdsPage = (p: Pick<Profile, 'pages'>, id: RivalPageId): boolean =>
  pagesHeld(p).includes(id);

/** A rival-note footnote variant shows only once its page is held (footnotes §1, FN-8). */
export const rivalNoteVisible = (p: Pick<Profile, 'pages'>, variant: string): boolean =>
  pagesHeld(p).some((id) => RIVAL_PAGES[id]?.note?.variant === variant);
