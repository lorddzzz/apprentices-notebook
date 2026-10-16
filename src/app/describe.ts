import {
  ATTACKS,
  CODEX,
  DISTRICTS,
  DRAFTS,
  ENCOUNTERS,
  ENEMIES,
  type InteractionId,
  MEMBERS,
  RUNES,
  SOLVENTS,
  TUNING,
} from '$data';
import {
  type Action,
  type Aim,
  type BattleState,
  type Coord,
  canUndoMove,
  castableSpells,
  type EnemyUnit,
  findUnit,
  type GameEvent,
  intentPreview,
  type LootItem,
  label,
  legalMoves,
  livingUnits,
  type MemberUnit,
  members,
  shoveDirs,
  spellOf,
  step,
  type Tile,
  tileAt,
  type Unit,
  unitAt,
} from '$engine';
import type { InputMode } from './battleInput';

/** UI wording: captions, inspect lines, preview summaries. Plain functions, tested. */

const ORDINALS = ['1st', '2nd', '3rd'];
export const ordinal = (n: number): string => ORDINALS[n - 1] ?? `${n}th`;

/** "rat C2" for enemies, "Stoker" for members (short form for captions). */
export function shortName(u: Unit): string {
  return u.kind === 'member' ? u.name : `${u.name} ${label(u.pos)}`;
}

export function tileLine(tile: Tile, at: Coord): string {
  const rounds = (n: number): string => `${n} ${n === 1 ? 'round' : 'rounds'}`;
  const parts: string[] = [];
  if (tile.plate)
    parts.push(tile.plateRounds > 0 ? `brass plate (${rounds(tile.plateRounds)})` : 'brass plate');
  if (tile.vent) parts.push('steam vent');
  if (tile.fire > 0) parts.push(`burning oil (${rounds(tile.fire)})`);
  else if (tile.oil) parts.push('oil');
  if (tile.ink) parts.push('ink puddle');
  if (tile.steam > 0) parts.push(`steam (${rounds(tile.steam)})`);
  return `${label(at)}: ${parts.length ? parts.join(', ') : 'bare floor'}`;
}

function intentPhrase(s: BattleState, e: EnemyUnit): string {
  if (!e.intent) return 'waiting';
  if (e.intent.kind === 'summon')
    return `calls a moth at ${label(e.intent.at)} (${ordinal(e.intent.order)})`;
  if (e.intent.kind === 'flare') return `flares every moth (${ordinal(e.intent.order)})`;
  const verb = ATTACKS[e.intent.attack].verbs;
  const preview = intentPreview(s, e);
  const victim = preview?.hit ? unitAt(s, preview.hit) : null;
  const target = victim ? `, hits ${shortName(victim)}` : ', hits nothing yet';
  return `${verb} ${e.intent.dir} (${ordinal(e.intent.order)})${target}`;
}

/**
 * What makes a unit special, with the effect spelled out: `oil-soaked (fire +1)`. Members list
 * their affinity. Inked and coated states count, since they change what spells do to it.
 */
export function unitTraits(
  u: Pick<Unit, 'kind' | 'def' | 'inked' | 'brass' | 'oilSoaked'> & { branded?: boolean },
): string[] {
  const out: string[] = [];
  if (u.inked) out.push(`inked (+${TUNING.inkedBonus} damage taken)`);
  if (u.brass) out.push('brass (conducts spark)');
  if (u.oilSoaked) out.push(`oil-soaked (fire +${TUNING.oilSoakedBonus})`);
  if (u.branded) out.push(`branded (fire +${TUNING.brandedBonus})`);
  if (u.kind === 'enemy') {
    const def = ENEMIES[u.def as keyof typeof ENEMIES];
    if (def.oilTrail) out.push('leaves an oil trail');
    if (def.attack && ATTACKS[def.attack].inks) out.push('its spit inks');
  } else {
    const aff = MEMBERS[u.def as keyof typeof MEMBERS].affinity;
    if (aff.length)
      out.push(`${aff.map((m) => RUNES[m].name).join(' and ')} runes +${TUNING.affinityBonus}`);
  }
  return out;
}

