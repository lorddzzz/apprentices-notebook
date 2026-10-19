<script lang="ts">
  import type { CompiledLattice, Coord, SpellKey } from '$engine';
  import { key } from '$engine';
  import { arrowHead, auraLinks, flowSegments, linkLine } from '../../../app/flowGeometry';
  import { type FlowZone, flowZones } from '../../../app/study';

  interface Props {
    compiled: CompiledLattice;
    focus: SpellKey | null;
    cols: number;
    rows: number;
    /** The cell drawn at the top-left (a Glyph's inside has local cells left of and above 0, 0). */
    origin?: Coord;
  }

  let { compiled, focus, cols, rows, origin = { x: 0, y: 0 } }: Props = $props();

  // Trim so lines live in the gaps between the rune frames instead of under them.
  const TRIM = 0.33;

  // A Glyph's inner cells all sit on its one socket: draw the way in, not the walk inside.
  const outer = $derived<CompiledLattice>({
    ...compiled,
    spells: compiled.spells.map((s) => ({
      ...s,
      path: s.path.filter((c, i) => {
        const prev = s.path[i - 1];
        return !(c.inner && prev && prev.at.x === c.at.x && prev.at.y === c.at.y);
      }),
    })),
  });

  // Fork sides and Seal splits (R5, J1): which branch each cell hangs on, and what is in the jar.
  const zones = $derived(flowZones(compiled));
  const forks = $derived(
    new Set(
      compiled.spells.flatMap((s) =>
        s.path.filter((c) => c.rune === 'fork' && !c.inner).map((c) => `${s.key}:${key(c.at)}`),
      ),
    ),
  );
  const seals = $derived(
    new Set(
      compiled.spells.flatMap((s) =>
        s.path
          .filter((c) => (c.rune === 'jar' || c.rune === 'fuse') && !c.inner)
          .map((c) => `${s.key}:${key(c.at)}`),
      ),
    ),
  );
  const NONE: FlowZone = { side: null, sealed: false };

  const segments = $derived(
    flowSegments(outer, focus)
      // faint segments first so the focused spell always draws on top
      .sort((a, b) => Number(a.focused) - Number(b.focused))
      .map((s) => {
        const line = linkLine(s.from, s.to, TRIM);
        const zone = zones.get(s.spell)?.get(key(s.to)) ?? NONE;
        const mid = { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 };
        const vertical = line.x1 === line.x2;
        return {
          ...s,
          line,
          zone,
          mid,
          // a Fork's first segment into each branch is lettered; a Seal's outgoing one is ticked
          letter: forks.has(`${s.spell}:${key(s.from)}`) && zone.side ? zone.side : null,
          split: seals.has(`${s.spell}:${key(s.from)}`),
          tick: vertical
            ? { x1: mid.x - 0.16, y1: mid.y, x2: mid.x + 0.16, y2: mid.y }
            : { x1: mid.x, y1: mid.y - 0.16, x2: mid.x, y2: mid.y + 0.16 },
          head: arrowHead(line, s.dir),
          id: `${s.spell}:${key(s.to)}`,
        };
      }),
  );
  const auras = $derived(
    auraLinks(compiled.auraTouches).map((l) => ({
      ...l,
      line: linkLine(l.from, l.to, 0.3),
      id: `${key(l.from)}>${key(l.to)}`,
    })),
  );
</script>

<svg
  class="flow"
  viewBox="{origin.x} {origin.y} {cols} {rows}"
  preserveAspectRatio="none"
  aria-hidden="true"
  data-testid="flow"
>
  {#each auras as a (a.id)}
    <circle cx={a.to.x + 0.5} cy={a.to.y + 0.5} r="0.47" class="glow" />
    <line x1={a.line.x1} y1={a.line.y1} x2={a.line.x2} y2={a.line.y2} class="aura" />
  {/each}
  {#each segments as s (s.id)}
    <g
      class="seg"
      class:faint={!s.focused}
      class:left={s.zone.side === 'left'}
      class:right={s.zone.side === 'right'}
      class:sealed={s.zone.sealed}
      data-side={s.zone.side}
      data-sealed={s.zone.sealed}
    >
      <line x1={s.line.x1} y1={s.line.y1} x2={s.line.x2} y2={s.line.y2} />
      <polygon points={s.head} />
      {#if s.split}
        <line class="tick" x1={s.tick.x1} y1={s.tick.y1} x2={s.tick.x2} y2={s.tick.y2} />
      {/if}
      {#if s.letter}
        <circle class="tag" cx={s.mid.x} cy={s.mid.y} r="0.14" />
        <text class="letter" x={s.mid.x} y={s.mid.y + 0.07} text-anchor="middle">
          {s.letter === 'left' ? 'L' : 'R'}
        </text>
      {/if}
    </g>
  {/each}
</svg>

<style>
  .flow {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }
  .seg line {
    stroke: var(--f-source);
    stroke-width: 3;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .seg polygon {
    fill: var(--f-source);
    stroke: var(--f-source);
    stroke-width: 1;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  /* Two branches, two colours: left blue, right moss. After a Seal everything is amber and dashed. */
  .seg.left line,
  .seg.left polygon {
    stroke: var(--role-source);
  }
  .seg.right line,
  .seg.right polygon {
    stroke: var(--role-trigger);
  }
  .seg.left polygon {
    fill: var(--role-source);
  }
  .seg.right polygon {
    fill: var(--role-trigger);
  }
  .seg.sealed line {
    stroke: var(--role-seal);
    stroke-dasharray: 6 4;
  }
  .seg.sealed polygon {
    fill: var(--role-seal);
    stroke: var(--role-seal);
  }
  .seg line.tick {
    stroke: var(--role-seal);
    stroke-width: 4;
    stroke-dasharray: none;
  }
  .seg .tag {
    fill: var(--parchment);
    stroke: var(--role-source);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .seg.right .tag {
    stroke: var(--role-trigger);
  }
  .letter {
    font: 700 0.2px var(--mono);
    fill: var(--ink);
    stroke: none;
  }
  .seg.faint line,
  .seg.faint polygon {
    stroke: var(--ink-faint);
  }
  .seg.faint polygon {
    fill: var(--ink-faint);
  }
  .aura {
    stroke: var(--f-aura);
    stroke-width: 2.5;
    stroke-dasharray: 5 4;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .glow {
    fill: var(--f-aura);
    opacity: 0.2;
  }
</style>
