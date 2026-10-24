import {
  type CapstoneKey,
  capstoneKey,
  type DistrictId,
  FOOTNOTES,
  type FootnoteKey,
  type FootnoteSubject,
  footnoteKeyOf,
  isFootnoteSubject,
  LINES,
  type LineId,
  METHODS,
  type MethodId,
  RUNES,
  type RuneId,
  type SlotKey,
  type SlotLevel,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
  subjectKind,
  VARIANTS,
  type VariantDef,
  variantLevel,
  variantLine,
} from '$data';
import type { Ctx, FootnoteIds, FootnoteVariantId } from './ctx';
import type { EventLog } from './events';
import type { BattleState, FootnoteEntry, Profile, UnitId } from './types';

/** True when the household wrote this variant in its slot or capstone. Handlers name ids, never text. */
export function hasFootnote(ctx: Pick<Ctx, 'footnotes'>, id: FootnoteVariantId): boolean {
  const variant = VARIANTS.find((v) => v.id === id);
  return variant !== undefined && ctx.footnotes[footnoteKeyOf(variant)] === id;
}

/**
 * Footnotes (footnotes.md §1, plan FN P2/P3/P11): pure functions on the profile. `variants`
 * defaults to the content. Points are per subject (rune, method, solvent), household-wide; line
 * slots open at levels I and II on witnessed lines, the capstone at level III with no line.
 */

const EMPTY: FootnoteEntry = { points: 0, slots: {} };

/** What the write and view functions read besides the profile. */
export interface FootnoteOpts {
  variants?: readonly VariantDef[];
  /** True when the household holds that rival's page (RV); without it rival notes stay hidden. */
  holdsRivalPage?: (rival: NonNullable<VariantDef['rival']>) => boolean;
}

export function footnotePoints(p: Profile, subject: FootnoteSubject): number {
  return p.footnotes[subject]?.points ?? 0;
}

/** 0–3: how many of the subject's kind's thresholds its points have reached. */
export function footnoteLevel(p: Profile, subject: FootnoteSubject): number {
  const pts = footnotePoints(p, subject);
  return FOOTNOTES.levels[subjectKind(subject)].filter((t) => pts >= t).length;
}

/** The points the subject's level `level` (1–3) needs. */
export function footnoteThreshold(subject: FootnoteSubject, level: 1 | 2 | 3): number {
  return FOOTNOTES.levels[subjectKind(subject)][level - 1] ?? Number.POSITIVE_INFINITY;
}

/** A subject earns points once the household knows it: a known rune, a learned method, a found solvent. */
export function knowsSubject(p: Profile, subject: FootnoteSubject): boolean {
  switch (subjectKind(subject)) {
    case 'rune':
      return p.known.includes(subject as RuneId);
    case 'method':
      return p.methods.includes(subject as MethodId);
    case 'solvent':
      return p.solventsFound.includes(subject as SolventId);
  }
}

/**
 * One point per firing of a line, credited to the line's subject when it has a margin and is known
 * (P2: read from the line id alone). Trip fights only: the caller decides; the Bench and Lab never call it.
 */
export function awardFootnotePoints(p: Profile, firedLines: readonly LineId[]): Profile {
  const footnotes = { ...p.footnotes };
  for (const line of firedLines) {
    const subject = line.slice(0, line.indexOf(':'));
    if (!isFootnoteSubject(subject) || !knowsSubject(p, subject)) continue;
    const cur = footnotes[subject] ?? EMPTY;
    footnotes[subject] = { ...cur, points: cur.points + 1 };
  }
  return { ...p, footnotes };
}

/** The rival units of a battle: their casts (and their delayed effects) reveal lines but earn no points. */
export function rivalCasters(b: Pick<BattleState, 'units'>): ReadonlySet<UnitId> {
  return new Set(b.units.filter((u) => u.kind === 'enemy' && u.rival).map((u) => u.id));
}

/**
 * The firings that earn points: one per consecutive run of events with one line (not per tile),
 * leaving out events whose origin is a rival's cast. A rival's run breaks the household's.
 */