/** Inspect line: `rat C2 · 2/2 HP · oil-soaked (fire +1) · bites right (2nd), hits Stoker`. */
export function unitLine(s: BattleState, u: Unit): string {
  const bits = [shortName(u), `${u.hp}/${u.maxHp} HP`];
  if (u.shield > 0) bits.push(`shield ${u.shield}`);
  bits.push(...unitTraits(u));
  const tile = tileAt(s, u.pos);
  if (tile.steam > 0) bits.push('in steam');
  if (tile.fire > 0) bits.push('on fire');
  else if (tile.oil) bits.push('on oil');
  if (u.kind === 'enemy') bits.push(intentPhrase(s, u));
  return bits.join(' · ');
}

export function aimText(s: BattleState, aim: Aim): string {
  switch (aim.kind) {
    case 'dir':
      return aim.dir;
    case 'tile':
      return `at ${label(aim.at)}`;
    case 'ally': {
      const u = findUnit(s, aim.unit);
      return `on ${u ? u.name : aim.unit}`;
    }
  }
}

/** Short name of an action for buttons: "Bolt right", "Shove rat right". */
export function actionLabel(s: BattleState, a: Action): string {
  switch (a.type) {
    case 'cast': {
      const m = findUnit(s, a.unit);
      const spell = m?.kind === 'member' ? spellOf(m, a.spell) : null;
      return `${spell ? RUNES[spell.source].name : 'Spell'} ${aimText(s, a.aim)}`;
    }
    case 'shove': {
      const m = findUnit(s, a.unit);
      const t = m ? unitAt(s, step(m.pos, a.dir)) : null;
      return t ? `Shove ${t.name} ${a.dir}` : `Shove ${a.dir}`;
    }
    case 'move':
      return `Move to ${label(a.to)}`;
    case 'undoMove':
      return 'Undo move';
    case 'endTurn':
      return 'End turn';
  }
}

/** How a known interaction reads in a preview; unknown ones stay `???` (pillar: find it by playing). */
const INTERACTION_WORDS: Record<InteractionId, string> = {
  ignite: 'oil ignites',
  conduct: 'spark conducts',
  arc: 'spark arcs',
  detonate: 'ink detonates',
  extinguish: 'fire doused',
  slide: 'slides on oil',
  diffuse: 'ink diffuses',
  heat: 'brass heats',
  stain: 'oil stains',
  drift: 'the current carries it',
};
const INTERACTION_OF: Partial<Record<GameEvent['type'], InteractionId>> = {
  ignite: 'ignite',
  conduct: 'conduct',
  arc: 'arc',
  detonate: 'detonate',
  extinguish: 'extinguish',
  slide: 'slide',
  diffuse: 'diffuse',
  heated: 'heat',
  stained: 'stain',
};

/** Plain material effects (not interactions): always named. */
const MATERIAL_WORDS: [GameEvent['type'], string][] = [
  ['puddle', 'ink pools'],
  ['oiled', 'oil spreads'],
  ['steam', 'steam rises'],
  ['plates', 'brass plate rises'],
];

export interface Outcome {
  /** HP actually lost per unit (shield absorption excluded, overkill included). */
  damage: Record<string, number>;
  kills: string[];
  shields: Record<string, number>;
  inked: string[];
}

export function outcomeOf(events: readonly GameEvent[]): Outcome {
  const damage: Record<string, number> = {};
  const shields: Record<string, number> = {};
  const kills: string[] = [];
  const inked: string[] = [];
  for (const e of events) {
    if (e.type === 'damage') damage[e.target.id] = (damage[e.target.id] ?? 0) + e.amount;
    else if (e.type === 'shieldAbsorbs') damage[e.unit.id] = (damage[e.unit.id] ?? 0) - e.absorbed;
    else if (e.type === 'shieldGained') shields[e.unit.id] = (shields[e.unit.id] ?? 0) + e.amount;
    else if (e.type === 'died' && !kills.includes(e.unit.id)) kills.push(e.unit.id);
    else if (e.type === 'inked' && !inked.includes(e.unit.id)) inked.push(e.unit.id);
  }
  return { damage, kills, shields, inked };
}

/**
 * One line for the caption before confirming: `Bolt right: rat C2 −2 dies, oil ignites`.
 * Interaction names appear only once discovered; unknown ones read `???`.
 */
