import type { VariantDef } from '../types';

/**
 * Batch `bridges` (plan BR-19a/b): the Structure runes Hold, Brink and Lay, the solvents Mortar and
 * Chalk, and the Chief Warden's note. Texts are the approved draft in
 * docs/design/footnotes-content/bridges.md (§8 review; P21–P23). Effects live in `runes/actions.ts`,
 * `runes/flow.ts`, `resolve.ts`, `mix.ts`, `push.ts`, `bursts.ts`, `inventions.ts`, `exposed.ts` and
 * `districts/bridges/{collapse,support,wear}.ts`, keyed by these ids. Every "say so at build" in the
 * draft's Combos is a clause in the text or a one-line comment at the engine site.
 *
 * `chalk-network-ring` (a network cut by a fall reaches from where the brass stood) is not here yet:
 * it needs the fallen brass tile kept across casts, and a core file can read bridges state only
 * through `districts/api`, which has no reader for it (reported with BR-19b).
 */
export const BRIDGES: readonly VariantDef[] = [
  // ── Hold: a held unit (level I and II) ──
  {
    id: 'hold-held-extend',
    subject: 'hold',
    slot: { line: 'hold:held', level: 1 },
    text: 'A second Hold on a held unit adds one turn: held through your turn after next.',
  },
  {
    id: 'hold-held-pass',
    subject: 'hold',
    slot: { line: 'hold:held', level: 1 },
    text: 'A second Hold on a held unit is not wasted: it passes to the nearest unit beside it, yours included, and the first is not held twice.',
  },
  {
    id: 'hold-held-exposed',
    subject: 'hold',
    slot: { line: 'hold:held', level: 2 },
    text: 'A unit held twice takes one step more from every hit until it is free.',
  },
  {
    id: 'hold-held-shake',
    subject: 'hold',
    slot: { line: 'hold:held', level: 2 },
    text: 'A unit held twice is freed at your next turn and cannot be held again for a round.',
  },
  // ── Hold: a cracked span (level I and II) ──
  {
    id: 'hold-cracked-lean',
    subject: 'hold',
    slot: { line: 'hold:cracked', level: 1 },
    text: 'Hold leans on the stone too: a cracked tile you hold waits one more dusk before it falls, once.',
  },
  {
    id: 'hold-cracked-pinned',
    subject: 'hold',
    slot: { line: 'hold:cracked', level: 1 },
    text: 'A unit held on a cracked span takes one step more from every hit until the fall.',
  },
  {
    id: 'hold-cracked-spare',
    subject: 'hold',
    slot: { line: 'hold:cracked', level: 2 },
    text: 'A member held on a cracked span is lowered onto the nearest standing tile at dusk instead of falling.',
  },
  {
    id: 'hold-cracked-knot',
    subject: 'hold',
    slot: { line: 'hold:cracked', level: 2 },
    text: 'Hold also holds the units beside the target on the same cracked span, yours included.',
  },
  // ── Hold: capstones ──
  {
    id: 'hold-cap-crush',
    subject: 'hold',
    slot: { capstone: true },
    text: 'When a unit you held falls with the stone, it also takes the fall as a crush: a minion is gone either way, an elite takes the crush on top of the drop damage.',
  },
  {
    id: 'hold-cap-hang',
    subject: 'hold',
    slot: { capstone: true },
    text: 'When a unit you held would fall, it hangs instead: set on the nearest standing tile, held until your next turn.',
  },
  // ── Brink: a cracked span (level I and II) ──
  {
    id: 'brink-cracked-dusk',
    subject: 'brink',
    slot: { line: 'brink:cracked', level: 1 },
    text: 'Brink counts a cracked tile as an edge: it falls at dusk.',
  },
  {
    id: 'brink-cracked-half',
    subject: 'brink',
    slot: { line: 'brink:cracked', level: 1 },
    text: 'Beside a cracked tile Brink lets the rest through one step weaker.',
  },
  {
    id: 'brink-cracked-look',
    subject: 'brink',
    slot: { line: 'brink:cracked', level: 2 },
    text: 'A Brink that misses beside a cracked tile gives you a Guard of 1: you looked first.',
  },
  {
    id: 'brink-cracked-find',
    subject: 'brink',
    slot: { line: 'brink:cracked', level: 2 },
    text: 'A Brink that misses beside a cracked tile acts on the nearest unit within 2 that does stand at an edge, at full strength.',
  },
  // ── Brink: fallen span (level I and II) ──
  {
    id: 'brink-drop-near',
    subject: 'brink',
    slot: { line: 'brink:drop', level: 1 },
    text: 'Brink also counts the tiles diagonal to fog as beside it.',
  },
  {
    id: 'brink-drop-keen',
    subject: 'brink',
    slot: { line: 'brink:drop', level: 1 },
    text: 'Beside fog the rest is one step stronger.',
  },
  {
    id: 'brink-drop-stay',
    subject: 'brink',
    slot: { line: 'brink:drop', level: 2 },
    text: 'A foe struck beside fog is also held until your next turn.',
  },
  {
    id: 'brink-drop-nudge',
    subject: 'brink',
    slot: { line: 'brink:drop', level: 2 },
    text: 'The rest also pushes the target one tile toward the nearest fog tile.',
  },
  // ── Brink: capstones ──
  {
    id: 'brink-cap-fall',
    subject: 'brink',
    slot: { capstone: true },
    text: "When the target falls this dusk, Brink's rest acts once more on the tile it was standing on.",
  },
  {
    id: 'brink-cap-rim',
    subject: 'brink',
    slot: { capstone: true },
    text: "Brink never misses on the rim: the room's walls count as an edge for it.",
  },
  // ── Lay: a cracked span (level I and II) ──
  {
    id: 'lay-cracked-spent',
    subject: 'lay',
    slot: { line: 'lay:cracked', level: 1 },
    text: 'A plate or wall Lay sets on a cracked tile takes one hit more: it will not last, so it spends itself.',
  },
  {
    id: 'lay-cracked-both',
    subject: 'lay',
    slot: { line: 'lay:cracked', level: 1 },
    text: 'On a cracked tile Lay also sets a copy into the nearest standing tile.',
  },
  {
    id: 'lay-cracked-cloud',
    subject: 'lay',
    slot: { line: 'lay:cracked', level: 2 },
    text: 'A layer lost to the fall leaves a 1-round plain cloud on the nearest standing tile.',
  },
  {
    id: 'lay-cracked-last',
    subject: 'lay',
    slot: { line: 'lay:cracked', level: 2 },
    text: 'A layer lost to the fall acts once more on a unit that falls with it: a fire burns it, a brand cloud marks it, a scalding cloud scalds it.',
  },
  // ── Lay: capstones ──
  {
    id: 'lay-cap-footing',
    subject: 'lay',
    slot: { capstone: true },
    text: 'When Lay sets a plate into a span tile, the plate counts as a pier for that tile.',
  },
  {
    id: 'lay-cap-trail',
    subject: 'lay',
    slot: { capstone: true },
    text: 'When Lay sets a layer, it also sets a copy one round shorter into the tile behind the target.',
  },
  // ── Mortar: the unit (level I and II) ──
  {
    id: 'mortar-unit-rim',
    subject: 'mortar',
    slot: { line: 'mortar:unit', level: 1 },
    text: "Mortar's extra tile is dropped if it would carry a unit into fog: the push stops on the last stone.",
  },
  {
    id: 'mortar-unit-fall',
    subject: 'mortar',
    slot: { line: 'mortar:unit', level: 1 },
    text: 'A unit Mortar carries into the fog takes the fall one step harder.',
  },
  {
    id: 'mortar-unit-guard',
    subject: 'mortar',
    slot: { line: 'mortar:unit', level: 2 },
    text: 'A member of your party that Mortar pushes still goes the extra tile, and takes a Guard of 1 where it stops.',
  },
  {
    id: 'mortar-unit-behind',
    subject: 'mortar',
    slot: { line: 'mortar:unit', level: 2 },
    text: 'A Mortar’d push also pushes the unit behind the target one tile, plain.',
  },
  // ── Mortar: capstones ──
  {
    id: 'mortar-cap-set',
    subject: 'mortar',
    slot: { capstone: true },
    text: 'When a Mortar’d push ends on a chipped span tile, it sets the stone sound again.',
  },
  {
    id: 'mortar-cap-scatter',
    subject: 'mortar',
    slot: { capstone: true },
    text: 'When a Mortar’d push drops a unit into the fog, it also pushes each unit beside it one tile.',
  },
  // ── Chalk: the network (level I; level II is `chalk-network-kin`) ──
  {
    id: 'chalk-network-square',
    subject: 'chalk',
    slot: { line: 'chalk:network', level: 1 },
    text: "Chalk's reach counts diagonal tiles as one step.",
  },
  {
    id: 'chalk-network-end',
    subject: 'chalk',
    slot: { line: 'chalk:network', level: 1 },
    text: 'Chalk reaches one tile further past the brass at the last node as the cast began, the far end only.',
  },
  {
    id: 'chalk-network-kin',
    subject: 'chalk',
    slot: { line: 'chalk:network', level: 2 },
    text: "Chalk's extra reach passes over your own party.",
  },
  // ── Chalk: capstones ──
  {
    id: 'chalk-cap-circle',
    subject: 'chalk',
    slot: { capstone: true },
    text: 'When Chalk reaches a unit across fog, it reaches the units beside that unit too, one step weaker.',
  },
  {
    id: 'chalk-cap-line',
    subject: 'chalk',
    slot: { capstone: true },
    text: 'When a conducted action ends at brass, Chalk draws it on: the action runs once more from the next brass.',
  },
  // The Chief Warden's note (BR-20's rival, BR-19b's effect): hidden until his page is held.
  {
    id: 'chiefWarden:brink',
    subject: 'brink',
    slot: { line: 'brink:drop', level: 2 },
    text: 'A Warden does not fall off a bridge they walk. Any of yours beside the fog is passed over by Brink’s rest, and takes a Guard of 1 instead.',
    rival: 'chiefWarden',
    credit: "Copied from the Chief Warden's day-book.",
  },
];
