<script lang="ts">
  import { hatch } from './look';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const d = $derived((data ?? {}) as { fate?: unknown; due?: unknown });
  const fate = $derived(d.fate === 'ink' || d.fate === 'rub' ? d.fate : null);
  const due = $derived(typeof d.due === 'number' && d.due > 0 ? d.due : null);
  const id = $props.id();
  // The planned pencil is hatched closer than the unplanned.
  const gap = $derived(fate === null ? 16 : 11);
</script>

<!--
  Pencil (CG-12): graphite hatching over the floor, a stronger lean once the hand has planned it.
  A planned tile wears its fate in the lower right, clear of the token: an ink blot (solid, drips)
  or an eraser smudge (a pale rubber over smeared streaks), and the round it falls due. Fates read
  by shape, not by colour.
-->
<g transform="scale({k})" data-piece-art="cartographers:pencil" data-fate={fate ?? 'none'} data-due={due ?? ''}>
  <defs>
    <clipPath id="pc-{id}"><rect x="5" y="5" width="90" height="90" rx="3" /></clipPath>
  </defs>
  <g clip-path="url(#pc-{id})">
    <path d={hatch(gap)} stroke="var(--ink-soft)" stroke-width={fate === null ? 2.2 : 3} opacity={fate === 'rub' ? 0.4 : 0.55} fill="none" />
    {#if fate === 'ink'}
      <path d={hatch(gap)} stroke="var(--ink)" stroke-width="1.6" opacity="0.4" fill="none" transform="translate(100 0) scale(-1 1)" />
    {/if}
  </g>
  <rect x="5" y="5" width="90" height="90" rx="3" fill="none" stroke="var(--ink-soft)" stroke-width="2.4" stroke-dasharray={fate === 'rub' ? '7 5' : fate === 'ink' ? undefined : '2 6'} stroke-linecap="round" opacity="0.8" />

  {#if fate}
    <g transform="translate(70 70)">
      <circle r="22" fill="var(--parchment)" stroke="var(--parchment)" stroke-width="4" />
      {#if fate === 'ink'}
        <g data-mark="ink">
          <path d="M-6 -17C4 -17 13 -9 12 0C13 9 5 15 -3 14C-12 15 -17 7 -15 -1C-17 -9 -12 -17 -6 -17Z" fill="var(--ink)" />
          <path d="M-2 13V21M6 10V18" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
          <circle cx="-6" cy="-7" r="3" fill="var(--parchment)" opacity="0.7" />
        </g>
      {:else}
        <g data-mark="rub">
          <path d="M-19 8Q-8 4 0 8T19 6M-19 14Q-8 10 0 14T19 12" fill="none" stroke="var(--ink-soft)" stroke-width="3" stroke-linecap="round" opacity="0.7" />
          <g transform="rotate(-24)">
            <rect x="-15" y="-13" width="30" height="17" rx="4" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3.2" />
            <path d="M-3 -13V4" stroke="var(--ink)" stroke-width="3" />
            <rect x="-15" y="-13" width="12" height="17" rx="4" fill="var(--ink-soft)" opacity="0.55" />
          </g>
        </g>
      {/if}
      {#if due}
        <g transform="translate(14 -18)">
          <circle r="11" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" />
          <text y="5.5" text-anchor="middle" font-size="15" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{due}</text>
        </g>
      {/if}
    </g>
  {/if}
</g>
