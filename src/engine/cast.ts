import { RUNES, TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { dealDamage } from './damage';
import { who } from './events';
import { type Coord, key, label, neighbors4, sameCoord, square } from './grid';
import {
  applyBrand,
  applyBrass,
  applyEtch,
  applyFog,
  applyInk,
  applyKiln,
  applyMist,
  applyOil,
  applyScald,
  applySmear,
  applySpark,
  applySteam,
  applyTorch,
} from './materials';
import {
  boltRange,
  clip,
  findUnit,
  footprint,
  isAlive,
  memberById,
  spellOf,
  type Travel,
  tileAt,
  travel,
  unitAt,
} from './queries';
import type {
  Action,
  Aim,
  BattleState,
  EchoEntry,
  FiredCell,
  MemberUnit,
  Spell,
  SpellNode,
  Unit,
} from './types';

export type CastAction = Extract<Action, { type: 'cast' }>;

type Scale = (magnitude: number) => number;

/**
 * Where the path runes land. `pierced` is for runes behind a Pierce (every unit the projectile
 * passed); it equals `base` for any spell that has none.
 */
interface Targets {
  base: Coord[];
  pierced: Coord[];
}

const same = (tiles: Coord[]): Targets => ({ base: tiles, pierced: tiles });

/** Cast action (legality checked by `isLegal`): spends the charge and the action, then resolves. */
export function castAction(ctx: Ctx, action: CastAction): void {
  const m = memberById(ctx.s, action.unit);
  const spell = spellOf(m, action.spell);
  if (!spell) throw new Error(`${m.name} has no spell at ${action.spell}`);
  if (!ctx.s.lab) m.charges[spell.key] = (m.charges[spell.key] ?? 0) - 1;
  m.acted = true;
  m.undo = null;
  castSpell(ctx, m, spell, action.aim, false);
}

/** "right" / "at C4" / "on Stoker": the aim as it reads in the log. */
function aimText(s: BattleState, aim: Aim): string {
  switch (aim.kind) {
    case 'dir':
      return aim.dir;
    case 'tile':
      return `at ${label(aim.at)}`;
    case 'ally': {
      const ally = findUnit(s, aim.unit);
      return `on ${ally ? who(ref(ally)) : aim.unit}`;
    }
  }
}

/**
 * Resolves one spell: source effect, then the path depth-first, then (first cast only) queues the
 * echo. An echo halves every magnitude (floor, min 1). Chain reactions finish inside each rune.
 */
export function castSpell(
  ctx: Ctx,
  caster: MemberUnit,
  spell: Spell,
  aim: Aim,
  echo: boolean,
): void {
  const scale: Scale = (m) => (echo ? Math.max(1, Math.floor(m / TUNING.echoDivisor)) : m);
  emit(ctx, {
    type: 'cast',
    caster: ref(caster),
    spell: RUNES[spell.source].name,
    aim: structuredClone(aim),
    aimText: aimText(ctx.s, aim),
    echo,
  });
  const outer = ctx.cast;
  const from = ctx.log.length;
  ctx.cast = { kills: [] };
  const targets = resolveSource(ctx, caster, spell, aim, scale);
  const ran: SpellNode[] = [];
  runNodes(ctx, spell.nodes, targets, scale, ran, from);
  if (spell.echo && !echo && isAlive(caster)) {
    const entry: EchoEntry = { caster: caster.id, spell: spell.key, aim: structuredClone(aim) };
    ctx.s.echoes.push(entry);
    emit(ctx, { type: 'echoQueued', caster: ref(caster) });
  }
  ctx.cast = outer;
  if (!echo) {
    emit(ctx, {
      type: 'trace',
      caster: ref(caster),
      spell: spell.key,
      cells: firedCells(spell, ran),
      meaningful: ctx.log.slice(from).some((e) => MEANINGFUL.has(e.type)),
      spans: [], // task E1 fills these
    });
  }
}

/** Event types that make a cast count toward proof (plan P6). */
const MEANINGFUL: ReadonlySet<string> = new Set([
  'damage',
  'shieldGained',
  'shieldAbsorbs',
  'inked',
  'puddle',
  'oiled',
  'steam',
  'plates',
  'coated',
  'ignite',
  'died',
  'smear',
  'mist',
  'branded',
  'pierced',
]);

/** The source, every node that ran and the shape cells walked to reach it, once each (plan P7). */
function firedCells(spell: Spell, ran: readonly SpellNode[]): FiredCell[] {
  const known = new Map((spell.cells ?? []).map((c) => [key(c.at), c]));
  const dir = spell.path.find((p) => sameCoord(p.at, spell.at) && !p.inner)?.dir;
  const out: FiredCell[] = [];
  const seen = new Set<string>();
  const add = (at: Coord, fallback: FiredCell | null): void => {
    const cell = known.get(key(at)) ?? fallback;
    if (!cell || seen.has(key(at))) return;
    seen.add(key(at));
    out.push({ ...cell, at: { ...cell.at } });
  };
  add(spell.at, {
    at: spell.at,
    rune: spell.glyph ? null : spell.source,
    ...(dir ? { dir } : {}),
  });
  for (const node of ran) {
    for (const v of node.via ?? []) add(v, null);
    add(node.at, { at: node.at, rune: node.rune });
  }
  return out;
}

/** The source's own effect; returns the tiles the path runes apply to. */
function resolveSource(
  ctx: Ctx,
  caster: MemberUnit,
  spell: Spell,
  aim: Aim,
  scale: Scale,
): Targets {
  const s = ctx.s;
  const m = scale(spell.magnitude);
  switch (spell.source) {
    case 'bolt':
    case 'quill': {
      // Quill flies like a Bolt but pools ink under the unit it hits.
      const name = spell.source === 'quill' ? 'Quill' : 'Bolt';
      if (aim.kind !== 'dir') throw new Error(`${name} needs a direction`);
      const strike = (u: Unit, at: Coord): void => {
        dealDamage(ctx, u, m, name);
        if (spell.source === 'quill' && !tileAt(s, at).plate && !tileAt(s, at).ink) {
          tileAt(s, at).ink = true;
          emit(ctx, { type: 'puddle', tiles: [{ ...at }] });
        }
      };
      const r = travel(s, caster.pos, aim.dir, boltRange(s), caster.id);
      if (r.reason === 'none') {
        emit(ctx, { type: 'miss', source: name });
        return same([]);
      }
      const first = r.stop;
      let last: Travel = r;
      let all: Coord[] = r.path;
      if (r.reason === 'unit') strike(r.unit, r.stop);
      // Pierce: the first unit is passed, and the projectile flies on from its tile.
      const through = r.reason === 'unit' && spell.pierce === true;
      if (through) {
        emit(ctx, { type: 'pierced', source: name, unit: ref(r.unit, r.stop) });
        last = travel(s, r.stop, aim.dir, boltRange(s), caster.id);
        all = [...r.path, ...last.path];
      }
      switch (last.reason) {
        case 'steam':
          emit(ctx, { type: 'stopped', source: name, at: last.stop, by: 'steam', path: all });
          break;
        case 'brass':
          emit(ctx, {
            type: 'stopped',
            source: name,
            at: last.stop,
            by: 'brass plate',
            path: all,
          });
          break;
        case 'end':
          emit(ctx, { type: 'lands', source: name, at: last.stop, path: all });
          break;
        case 'unit':
          if (through) strike(last.unit, last.stop);
          break;
        case 'none':
          break;
      }
      if (!through) return same([{ ...first }]);
      const end = last.reason === 'none' ? [] : [{ ...last.stop }];
      return { base: [{ ...first }], pierced: [{ ...first }, ...end] };
    }
    case 'splash': {
      if (aim.kind !== 'tile') throw new Error('Splash needs a tile');
      const tiles = clip(s, square(aim.at, TUNING.splashRadius));
      emit(ctx, { type: 'splash', center: { ...aim.at }, tiles });
      for (const t of tiles) {
        const u = unitAt(s, t);
        if (u) dealDamage(ctx, u, m, 'Splash');
      }
      return same(tiles);
    }
    case 'ward': {
      if (aim.kind !== 'ally') throw new Error('Ward needs an ally');
      const ally = findUnit(s, aim.unit);
      if (!ally || !isAlive(ally)) return same([]);
      ally.shield += m;
      emit(ctx, { type: 'shieldGained', unit: ref(ally), amount: m });
      return same([{ ...ally.pos }]);
    }
  }
}

/** Path runes in order, depth-first: each node's `next` runs before its later siblings. */
function runNodes(
  ctx: Ctx,
  nodes: readonly SpellNode[],
  targets: Targets,
  scale: Scale,
  ran: SpellNode[],
  from: number,
): void {
  for (const node of nodes) {
    ran.push(node);
    const at = node.pierced ? targets.pierced : targets.base;
    if (node.kind === 'material') {
      const m = scale(node.magnitude);
      switch (node.rune) {
        case 'spark':
          applySpark(ctx, at, m);
          break;
        case 'ink':
          applyInk(ctx, footprint(ctx.s, at, m));
          break;
        case 'oil':
          applyOil(ctx, footprint(ctx.s, at, m));
          break;
        case 'steam':
          applySteam(ctx, footprint(ctx.s, at, m));
          break;
        case 'brass':
          applyBrass(ctx, footprint(ctx.s, at, m));
          break;
        case 'smear':
          applySmear(ctx, footprint(ctx.s, at, m));
          break;
        case 'torch':
          applyTorch(ctx, footprint(ctx.s, at, m));
          break;
        case 'fog':
          applyFog(ctx, footprint(ctx.s, at, m));
          break;
        case 'mist':
          applyMist(ctx, footprint(ctx.s, at, m));
          break;
        case 'brand':
          applyBrand(ctx, footprint(ctx.s, at, m));
          break;
        case 'scald':
          applyScald(ctx, footprint(ctx.s, at, m));
          break;
        case 'etch':
          applyEtch(ctx, footprint(ctx.s, at, m));
          break;
        case 'kiln':
          applyKiln(ctx, footprint(ctx.s, at, m));
          break;
      }
      runNodes(ctx, node.next, targets, scale, ran, from);
    } else if (node.rune === 'onInked') {
      const passed = at.some((t) => unitAt(ctx.s, t)?.inked === true);
      emit(ctx, { type: 'trigger', rune: 'onInked', passed });
      if (passed) runNodes(ctx, node.next, targets, scale, ran, from);
    } else if (node.rune === 'onIgnite') {
      const lit = ignitedSince(ctx, from);
      emit(ctx, { type: 'trigger', rune: 'onIgnite', passed: lit.length > 0 });
      // The rest of the flow lands on the new fire, not on the cast's targets.
      if (lit.length) runNodes(ctx, node.next, same(lit), scale, ran, from);
    } else {
      const victims = [...(ctx.cast?.kills ?? [])];
      if (!victims.length) emit(ctx, { type: 'trigger', rune: 'onKill', passed: false });
      for (const v of victims) {
        emit(ctx, { type: 'trigger', rune: 'onKill', passed: true, at: { ...v.at } });
        const burst = clip(ctx.s, [v.at, ...neighbors4(v.at)]);
        runNodes(ctx, node.next, same(burst), scale, ran, from);
      }
    }
  }
}

/** Every tile that caught fire since the cast began (log index `from`), each once, in log order. */
function ignitedSince(ctx: Ctx, from: number): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const e of ctx.log.slice(from)) {
    if (e.type !== 'ignite') continue;
    for (const t of e.tiles) {
      if (seen.has(key(t))) continue;
      seen.add(key(t));
      out.push({ ...t });
    }
  }
  return out;
}

