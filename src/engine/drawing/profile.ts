import { APPRENTICE_IDS, DISTRICT_IDS, type Drawing, ENEMY_IDS } from '$data';
import type { KitId } from '../districts/types';
import type { EndingState, Ledger, Profile } from '../types';
import { MASTER_IDS } from './types';

/**
 * The profile's three ending fields (EN-W0): `drawings`, `ending` and `ledger`. A save without
 * them reads as empty defaults; a malformed value is dropped (its slot, field or counter reads as
 * empty), never thrown, so an odd save never costs the player the rest of the profile.
 *
 * The fields are stored only once they differ from empty (the `recruits` precedent): a profile
 * that never touched the ending keeps its saved form byte for byte, so recorded saves and golden
 * trips stay valid. Read them through `drawingsOf`, `endingOf` and `ledgerOf`.
 */

export const DRAWING_SLOTS = 3;
export const NAME_MAX = 24;

export const emptyDrawings = (): (Drawing | null)[] =>
  Array.from({ length: DRAWING_SLOTS }, () => null);
export const emptyEnding = (): EndingState => ({ handover: false, creditsSeen: false });
export const emptyLedger = (): Ledger => ({ casts: 0, biggest: null, districts: [] });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isKitId = (v: unknown): v is KitId => {
  if (typeof v !== 'string') return false;
  const at = v.indexOf(':');
  return (
    at > 0 && at < v.length - 1 && (DISTRICT_IDS as readonly string[]).includes(v.slice(0, at))
  );
};
const idOf = <T extends string>(ids: readonly T[], v: unknown): T | undefined =>
  ids.find((id) => id === v);

/** One saved drawing, or `null` when anything about it is malformed. */
export function readDrawing(v: unknown): Drawing | null {
  if (!isRecord(v) || typeof v.name !== 'string') return null;
  const name = v.name.trim();
  if (name.length < 1 || name.length > NAME_MAX) return null;
  if (v.rule !== null && !isKitId(v.rule)) return null;
  if (!Array.isArray(v.foes) || v.foes.length < 1 || v.foes.length > 3) return null;
  const foes = v.foes.map((f) => idOf(ENEMY_IDS, f));
  if (foes.some((f) => f === undefined)) return null;
  if (!Array.isArray(v.pieces) || v.pieces.length > 2 || !v.pieces.every(isKitId)) return null;
  if (v.shape !== 'plain' && !isKitId(v.shape)) return null;
  const length = v.length;
  if (length !== 3 && length !== 4 && length !== 5 && length !== 6) return null;
  const heart = idOf(MASTER_IDS, v.heart);
  if (heart === undefined) return null;
  return {
    name,
    rule: v.rule,
    foes: foes as Drawing['foes'],
    pieces: v.pieces,
    shape: v.shape,
    length,
    heart,
  };
}

/** Three slots: each malformed one empty, a short list padded, a long one cut. */
export function readDrawings(v: unknown): (Drawing | null)[] {
  const raw = Array.isArray(v) ? v : [];
  return Array.from({ length: DRAWING_SLOTS }, (_, i) => readDrawing(raw[i]));
}

export function readEnding(v: unknown): EndingState {
  const r = isRecord(v) ? v : {};
  return { handover: r.handover === true, creditsSeen: r.creditsSeen === true };
}

/** Counts, the biggest chain (dropped whole when any part is malformed) and the opening order. */
export function readLedger(v: unknown): Ledger {
  const r = isRecord(v) ? v : {};
  const b = r.biggest;
  const caster = isRecord(b) ? idOf(APPRENTICE_IDS, b.caster) : undefined;
  const biggest =
    isRecord(b) && isCount(b.chain) && caster !== undefined && typeof b.name === 'string'
      ? { chain: b.chain, caster, name: b.name }
      : null;
  const districts = Array.isArray(r.districts)
    ? [
        ...new Set(
          r.districts.flatMap((d) => {
            const id = idOf(DISTRICT_IDS, d);
            return id === undefined ? [] : [id];
          }),
        ),
      ]
    : [];
  return { casts: isCount(r.casts) ? r.casts : 0, biggest, districts };
}

type EndingFields = Pick<Profile, 'drawings' | 'ending' | 'ledger'>;

/** The profile's three fields with their empty defaults filled in. */
export const drawingsOf = (p: Pick<Profile, 'drawings'>): (Drawing | null)[] =>
  p.drawings ?? emptyDrawings();
export const endingOf = (p: Pick<Profile, 'ending'>): EndingState => p.ending ?? emptyEnding();
export const ledgerOf = (p: Pick<Profile, 'ledger'>): Ledger => p.ledger ?? emptyLedger();

/** `parseProfile`'s three readers: only the fields that differ from empty are returned. */
export function endingFieldsOf(r: Record<string, unknown>): Partial<EndingFields> {
  const drawings = readDrawings(r.drawings);
  const ending = readEnding(r.ending);
  const ledger = readLedger(r.ledger);
  return {
    ...(drawings.some((d) => d !== null) ? { drawings } : {}),
    ...(ending.handover || ending.creditsSeen ? { ending } : {}),
    ...(ledger.casts > 0 || ledger.biggest !== null || ledger.districts.length > 0
      ? { ledger }
      : {}),
  };
}
