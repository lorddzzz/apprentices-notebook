import type { DistrictId } from '$data';
import { DISTRICT_KIT, type KitRoomDef, type PaperDef, type PaperId } from '$data/districts/index';
import type { Profile } from './types';

/**
 * The lore registry (district-kit §9): lamp-ledgers, bather's ledgers, letters. A paper is an
 * automatic find, not an offer: winning the room whose `lore` names it files it straight into
 * `Profile.papers`, so it costs no pick and a later wipe cannot lose it (DK-1: found order, kept
 * on a wipe). `kit` defaults to the districts' data (tests pass fixtures).
 */
export type PapersKit = Readonly<
  Partial<
    Record<
      DistrictId,
      { rooms?: readonly Pick<KitRoomDef, 'lore'>[]; papers?: readonly PaperDef[] }
    >
  >
>;

/** Every paper the districts define, by id. */
function defsOf(kit: PapersKit): Map<PaperId, PaperDef> {
  const defs = new Map<PaperId, PaperDef>();
  for (const d of Object.values(kit))
    for (const paper of d?.papers ?? []) defs.set(paper.id, paper);
  return defs;
}

/** The paper lying in this room of the district, if it defines one. */
export function paperIn(
  district: DistrictId,
  room: number,
  kit: PapersKit = DISTRICT_KIT,
): PaperDef | null {
  const id = kit[district]?.rooms?.[room]?.lore;
  return (id && defsOf(kit).get(id)) || null;
}

/** A won room: its paper joins the end of `papers` unless already found. Same profile otherwise. */
export function findPaper(
  p: Profile,
  district: DistrictId,
  room: number,
  kit: PapersKit = DISTRICT_KIT,
): Profile {
  const paper = paperIn(district, room, kit);
  if (!paper || p.papers.includes(paper.id)) return p;
  return { ...p, papers: [...p.papers, paper.id] };
}

export interface PaperGroup {
  group: string;
  papers: PaperDef[];
}

/**
 * The codex "Papers" page: groups in the order their first paper was found, papers in found order
 * inside each. An id no district defines any more (lore cut in a later build) is skipped.
 */
export function papersView(
  p: Pick<Profile, 'papers'>,
  kit: PapersKit = DISTRICT_KIT,
): PaperGroup[] {
  const defs = defsOf(kit);
  const groups: PaperGroup[] = [];
  for (const id of p.papers) {
    const paper = defs.get(id);
    if (!paper) continue;
    const g = groups.find((x) => x.group === paper.group);
    if (g) g.papers.push(paper);
    else groups.push({ group: paper.group, papers: [paper] });
  }
  return groups;
}
