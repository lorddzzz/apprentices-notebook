import {
  type BindEvent,
  ENEMIES,
  ENEMY_IDS,
  type InventionDef,
  type InventionId,
  LINES,
  type LineId,
  METHODS,
  type MethodId,
  RUNE_IDS,
  type RuneRef,
  SOLVENTS,
  type SolventId,
  slotKey,
  VARIANTS,
} from '$data';
import { RIVAL_TOKENS } from '$data/rivals';
import {
  type Action,
  type Aim,
  type BattleState,
  type Coord,
  footnoteIds,
  type GameEvent,
  headlineOf,
  type InventionLibrary,
  inventionInk,
  inventionIssue,
  inventionLibrary,
  knownSetOf,
  nameOf,
  type Profile,
  parseCell,
  partIssue,
  scenarioBattle,
  witnessedIn,
} from '$engine';
import { KIT } from '$engine/districts/kit';
import type { Kit } from '$engine/districts/types';
import { type PaletteEntry, type PaletteItem, paletteOf, toggleToken } from './lab';

/** The Bench (design §6.1; plan P37): the draft invention and the test scene, as pure functions. */

// ── The draft ───────────────────────────────────────────

export interface Draft {
  method: MethodId | null;
  /** One entry per slot of the method; null is empty. */
  parts: (RuneRef | null)[];
  event: BindEvent | null;
  solvent: SolventId | null;
}

export const EMPTY_DRAFT: Draft = { method: null, parts: [], event: null, solvent: null };

/** Picking a method clears the parts; Bind's carrier can only be Ink, so it is filled in. */
export function pickMethod(d: Draft, method: MethodId): Draft {
  const parts = METHODS[method].slots.map((s) =>
    s.accepts === 'carrier' ? ('ink' as const) : null,
  );
  return { method, parts, event: null, solvent: d.solvent };
}

export function setPart(d: Draft, slot: number, ref: RuneRef | null): Draft {
  return { ...d, parts: d.parts.map((p, i) => (i === slot ? ref : p)) };
}

export const setEvent = (d: Draft, event: BindEvent | null): Draft => ({ ...d, event });

/** Tapping the chosen solvent again goes back to plain. */
export const setSolvent = (d: Draft, solvent: SolventId | null): Draft => ({
  ...d,
  solvent: d.solvent === solvent ? null : solvent,
});

const DRAFT_ID: InventionId = 'inv:draft';

/** The invention the draft stands for, or null while a part or the event is still empty. */
export function draftDef(
  d: Draft,
  name = 'Draft',
  id: InventionId = DRAFT_ID,
): InventionDef | null {
  if (!d.method || d.parts.length === 0) return null;
  const parts = d.parts.filter((p): p is RuneRef => p !== null);
  if (parts.length !== d.parts.length) return null;
  const def: InventionDef = { id, name, method: d.method, parts, solvent: d.solvent };
  if (d.method === 'bind') {
    if (!d.event) return null;
    def.event = d.event;
  }
  return def;
}

/** What the player still has to choose, in the method's own words ("an Action that resolves at once"). */
function missing(d: Draft): string | null {
  if (!d.method) return 'Pick a method.';
  const method = METHODS[d.method];
  const slot = d.parts.indexOf(null);
  if (slot >= 0) return `Add ${method.slots[slot]?.label ?? 'a part'}.`;
  if (d.method === 'bind' && !d.event) return 'Choose the event the mark waits for.';
  return null;
}

export interface Status {
  /** The method's sentence with the parts' names; null before a method is chosen. Always shown once there is one. */
  headline: string | null;
  /** Why it doesn't fit, or what is still to choose. */
  issue: string | null;
  /** False for an unfinished draft: nothing to try or write yet. */
  valid: boolean;
  /** Every part chosen: an `issue` is then a real misfit, not just something left to choose. */
  complete: boolean;
  ink: number | null;
}

