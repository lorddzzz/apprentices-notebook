import {
  ATTACKS,
  CODEX,
  type CompoundId,
  DISTRICTS,
  ENEMIES,
  IDIOMS,
  MEMBERS,
  METHODS,
  RUNES,
  type RuneId,
  type SchoolId,
  SOLVENTS,
  type StateId,
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
  firstRune,
  type GameEvent,
  intentPreview,
  type Layer,
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
import { dryStrikeIntent, rivalVerb } from '$engine/rivals/resolve';
import type { InputMode } from './battleInput';

/** UI wording: captions, inspect lines, preview summaries. Plain functions, tested. */

const ORDINALS = ['1st', '2nd', '3rd'];
export const ordinal = (n: number): string => ORDINALS[n - 1] ?? `${n}th`;

/** "rat C2" for enemies, "Stoker" for members (short form for captions). */
export function shortName(u: Unit): string {
  return u.kind === 'member' ? u.name : `${u.name} ${label(u.pos)}`;
}

/** What a state or compound is called on the board and in the log. */
export const LAYER_NAME: Record<StateId | CompoundId, string> = {
  blot: 'ink blot',
  slick: 'oil slick',
  cloud: 'steam cloud',
  plate: 'brass plate',
  fire: 'fire',
  deepMark: 'deep mark',
  stain: 'stain',
  brandCloud: 'brand cloud',
  shackle: 'shackle',
  pool: 'pool',
  greaseFog: 'grease fog',
  skidPlate: 'skid plate',
  bank: 'bank',
  kettle: 'kettle',
  wall: 'wall',
};

const rounds = (n: number): string => `${n} ${n === 1 ? 'round' : 'rounds'}`;

const runeName = (r: string): string =>
  r.startsWith('inv:') ? r.slice(4) : (RUNES[r as RuneId]?.name ?? r);

/** "wall (2 rounds, 1 hit left)": a layer with what is left of it. */
function layerPhrase(layer: Layer): string {
  const bits: string[] = [];
  if (layer.rounds > 0 && !layer.set) bits.push(rounds(layer.rounds));
  if (layer.hits !== undefined)
    bits.push(`${layer.hits} ${layer.hits === 1 ? 'hit' : 'hits'} left`);
  const name = LAYER_NAME[layer.id];
  return bits.length ? `${name} (${bits.join(', ')})` : name;
}

export function tileLine(tile: Tile, at: Coord): string {
  const parts: string[] = [];
  if (tile.state) parts.push(layerPhrase(tile.state));
  if (tile.jar) {
    const first = firstRune(tile.jar.rest);
    const owner = tile.jar.owner.replace(/^./, (c) => c.toUpperCase());
    parts.push(
      `${owner}'s jar (opens ${tile.jar.event === 'step' ? 'on a step' : 'at dusk'}${first ? `, starts with ${runeName(first)}` : ''})`,
    );
  }
  if (tile.terrain.vent) parts.push('steam vent');
  if (tile.terrain.water) parts.push(`water flowing ${tile.terrain.water}`);
  if (tile.terrain.grate) parts.push('grate');
  if (tile.terrain.gate) parts.push('lock gate');
  if (tile.terrain.lamp) parts.push('lamp');
  if (tile.terrain.drop) parts.push('a drop');
  return `${label(at)}: ${parts.length ? parts.join(', ') : 'bare floor'}`;
}

function intentPhrase(s: BattleState, e: EnemyUnit): string {
  if (!e.intent) return 'waiting';
  if (e.intent.kind === 'summon')
    return `calls a moth at ${label(e.intent.at)} (${ordinal(e.intent.order)})`;
  if (e.intent.kind === 'flare') return `flares every moth (${ordinal(e.intent.order)})`;
  if (e.intent.kind === 'cast' || e.intent.kind === 'trick') {
    const fallback = e.intent.fallback ? `, or strikes ${label(e.intent.fallback)}` : '';
    return `will ${rivalVerb(e, e.intent)}${fallback} (${ordinal(e.intent.order)})`;
  }
  if (e.intent.kind === 'rivalStrike') {
    return `${ATTACKS[dryStrikeIntent(e, e.intent).attack].verbs} ${e.intent.dir} (${ordinal(e.intent.order)})`;
  }
  const verb = ATTACKS[e.intent.attack].verbs;
  const preview = intentPreview(s, e);
  const victim = preview?.hit ? unitAt(s, preview.hit) : null;
  const target = victim ? `, hits ${shortName(victim)}` : ', hits nothing yet';
  return `${verb} ${e.intent.dir} (${ordinal(e.intent.order)})${target}`;
}

export const SCHOOL_NAME: Record<SchoolId, string> = {
  seam: 'Seam',
  timing: 'Timing',
  contracts: 'Contracts',
  areas: 'Areas',
  structure: 'Structure',
  resonance: 'Resonance',
  board: 'Board',
};

/** What a unit carries that changes how spells treat it; works for engine units and board views. */
export interface TraitSource {
  kind: 'member' | 'enemy';
  def: string;
  mark: 'plain' | 'deep' | null;
  collar: boolean;
  shackle: boolean;
  held: boolean;
  stunned: boolean;
  /** The action a bound mark holds (Bind). */
  bound?: string | null;
}

export function traitSource(u: Unit): TraitSource {
  return {
    kind: u.kind,
    def: u.def,
    mark: u.mark ? (u.mark.deep ? 'deep' : 'plain') : null,
    collar: u.collar !== false,
    shackle: u.shackle > 0,
    held: u.held > 0,
    stunned: u.stunned,
    bound: u.mark?.bound?.action ?? null,
  };
}

/**
 * What makes a unit special, with the effect spelled out: `marked (a Spark bursts it for 3)`.
 * Members list their lean. Marks, collars and shackles count, since they change what spells do to it.
 */
export function unitTraits(u: TraitSource): string[] {
  const out: string[] = [];
  if (u.mark) {
    const bursts =
      u.mark === 'deep' ? 'deeply marked (two Sparks to clear)' : 'marked (a Spark bursts it)';
    out.push(u.bound ? `${bursts}, holding ${runeName(u.bound)} until its event` : bursts);
  }
  if (u.shackle) out.push('shackled (cannot move)');
  else if (u.collar) out.push('collared (conducts Spark)');
  if (u.held) out.push('held in place');
  if (u.stunned) out.push('stunned (skips its next action)');
  if (u.kind === 'enemy') {
    const def = ENEMIES[u.def as keyof typeof ENEMIES];
    if (def.oilTrail) out.push('leaves an oil trail');
    if (def.attack && ATTACKS[def.attack].inks) out.push('its spit inks');
  } else {
    const lean = MEMBERS[u.def as keyof typeof MEMBERS].lean;
    out.push(`trained in ${SCHOOL_NAME[lean.trained]}`);
    if (lean.gifted) out.push(`gifted in ${SCHOOL_NAME[lean.gifted]}`);
  }
  return out;
}

/** Inspect line: `rat C2 · 2/2 HP · oil-soaked (fire +1) · bites right (2nd), hits Stoker`. */
export function unitLine(s: BattleState, u: Unit): string {
  const bits = [shortName(u), `${u.hp}/${u.maxHp} HP`];
  if (u.shield > 0) bits.push(`shield ${u.shield}`);
  bits.push(...unitTraits(traitSource(u)));
  const tile = tileAt(s, u.pos);
  if (tile.state) bits.push(`in ${LAYER_NAME[tile.state.id]}`);
  if (u.kind === 'enemy') bits.push(intentPhrase(s, u));
  return bits.join(' · ');
}

export function aimText(aim: Aim): string {
  switch (aim.kind) {
    case 'dir':
      return aim.dir;
    case 'tile':
      return `at ${label(aim.at)}`;
    case 'self':
      return 'on yourself';
  }
}

/** Short name of an action for buttons: "Bolt right", "Shove rat right". */
export function actionLabel(s: BattleState, a: Action): string {
  switch (a.type) {
    case 'cast': {
      const m = findUnit(s, a.unit);
      const spell = m?.kind === 'member' ? spellOf(m, a.spell) : null;
      return `${spell ? RUNES[spell.source].name : 'Spell'} ${aimText(a.aim)}`;
    }
    case 'shove': {
      const m = findUnit(s, a.unit);
      const t = m ? unitAt(s, step(m.pos, a.dir)) : null;
      return t ? `Shove ${t.name} ${a.dir}` : `Shove ${a.dir}`;
    }
    case 'pull':
      return `Pull ${a.dir}`;
    case 'hop':
      return `Hop ${a.dir}`;
    case 'swap':
      return `Swap ${a.dir}`;
    case 'move':
      return `Move to ${label(a.to)}`;
    case 'undoMove':
      return 'Undo move';
    case 'endTurn':
      return 'End turn';
  }
}

export interface Outcome {
  /** HP actually lost per unit (shield absorption excluded, overkill included). */
  damage: Record<string, number>;
  kills: string[];
  shields: Record<string, number>;
  marked: string[];
}

export function outcomeOf(events: readonly GameEvent[]): Outcome {
  const damage: Record<string, number> = {};
  const shields: Record<string, number> = {};
  const kills: string[] = [];
  const marked: string[] = [];
  for (const e of events) {
    if (e.type === 'damage') damage[e.target.id] = (damage[e.target.id] ?? 0) + e.amount;
    else if (e.type === 'shieldAbsorbs') damage[e.unit.id] = (damage[e.unit.id] ?? 0) - e.absorbed;
    else if (e.type === 'shieldGained') shields[e.unit.id] = (shields[e.unit.id] ?? 0) + e.amount;
    else if (e.type === 'died' && !kills.includes(e.unit.id)) kills.push(e.unit.id);
    else if (e.type === 'marked' && !marked.includes(e.unit.id)) marked.push(e.unit.id);
  }
  return { damage, kills, shields, marked };
}

/**
 * One line for the caption before confirming: `Bolt right: rat C2 −2 dies`. It names damage,
 * kills, shields, marks and pushes of the events given (the witnessed part, D2); `masked` says
 * some events were left out.
 */
export function previewSummary(
  before: BattleState,
  action: Action,
  events: readonly GameEvent[],
  masked = false,
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
    if (o.marked.includes(u.id) && !dies) bits.push('marked');
    if (bits.length) parts.push(`${name(u.id)} ${bits.join(' ')}`);
  }
  for (const e of events) {
    if (e.type === 'push') parts.push(`${name(e.unit.id)} pushed ${e.dir}`);
  }
  if (parts.length === 0) {
    const lands = events.find((e) => e.type === 'lands' || e.type === 'stopped');
    if (lands?.type === 'stopped') parts.push(`stopped by ${lands.by} at ${label(lands.at)}`);
    else if (lands?.type === 'lands') parts.push(`lands at ${label(lands.at)}`);
    else {
      const aimed = events.find((e) => e.type === 'aimed');
      const at = aimed?.type === 'aimed' ? aimed.targets : [];
      const who = at.map((t) => (t.kind === 'unit' ? name(t.unit) : label(t.at)));
      if (who.length) parts.push(`aims at ${who.join(', ')}`);
      // A masked preview never says "no effect": that would hint at what the blank holds (D2).
      else if (!masked) parts.push('no effect');
    }
  }
  return parts.length
    ? `${actionLabel(before, action)}: ${parts.join(', ')}`
    : actionLabel(before, action);
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
      return `${name}: tap any tile in a lit line to aim it that way.`;
    case 'splash':
      return `${name}: tap a tile within 3 to burst there (3×3, hits allies too).`;
    case 'touch':
      return `${name}: tap yourself or an adjacent tile.`;
    case 'vat':
      return `${name}: tap a tile within 1 for the top-left corner of a 2×2.`;
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
      return {
        text: `${mode.preview.summary}. Tap again or Confirm.`,
        tone: mode.preview.warning ? 'warn' : 'hint',
      };
    case 'inspect': {
      const u = unitAt(s, mode.at);
      const tile = tileAt(s, mode.at);
      const text = u
        ? `${unitLine(s, u)}${tile.terrain.vent ? ' · on a vent' : ''}`
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

/** "Stain", "Fire", "Bonfire": the title of a named result (`compound:stain`, `burst:fire`, `idiom:bonfire`). */
export function namedTitle(id: string): string {
  const entry = CODEX.find((c) => c.id === id);
  if (entry) return entry.title;
  const [what = '', ref = ''] = id.split(':');
  if (what === 'idiom') return IDIOMS.find((i) => i.id === ref)?.name ?? ref;
  const plain = id.slice(what.length + 1).replace(/^page:/, '');
  const spaced = plain.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One line for a loot item: name, then what it does. */
export function lootLine(item: LootItem): { title: string; text: string } {
  switch (item.kind) {
    case 'rune':
      return {
        title: `${RUNES[item.rune].name}, a rune page`,
        text: RUNES[item.rune].headline,
      };
    case 'method':
      return { title: METHODS[item.method].name, text: METHODS[item.method].headline };
    case 'ink':
      return {
        title: `+${item.amount} ink`,
        text: 'A bigger ink pot for every page in the household.',
      };
    case 'solvent':
      return { title: SOLVENTS[item.solvent].name, text: SOLVENTS[item.solvent].rule };
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

/** "the flooded stair", "the Heart of the Seam": a place name inside a sentence. */
export function inSentence(place: string): string {
  return place.startsWith('The ') ? `the ${place.slice(4)}` : `the ${place}`;
}
