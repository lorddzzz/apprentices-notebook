import type { Tone as BellTone } from '$data/districts/foundry';
import { isTone } from '$data/districts/foundry';
import type { Coord } from '$engine';
import type { Fx } from '../../../app/fx';

type Loose = { type: string; at?: Coord; data?: unknown };

const cells = (v: unknown): Coord[] =>
  Array.isArray(v)
    ? v.flatMap((c) => {
        const r = c as { x?: unknown; y?: unknown } | null;
        return r && typeof r.x === 'number' && typeof r.y === 'number' ? [{ x: r.x, y: r.y }] : [];
      })
    : [];

/**
 * The effects a foundry event plays on the board (BF-17); null when the event is not the
 * foundry's, so `fxOf` carries on. A ring spreads from every bell of its tone; a muffled strike and
 * a retune float a word over the bell; the Great Peal is a banner.
 */
export function foundryFx(e: Loose): Fx[] | null {
  const d = (e.data ?? {}) as { tone?: unknown; bells?: unknown; to?: unknown };
  switch (e.type) {
    case 'foundry:ring': {
      const at = cells(d.bells);
      return isTone(d.tone) && at.length > 0 ? [{ kind: 'ring', cells: at, bell: d.tone }] : [];
    }
    case 'foundry:muffled':
      return e.at ? [{ kind: 'float', at: e.at, text: 'muffled', tone: 'steam' }] : [];
    case 'foundry:retuned':
      return e.at && isTone(d.to)
        ? [{ kind: 'float', at: e.at, text: `to ${d.to satisfies BellTone}`, tone: 'brass' }]
        : [];
    case 'foundry:greatPeal':
      return [{ kind: 'banner', text: 'The Great Peal' }];
    default:
      return e.type.startsWith('foundry:') ? [] : null;
  }
}
