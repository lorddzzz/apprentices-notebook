import { DISTRICT_IDS, DISTRICTS, type DistrictDef, type DistrictId, RUNES } from '$data';
import { type DistrictState, districtState, type Profile } from '$engine';

/** One district as the sketch map draws it (design §1). Unheard districts have no node. */
export interface MapNode {
  id: DistrictId;
  state: Exclude<DistrictState, 'unheard'>;
  name: string;
  x: number;
  y: number;
  line: string; // the owner's line, once heard
  barred: string; // how the way is barred; empty when open
  material: string;
  guild: string;
  fresh: boolean; // heard since the map was last seen: new ink
  heart: boolean; // heart cleared: a small mark
  burntGate: boolean; // threshold solved: a burnt gate
  tryLock: boolean; // heard, with a threshold gate to try
}

type Table = Readonly<Record<DistrictId, DistrictDef>>;

export function mapNode(p: Profile, id: DistrictId, table: Table = DISTRICTS): MapNode | null {
  const state = districtState(p, id);
  if (state === 'unheard') return null;
  const d = table[id];
  return {
    id,
    state,
    name: d.name,
    x: d.map.x,
    y: d.map.y,
    line: d.line,
    barred: state === 'open' ? '' : d.barred,
    material: RUNES[d.material].name,
    guild: d.guild,
    fresh: p.city.fresh.includes(id),
    heart: p.city.hearts.includes(id),
    burntGate: p.city.solved.includes(id),
    tryLock: state === 'heard' && d.gate.kind === 'threshold',
  };
}

/** The nodes to draw: every heard or open district, in id order. Unheard ones stay blank paper. */
export function mapNodes(p: Profile, table: Table = DISTRICTS): MapNode[] {
  return DISTRICT_IDS.flatMap((id) => {
    const n = mapNode(p, id, table);
    return n ? [n] : [];
  });
}

/** Ink lines run from the Seam to each other drawn district. */
export function mapPaths(
  nodes: readonly MapNode[],
): { id: DistrictId; from: MapNode; to: MapNode }[] {
  const seam = nodes.find((n) => n.id === 'seam');
  if (!seam) return [];
  return nodes.filter((n) => n.id !== 'seam').map((n) => ({ id: n.id, from: seam, to: n }));
}

/** The small caption under a node's name. */
export function nodeTag(n: MapNode): string {
  return [n.material, n.guild].filter(Boolean).join(' · ');
}
