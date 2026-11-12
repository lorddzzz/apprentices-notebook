<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const note = $derived(Number((data as { note?: unknown } | null)?.note ?? 0));
</script>

<!-- An empty hook (BF-18): iron on the beam, where a rung great bell will hang; a named note shows its number. -->
<g transform="scale({k})" data-piece-art="foundry:hook" data-note={note}>
  <rect x="26" y="14" width="48" height="10" rx="4" fill="var(--ink)" stroke="#f1e6cc" stroke-width="4" paint-order="stroke" />
  <path d="M50 24V52Q50 74 34 70Q26 66 32 58" fill="none" stroke="#f1e6cc" stroke-width="13" stroke-linecap="round" />
  <path d="M50 24V52Q50 74 34 70Q26 66 32 58" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linecap="round" />
  {#if note > 0}
    <text x="68" y="76" text-anchor="middle" font-size="26" font-weight="bold" fill="var(--ink)" stroke="#f1e6cc" stroke-width="4" paint-order="stroke" font-family="Georgia, serif">{note}</text>
  {/if}
</g>