export function statusOf(p: Profile, d: Draft): Status {
  if (!d.method)
    return { headline: null, issue: 'Pick a method.', valid: false, complete: false, ink: null };
  const lib = inventionLibrary(p);
  const filled: InventionDef = {
    id: DRAFT_ID,
    name: 'Draft',
    method: d.method,
    parts: d.parts.filter((x): x is RuneRef => x !== null),
    solvent: d.solvent,
    ...(d.event ? { event: d.event } : {}),
  };
  const headline = headlineOf(filled, lib);
  const open = missing(d);
  if (open) return { headline, issue: open, valid: false, complete: false, ink: null };
  const issue = inventionIssue(filled, knownSetOf(p));
  return { headline, issue, valid: issue === null, complete: true, ink: inventionInk(filled, lib) };
}

// ── Choosing parts ──────────────────────────────────────

export interface Choice {
  ref: RuneRef;
  name: string;
  /** Null when it fits; else the one-line reason (the choice is greyed). */
  reason: string | null;
}

/** Every rune and invention the household has, with whether it fits the slot. */
export function choicesFor(p: Profile, d: Draft, slot: number): Choice[] {
  if (!d.method) return [];
  const lib = inventionLibrary(p);
  const known = knownSetOf(p);
  const method = d.method;
  const refs: RuneRef[] = [
    ...RUNE_IDS.filter((r) => p.known.includes(r)),
    ...p.inventions.map((i) => i.id),
  ];
  return refs.map((ref) => ({
    ref,
    name: nameOf(ref, lib),
    reason: partIssue(method, slot, ref, known),
  }));
}

/** Bind's events the household knows (the others are not offered). */
export const eventsKnown = (p: Profile): BindEvent[] => knownSetOf(p).events as BindEvent[];

/** Learned methods only. */
export const methodsKnown = (p: Profile): MethodId[] => [...p.methods];

// ── Naming and writing ──────────────────────────────────

/** "Conduct Shove", or "Bind Ink Strike" for a Bind; the player's own name replaces it. */
export function defaultName(d: Draft, lib: InventionLibrary = {}): string {
  if (!d.method) return '';
  const parts = d.parts
    .filter((x): x is RuneRef => x !== null && x !== 'ink')
    .map((x) => nameOf(x, lib));
  const flavour = d.solvent ? [`with ${SOLVENTS[d.solvent].name}`] : [];
  return [METHODS[d.method].name, ...parts, ...flavour].join(' ');
}

/** `inv:` + the name in lower case, made unique among the household's inventions. */
export function inventionIdFor(name: string, p: Pick<Profile, 'inventions'>): InventionId {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'rune';
  const taken = new Set(p.inventions.map((i) => i.id));
  let id: InventionId = `inv:${slug}`;
  for (let n = 2; taken.has(id); n++) id = `inv:${slug}-${n}`;
  return id;
}

/** The invention to write, with the player's name (the default when the field is blank). */
export function inventionToWrite(p: Profile, d: Draft, typed: string): InventionDef | null {
  const name = typed.trim() || defaultName(d, inventionLibrary(p));
  return draftDef(d, name, inventionIdFor(name, p));
}

// ── The test scene (P37) ────────────────────────────────

export const SCENE_W = 6;
export const SCENE_H = 5;
export const CASTER_START: Coord = { x: 0, y: 2 };
export const MAX_SUBJECTS = 3;

/** Cell tokens as [y][x]; the caster stands at the left. */
export type Scene = readonly (readonly string[])[];

export function emptyScene(): Scene {
  return Array.from({ length: SCENE_H }, (_, y) =>
    Array.from({ length: SCENE_W }, (_, x) =>
      x === CASTER_START.x && y === CASTER_START.y ? 'D' : '.',
    ),
  );
}

export const sceneText = (scene: Scene): string => scene.map((r) => r.join(' ')).join('\n');

/**
 * Swatches the Bench offers once the household has met the thing, by `Profile.met` key (any one of
 * the keys opens it). Foes come from the enemy registry through `foesMet`, board pieces from the kit
 * through `PieceDef.bench.met`; this table is only the tile states, compounds and terrain.
 */
