<script lang="ts">
  import { bridgeArtOf } from '../../../app/bridgeView';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const art = $derived(bridgeArtOf(data));
  /** sound = full stone; chipped = worn but standing; cracked = broken or cut off from every pier. */
  const state = $derived(art.cracked ? 'cracked' : art.stone < art.max ? 'chipped' : 'sound');
  const broken = $derived(art.stone <= 0);
</script>

<!--
  A span tile (BR-14): one slab of arch-stone laid flat over the fog. Three states, told apart by
  shape and not by colour alone. Sound: a clean slab with two mortar joints. Chipped: a corner
  bitten off and one hairline crack, still standing. Cracked: the slab split by a bold zig-zag,
  its halves drifting apart and the face dimmed, dashed outline (the section's own outline is drawn
  by the board's bridge layer). Broken stone (0) is split wider than a section that is only cut off.
-->
<g transform="scale({k})" data-piece-art="bridges:span" data-stone-state={state}>
  {#if state === 'sound'}
    <rect x="5" y="9" width="90" height="82" rx="6" fill="var(--parchment-deep)" stroke="var(--ink-soft)" stroke-width="3.5" />
    <path d="M5 50H95M50 9V50M30 50V91M72 50V91" stroke="var(--ink-soft)" stroke-width="2.2" opacity="0.55" />
    <rect x="9" y="13" width="82" height="74" rx="4" fill="none" stroke="var(--parchment)" stroke-width="2" opacity="0.7" />
  {:else if state === 'chipped'}
    <path d="M5 15Q5 9 11 9H62L70 20L84 18L95 26V85Q95 91 89 91H11Q5 91 5 85Z" fill="var(--parchment-deep)" stroke="var(--ink-soft)" stroke-width="3.5" stroke-linejoin="round" />
    <path d="M5 50H95M50 9V50M30 50V91M72 50V91" stroke="var(--ink-soft)" stroke-width="2.2" opacity="0.45" />
    <path d="M62 9L56 30L66 42L58 58" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M70 20L84 18L95 26" fill="none" stroke="var(--parchment)" stroke-width="2" opacity="0.8" />
  {:else}
    <g transform="translate({broken ? -4 : -2} {broken ? 2 : 1})">
      <path d="M5 15Q5 9 11 9H46L38 34L52 50L40 66L46 91H11Q5 91 5 85Z" fill="var(--parchment-dark)" stroke="var(--ink-soft)" stroke-width="3.5" stroke-linejoin="round" stroke-dasharray="9 5" />
    </g>
    <g transform="translate({broken ? 4 : 2} {broken ? -2 : -1})">
      <path d="M54 9H89Q95 9 95 15V85Q95 91 89 91H50L44 66L56 50L42 34Z" fill="var(--parchment-dark)" stroke="var(--ink-soft)" stroke-width="3.5" stroke-linejoin="round" stroke-dasharray="9 5" />
    </g>
    <path d="M46 6L38 34L52 50L40 66L47 94" fill="none" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M46 6L38 34L52 50L40 66L47 94" fill="none" stroke="var(--parchment)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  {/if}
</g>