export function previewSummary(
  before: BattleState,
  action: Action,
  events: readonly GameEvent[],
  known: readonly InteractionId[],
): string {
  const o = outcomeOf(events);
  const parts: string[] = [];
  const name = (id: string): string => {
    const u = findUnit(before, id);
    return u ? shortName(u) : id;
  };
  for (const u of before.units) {
    const hurt = o.damage[u.id];
    const dies = o.kills.includes(u.id);
    const shield = o.shields[u.id];
    const bits: string[] = [];
    if (hurt !== undefined) bits.push(hurt > 0 ? `−${hurt}` : 'blocked');
    if (dies) bits.push(u.kind === 'member' ? 'is down' : 'dies');
    if (shield) bits.push(`+${shield} shield`);
    if (o.inked.includes(u.id) && !dies) bits.push('inked');
    if (bits.length) parts.push(`${name(u.id)} ${bits.join(' ')}`);
  }
  for (const e of events) {
    if (e.type === 'pushed' && !events.some((x) => x.type === 'slide' && x.unit.id === e.unit.id)) {
      parts.push(`${name(e.unit.id)} to ${label(e.to)}`);
    }
    if (e.type === 'bump') parts.push(`bumps ${e.into}`);
  }
  const seen = new Set<InteractionId>();
  for (const e of events) {
    const id = INTERACTION_OF[e.type];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (!known.includes(id)) parts.push('???');
    else if (id === 'slide' && e.type === 'slide')
      parts.push(`${name(e.unit.id)} slides to ${label(e.to)}`);
    else parts.push(INTERACTION_WORDS[id]);
  }
  for (const [type, words] of MATERIAL_WORDS) {
    if (events.some((e) => e.type === type)) parts.push(words);
  }
  if (!parts.some((p) => p !== '???')) {
    const lands = events.find((e) => e.type === 'lands' || e.type === 'stopped');
    if (lands?.type === 'stopped') parts.unshift(`stopped by ${lands.by} at ${label(lands.at)}`);
    else if (lands?.type === 'lands') parts.unshift(`lands at ${label(lands.at)}`);
    if (parts.length === 0) parts.push('no effect');
  }
  return `${actionLabel(before, action)}: ${parts.join(', ')}`;
}

// ── Captions ────────────────────────────────────────────

function memberHint(s: BattleState, m: MemberUnit): string {
  const canMove = legalMoves(s, m.id).length > 0;
  const spells = castableSpells(s, m.id);
  const canCast = spells.some((sp) => sp.usable);
  const canShove = shoveDirs(s, m.id).length > 0;
  const undo = canUndoMove(s, m.id);
  if (!canMove && m.acted) {
    const next = members(s).find((o) => o.id !== m.id && o.hp > 0 && (!o.moved || !o.acted));
    return `${m.name} is done this turn. ${next ? `Tap ${next.name} or End turn.` : 'Tap End turn.'}`;
  }
  const acts: string[] = [];
  if (canMove) acts.push('tap a dot to move');
  if (canCast) acts.push('pick a spell');
  else if (!m.acted && spells.length && !canCast) acts.push('no charges left');
  if (canShove && !m.acted) acts.push('Shove');
  if (undo) acts.push('Undo move');
  if (acts.length === 0) return `${m.name}: nothing to do.`;
  const last = acts.pop();
  return `${m.name}: ${acts.length ? `${acts.join(', ')} or ${last}` : last}.`;
}

function aimHint(s: BattleState, mode: Extract<InputMode, { kind: 'aim' }>): string {
  const m = findUnit(s, mode.unit);
  const spell = m?.kind === 'member' ? spellOf(m, mode.spell) : null;
  if (!spell) return 'Pick a target.';
  const name = RUNES[spell.source].name;
  switch (spell.source) {
    case 'bolt':
    case 'quill':
      return `${name}: tap any tile in a lit line to aim it that way.`;
    case 'splash':
      return `${name}: tap a tile within 3 to burst there (3×3, hits allies too).`;
    case 'ward':
      return `${name}: tap ${m?.name ?? 'the caster'} or an adjacent ally to shield.`;
  }
}

