<script lang="ts">
  import { fallbackLine } from '../../../app/lootviews';
  import CardFace from './CardFace.svelte';

  let { item }: { item: unknown } = $props();

  const kind = $derived(
    typeof item === 'object' && item !== null && 'kind' in item ? String(item.kind) : '',
  );
  const line = $derived(fallbackLine({ kind }));
</script>

<CardFace title={line.title} text={line.text}>
  {#snippet mark()}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A find">
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
      <path d="M20 11l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7-5.9-3.7-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5z" fill="none" stroke="var(--ink-soft)" stroke-width="1.6" stroke-linejoin="round" />
    </svg>
  {/snippet}
</CardFace>
