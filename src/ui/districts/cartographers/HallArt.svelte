<script lang="ts">
  import type { UnitArtProps } from '..';
  import { silhouetteOf } from './look';

  let { unit, glyph }: UnitArtProps = $props();
  const body = $derived(silhouetteOf(unit.def));
</script>

<!--
  The guild's hands (CG-12), one silhouette each, dark with a parchment edge like every foe: the
  Surveyor is a tripod robe holding dividers, the Eraser a rubber block with a pale cap, the Tracer
  a shade with a ragged hem and a dashed ghost of itself behind. Hit pips and traits are drawn by
  UnitToken.
-->
{#if unit.def === 'surveyor'}
  <g data-unit="surveyor">
    <path d="M50 8V30M42 6H58" stroke="var(--parchment)" stroke-width="8" stroke-linecap="round" />
    <path d="M50 8V30M42 6H58" stroke="var(--ink)" stroke-width="3.5" stroke-linecap="round" />
    <path d="M70 40L82 8M70 40L92 36" stroke="var(--parchment)" stroke-width="9" stroke-linecap="round" />
    <path d="M70 40L82 8M70 40L92 36" stroke="var(--m-brass)" stroke-width="4.5" stroke-linecap="round" />
    <path d={body} fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d={body} fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <text x="50" y="62" text-anchor="middle" font-size="22" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if unit.def === 'eraser'}
  <g data-unit="eraser">
    <path d={body} fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d="M20 40Q20 32 28 32H72Q80 32 80 40V50H20Z" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <path d="M50 32V50" stroke="var(--ink)" stroke-width="3" />
    <path d="M20 66H80" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="4 5" />
    <text x="50" y="68" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else}
  <g data-unit="tracer">
    <path d={body} transform="translate(12 -4)" fill="none" stroke="var(--parchment)" stroke-width="7" stroke-linejoin="round" />
    <path d={body} transform="translate(12 -4)" fill="none" stroke="var(--ink-soft)" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round" />
    <path d={body} fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <circle cx="42" cy="40" r="3.4" fill="var(--parchment)" />
    <circle cx="58" cy="40" r="3.4" fill="var(--parchment)" />
    <text x="50" y="64" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{/if}
