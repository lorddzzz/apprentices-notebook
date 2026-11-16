import { CARTOGRAPHERS_ROOMS } from '$data/districts/cartographers/rooms';
import { type BoardSpec, parseBoard } from '../../notation';
import { createRng, deriveSeed } from '../../rng';
import type { BattleState } from '../../types';
import { bare, cellIndex, type Placement, placeFrame, placementsFrom } from '../frame';
import type { BotTerms, HeartSetup } from '../types';
import { guildHandPreview } from './guildHand';
import { GUILD_HAND_RULE_ID, PENCIL_PIECE } from './types';

/**
 * The Cartographers' heart frame (CG-10; cartographers-plan P4, P13) and the bot's term. The frame
 * reads the Registrar, his Tracer and the outlines off the authored heart's first layout and
 * sets them on any board of an allowed size through `frame.ts`'s `placeFrame`, salt 7160 (the next
 * free heart salt after 7100-7150); a seeded scatter of unplanned pencil covers about two in five
 * of the tiles above the bottom two rows (kept bare for the start points). The hand's own rule is the district's; the pencil
 * config is the heart room's (`ROOM_PENCIL`), read when a trip lists the rule.
 */

const SALT = 7160;

/** Read from the authored heart on first use: the notation parser is not ready at module load. */
let source: Placement[] | null = null;
function sourceOfHeart(): Placement[] {
  if (source) return source;
  const layout = CARTOGRAPHERS_ROOMS.find((r) => r.heart)?.variants[0]?.layout;
  if (!layout) throw new Error('the cartographers have no authored heart');
  const placements = placementsFrom(parseBoard(layout));
  if (!placements[0]?.token.startsWith('Y'))
    throw new Error('the cartographers heart has no Registrar');
  // The units and outlines settle by placement; pencil is scattered and blank paper (no tile,
  // it would cut a small room in two) is left out.
  source = placements.filter((p) => !p.token.includes('{pencil}') && !p.token.includes('{blank}'));
  return source;
}

const PENCIL_SHARE = 0.4;

function scatterPencil(out: BoardSpec, seed: number): void {
  const rng = createRng(deriveSeed(seed, SALT + 1));
  for (let y = 0; y < out.height - 2; y++) {
    for (let x = 0; x < out.width; x++) {
      const tile = out.tiles[cellIndex(out, { x, y })];
      if (!tile || !bare(out, { x, y }) || rng.next() >= PENCIL_SHARE) continue;
      tile.piece = { id: PENCIL_PIECE, data: { fate: null, due: null } };
    }
  }
}

export const cartographersHeartFrame = (board: BoardSpec, seed: number): BoardSpec =>
  placeFrame(board, seed, SALT, sourceOfHeart(), (out) => scatterPencil(out, seed));

export const CARTOGRAPHERS_HEART_SETUP: HeartSetup = {
  foe: 'registrar',
  rules: [GUILD_HAND_RULE_ID],
  frame: cartographersHeartFrame,
};

/**
 * What the pencil about to be rubbed out is worth at round end: a living foe standing on it is
 * lost to the paper (it counts for the party), a party member standing on it is erased (never end
 * a turn there). 0 on a board without the hand.
 */
function rubTerm(s: BattleState): number {
  const own = s.rules?.[GUILD_HAND_RULE_ID];
  if (!own) return 0;
  let v = 0;
  for (const shape of guildHandPreview(s, own)) {
    if (shape.kind !== 'tile' || shape.tone !== 'erased') continue;
    for (const u of s.units) {
      if (u.bystander || u.hp <= 0 || u.out) continue;
      if (u.pos.x !== shape.at.x || u.pos.y !== shape.at.y) continue;
      if (u.kind === 'enemy') v += 10 * Math.min(2, u.hp);
      else v -= 100 * Math.min(2, u.hp);
    }
  }
  return v;
}

export const CARTOGRAPHERS_BOT: BotTerms = { value: rubTerm };
