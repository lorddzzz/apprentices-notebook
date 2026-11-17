import type { MasterId } from '$data';
import type { HeartFrame } from '../types';
import { MARGINALIA_FRAME } from './marginalia';

/**
 * P34: each master's frame, one line per master. EN-W1 seeds the Marginalia's; the kit packs add
 * the rest (EN-K1 replaces this one).
 */
export const HEART_FRAMES: Partial<Record<MasterId, HeartFrame>> = {
  marginalia: MARGINALIA_FRAME,
};
