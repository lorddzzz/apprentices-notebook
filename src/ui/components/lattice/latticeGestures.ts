import type { Coord } from '$engine';
import { parseLatticeKey } from '$engine';
import { editCell, panView, screenToCell, type ViewTransform } from '../../../app/latticeViewport';
import type { LatticePanOptions } from '../../attach/latticePan';

/**
 * What a pan / tap / hold / keyboard activation does on the paper, kept apart from the component
 * so a test can drive the real handlers. Editing gestures are frozen as built: a tap or keyboard
 * activation in Fit mode zooms to that region (navigation, allowed read-only); at edit scale it
 * reaches the socket; a hold reaches the socket only at edit scale. `readonly` cuts the socket
 * paths only: pan, Fit, scale and region zoom still work.
 */
export interface GestureDeps {
  readonly: () => boolean;
  view: () => ViewTransform;
  size: () => { width: number; height: number };
  update: (next: ViewTransform) => void;
  /** Client point to surface-local point. */
  point: (client: Coord) => Coord;
  /** The `data-at` cell under a client point (Fit mode hit test), if any. */
  hit: (client: Coord) => string | null;
  onCellTap: (at: Coord) => void;
  onCellHold: (at: Coord) => void;
}

export interface LatticeGestures {
  /** Tap on a cell button or keyboard activation. */
  activate: (at: Coord) => void;
  options: LatticePanOptions;
}

export function latticeGestures(deps: GestureDeps): LatticeGestures {
  const activate = (at: Coord): void => {
    const view = deps.view();
    if (view.mode === 'fit') deps.update(editCell(at, deps.size()));
    else if (!deps.readonly()) deps.onCellTap(at);
  };
  const options: LatticePanOptions = {
    onPan: (delta) => deps.update(panView(deps.view(), delta)),
    onTap: (client) => {
      const view = deps.view();
      const hit = view.mode === 'fit' ? deps.hit(client) : null;
      activate(hit ? parseLatticeKey(hit) : screenToCell(view, deps.point(client)));
    },
    onHold: (client) => {
      const view = deps.view();
      if (!deps.readonly() && view.mode === 'edit')
        deps.onCellHold(screenToCell(view, deps.point(client)));
    },
  };
  return { activate, options };
}
