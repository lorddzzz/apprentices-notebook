<script lang="ts">
  import { firstArt, sceneRect } from './art';
  import { FIGHT_KITS, type FightArtContext, fightArtIds } from './fightArt';
  import { CELL, GUTTER } from './geometry';

  interface Props {
    cols: number;
    rows: number;
    /** The room's district and arena flag (FT-D7). Without a district there is no scene. */
    kit?: FightArtContext;
  }

  let { cols, rows, kit }: Props = $props();

  const theme = $derived(kit?.district ? FIGHT_KITS[kit.district] : undefined);
  const art = $derived(
    kit?.district ? firstArt(fightArtIds(kit.district, { kind: 'scene' }, kit.arena)) : null,
  );
  const placed = $derived(art ? sceneRect(cols, rows, art.id, theme?.sceneFocal) : null);
</script>

<!-- The district scene behind the grid, muted; a vector wash when the art is not shipped. -->
{#if kit?.district}
  <g pointer-events="none" data-scene={art ? 'art' : 'wash'}>
    <rect
      x={-GUTTER}
      y={-GUTTER}
      width={cols * CELL + GUTTER}
      height={rows * CELL + GUTTER}
      fill="var(--parchment)"
    />
    {#if art && placed}
      <clipPath id="scene-clip">
        <rect x={-GUTTER} y={-GUTTER} width={cols * CELL + GUTTER} height={rows * CELL + GUTTER} />
      </clipPath>
      <image
        href={art.url}
        x={placed.x}
        y={placed.y}
        width={placed.w}
        height={placed.h}
        opacity="0.55"
        clip-path="url(#scene-clip)"
      />
    {:else}
      <rect
        x={-GUTTER}
        y={-GUTTER}
        width={cols * CELL + GUTTER}
        height={rows * CELL + GUTTER}
        fill={theme?.tileTone ?? 'var(--ink-soft)'}
        opacity="0.16"
      />
    {/if}
  </g>
{/if}
