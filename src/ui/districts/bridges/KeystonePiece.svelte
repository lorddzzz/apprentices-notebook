<script lang="ts">
  import { bridgeArtOf } from './board';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const art = $derived(bridgeArtOf(data));
  const worn = $derived(art.stone < art.max);
</script>

<!--
  The keystone (BR-14): the great arch's wedge, a pier with its own HP. A brass-edged wedge with
  pips for the HP left along the top (the base is left clear for a unit's HP label); once worn a crack runs through it. At 0 it shatters (the
  tile turns to fog, so this art is never drawn at 0).
-->
<g transform="scale({k})" data-piece-art="bridges:keystone" data-hp={art.stone}>
  <g transform="translate(0 11) scale(1 0.7)">
    <path d="M26 8H74L92 90H8Z" fill="var(--parchment-deep)" stroke="var(--m-brass-dark)" stroke-width="5" stroke-linejoin="round" />
    <path d="M34 18H66L80 80H20Z" fill="none" stroke="var(--m-brass)" stroke-width="3" stroke-linejoin="round" />
    {#if worn}
      <path d="M56 20L48 40L60 54L50 70" fill="none" stroke="var(--ink)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    {/if}
  </g>
  {#each Array.from({ length: art.max }, (_, i) => i) as i (i)}
    {@const step = Math.min(11, 88 / art.max)}
    {@const x = 50 - (art.max * step - 3) / 2 + i * step}
    <rect x={x} y="2" width={step - 3} height="7" rx="1.5" fill={i < art.stone ? 'var(--m-brass-dark)' : 'none'} stroke="var(--ink)" stroke-width="1.5" />
  {/each}
</g>
