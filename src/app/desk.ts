import {
  capstoneKey,
  FOOTNOTES,
  type FootnoteKey,
  type FootnoteKind,
  type FootnoteSubject,
  footnoteKeyOf,
  LINES,
  type LineId,
  METHOD_IDS,
  METHODS,
  RUNE_IDS,
  RUNES,
  SOLVENT_IDS,
  SOLVENTS,
  type SolventId,
  subjectKind,
  VARIANTS,
  type VariantDef,
} from '$data';
import {
  type FootnoteError,
  type FootnoteOpts,
  footnoteCost,
  footnoteLevel,
  footnotePoints,
  homeDistrict,
  knowsSubject,
  type Profile,
  type SlotView,
  type Spend,
  slotsOf,
  writeFootnote,
} from '$engine';
import { lineText } from './bench';

/**
 * The footnote desk (design §8, footnotes.md §1, plan FN-4): pure views and the write reducer the
 * Desk screen shows. Subjects are runes, methods and solvents; each has a margin column of frames
 * that are filled, open or locked (P9). Writing is home-only (P10).
 */

/** Footnotes show in the Study once any known subject has earned points. */
export function deskUnlocked(p: Profile): boolean {
  return DESK_SUBJECTS.some((s) => knowsSubject(p, s) && footnotePoints(p, s) > 0);
}

const DESK_SUBJECTS: readonly FootnoteSubject[] = [...RUNE_IDS, ...METHOD_IDS, ...SOLVENT_IDS];

export const KIND_LABEL: Record<FootnoteKind, string> = {
  rune: 'Runes',
  method: 'Methods',
  solvent: 'Solvents',
};

export function subjectName(subject: FootnoteSubject): string {
  switch (subjectKind(subject)) {
    case 'rune':
      return RUNES[subject as keyof typeof RUNES].name;
    case 'method':
      return METHODS[subject as keyof typeof METHODS].name;
    case 'solvent':
      return SOLVENTS[subject as SolventId].name;
  }
}

export interface SubjectRow {
  subject: FootnoteSubject;
  kind: FootnoteKind;
  name: string;
  points: number;
  /** 0–3. */
  level: number;
  /** Points to the next level, or null at the top. */
  toNext: number | null;
  /** Frames you could write into now and have not. */
  open: number;
}

/** Known subjects that have points, runes then methods then solvents, most points first in each. */
export function deskRows(p: Profile, opts: FootnoteOpts = {}): SubjectRow[] {
  const kinds: FootnoteKind[] = ['rune', 'method', 'solvent'];
  return DESK_SUBJECTS.filter((s) => knowsSubject(p, s) && footnotePoints(p, s) > 0)
    .map((subject): SubjectRow => {
      const kind = subjectKind(subject);
      const points = footnotePoints(p, subject);
      const next = FOOTNOTES.levels[kind].find((t) => points < t);
      return {
        subject,
        kind,
        name: subjectName(subject),
        points,
        level: footnoteLevel(p, subject),
        toNext: next === undefined ? null : next - points,
        open: slotsOf(p, subject, opts).filter((s) => s.state === 'open').length,
      };
    })
    .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || b.points - a.points);
}

/** The rows grouped by kind, empty kinds left out. */
export function deskGroups(
  rows: readonly SubjectRow[],
): { kind: FootnoteKind; rows: SubjectRow[] }[] {
  return (['rune', 'method', 'solvent'] as const)
    .map((kind) => ({ kind, rows: rows.filter((r) => r.kind === kind) }))
    .filter((g) => g.rows.length > 0);
}

export interface VariantView {
  id: string;
  text: string;
  chosen: boolean;
  /** A rival's note: the margin credits its author. */
  credit: string | null;
}

/** One solvent a first write spends: `n` of it, with `count` held now. */
export interface SpendView {
  solvent: SolventId;
  name: string;
  n: number;
  count: number;
}

export type FrameState = 'filled' | 'open' | 'locked';

/** One frame of a margin: a line's level I or II slot, or the subject's capstone. */
export interface FrameView {
  key: FootnoteKey;
  /** 1, 2, or 3 for the capstone. */
  level: 1 | 2 | 3;
  state: FrameState;
  /** Points this level needs. */
  threshold: number;
  /** Points still missing (locked frames only), else 0. */
  missing: number;
  /** The two (or three) choices; empty while locked, since a locked margin has no text. */
  variants: VariantView[];
  /** What the first write spends; empty once written (re-picking is free) or when it can't be paid. */
  spends: SpendView[];
  /** Why a first write is not possible right now, in plain words. */
  blocked: string | null;
}

/** A witnessed margin line with its frames (level I, then II). */
export interface LineMargin {
  line: LineId;
  /** What the line reads as without a footnote. */
  current: string;
  frames: FrameView[];
}

export interface MarginView {
  lines: LineMargin[];
  capstone: FrameView | null;
}

