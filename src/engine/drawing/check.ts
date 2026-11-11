import type { Drawing } from '$data';
import type { Profile } from '../types';
import { notBuilt } from './stub';
import type { Issue } from './types';

/** P5: every unmet need, element or limit, each with its sentence; empty when the drawing may be saved. EN-5. */
export function checkDrawing(_p: Profile, _d: Drawing): Issue[] {
  return notBuilt('EN-5');
}
