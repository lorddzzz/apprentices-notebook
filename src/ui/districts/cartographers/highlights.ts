import { type BattleState, type Coord, type EnemyUnit, findUnit } from '$engine';
import { tracerTether } from '$engine/districts/cartographers/foes';
import {
  GUILD_HAND_RULE_ID,
  type NoteCircle,
  SURVEYOR_BEHAVIOUR,
} from '$engine/districts/cartographers/types';
import type { Json } from '$engine/districts/types';
import type { DistrictHighlight, HighlightCtx } from '../logic';

/** Highlight keys, drawn by `CARTOGRAPHERS_UI.highlightArt`. */
export const CIRCLE = 'cartographers:circle';
export const LINK = 'cartographers:link';

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** The circles a mark's or the trick's data carries, read forgivingly. */
function circlesIn(data: unknown): { at: Coord; holder: string }[] {
  const raw = obj(data)?.circles;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    const o = obj(c);
    const at = obj(o?.at);
    const x = num(at?.x);
    const y = num(at?.y);
    return x !== null && y !== null && typeof o?.holder === 'string'
      ? [{ at: { x, y }, holder: o.holder }]
      : [];
  });
}

const posOf = (s: BattleState, id: string): Coord | null => {
  const u = findUnit(s, id);
  return u && u.hp > 0 && !u.out ? { ...u.pos } : null;
};

const living = (e: EnemyUnit): boolean => e.hp > 0 && !e.out;

/**
 * The Registrar's circles (his shown mark and his drawn state, holder a guild hand or himself) and
 * the household's (`GuildHandState.circles`, holder a party member), as one kind of mark. A holder
 * who has left the room draws no line.
 */
function circles(s: BattleState, out: DistrictHighlight[]): void {
  for (const e of s.units) {
    if (e.kind !== 'enemy' || e.rival?.rival !== 'registrar' || !living(e)) continue;
    const lists = [
      { state: 'shown', cs: circlesIn(e.rival.mark?.data) },
      { state: 'drawn', cs: circlesIn(e.rival.trick) },
    ];
    for (const { state, cs } of lists) {
      for (const c of cs) {
        const to = posOf(s, c.holder);
        out.push({
          kind: 'district',
          key: CIRCLE,
          at: c.at,
          ...(to ? { to } : {}),
          data: {
            source: 'registrar',
            state,
            holder: c.holder === e.id ? 'self' : 'hand',
          },
        });
      }
    }
  }
  const own = obj(s.rules?.[GUILD_HAND_RULE_ID]);
  const note = Array.isArray(own?.circles) ? (own.circles as readonly NoteCircle[]) : [];
  for (const c of note) {
    const to = posOf(s, c.holder);
    out.push({
      kind: 'district',
      key: CIRCLE,
      at: { x: c.at.x, y: c.at.y },
      ...(to ? { to } : {}),
      data: { source: 'note', state: 'drawn', holder: 'member' },
    });
  }
}

/** The Surveyor's named pair, and each Tracer's thread to its apprentice. */
function links(s: BattleState, out: DistrictHighlight[]): void {
  for (const e of s.units) {
    if (e.kind !== 'enemy' || !living(e)) continue;
    if (e.intent?.kind === 'behaviour' && e.intent.id === SURVEYOR_BEHAVIOUR) {
      const [a, b] = e.intent.telegraph.tiles;
      if (a && b) {
        out.push({
          kind: 'district',
          key: LINK,
          at: { ...a },
          to: { ...b },
          data: { kind: 'swap' },
        });
      }
    }
    if (e.def === 'tracer') {
      const m = tracerTether(s, e);
      if (m) {
        out.push({
          kind: 'district',
          key: LINK,
          at: { ...e.pos },
          to: { ...m.pos },
          data: { kind: 'tether' } satisfies Json,
        });
      }
    }
  }
}

/** The hall's board marks: circles with their holder lines, the swap pair and the tracer's tether. */
export function cartographersHighlights(ctx: HighlightCtx): DistrictHighlight[] {
  const out: DistrictHighlight[] = [];
  circles(ctx.intentState, out);
  links(ctx.intentState, out);
  return out;
}
