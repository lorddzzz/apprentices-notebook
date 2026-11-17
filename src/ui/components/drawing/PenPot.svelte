<script lang="ts">
  interface Props {
    /** How full the pot is, 0 to 1 (over the pen reads as full and red). */
    fill: number;
    over: boolean;
    label: string;
  }

  let { fill, over, label }: Props = $props();
  const TOP = 6;
  const HEIGHT = 30;
  const level = $derived(Math.max(0, Math.min(1, fill)) * HEIGHT);
</script>

<svg class="pot" class:over width="36" height="44" viewBox="0 0 36 44" role="img" aria-label={label}>
  <rect x="5" y={TOP + HEIGHT - level} width="26" height={level} class="ink" />
  <path d="M5 6 V34 Q5 40 11 40 H25 Q31 40 31 34 V6" class="glass" />
  <path d="M3 6 H33" class="glass" />
</svg>

<style>
  .pot {
    flex: none;
  }
  .glass {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .ink {
    fill: var(--m-ink);
  }
  .over .ink {
    fill: var(--danger);
  }
</style>
