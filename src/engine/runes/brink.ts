import { ACTIONS } from '$data';
import { type Ctx, type FootnoteVariantId, withLine } from '../ctx';
import { gainShield } from '../damage';
import { byReadingOrder, type Coord, type Dir } from '../grid';
import { push } from '../push';
import { findUnit, inBoard, livingUnits, tileAt, unitAt } from '../queries';
import { whereIs } from '../targets';
import { type BattleState, type Flow, type Target, targetKey, type Unit } from '../types';
import { holdUnit } from './actions';
import { beside, type Trial } from './flow';

// ── Brink's footnotes (BR-19a) ──────────────────────────

/** The way from `from` toward the nearest fog tile within reach (orthogonal first, then reading order); null if none. */
export function fogWard(s: BattleState, from: Coord, diagonal: boolean): Dir | null {
  const cand: Coord[] = [];
  const fog = (c: Coord): boolean =>
    inBoard(s, c) ? tileAt(s, c).terrain.drop : s.edge === 'drop';
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const)
    if (fog({ x: from.x + dx, y: from.y + dy })) cand.push({ x: from.x + dx, y: from.y + dy });
  if (!cand.length && diagonal) {
    for (const dx of [-1, 1])
      for (const dy of [-1, 1]) {
        const c = { x: from.x + dx, y: from.y + dy };
        if (inBoard(s, c) && tileAt(s, c).terrain.drop) cand.push(c);
      }
  }
  const to = cand.sort(byReadingOrder)[0];
  if (!to) return null;
  const dx = to.x - from.x;
  // A diagonal fog tile is approached along the row first.
  return dx > 0 ? 'right' : dx < 0 ? 'left' : to.y > from.y ? 'down' : 'up';
}

/**
 * What the Brink footnotes change around one trigger step: `brink-cracked-look` and `-find` on a
 * miss beside a cracked tile (a find acts at full strength), `chiefWarden:brink` (a member of the
 * caster's party beside fog is passed over and guarded), the weaker or stronger rest (`half`,
 * `keen`), and `brink-drop-stay` and `-nudge` after the rest. Inert with none of them written.
 */
export function brinkOutcome(
  ctx: Ctx,
  flow: Flow,
  trials: readonly { t: Target; r: Trial }[],
  fn: (id: FootnoteVariantId) => boolean,
): {
  passedOver: Target[];
  found: Target[];
  afterVerdict: () => void;
  groups: (through: readonly Target[], flow: Flow) => { targets: Target[]; flow: Flow }[];
  after: ((through: readonly Target[]) => () => void) | null;
} {
  const s = ctx.s;
  const unitOf = (t: Target): Unit | null => {
    const at = whereIs(s, t);
    return t.kind === 'unit' ? (findUnit(s, t.unit) ?? null) : at ? unitAt(s, at) : null;
  };
  const guardUntil = s.round + 1;
  const passedOver = fn('chiefWarden:brink')
    ? trials.filter((x) => x.r.pass && x.r.line === 'brink:drop' && unitOf(x.t)?.kind === 'member')
    : [];
  const missed = trials.filter((x) => !x.r.pass && x.r.line === 'brink:cracked');
  const found: Target[] = [];
  const headings = new Map(flow.headings);
  if (fn('brink-cracked-find')) {
    for (const x of missed) {
      const here = whereIs(s, x.t);
      const self = unitOf(x.t);
      if (!here) continue;
      const near = livingUnits(s)
        .filter(
          (u) =>
            u.id !== self?.id &&
            !found.some((f) => f.kind === 'unit' && f.unit === u.id) &&
            Math.abs(u.pos.x - here.x) + Math.abs(u.pos.y - here.y) <= 2 &&
            beside(s, flow.snapshot, { kind: 'tile', at: u.pos }),
        )
        .sort(
          (a, b) =>
            Math.abs(a.pos.x - here.x) +
              Math.abs(a.pos.y - here.y) -
              (Math.abs(b.pos.x - here.x) + Math.abs(b.pos.y - here.y)) ||
            byReadingOrder(a.pos, b.pos),
        )[0];
      if (!near) continue;
      const nt: Target = { kind: 'unit', unit: near.id };
      found.push(nt);
      headings.set(targetKey(nt), flow.headings.get(targetKey(x.t)) ?? null);
    }
  }
  const stay = fn('brink-drop-stay');
  const nudge = fn('brink-drop-nudge');
  return {
    passedOver: passedOver.map((x) => x.t),
    found,
    afterVerdict: () => {
      if (fn('brink-cracked-look') && missed.length) {
        const caster = findUnit(s, flow.caster);
        if (caster) withLine(ctx, 'brink:cracked', () => gainShield(ctx, caster, 1, guardUntil));
      }
      for (const x of passedOver) {
        const u = unitOf(x.t);
        if (u) withLine(ctx, 'brink:drop', () => gainShield(ctx, u, 1, guardUntil));
      }
    },
    groups: (through, base) => {
      const out = new Map<number, Target[]>();
      const foundFlow: Flow = { ...base, headings };
      const plain: Target[] = [];
      for (const t of through) {
        if (found.includes(t)) continue;
        const w = trials.find((x) => x.t === t)?.r.weaker ?? 0;
        if (w === 0) plain.push(t);
        else out.set(w, [...(out.get(w) ?? []), t]);
      }
      const groups = [
        ...(plain.length ? [{ targets: plain, flow: base }] : []),
        ...[...out].map(([w, targets]) => ({
          targets,
          flow: { ...base, weaker: (base.weaker ?? 0) + w },
        })),
        ...(found.length ? [{ targets: found, flow: foundFlow }] : []),
      ];
      return groups.reverse(); // queued last-first, so the first group runs first
    },
    after:
      stay || nudge
        ? (through) => () => {
            for (const t of through) {
              if (trials.find((x) => x.t === t)?.r.line !== 'brink:drop') continue;
              const u = unitOf(t);
              if (!u || u.hp <= 0) continue;
              if (stay && u.kind === 'enemy') {
                withLine(ctx, 'brink:drop', () => holdUnit(ctx, u, ACTIONS.holdRounds));
              }
              // `brink-drop-near` + nudge: a diagonal target goes toward the nearest fog tile.
              const way = nudge ? fogWard(s, u.pos, fn('brink-drop-near')) : null;
              if (way) withLine(ctx, 'brink:drop', () => push(ctx, u, way, 1, flow.origin));
            }
          }
        : null,
  };
}
