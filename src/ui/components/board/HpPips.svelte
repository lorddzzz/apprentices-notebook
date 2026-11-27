<script lang="ts">
  import type { UnitView } from '../../../app/view';
  import { CELL } from './geometry';

  interface Props {
    units: readonly UnitView[];
  }

  let { units }: Props = $props();

  // One row up to 6, two rows up to 8, a number beyond: each stays legible at a 44 px cell (FT-10).
  const ONE_ROW_MAX = 6;
  const TWO_ROW_MAX = 8;

  interface Pip {
    x: number;
    y: number;
    w: number;
    h: number;
    full: boolean;
  }

  function pipsOf(hp: number, maxHp: number): Pip[] {
    const two = maxHp > ONE_ROW_MAX;
    const perRow = two ? Math.ceil(maxHp / 2) : maxHp;
    const w = two ? 14 : 13;
    const h = two ? 9 : 13;
    const gap = two ? 3 : 4;
    const rowH = h + 2;
    return Array.from({ length: maxHp }, (_, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, maxHp - row * perRow);
      const rows = two ? 2 : 1;
      return {
        x: CELL / 2 - (inRow * (w + gap) - gap) / 2 + col * (w + gap),
        y: CELL - 2 - (rows - row) * rowH + 1,
        w,
        h,
        full: i < hp,
      };
    });
  }
</script>

<!-- Under the foot, in the overlay group: a figure below never covers its row above's HP. -->
<g pointer-events="none" data-layer="hp">
  {#each units as unit (unit.id)}
    <g transform="translate({unit.pos.x * CELL} {unit.pos.y * CELL})" data-hp={unit.id}>
      {#if unit.maxHp > TWO_ROW_MAX}
        <rect x="22" y="72" width="56" height="26" rx="13" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" />
        <text
          x="50"
          y="92"
          text-anchor="middle"
          font-size="24"
          font-weight="bold"
          fill="var(--ink)"
          font-family="var(--font-serif)"
        >{unit.hp}/{unit.maxHp}</text>
      {:else}
        {#each pipsOf(unit.hp, unit.maxHp) as p, i (i)}
          <rect
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            rx="2"
            fill={p.full ? 'var(--ink)' : 'var(--parchment)'}
            stroke="var(--ink)"
            stroke-width="3"
            paint-order="stroke"
          />
        {/each}
      {/if}
    </g>
  {/each}
</g>
