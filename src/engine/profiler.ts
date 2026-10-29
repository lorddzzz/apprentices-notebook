import { MEMBER_IDS, TUNING } from '$data';
import type { EventLog, GameEvent, NodeSpan } from './events';
import { baseGlyphCost } from './glyph';
import { type Coord, key, neighbors4 } from './grid';
import { libraryOf, roleOf } from './lattice';
import { MEANINGFUL } from './resolve';
import type {
  CastSample,
  CellKey,
  GlyphDef,
  GlyphId,
  GlyphRecord,
  InventionLibrary,
  Origin,
  Profile,
  TierLevel,
  TierUp,
} from './types';
import { isGlyph } from './types';

/**
 * The profiler (design research-and-mastery §4.9, plan M1–M16): harm attribution per Glyph from the
 * trace spans, per-version records, Economy and Reliability tiers and their rewards.
 *
 * Never import `run.ts` here: run.ts imports this module (the effective Glyph library reads
 * `rewardsOf`).
 */

/** Both tiers of a record or a window. */
export interface Tiers {
  economy: TierLevel;
  reliability: TierLevel;
}

/** What a version's best tiers earn (M12): ink off, the extra exit, how many open cells. */
export interface GlyphRewards {
  discount: number; // 0–3: one ink per Economy tier
  extraExit: boolean; // Reliability silver or better
  params: number; // TUNING.paramSlots, or paramSlotsGold at Reliability gold
}

/** One Glyph socket's part in one non-echo cast (M3, M4): the sample and the local cells that fired. */
export interface GlyphCast {
  glyph: GlyphId;
  version: number;
  sample: CastSample;
  fired: readonly CellKey[]; // local cell keys
}

/** The key of a version's record in `Profile.glyphRecords`: "g1@2". */
export function versionKey(id: GlyphId, version: number): string {
  return `${id}@${version}`;
}

export function emptyRecord(): GlyphRecord {
  return {
    casts: 0,
    harm: 0,
    meaningful: 0,
    recent: [],
    best: { economy: 0, reliability: 0 },
    fired: {},
  };
}

/** A version's record; a missing one reads as empty (M37). */
export function recordOf(
  p: Pick<Profile, 'glyphRecords'>,
  id: GlyphId,
  version: number,
): GlyphRecord {
  return p.glyphRecords[versionKey(id, version)] ?? emptyRecord();
}

/** The events a span owns, given the log index of its cast's first effect event. */
const stretch = (events: EventLog, base: number, span: NodeSpan): readonly GameEvent[] =>
  events.slice(base + span.from, base + span.to);

/** A cast's identity survives stored effects, copied origins and later player turns. */
export const castOriginKey = (o: Origin): string => `${o.caster}|${o.spell}|${o.cast}`;

/** Harm in a stretch (M1): damage to enemies plus `killHarm` per enemy death. */
function harmIn(evs: readonly GameEvent[]): number {
  let harm = 0;
  for (const e of evs) {
    if (e.type === 'damage' && !e.target.member && !e.target.bystander) harm += e.amount;
    else if (e.type === 'died' && !e.unit.member && !e.unit.bystander) harm += TUNING.killHarm;
  }
  return harm;
}

/** The local cells a span fired: the cell itself and the shape cells walked to reach it. */
function localCells(span: NodeSpan): Coord[] {
  return [...(span.viaInner ?? []), ...(span.inner ? [span.inner] : [])];
}

/** Auras beside a socket in a member's lattice: each costs 1 ink (M9). */
function outerAuras(p: Profile, caster: string, socket: Coord): number {
  const member = MEMBER_IDS.find((m) => m === caster);
  const runes = member ? (p.lattices?.[member] ?? []) : [];
  const near = new Set(neighbors4(socket).map(key));
  const lib = libraryOf(p.inventions ?? []);
  return runes.filter((r) => !isGlyph(r) && roleOf(r.rune, lib) === 'aura' && near.has(key(r.at)))
    .length;
}

