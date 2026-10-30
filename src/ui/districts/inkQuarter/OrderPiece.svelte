<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
</script>

<!--
  The standing order (IQ-15): a boxed ink-blue stamp with a falling drop, "whoever stands here at
  dusk is marked". The drop and box are the Ink mark's colour so the two read as cause and effect.
-->
<g transform="scale({k})" data-piece-art="inkQuarter:order">
  <rect x="14" y="14" width="72" height="72" rx="6" fill="var(--parchment)" fill-opacity="0.55" />
  <rect x="14" y="14" width="72" height="72" rx="6" fill="none" stroke="var(--m-ink)" stroke-width="6" />
  <rect x="23" y="23" width="54" height="54" rx="3" fill="none" stroke="var(--m-ink)" stroke-width="2.5" stroke-dasharray="4 3" />
  <path d="M50 30C42 44 38 50 38 58a12 12 0 0 0 24 0c0-8-4-14-12-28z" fill="var(--m-ink)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
  <path d="M26 82h48" stroke="var(--m-ink)" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 6" />
</g>
