import type { Profile } from '../types';
import { notBuilt } from './stub';
import type { Palette, Pen } from './types';

/** P3: what the household has met (rules fought under, foes met, pieces, shapes started, masters beaten). EN-5. */
export function paletteOf(_p: Profile): Palette {
  return notBuilt('EN-5');
}

/** P6: 1 per heart cleared, 1 per four known rune pages, 1 per level-III capstone. EN-5. */
export function penOf(_p: Profile): Pen {
  return notBuilt('EN-5');
}
