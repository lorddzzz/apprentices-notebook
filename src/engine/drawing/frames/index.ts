import type { MasterId } from '$data';
import type { HeartFrame } from '../types';
import { LAMPLIGHTER_FRAME } from './lamplighter';
import { LAMP_MOTHER_FRAME } from './lampMother';
import { MARGINALIA_FRAME } from './marginalia';
import { POSTMASTER_FRAME } from './postmaster';
import { STEWARD_FRAME } from './steward';

/**
 * P34: each master's frame, one line per master. A kit pack adds its lines here.
 */
export const HEART_FRAMES: Partial<Record<MasterId, HeartFrame>> = {
  marginalia: MARGINALIA_FRAME,
  mother: LAMP_MOTHER_FRAME,
  lamplighter: LAMPLIGHTER_FRAME,
  postmaster: POSTMASTER_FRAME,
  bathSteward: STEWARD_FRAME,
};