/** The cells that fired, plus every inner aura touching one of them (M8). */
function withAuras(def: GlyphDef, cells: readonly Coord[], library: InventionLibrary): CellKey[] {
  const out = new Set<CellKey>(cells.map(key));
  for (const c of def.cells) {
    if (roleOf(c.rune, library) !== 'aura') continue;
    if (neighbors4(c.at).some((n) => out.has(key(n)))) out.add(key(c.at));
  }
  return [...out];
}

/**
 * Every Glyph cast in a trip battle's log, in log order (M3–M6). `p` is the profile at battle
 * start. A cast's `trace` carries the spans; their offsets start right after the `cast` event
 * before it. One sample per Glyph socket: a Spell Glyph always has one (its source ran), a Payload
 * Glyph only when an inner node ran (M4). Echoes have no trace, so they give nothing (M5).
 */
export function glyphSamples(events: EventLog, p: Profile): GlyphCast[] {
  const out: GlyphCast[] = [];
  const library = libraryOf(p.inventions ?? []);
  type Trace = Extract<GameEvent, { type: 'trace' }>;
  const groups = new Map<string, { trace: Trace; base: number }[]>();
  let base = -1;
  events.forEach((e, i) => {
    if (e.type === 'cast') base = i + 1;
    if (e.type !== 'trace' || (base < 0 && !e.continued)) return;
    const id = e.origin ? castOriginKey(e.origin) : `legacy:${i}`;
    groups.set(id, [...(groups.get(id) ?? []), { trace: e, base }]);
  });
  for (const group of groups.values()) {
    const e = group[0]?.trace;
    if (!e) continue;
    const sockets = new Map<string, { span: NodeSpan; base: number; continued: boolean }[]>();
    for (const part of group)
      for (const span of part.trace.spans) {
        if (!span.glyph) continue;
        const k = `${span.glyph}|${key(span.at)}`;
        sockets.set(k, [
          ...(sockets.get(k) ?? []),
          { span, base: part.base, continued: !!part.trace.continued },
        ]);
      }
    for (const parts of sockets.values()) {
      const first = parts[0]?.span;
      const def = first?.glyph ? p.glyphs.find((g) => g.id === first.glyph) : undefined;
      if (!first || !def) continue;
      const owned = new Set(
        parts.flatMap((p) => (p.continued ? [] : stretch(events, p.base, p.span))),
      );
      if (e.origin) {
        const cast = castOriginKey(e.origin);
        for (const event of events) {
          if (
            event.origin?.glyph === def.id &&
            castOriginKey(event.origin) === cast &&
            (!event.origin.glyphAt || key(event.origin.glyphAt) === key(first.at))
          )
            owned.add(event);
        }
      }
      const lifetime = [...owned].filter(
        (event) =>
          !event.origin ||
          !e.origin ||
          (castOriginKey(event.origin) === castOriginKey(e.origin) &&
            (!event.origin.glyph || event.origin.glyph === def.id) &&
            (!event.origin.glyphAt || key(event.origin.glyphAt) === key(first.at))),
      );
      out.push({
        glyph: def.id,
        version: def.version,
        sample: {
          harm: harmIn(lifetime),
          cost: baseGlyphCost(def, library) + outerAuras(p, e.caster.id, first.at),
          meaningful: lifetime.some((x) => MEANINGFUL.has(x.type)),
        },
        fired: withAuras(
          def,
          parts.flatMap((p) => localCells(p.span)),
          library,
        ),
      });
    }
  }
  return out;
}

const higher = (a: TierLevel, b: TierLevel): TierLevel => (a >= b ? a : b);

/** The record after one more sample (M8): lifetime sums, the window, best tiers, fired counts. */
export function foldRecord(
  r: GlyphRecord,
  sample: CastSample,
  fired: readonly CellKey[],
): GlyphRecord {
  const recent = [...r.recent, sample].slice(-TUNING.tierWindow);
  const now = windowTiers(recent);
  const counts: Record<CellKey, number> = { ...r.fired };
  for (const k of new Set(fired)) counts[k] = (counts[k] ?? 0) + 1;
  return {
    casts: r.casts + 1,
    harm: r.harm + sample.harm,
    meaningful: r.meaningful + (sample.meaningful ? 1 : 0),
    recent,
    best: {
      economy: higher(r.best.economy, now.economy),
      reliability: higher(r.best.reliability, now.reliability),
    },
    fired: counts,
  };
}

