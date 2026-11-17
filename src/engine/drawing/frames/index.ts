import type { MasterId } from '$data';
import type { HeartFrame } from '../types';
import { MARGINALIA_FRAME } from './marginalia';

/**
 * P34: each master's frame, one line per master. A kit pack adds its lines here.
 */
export const HEART_FRAMES: Partial<Record<MasterId, HeartFrame>> = {
  marginalia: MARGINALIA_FRAME,
};
