import type { PieceDef } from '../types';
import { outlineStruck, pencilStruck } from './paper';
import {
  BLANK_DEF,
  isFate,
  OUTLINE_DEF,
  type OutlineData,
  PENCIL_DEF,
  PENCIL_RULE_ID,
  type PencilData,
} from './types';

/**
 * The Cartographers' paper pieces with their notation and triggers (P1, P2; CG-1). The bases are
 * declared in `types.ts` (cycle-free); this file adds what the kit registers.
 *
 * - `{pencil}`, `{pencil:ink}`, `{pencil:rub}`, `{pencil:rub@2}`: a fate, and the round whose end
 *   resolves it. `write` is the inverse of `parse`, so a board round-trips.
 * - `{blank}`: no tile; registered as declared. Its void, solidity and `holds: 'none'` are the
 *   def's (`pieceVoid`, `pieceHoldsNothing`): no state or jar lands on it, and no unit stands on
 *   it to be marked. CG-3 refuses Draw onto it.
 * - `{outline:<foe>}`, `{outline:<foe>@<n>}`: pencil carrying a foe. Inking it is CG-4's.
 */

const PENCIL_SUFFIX = /^(ink|rub)(?:@([1-9]\d*))?$/;

/** `ink`, `rub`, `rub@2` → the fate and its due round; anything else is not a pencil. */
export function parsePencil(suffix: string): PencilData | null {
  const m = PENCIL_SUFFIX.exec(suffix);
  const fate = m?.[1];
  if (!m || !fate || !isFate(fate)) return null;
  return { fate, due: m[2] ? Number(m[2]) : null };
}

/** The canonical suffix: empty for an unplanned pencil, `ink` / `rub` / `rub@2` otherwise. */
export function writePencil(d: PencilData): string {
  if (d.fate === null) return '';
  return d.due === null ? d.fate : `${d.fate}@${d.due}`;
}

const OUTLINE_SUFFIX = /^([A-Za-z][A-Za-z0-9]*)(?:@([1-9]\d*))?$/;

/** `surveyor`, `eraser@3` → the foe def id and its due round (the foe's existence is CG-5's). */
export function parseOutline(suffix: string): OutlineData | null {
  const m = OUTLINE_SUFFIX.exec(suffix);
  const foe = m?.[1];
  if (!m || !foe) return null;
  return { foe, due: m[2] ? Number(m[2]) : null };
}

export function writeOutline(d: OutlineData): string {
  if (!d.foe) return '';
  return d.due === null ? d.foe : `${d.foe}@${d.due}`;
}

/** The pencil piece as registered. */
export const PENCIL: PieceDef<PencilData> = {
  ...PENCIL_DEF,
  triggers: { onStruck: pencilStruck },
  data: {
    init: { fate: null, due: null },
    parse: parsePencil,
    write: writePencil,
  },
};

/** The outline piece as registered (CG-4 gives it its inking and the waiting rule). */
export const OUTLINE: PieceDef<OutlineData> = {
  ...OUTLINE_DEF,
  triggers: { onStruck: outlineStruck },
  rules: [PENCIL_RULE_ID],
  data: {
    init: { foe: '', due: null },
    parse: parseOutline,
    write: writeOutline,
  },
};

export const CARTOGRAPHERS_REGISTERED_PIECES: readonly PieceDef[] = [
  PENCIL,
  BLANK_DEF,
  OUTLINE,
] as readonly PieceDef[];