const tierFor = (value: number, thresholds: readonly number[]): TierLevel =>
  thresholds.filter((t) => value >= t).length as TierLevel;

/** The tiers a full window earns; none below `TUNING.tierWindow` casts (M10, M11). */
export function windowTiers(recent: readonly CastSample[]): Tiers {
  if (recent.length < TUNING.tierWindow) return { economy: 0, reliability: 0 };
  const last = recent.slice(-TUNING.tierWindow);
  return {
    economy: tierFor(economyOf(last), TUNING.economyTiers),
    reliability: tierFor(reliabilityOf(last), TUNING.reliabilityTiers),
  };
}

/** Σ harm ÷ Σ cost over the samples (M9); 0 for none. */
export function economyOf(recent: readonly CastSample[]): number {
  const cost = recent.reduce((sum, s) => sum + s.cost, 0);
  return cost > 0 ? recent.reduce((sum, s) => sum + s.harm, 0) / cost : 0;
}

/** The share of meaningful samples, 0–1 (M6); 0 for none. */
export function reliabilityOf(recent: readonly CastSample[]): number {
  return recent.length > 0 ? recent.filter((s) => s.meaningful).length / recent.length : 0;
}

/** What a record's best tiers earn (M12): one ink per Economy tier, the extra exit at silver, a second parameter at gold. */
export function rewardsOf(record: GlyphRecord): GlyphRewards {
  const { economy, reliability } = record.best;
  return {
    discount: economy,
    extraExit: reliability >= 2,
    params: reliability >= 3 ? TUNING.paramSlotsGold : TUNING.paramSlots,
  };
}

/** Folds a trip battle's Glyph casts into the profile's records (M7). Only `glyphRecords` changes. */
export function recordGlyphCasts(p: Profile, events: EventLog): Profile {
  const casts = glyphSamples(events, p);
  if (casts.length === 0) return p;
  const glyphRecords = { ...p.glyphRecords };
  for (const c of casts) {
    const k = versionKey(c.glyph, c.version);
    glyphRecords[k] = foldRecord(glyphRecords[k] ?? emptyRecord(), c.sample, c.fired);
  }
  return { ...p, glyphRecords };
}

/** Tiers that rose between two profiles' records, current versions only, in Glyph order (M16). */
export function tierUps(
  before: Pick<Profile, 'glyphs' | 'glyphRecords'>,
  after: Pick<Profile, 'glyphs' | 'glyphRecords'>,
): TierUp[] {
  const ups: TierUp[] = [];
  for (const g of after.glyphs) {
    const was = recordOf(before, g.id, g.version).best;
    const now = recordOf(after, g.id, g.version).best;
    for (const metric of ['economy', 'reliability'] as const) {
      if (now[metric] > was[metric]) {
        ups.push({ glyph: g.id, name: g.name, version: g.version, metric, tier: now[metric] });
      }
    }
  }
  return ups;
}

/** Local cells with no fire after `TUNING.deadAfterCasts` casts of this version (M13). */
export function deadCells(def: GlyphDef, record: GlyphRecord): Coord[] {
  if (record.casts < TUNING.deadAfterCasts) return [];
  return def.cells.filter((c) => !record.fired[key(c.at)]).map((c) => ({ x: c.at.x, y: c.at.y }));
}

/**
 * Local cell keys of `glyph` that fired anywhere in `events` (the desk's playback, U5): from the
 * spans of every non-echo cast. Auras aren't listed: the log doesn't know the Glyph's inside.
 */
export function innerFired(events: EventLog, glyph: GlyphId): CellKey[] {
  const out = new Set<CellKey>();
  for (const e of events) {
    if (e.type !== 'trace') continue;
    for (const span of e.spans) {
      if (span.glyph === glyph) for (const c of localCells(span)) out.add(key(c));
    }
  }
  return [...out];
}
