import {
  DISTRICTS,
  type DistrictDef,
  type DistrictId,
  RUNES,
  TIER_NAMES,
  TIER_UP_LINES,
} from '$data';
import {
  type CellKey,
  key as cellKey,
  isGlyph,
  label,
  type Placed,
  type Spell,
  type SpellTally,
  type TierUp,
  type TripRecap,
} from '$engine';

/** "Cashing In v2 reached silver Reliability. Pick its extra exit at the desk" (M16). */
export function tierUpLine(up: TierUp): string {
  const head = TIER_UP_LINES[up.metric]
    .replace('{name}', up.name)
    .replace('{version}', String(up.version))
    .replace('{tier}', TIER_NAMES[up.tier]);
  const tail =
    up.metric === 'reliability' && up.tier === 2
      ? TIER_UP_LINES.extraExit
      : up.metric === 'reliability' && up.tier === 3
        ? TIER_UP_LINES.secondParam
        : '';
  return tail ? `${head} ${tail}` : head;
}

/** The spell's path cells as proof sees them, each once (a Glyph's inner cells are its socket). */
function pathCells(spell: Spell): CellKey[] {
  const at = spell.cells
    ? spell.cells.map((c) => cellKey(c.at))
    : spell.path.map((p) => cellKey(p.at));
  return [...new Set(at)];
}

/**
 * The cells of `t` that never fired, but only while `t` describes a plain spell that is still
 * wired as it was fought (M15). Anything else is stale and gives `null`.
 */
export function freshDeadCells(t: SpellTally, current: readonly Spell[]): CellKey[] | null {
  const now = current.find((s) => s.key === t.spell);
  if (!now || now.glyph) return null;
  const cells = pathCells(now);
  if (cells.length !== t.cells.length || !cells.every((c) => t.cells.includes(c))) return null;
  return t.cells.filter((c) => !t.fired.includes(c));
}

const plural = (n: number, one: string): string => `${n} ${n === 1 ? one : `${one}s`}`;

/** "last trip: 6 casts, 9 harm · 1 cell never fired" under a plain spell (M15); null when stale. */
export function spellLine(t: SpellTally | undefined, spell: Spell): string | null {
  if (!t) return null;
  const dead = freshDeadCells(t, [spell]);
  if (!dead) return null;
  const base = `last trip: ${plural(t.casts, 'cast')}, ${t.damage} harm`;
  return dead.length ? `${base} · ${plural(dead.length, 'cell')} never fired` : base;
}

/** "the Fork at C3 never fired" for each dead cell of a ledger row (M15); empty when stale. */
export function deadCellNotes(
  t: SpellTally,
  current: readonly Spell[],
  placed: readonly Placed[],
): string[] {
  const dead = freshDeadCells(t, current) ?? [];
  return dead.map((k) => {
    const [x = 0, y = 0] = k.split(',').map(Number);
    const p = placed.find((r) => r.at.x === x && r.at.y === y);
    const what = p && !isGlyph(p) ? RUNES[p.rune].name : 'rune';
    return `the ${what} at ${label({ x, y })} never fired`;
  });
}

/**
 * A heard district's voice on the trip page (K-20). The recap keeps only the district id, so the
 * voice comes from its hear list: a district with any owner condition was drawn by the owner.
 */
export function heardVoice(id: DistrictId, table: DistrictTable = DISTRICTS): 'owner' | 'rumour' {
  return table[id].hear.some((c) => c.voice === 'owner') ? 'owner' : 'rumour';
}

type DistrictTable = Readonly<Record<DistrictId, DistrictDef>>;

export interface HeardHighlight {
  kind: 'heard';
  title: string;
  text: string;
}

/** One highlight per district heard on the trip: "The owner drew … on the map" or "A rumour of …" (K-20). */
export function heardHighlights(
  recap: TripRecap,
  table: DistrictTable = DISTRICTS,
): HeardHighlight[] {
  return recap.stats.heard.map((id) => {
    const d = table[id];
    const text =
      heardVoice(id, table) === 'owner'
        ? `The owner drew ${d.name} on the map: “${d.line}”`
        : `A rumour of ${d.name}`;
    return { kind: 'heard', title: 'A new page of the map', text };
  });
}

/** The one rumour line at the Study window: the first rumour-voiced district heard on the last trip. */
export function rumourLine(
  recap: TripRecap | null,
  table: DistrictTable = DISTRICTS,
): string | null {
  const id = recap?.stats.heard.find((d) => heardVoice(d, table) === 'rumour');
  return id ? `A rumour of ${table[id].name}` : null;
}