export function pointLines(log: EventLog, rivals: ReadonlySet<UnitId> = new Set()): LineId[] {
  const out: LineId[] = [];
  let last: string | undefined;
  for (const e of log) {
    if (!e.line) continue;
    const theirs = e.origin !== undefined && rivals.has(e.origin.caster);
    const key = theirs ? `rival|${e.line}` : e.line;
    if (key !== last && !theirs) out.push(e.line);
    last = key;
  }
  return out;
}

// ── Slots ───────────────────────────────────────────────

const shown = (v: VariantDef, opts: FootnoteOpts): boolean =>
  v.rival === undefined || (opts.holdsRivalPage?.(v.rival) ?? false);

/** The subject's authored variants a household can see (rival notes only with the page held). */
function variantsOf(subject: FootnoteSubject, opts: FootnoteOpts): VariantDef[] {
  return (opts.variants ?? VARIANTS).filter((v) => v.subject === subject && shown(v, opts));
}

export type SlotState = 'open' | 'filled' | 'locked';

/** One frame of a subject's margin (P9: witnessed margin lines and the capstone only). */
export interface SlotView {
  key: FootnoteKey;
  /** The line it sits on; null for the capstone. */
  line: LineId | null;
  level: 1 | 2 | 3;
  /** Points this level needs. */
  threshold: number;
  state: SlotState;
  /** The written variant's id, when filled. */
  written: string | null;
  /** The choices (empty while locked: a locked margin has no text). */
  options: VariantDef[];
}

/**
 * The subject's margin: per witnessed margin line its level I and II slots, then the capstone,
 * each open, filled or locked. A margin line is one with authored variants (P1).
 */
export function slotsOf(p: Profile, subject: FootnoteSubject, opts: FootnoteOpts = {}): SlotView[] {
  const level = footnoteLevel(p, subject);
  const entry = p.footnotes[subject] ?? EMPTY;
  const byKey = new Map<FootnoteKey, { line: LineId | null; level: 1 | 2 | 3; v: VariantDef[] }>();
  for (const v of variantsOf(subject, opts)) {
    const line = variantLine(v);
    if (line !== null && !p.witnessed.includes(line)) continue;
    const key = footnoteKeyOf(v);
    const slot = byKey.get(key) ?? { line, level: variantLevel(v), v: [] };
    slot.v.push(v);
    byKey.set(key, slot);
  }
  const views = [...byKey].map(([key, s]): SlotView => {
    const written = (s.line === null ? entry.capstone : entry.slots[key as SlotKey]) ?? null;
    const state: SlotState = s.level > level ? 'locked' : written ? 'filled' : 'open';
    return {
      key,
      line: s.line,
      level: s.level,
      threshold: footnoteThreshold(subject, s.level),
      state,
      written,
      options: state === 'locked' ? [] : s.v,
    };
  });
  // Lines in first-authored order, level I before II on each; the capstone last.
  return views.sort((a, b) => (a.line === null ? 1 : 0) - (b.line === null ? 1 : 0));
}

/** Variants on offer: every open or filled slot's choices for this subject (capstones included). */
export function footnoteOffers(
  p: Profile,
  subject: FootnoteSubject,
  variants: readonly VariantDef[] = VARIANTS,
  opts: Omit<FootnoteOpts, 'variants'> = {},
): VariantDef[] {
  return slotsOf(p, subject, { ...opts, variants }).flatMap((s) => s.options);
}

// ── Costs (P3) ──────────────────────────────────────────

export type FootnoteError = 'notReached' | 'unknownVariant' | 'noSolvent' | 'notHeld';

/** One solvent spent by a write. */
export interface Spend {
  solvent: SolventId;
  n: number;
}

const districtSolvents = (district: DistrictId | undefined): SolventId[] =>
  SOLVENT_IDS.filter((s) => SOLVENTS[s].district === district);

/** Where the subject comes from: its capstone costs one of each of that district's solvents. */
export function homeDistrict(subject: FootnoteSubject): DistrictId {
  switch (subjectKind(subject)) {
    case 'rune':
      return RUNES[subject as RuneId].district;
    case 'method':
      return METHODS[subject as MethodId].district;
    case 'solvent':
      return SOLVENTS[subject as SolventId].district;
  }
}

