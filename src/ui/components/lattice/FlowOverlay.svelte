<script lang="ts">
  import type { CompiledLattice, SpellKey } from '$engine';
  import { key } from '$engine';
  import { arrowHead, auraLinks, flowSegments, linkLine } from '../../../app/flowGeometry';

  interface Props {
    compiled: CompiledLattice;
    focus: SpellKey | null;
    cols: number;
    rows: number;
  }

  let { compiled, focus, cols, rows }: Props = $props();

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

  const segments = $derived(
    flowSegments(outer, focus)
      // faint segments first so the focused spell always draws on top
      .sort((a, b) => Number(a.focused) - Number(b.focused))
      .map((s) => {
        const line = linkLine(s.from, s.to, TRIM);
        return { ...s, line, head: arrowHead(line, s.dir), id: `${s.spell}:${key(s.to)}` };
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
  viewBox="0 0 {cols} {rows}"
  preserveAspectRatio="none"
  aria-hidden="true"
  data-testid="flow"
>
  {#each auras as a (a.id)}
    <circle cx={a.to.x + 0.5} cy={a.to.y + 0.5} r="0.47" class="glow" />
    <line x1={a.line.x1} y1={a.line.y1} x2={a.line.x2} y2={a.line.y2} class="aura" />
  {/each}
  {#each segments as s (s.id)}
    <g class="seg" class:faint={!s.focused}>
      <line x1={s.line.x1} y1={s.line.y1} x2={s.line.x2} y2={s.line.y2} />
      <polygon points={s.head} />
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
