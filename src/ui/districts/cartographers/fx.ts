import type { Coord } from '$engine';
import type { Fx, PaperWhat } from '../../../app/fx';

type Loose = { type: string; at?: Coord; data?: unknown };

const cellsOf = (v: unknown): Coord[] =>
  Array.isArray(v)
    ? v.flatMap((c) => {
        const r = c as { x?: unknown; y?: unknown } | null;
        return r && typeof r.x === 'number' && typeof r.y === 'number' ? [{ x: r.x, y: r.y }] : [];
      })
    : [];

const WHAT: Readonly<Record<string, PaperWhat>> = {
  'cartographers:inked': 'inked',
  'cartographers:rubbedOut': 'rubbed',
  'cartographers:undrawn': 'undrawn',
  'cartographers:drawnIn': 'drawnIn',
  'cartographers:circled': 'circled',
  'cartographers:trickObjectGone': 'lifted',
};

/**
 * The effects a cartographers event plays on the board (CG-12); null when the event is not the
 * hall's, so `fxFor` carries on. Each of the six events has its own animation (`PaperFx`): ink
 * soaks in, a tile is rubbed out, a drawing is undone, an outline fills with the foe, a circle is
 * drawn and closes. A lifted circle (an Erase on it) fades.
 */
export function cartographersFx(e: Loose): Fx[] | null {
  if (!e.type.startsWith('cartographers:')) return null;
  if (e.type === 'cartographers:struck') {
    const d = (e.data ?? {}) as { tiles?: unknown };
    return cellsOf(d.tiles).map((at): Fx => ({ kind: 'paper', at, what: 'struck' }));
  }
  const what = WHAT[e.type];
  return what && e.at ? [{ kind: 'paper', at: e.at, what }] : [];
}
