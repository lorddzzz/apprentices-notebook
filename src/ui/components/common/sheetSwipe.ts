/** A downward drag on the sheet's handle or title row closes it when it is long, or short but quick. */
export function swipeCloses(dy: number, ms: number, panelHeight: number): boolean {
  if (dy <= 0) return false;
  if (dy >= Math.min(120, panelHeight * 0.3)) return true;
  return dy >= 40 && ms > 0 && dy / ms >= 0.5;
}