/** The district solvent the player holds most of (ties: first listed), or null when none. */
export function solventFor(p: Profile, line: LineId): SolventId | null {
  return mostHeld(p.solvents, districtSolvents(LINES.find((l) => l.id === line)?.district));
}

function mostHeld(held: Profile['solvents'], from: readonly SolventId[]): SolventId | null {
  return from
    .filter((s) => held[s] > 0)
    .reduce<SolventId | null>(
      (best, s) => (best === null || held[s] > held[best] ? s : best),
      null,
    );
}

/**
 * What writing into an empty slot spends: level I one solvent of the line's district, level II
 * two of them (any mix, most held first), the capstone one of each of the home district's.
 * `[]` once the slot is filled (re-picking is free); null when the household cannot pay.
 */
export function footnoteCost(
  p: Profile,
  subject: FootnoteSubject,
  key: FootnoteKey,
): Spend[] | null {
  const entry = p.footnotes[subject] ?? EMPTY;
  if (key === capstoneKey(subject)) {
    if (entry.capstone !== undefined) return [];
    const all = districtSolvents(homeDistrict(subject));
    return all.length > 0 && all.every((s) => p.solvents[s] > 0)
      ? all.map((solvent) => ({ solvent, n: 1 }))
      : null;
  }
  if (entry.slots[key as SlotKey] !== undefined) return [];
  const at = key.lastIndexOf('@');
  const line = key.slice(0, at) as LineId;
  const count = Number(key.slice(at + 1)) as SlotLevel;
  const from = districtSolvents(LINES.find((l) => l.id === line)?.district);
  const held = { ...p.solvents };
  const spent = new Map<SolventId, number>();
  for (let i = 0; i < count; i++) {
    const s = mostHeld(held, from);
    if (s === null) return null;
    held[s] -= 1;
    spent.set(s, (spent.get(s) ?? 0) + 1);
  }
  return [...spent].map(([solvent, n]) => ({ solvent, n }));
}

/**
 * Writes (or re-picks, free) a variant into its slot or capstone. Level I and II of a line are
 * independent (P11): writing one never clears the other.
 */
export function writeFootnote(
  p: Profile,
  subject: FootnoteSubject,
  key: FootnoteKey,
  variantId: string,
  opts: FootnoteOpts = {},
): { profile: Profile } | { error: FootnoteError } {
  const v = (opts.variants ?? VARIANTS).find((x) => x.id === variantId);
  if (!v || v.subject !== subject || footnoteKeyOf(v) !== key) return { error: 'unknownVariant' };
  if (!shown(v, opts)) return { error: 'notHeld' };
  const line = variantLine(v);
  if (
    variantLevel(v) > footnoteLevel(p, subject) ||
    (line !== null && !p.witnessed.includes(line))
  ) {
    return { error: 'notReached' };
  }
  const cost = footnoteCost(p, subject, key);
  if (cost === null) return { error: 'noSolvent' };
  const solvents = { ...p.solvents };
  for (const { solvent, n } of cost) solvents[solvent] -= n;
  const cur = p.footnotes[subject] ?? EMPTY;
  const entry: FootnoteEntry =
    line === null
      ? { ...cur, capstone: v.id }
      : { ...cur, slots: { ...cur.slots, [key as SlotKey]: v.id } };
  return { profile: { ...p, solvents, footnotes: { ...p.footnotes, [subject]: entry } } };
}

/** What `ctx.footnotes` holds: each written slot's and capstone's variant id (known variants only). */
export function footnoteIds(p: Profile, variants: readonly VariantDef[] = VARIANTS): FootnoteIds {
  const out: Partial<Record<FootnoteKey, FootnoteVariantId>> = {};
  for (const [subject, entry] of Object.entries(p.footnotes) as [
    FootnoteSubject,
    FootnoteEntry,
  ][]) {
    const written: [FootnoteKey, string | undefined][] = [
      ...(Object.entries(entry.slots) as [FootnoteKey, string][]),
      [capstoneKey(subject) as CapstoneKey, entry.capstone],
    ];
    for (const [key, id] of written) {
      const v = variants.find((x) => x.id === id);
      if (v && v.subject === subject && footnoteKeyOf(v) === key) out[key] = v.id;
    }
  }
  return out;
}
