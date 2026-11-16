<script lang="ts">
  import { hatch, silhouetteOf } from './look';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const d = $derived((data ?? {}) as { foe?: unknown; due?: unknown });
  const foe = $derived(typeof d.foe === 'string' ? d.foe : '');
  const due = $derived(typeof d.due === 'number' && d.due > 0 ? d.due : null);
  const body = $derived(silhouetteOf(foe));
  const id = $props.id();
</script>

<!--
  A foe in pencil (CG-12): a dashed silhouette over lightly hatched paper, hollow so that it reads
  as not yet there. The round it inks in is the badge; a dotted frame says it blocks the tile.
-->
<g transform="scale({k})" data-piece-art="cartographers:outline" data-foe={foe} data-due={due ?? ''}>
  <defs>
    <clipPath id="ol-{id}"><path d={body} /></clipPath>
  </defs>
  <g clip-path="url(#ol-{id})">
    <rect x="10" y="10" width="80" height="80" fill="var(--parchment)" />
    <path d={hatch(9)} stroke="var(--ink-soft)" stroke-width="1.8" opacity="0.5" fill="none" />
  </g>
  <path d={body} fill="none" stroke="var(--parchment)" stroke-width="9" stroke-linejoin="round" />
  <path d={body} fill="none" stroke="var(--ink)" stroke-width="3.6" stroke-linejoin="round" stroke-dasharray="8 6" stroke-linecap="round" />
  <rect x="5" y="5" width="90" height="90" rx="3" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" opacity="0.7" />
  {#if due}
    <g transform="translate(82 82)">
      <circle r="11" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" />
      <text y="5.5" text-anchor="middle" font-size="15" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{due}</text>
    </g>
  {/if}
</g>
