import { TONES, type Tone } from '$data/districts/foundry';
import type { BattleState, Coord } from '$engine';
import { RINGER_BEHAVIOUR } from '$engine/districts/foundry/foes';
import { isHumming, ringingBells } from '$engine/districts/foundry/ring';
import { calledNote, tuneOf } from '$engine/districts/foundry/tune';
import { TUNE_RULE_ID } from '$engine/districts/foundry/types';
import type { DistrictHighlight, HighlightCtx } from '../logic';
import { bellSpots, toneOfLabel } from './state';

/** Highlight keys, drawn by `FOUNDRY_UI.highlightArt` (IQ-15). */
export const HALO = 'foundry:halo';
export const MUFFLED = 'foundry:muffled';
export const STRUCK = 'foundry:struck';
export const HUNG = 'foundry:hung';

/** Why a bell is haloed: a Ringer's pull, the called note, the Great Peal, or a previewed ring. */
export type HaloWhy = 'ringer' | 'note' | 'peal' | 'ring';
const WEIGHT: Record<HaloWhy, number> = { ring: 0, note: 1, ringer: 2, peal: 3 };

const keyOf = (c: Coord): string => `${c.x},${c.y}`;

/**
 * The foundry's board marks (BF-17, BF-18): a halo on the bells a Ringer will ring and on the called
 * note's bells, every bell not humming under the Peal's warning, a cloud over a muffled bell, a
 * ring on a bell a previewed cast strikes, and the strike mark on each hung great bell.
 */
export function foundryHighlights(ctx: HighlightCtx): DistrictHighlight[] {
  const { state, intentState, shown } = ctx;
  const spots = bellSpots(state);
  if (spots.length === 0) return [];
  const out: DistrictHighlight[] = [];
  const halos = new Map<string, { at: Coord; tone: Tone; why: HaloWhy }>();
  const halo = (at: Coord, tone: Tone, why: HaloWhy): void => {
    const was = halos.get(keyOf(at));
    if (!was || WEIGHT[why] > WEIGHT[was.why]) halos.set(keyOf(at), { at, tone, why });
  };

  for (const s of spots) {
    if (s.muffled) out.push({ kind: 'district', key: MUFFLED, at: { ...s.at } });
    if (s.allied && state.phase === 'player') {
      out.push({ kind: 'district', key: HUNG, at: { ...s.at }, data: { tone: s.tone } });
    }
  }

  for (const u of intentState.units) {
    if (u.kind !== 'enemy' || u.hp <= 0 || u.intent?.kind !== 'behaviour') continue;
    if (u.intent.id !== RINGER_BEHAVIOUR) continue;
    const tone = toneOfLabel(u.intent.telegraph.label);
    if (!tone) continue;
    for (const at of ringingBells(intentState, tone)) halo(at, tone, 'ringer');
  }

  tuneHalos(state, halo);

  for (const e of shown ?? []) {
    const d = (e as { data?: { tone?: Tone; bells?: Coord[] } }).data;
    if (e.type === 'foundry:bellStruck' && (e as { at?: Coord }).at) {
      const at = (e as { at: Coord }).at;
      out.push({ kind: 'district', key: STRUCK, at: { ...at }, data: { tone: d?.tone ?? null } });
    }
    if (e.type === 'foundry:ring' && d?.tone) {
      for (const at of d.bells ?? []) halo(at, d.tone, 'ring');
    }
  }

  for (const h of halos.values()) {
    out.push({ kind: 'district', key: HALO, at: { ...h.at }, data: { tone: h.tone, why: h.why } });
  }
  return out;
}

/** The tune's warning: the called note's bells, or every bell that can ring when the fourth is called. */
function tuneHalos(s: BattleState, halo: (at: Coord, tone: Tone, why: HaloWhy) => void): void {
  if (!(TUNE_RULE_ID in (s.rules ?? {}))) return;
  if (!s.units.some((u) => u.kind === 'enemy' && u.def === 'carillonneur' && u.hp > 0)) return;
  const t = tuneOf(s);
  const called = calledNote(t);
  if (t.at < t.tune.length - 1) {
    for (const at of ringingBells(s, called)) halo(at, called, 'note');
    return;
  }
  for (const tone of TONES) {
    if (isHumming(s, tone)) continue;
    for (const at of ringingBells(s, tone)) halo(at, tone, 'peal');
  }
}