const MET_ITEMS: readonly { items: readonly PaletteItem[]; met: readonly string[] }[] = [
  { items: ['o'], met: ['slick'] },
  { items: ['i'], met: ['blot'] },
  { items: ['~'], met: ['cloud'] },
  { items: ['*'], met: ['fire'] },
  { items: ['='], met: ['plate'] },
  { items: ['_'], met: ['drop'] },
  { items: ['!'], met: ['mark'] },
  { items: ['&'], met: ['collar'] },
  { items: ['$'], met: ['shackle'] },
  { items: ['{stain}'], met: ['stain'] },
  { items: ['{brand}'], met: ['brandCloud'] },
  { items: ['{pool}'], met: ['pool'] },
  { items: ['{fog}'], met: ['greaseFog'] },
  { items: ['{skid}'], met: ['skidPlate'] },
  { items: ['{bank}'], met: ['bank'] },
  { items: ['{kettle}'], met: ['kettle'] },
  { items: ['{wall}'], met: ['wall'] },
  // Water and its current; a grate only makes sense on water.
  { items: ['w>', 'wv', 'w<', 'w^', 'h'], met: ['water'] },
  // A vent breathes steam: `metIn` does not record vents yet, so a met steam cloud opens it too.
  { items: ['@'], met: ['vent', 'cloud'] },
];

/**
 * What the palette offers: the caster, a dummy, the foes met, the states, compounds, terrain and
 * board pieces met, the eraser. Read from the registries, in the Lab palette's order.
 */
export function sceneEntries(p: Pick<Profile, 'met' | 'foesMet'>, kit: Kit = KIT): PaletteEntry[] {
  const met: readonly string[] = p.met;
  const rivals = new Set(RIVAL_TOKENS.filter((t) => t.kind === 'foe').map((t) => t.id));
  const foes = p.foesMet.filter((f) => !rivals.has(f)).map((f) => ENEMIES[f].token);
  const states = MET_ITEMS.filter((m) => m.met.some((k) => met.includes(k))).flatMap(
    (m) => m.items,
  );
  const pieces = Object.values(kit.pieces).flatMap((def) =>
    def.bench && met.includes(def.bench.met) ? [`{${def.token}}`] : [],
  );
  const have = new Set<PaletteItem>(['D', 'd', ...foes, ...states, ...pieces, '.']);
  return paletteOf(kit, 'all').filter((x) => have.has(x.item));
}

export const sceneItems = (p: Pick<Profile, 'met' | 'foesMet'>, kit: Kit = KIT): PaletteItem[] =>
  sceneEntries(p, kit).map((x) => x.item);

const FOE_TOKENS = new Set<string>(ENEMY_IDS.map((id) => ENEMIES[id].token));
const isCaster = (token: string): boolean => token.startsWith('D');
const ORIGIN: Coord = { x: 0, y: 0 };

/** A cell is a subject when a foe stands on it (any kind in the enemy registry, the dummy too). */
function isSubject(token: string): boolean {
  try {
    return parseCell(token, ORIGIN).unit?.kind === 'enemy';
  } catch {
    return false;
  }
}

export const subjectsIn = (scene: Scene): number => scene.flat().filter(isSubject).length;

