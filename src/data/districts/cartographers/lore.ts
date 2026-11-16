import type { KitRoomDef, PaperDef } from '../index';

/**
 * The Cartographers' lore (cartographers-plan P17), physical and filed like the other districts'
 * papers: winning the room whose `lore` names it files the paper at once, and the codex shows it
 * under "The academy". The registry waits in room 2, the owner's desk in room 5's back hall and
 * the struck name in the heart room (the Registrar's fall), which also carries the door line on the
 * heart's clear, "Below the Seam, a lock turns." (P18: the lower Seam's door reads
 * `city.hearts`; the paper is only the line). *The bad join* is filed by room 4 (the first room past
 * the quiet doorway): one room files one paper and the heart's is the struck name, so the join
 * takes the room before the owner's desk, and the final run reads registry, bad join, desk, name.
 */
const paper = (
  id: string,
  title: string,
  text: string,
  found: PaperDef['found'],
  hand = 'The guild',
): PaperDef => ({
  id: `cartographers:${id}`,
  district: 'cartographers',
  title,
  hand,
  text,
  group: 'The academy',
  found,
});

export const CARTOGRAPHERS_PAPERS: readonly PaperDef[] = [
  paper(
    'registry',
    'The registry',
    'Names in columns, each struck through in a neater hand than the one that wrote it. Against the last line, in pencil: not yet ruled. The drawer under it will not close, and the ledger will not say who is meant to keep it.',
    { kind: 'room', room: 1 },
  ),
  paper(
    'ownersDesk',
    "The owner's desk",
    'A desk in the back hall that nobody dared clear. The blotter is a half-drawn street that stops at a join. One note in a younger hand: the pieces do not meet. Somebody has to hold them. Expelled for the knowing, not the drawing.',
    { kind: 'room', room: 4 },
    'The owner',
  ),
  paper(
    'struckName',
    'The struck name',
    'The Registrar lowers his pen. The last name in the register is a pupil who found the join and drew into it. The stroke through it was never finished, so the name was never quite gone. Below the Seam, a lock turns.',
    { kind: 'heart' },
  ),
  paper(
    'badJoin',
    'The bad join',
    'Where the canals, the quarter and the baths were pieced together, the guild joined them badly, and nothing anchors a join: no lamps, no bell, nothing to hold it still. That is the Seam. The owner went in to keep it, and the keeping drew a real place on the paper.',
    { kind: 'room', room: 3 },
  ),
];

/** The rooms whose win files a paper: the registry (room 2), the owner's desk (room 5), the heart. */
const LORE_BY_ROOM: Readonly<Record<number, string>> = {
  1: 'cartographers:registry',
  3: 'cartographers:badJoin',
  4: 'cartographers:ownersDesk',
  5: 'cartographers:struckName',
};

/** Names the rooms' papers in place, so the district's rooms stay the one `CARTOGRAPHERS_ROOMS` array. */
export const withLore = (rooms: readonly KitRoomDef[]): readonly KitRoomDef[] => {
  rooms.forEach((r, i) => {
    const lore = LORE_BY_ROOM[i];
    if (lore) Object.assign(r, { lore });
  });
  return rooms;
};