const ROMAN = ['', 'I', 'II', 'III'];
export const levelNumeral = (level: number): string => ROMAN[level] ?? '';

const districtSolventNames = (district: string | undefined): string[] =>
  SOLVENT_IDS.filter((s) => SOLVENTS[s].district === district).map((s) => SOLVENTS[s].name);

/** What a first write needs, in plain words: "Needs Gallnut or Cinder", "Needs 2 of Gallnut or Cinder", "Needs Pitch and Wick". */
export function needsText(subject: FootnoteSubject, key: FootnoteKey): string {
  if (key === capstoneKey(subject)) {
    const names = districtSolventNames(homeDistrict(subject));
    return names.length === 0 ? 'Needs a solvent' : `Needs ${names.join(' and ')}, one each`;
  }
  const at = key.lastIndexOf('@');
  const line = key.slice(0, at);
  const level = Number(key.slice(at + 1));
  const names = districtSolventNames(LINES.find((l) => l.id === line)?.district);
  if (names.length === 0) return 'Needs a solvent';
  return `Needs ${level === 2 ? '2 of ' : ''}${names.join(' or ')}`;
}

/** "Spends 1 Gallnut", "Spends 2 Cinder", "Spends Pitch and Wick, one each". */
export function spendText(spends: readonly SpendView[]): string {
  if (spends.length === 0) return '';
  if (spends.every((s) => s.n === 1) && spends.length > 1) {
    return `Spends ${spends.map((s) => s.name).join(' and ')}, one each`;
  }
  return `Spends ${spends.map((s) => `${s.n} ${s.name}`).join(' and ')}`;
}

const spendView = (p: Profile, { solvent, n }: Spend): SpendView => ({
  solvent,
  name: SOLVENTS[solvent].name,
  n,
  count: p.solvents[solvent],
});

function frameOf(p: Profile, subject: FootnoteSubject, slot: SlotView): FrameView {
  const cost = slot.state === 'locked' ? null : footnoteCost(p, subject, slot.key);
  const points = footnotePoints(p, subject);
  const variants = slot.options.map(
    (v: VariantDef): VariantView => ({
      id: v.id,
      text: v.text,
      chosen: slot.written === v.id,
      credit: v.rival === undefined ? null : (v.credit ?? null),
    }),
  );
  return {
    key: slot.key,
    level: slot.level,
    state: slot.state,
    threshold: slot.threshold,
    missing: slot.state === 'locked' ? Math.max(0, slot.threshold - points) : 0,
    variants,
    spends: (cost ?? []).map((s) => spendView(p, s)),
    blocked: slot.state === 'open' && cost === null ? needsText(subject, slot.key) : null,
  };
}

/** A subject's margin column: witnessed margin lines with their frames, then the capstone (P9). */
export function marginOf(
  p: Profile,
  subject: FootnoteSubject,
  opts: FootnoteOpts = {},
): MarginView {
  const lines: LineMargin[] = [];
  let capstone: FrameView | null = null;
  for (const slot of slotsOf(p, subject, opts)) {
    const frame = frameOf(p, subject, slot);
    if (slot.line === null) {
      capstone = frame;
      continue;
    }
    const at = lines.find((l) => l.line === slot.line);
    if (at) at.frames.push(frame);
    else lines.push({ line: slot.line, current: lineText(slot.line), frames: [frame] });
  }
  for (const l of lines) l.frames.sort((a, b) => a.level - b.level);
  return { lines, capstone };
}

export function footnoteErrorText(
  e: FootnoteError,
  subject: FootnoteSubject,
  key: FootnoteKey,
): string {
  if (e === 'noSolvent') return needsText(subject, key);
  if (e === 'notReached') return 'That margin is not yet within your reach.';
  if (e === 'notHeld') return "That note is in a rival's hand you do not hold.";
  return 'There is no such footnote.';
}

export const ROAD_REFUSAL = 'Footnotes are written at home, at the desk, not on the road.';

/** Where the household is: writing needs `atHome` (no trip open, P10). `opts` carries rival pages (FN-8). */
export interface WriteContext extends FootnoteOpts {
  atHome: boolean;
}

/** Writes or re-picks a variant; the error is already a friendly line. */
export function writeAt(
  p: Profile,
  subject: FootnoteSubject,
  variantId: string,
  ctx: WriteContext,
): { profile: Profile } | { error: string } {
  const { atHome, ...opts } = ctx;
  if (!atHome) return { error: ROAD_REFUSAL };
  const v = (opts.variants ?? VARIANTS).find((x) => x.id === variantId);
  if (!v || v.subject !== subject) return { error: 'There is no such footnote.' };
  const key = footnoteKeyOf(v);
  const r = writeFootnote(p, subject, key, variantId, opts);
  return 'error' in r ? { error: footnoteErrorText(r.error, subject, key) } : r;
}
