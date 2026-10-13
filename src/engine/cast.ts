import { RUNES, TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { dealDamage } from './damage';
import { who } from './events';
import { type Coord, label, neighbors4, square } from './grid';
import { applyBrass, applyInk, applyOil, applySpark, applySteam } from './materials';
import {
  boltRange,
  clip,
  findUnit,
  footprint,
  isAlive,
  memberById,
  spellOf,
  travel,
  unitAt,
} from './queries';
import type { Action, Aim, BattleState, EchoEntry, MemberUnit, Spell, SpellNode } from './types';

export type CastAction = Extract<Action, { type: 'cast' }>;

type Scale = (magnitude: number) => number;

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
  ctx.cast = { kills: [] };
  const targets = resolveSource(ctx, caster, spell, aim, scale);
  runNodes(ctx, spell.nodes, targets, scale);
  if (spell.echo && !echo && isAlive(caster)) {
    const entry: EchoEntry = { caster: caster.id, spell: spell.key, aim: structuredClone(aim) };
    ctx.s.echoes.push(entry);
    emit(ctx, { type: 'echoQueued', caster: ref(caster) });
  }
  ctx.cast = outer;
}

/** The source's own effect; returns the tiles the path runes apply to. */
function resolveSource(
  ctx: Ctx,
  caster: MemberUnit,
  spell: Spell,
  aim: Aim,
  scale: Scale,
): Coord[] {
  const s = ctx.s;
  const m = scale(spell.magnitude);
  switch (spell.source) {
    case 'bolt':
    case 'quill': {
      // A2: Quill pools ink under the unit it hits; until then it flies like a Bolt.
      if (aim.kind !== 'dir') throw new Error('Bolt needs a direction');
      const r = travel(s, caster.pos, aim.dir, boltRange(s), caster.id);
      switch (r.reason) {
        case 'none':
          emit(ctx, { type: 'miss', source: 'Bolt' });
          return [];
        case 'unit':
          dealDamage(ctx, r.unit, m, 'Bolt');
          break;
        case 'steam':
          emit(ctx, { type: 'stopped', source: 'Bolt', at: r.stop, by: 'steam', path: r.path });
          break;
        case 'brass':
          emit(ctx, {
            type: 'stopped',
            source: 'Bolt',
            at: r.stop,
            by: 'brass plate',
            path: r.path,
          });
          break;
        case 'end':
          emit(ctx, { type: 'lands', source: 'Bolt', at: r.stop, path: r.path });
          break;
      }
      return [{ ...r.stop }];
    }
    case 'splash': {
      if (aim.kind !== 'tile') throw new Error('Splash needs a tile');
      const tiles = clip(s, square(aim.at, TUNING.splashRadius));
      emit(ctx, { type: 'splash', center: { ...aim.at }, tiles });
      for (const t of tiles) {
        const u = unitAt(s, t);
        if (u) dealDamage(ctx, u, m, 'Splash');
      }
      return tiles;
    }
    case 'ward': {
      if (aim.kind !== 'ally') throw new Error('Ward needs an ally');
      const ally = findUnit(s, aim.unit);
      if (!ally || !isAlive(ally)) return [];
      ally.shield += m;
      emit(ctx, { type: 'shieldGained', unit: ref(ally), amount: m });
      return [{ ...ally.pos }];
    }
  }
}

/** Path runes in order, depth-first: each node's `next` runs before its later siblings. */
function runNodes(ctx: Ctx, nodes: readonly SpellNode[], targets: Coord[], scale: Scale): void {
  for (const node of nodes) {
    if (node.kind === 'material') {
      const m = scale(node.magnitude);
      switch (node.rune) {
        case 'spark':
          applySpark(ctx, targets, m);
          break;
        case 'ink':
          applyInk(ctx, footprint(ctx.s, targets, m));
          break;
        case 'oil':
          applyOil(ctx, footprint(ctx.s, targets, m));
          break;
        case 'steam':
          applySteam(ctx, footprint(ctx.s, targets, m));
          break;
        case 'brass':
          applyBrass(ctx, footprint(ctx.s, targets, m));
          break;
        case 'smear':
        case 'torch':
        case 'fog':
        case 'mist':
        case 'brand':
          break; // A2
      }
      runNodes(ctx, node.next, targets, scale);
    } else if (node.rune === 'onInked') {
      const passed = targets.some((t) => unitAt(ctx.s, t)?.inked === true);
      emit(ctx, { type: 'trigger', rune: 'onInked', passed });
      if (passed) runNodes(ctx, node.next, targets, scale);
    } else {
      const victims = [...(ctx.cast?.kills ?? [])];
      if (!victims.length) emit(ctx, { type: 'trigger', rune: 'onKill', passed: false });
      for (const v of victims) {
        emit(ctx, { type: 'trigger', rune: 'onKill', passed: true, at: { ...v.at } });
        runNodes(ctx, node.next, clip(ctx.s, [v.at, ...neighbors4(v.at)]), scale);
      }
    }
  }
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