/** One tap with the palette: the new scene, or the reason nothing changed. */
export function paintScene(
  scene: Scene,
  at: Coord,
  item: PaletteItem,
): { scene: Scene } | { why: string } {
  const here = scene[at.y]?.[at.x];
  if (here === undefined) return { why: 'Off the board' };
  const isUnit = item === 'D' || FOE_TOKENS.has(item);
  if (item === '.' && isCaster(here)) return { why: 'The caster stays' };
  if (isUnit && isCaster(here)) return { why: 'The caster is standing there' };
  let next = scene.map((r) => [...r]);
  let token = toggleToken(here, item);
  if (item === 'D') {
    if (isCaster(here)) return { why: 'The caster is already there' };
    // Moving the caster: pick them up from where they stood.
    next = next.map((r) => r.map((t) => (isCaster(t) ? t.replace(/^D/, '') || '.' : t)));
    token = toggleToken(next[at.y]?.[at.x] ?? '.', 'D');
  }
  if (token === here && item !== 'D') return { why: 'Nothing to change there' };
  const row = next[at.y];
  if (!row) return { why: 'Off the board' };
  row[at.x] = token;
  if (subjectsIn(next) > MAX_SUBJECTS) return { why: `Up to ${MAX_SUBJECTS} subjects` };
  return { scene: next };
}

/** The Source that carries the draft on the test scene's caster, and what follows it. */
function trialLattice(d: Draft, id: InventionId): string {
  if (d.method === 'margin') return `. ${id} . . .\nBolt> Strike . . .`;
  if (d.method === 'bind') {
    const then = d.event === 'hit' || d.event === 'dies' ? 'Strike' : 'Shove';
    return `. . . . .\nBolt> ${id} ${then} . .\n. . . . .`;
  }
  return `. . . . .\nBolt> ${id} . . .\n. . . . .`;
}

/** The scene as a battle (Lab rules: nothing is spent) with the draft invention loaded on the caster. */
export function sceneBattle(scene: Scene, p: Profile, d: Draft): BattleState {
  const def = draftDef(d);
  const inventions = def ? { ...inventionLibrary(p), [def.id]: def } : inventionLibrary(p);
  const lattices = def ? { draughtsman: trialLattice(d, def.id) } : {};
  const state = scenarioBattle(
    { title: 'Bench', board: sceneText(scene), lattices },
    { lab: true, inventions },
  );
  return state.phase === 'player' ? state : { ...state, phase: 'player' };
}

/** Aiming like a cast: a tap picks the direction (the larger axis from the caster). */
export function aimFrom(caster: Coord, tap: Coord): Aim | null {
  const dx = tap.x - caster.x;
  const dy = tap.y - caster.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return { kind: 'dir', dir: dx > 0 ? 'right' : 'left' };
  return { kind: 'dir', dir: dy > 0 ? 'down' : 'up' };
}

/** The trial: one cast of the draft; a Repeat or Margin then waits its turn out to show the echo. */
export function trialActions(state: BattleState, d: Draft, tap: Coord): Action[] | null {
  const caster = state.units.find((u) => u.kind === 'member');
  if (caster?.kind !== 'member') return null;
  const aim = aimFrom(caster.pos, tap);
  const spell = caster.spells[0];
  if (!aim || !spell) return null;
  const cast: Action = { type: 'cast', unit: caster.id, spell: spell.key, aim };
  return d.method === 'repeat' || d.method === 'margin' ? [cast, { type: 'endTurn' }] : [cast];
}

// ── Witnessing (D4) ─────────────────────────────────────

/** Lines fired by a trial that are new to this Bench session, first-seen order. */
export const newLines = (log: readonly GameEvent[], seen: readonly LineId[]): LineId[] =>
  witnessedIn(log).filter((l) => !seen.includes(l));

/** The sentence a witnessed line reads as. */
export const lineText = (id: LineId): string =>
  LINES.find((l) => l.id === id)?.text ?? 'This one is still being written.';

/** The sentence with the household's margin written under it (level I, then II), owner's hand. */
export function lineTextFor(p: Profile, id: LineId): string {
  const written = footnoteIds(p);
  const margin = ([1, 2] as const).flatMap((level) => {
    const variant = VARIANTS.find((v) => v.id === written[slotKey(id, level)]);
    return variant ? [variant.text] : [];
  });
  return [lineText(id), ...margin].join(' ');
}

/** The footnotes a Bench trial applies (P6): the written ones. The Bench awards no points. */
export const trialFootnotes = (p: Profile): ReturnType<typeof footnoteIds> => footnoteIds(p);