/** Is a stored echo still castable now? Bolt needs a flight, Ward a living ally; Splash always. */
function echoReady(s: BattleState, caster: MemberUnit, spell: Spell, aim: Aim): boolean {
  switch (aim.kind) {
    case 'dir':
      return (
        (spell.source === 'bolt' || spell.source === 'quill') &&
        travel(s, caster.pos, aim.dir, boltRange(s), caster.id).reason !== 'none'
      );
    case 'tile':
      return spell.source === 'splash';
    case 'ally': {
      const ally = findUnit(s, aim.unit);
      return spell.source === 'ward' && !!ally && isAlive(ally);
    }
  }
}

/**
 * Start of the player phase: recasts every queued echo at half strength (no charge, no action,
 * never re-queued), or logs that it fizzles when the caster is down or the aim no longer works.
 */
export function runEchoes(ctx: Ctx): void {
  const queued = ctx.s.echoes;
  ctx.s.echoes = [];
  for (const e of queued) {
    const caster = findUnit(ctx.s, e.caster);
    if (caster?.kind !== 'member') continue;
    const spell = spellOf(caster, e.spell);
    if (!isAlive(caster) || !spell || !echoReady(ctx.s, caster, spell, e.aim)) {
      emit(ctx, { type: 'echoFizzles', caster: ref(caster) });
      continue;
    }
    castSpell(ctx, caster, spell, e.aim, true);
  }
}
