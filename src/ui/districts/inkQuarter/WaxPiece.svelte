<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const rounds = $derived(
    typeof data === 'object' && data !== null && 'rounds' in data && typeof data.rounds === 'number'
      ? data.rounds
      : 2,
  );
  const BLOB =
    'M50 14c9 0 12 6 20 8s12 8 10 17c-2 8 4 12 2 21s-8 12-16 14-14 8-22 6-12-8-19-12-8-12-6-20-4-13 2-20 12-10 29-14z';
</script>

<!--
  The wax seal (IQ-16): a red wax disc with a pressed ring, over the tile. One notch per round it
  has left, so a one-round seal reads as nearly spent. Non-solid; a unit's token draws above it
  and the "held" padlock marks whoever it holds.
-->
<g transform="scale({k})" data-piece-art="inkQuarter:wax" data-rounds={rounds}>
  <path d={BLOB} fill="var(--danger)" stroke="var(--parchment)" stroke-width="8" stroke-linejoin="round" paint-order="stroke" />
  <path d={BLOB} fill="var(--danger)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
  <circle cx="50" cy="50" r="20" fill="none" stroke="var(--parchment)" stroke-width="3" opacity="0.7" />
  {#each { length: rounds } as _, i (i)}
    <circle cx={50 + (i - (rounds - 1) / 2) * 12} cy="84" r="4" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2" />
  {/each}
</g>