export interface Caption {
  text: string;
  tone: 'hint' | 'event' | 'warn';
}

/** What a tap does right now. Every input mode has one. */
export function hintFor(mode: InputMode, s: BattleState): Caption {
  if (s.phase === 'won') return { text: 'The party wins.', tone: 'event' };
  if (s.phase === 'lost') return { text: 'The party is wiped out.', tone: 'event' };
  const note = 'note' in mode && mode.note ? mode.note : null;
  const withNote = (text: string): Caption =>
    note ? { text: `${note} ${text}`, tone: 'warn' } : { text, tone: 'hint' };
  switch (mode.kind) {
    case 'idle': {
      const ready = members(s).some((m) => m.hp > 0 && (!m.moved || !m.acted));
      return withNote(
        ready
          ? 'Tap a party member to act, or an enemy to read its intent.'
          : 'Everyone has acted. Tap End turn.',
      );
    }
    case 'member': {
      const m = findUnit(s, mode.unit);
      return withNote(m?.kind === 'member' ? memberHint(s, m) : 'Tap a party member.');
    }
    case 'aim':
      return withNote(aimHint(s, mode));
    case 'shove':
      return withNote('Shove: tap an adjacent unit to push it one tile.');
    case 'confirm':
      return { text: `${mode.preview.summary}. Tap again or Confirm.`, tone: 'hint' };
    case 'inspect': {
      const u = unitAt(s, mode.at);
      const tile = tileAt(s, mode.at);
      const text = u
        ? `${unitLine(s, u)}${tile.vent ? ' · on a vent' : ''}`
        : tileLine(tile, mode.at);
      return { text, tone: 'hint' };
    }
  }
}

/** Members whose tile an enemy attack would hit as things stand. */
export function threatenedMembers(s: BattleState): string[] {
  const out: string[] = [];
  for (const u of livingUnits(s)) {
    if (u.kind !== 'enemy') continue;
    const p = intentPreview(s, u);
    const victim = p?.hit ? unitAt(s, p.hit) : null;
    if (victim?.kind === 'member' && !out.includes(victim.id)) out.push(victim.id);
  }
  return out;
}

// ── Expedition wording ──

/** "Ignite" for the codex entry of an interaction. */
export function interactionTitle(id: InteractionId): string {
  return CODEX.find((e) => e.kind === 'interaction' && e.ref === id)?.title ?? id;
}

/** One line for a loot item: name, then what it does. */
export function lootLine(item: LootItem): { title: string; text: string } {
  switch (item.kind) {
    case 'rune':
      return { title: RUNES[item.rune].name, text: RUNES[item.rune].rule };
    case 'ink':
      return {
        title: `+${item.amount} ink`,
        text: `A bigger ink pot for the ${MEMBERS[item.member].name}.`,
      };
    case 'solvent':
      return { title: SOLVENTS[item.solvent].name, text: SOLVENTS[item.solvent].blurb };
    case 'vellum':
      return {
        title: `Vellum ×${item.amount}`,
        text: 'Fine skin for a fair copy. Compiling a proven pattern costs one sheet.',
      };
    case 'doorway':
      return {
        title: 'A quiet doorway',
        text: 'Somewhere to sit and rewire your lattices before going on.',
      };
    case 'draft':
      return {
        title: `An owner's draft: ${DRAFTS.find((d) => d.id === item.draft)?.name ?? 'a torn page'}`,
        text: 'A page the owner never got working. Mend it at the desk.',
      };
    case 'key':
      return {
        title: `A key to ${DISTRICTS[item.district].name}`,
        text: 'Bring it home and the way opens.',
      };
  }
}

/** A short label for a loot item where space is tight ("Bolt", "+2 ink"). */
export function lootName(item: LootItem): string {
  return lootLine(item).title;
}

/** "Three rats" for trip encounter `i`; the next one's title on the Push on button. */
export function encounterTitle(i: number): string {
  return ENCOUNTERS[i]?.title ?? 'The Seam';
}

/** "the flooded stair", "the Heart of the Seam": a place name inside a sentence. */
export function inSentence(place: string): string {
  return place.startsWith('The ') ? `the ${place.slice(4)}` : `the ${place}`;
}
