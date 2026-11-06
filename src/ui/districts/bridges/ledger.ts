import {
  BRIDGE_ROOMS_12,
  BRIDGE_ROOMS_34,
  BRIDGES_LEDGER,
  BRIDGES_PASS_CARD,
  spanLedger,
  spanVariantPool,
  WARDEN_CARD,
  WATCHPOST_SCENE,
} from '$data/districts/bridges';
import { BRIDGE_TUNING, SPAN_KINDS, type SpanKind } from '$data/districts/bridges/types';
import { LOOT_TABLES } from '$data/loot';
import type { LootItem, Trip } from '$engine';

/**
 * The bridges' Crossroads and Loot copy as pure readers (BR-15): the span cards say what the
 * next room holds (foes, floor, loot) from the room's layouts and the span's loot table, plus the
 * mason's-ledger line. Rooms are 0-based; at the Crossroads `trip.encounter` is the room just won.
 */

export interface SpanCard {
  kind: SpanKind;
  title: string;
  /** "Long span" or "Short span": the way's own name. */
  name: string;
  hand: string;
  ledger: string;
  /** "2–3 foes", or null when the next room has no layouts yet. */
  foes: string | null;
  floor: string;
  loot: string;
}

const ROOMS = [...BRIDGE_ROOMS_12, ...BRIDGE_ROOMS_34];
const FOE_CELLS = new Set(['j', 'y', 'J']);

const cells = (layout: string): string[] => layout.split(/\s+/).filter(Boolean);

/** Foe count of one authored layout (a foe token is its letter plus the span's stone). */
export const foeCount = (layout: string): number =>
  cells(layout).filter((c) => FOE_CELLS.has(c.charAt(0))).length;

const range = (nums: readonly number[]): string => {
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
};

/** "2–3 foes" over the next room's layouts for a span kind; null if none are authored. */
export function foesLine(next: number, kind: SpanKind): string | null {
  const room = ROOMS[next];
  const counts = spanVariantPool(next, kind).flatMap((i) => {
    const v = room?.variants?.[i];
    return v ? [foeCount(v.layout)] : [];
  });
  if (counts.length === 0) return null;
  return `${range(counts)} ${Math.max(...counts) === 1 ? 'foe' : 'foes'}`;
}

/** The floor in words: stone per tile, and what that means for a crush or a burst. */
export function floorLine(kind: SpanKind): string {
  const stone = BRIDGE_TUNING.stone[kind];
  return kind === 'sound'
    ? `Stone ${stone}: a tile takes ${stone} wears before it breaks.`
    : `Stone ${stone}: one crush or burst breaks a tile, and little ground is left.`;
}

/** The loot in words, read from the span's table: ink or none, and how much of the school. */
export function lootLine(kind: SpanKind): string {
  const entries = LOOT_TABLES[`bridges:${kind}`]?.entries ?? [];
  const has = (k: string) => entries.some((e) => e.spec.kind === k);
  const school = entries.filter((e) => e.spec.kind === 'rune' || e.spec.kind === 'solvent');
  const weight = (es: typeof entries) => es.reduce((n, e) => n + e.weight, 0);
  const share = Math.round((weight(school) / Math.max(1, weight(entries))) * 100);
  return `${has('ink') ? 'Steady ink' : 'No ink'}, ${share}% pages and solvents${has('vellum') ? ', vellum' : ''}.`;
}

/** The two span cards for the way on from room `after`, in the data's order. */
export function spanCards(after: number): SpanCard[] {
  return SPAN_KINDS.map((kind) => {
    const line = spanLedger(after, kind);
    return {
      kind,
      title: line?.title ?? (kind === 'sound' ? 'The sound span' : 'The crumbling span'),
      name: kind === 'sound' ? 'Long span' : 'Short span',
      hand: line?.hand ?? 'A mason',
      ledger: line?.text ?? '',
      foes: foesLine(after + 1, kind),
      floor: floorLine(kind),
      loot: lootLine(kind),
    };
  });
}

/** The cards while the party stands at a bridges Crossroads; empty elsewhere or at the heart. */
export function crossroadsCards(t: Trip): SpanCard[] {
  if (t.district !== 'bridges' || t.status !== 'crossroads') return [];
  return t.encounter >= BRIDGE_TUNING.rooms ? [] : spanCards(t.encounter);
}

export interface WatchpostView {
  scene: string;
  title: string;
  blurb: string;
  hand: string;
  ledger: string;
}

const isWarden = (i: LootItem): boolean => i.kind === 'recruit' && i.apprentice === 'warden';

/** The watchpost's scene while the defector warden is among the offers; null otherwise. */
export function watchpostView(t: Trip): WatchpostView | null {
  if (t.district !== 'bridges' || !t.offers.some(isWarden)) return null;
  const line = BRIDGES_LEDGER.find((l) => l.at.kind === 'watchpost');
  return {
    scene: WATCHPOST_SCENE,
    title: WARDEN_CARD.title,
    blurb: WARDEN_CARD.blurb,
    hand: line?.hand ?? 'A warden',
    ledger: line?.text ?? '',
  };
}

/** The pass's copy while a key to the bridges is among the offers; null otherwise. */
export function passView(t: Trip): { title: string; text: string } | null {
  return t.offers.some((i) => i.kind === 'key' && i.district === 'bridges')
    ? { ...BRIDGES_PASS_CARD }
    : null;
}

/** The generic bindEvent kind's copy by event (BR-10's *pushed* page; CG's *dies* reuses it). */
export function bindEventCard(
  item: unknown,
): { title: string; text: string; event: string } | null {
  const event =
    typeof item === 'object' && item !== null && 'event' in item ? String(item.event) : '';
  if (event === 'pushed')
    return {
      event,
      title: 'The pushed page',
      text: 'A Bind page that fires when a unit is pushed. Bank it and the Bench offers it.',
    };
  if (event === 'dies')
    return {
      event,
      title: 'The dying page',
      text: 'A Bind page that fires when a unit dies. Bank it and the Bench offers it.',
    };
  return null;
}
