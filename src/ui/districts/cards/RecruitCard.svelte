<script lang="ts">
  import { recruitCard } from '../../../app/lootviews';
  import ApprenticeToken from '../../components/common/ApprenticeToken.svelte';
  import CardFace from './CardFace.svelte';
  import FallbackCard from './FallbackCard.svelte';

  let { item }: { item: unknown } = $props();

  const apprentice = $derived(
    typeof item === 'object' && item !== null && 'apprentice' in item
      ? String(item.apprentice)
      : '',
  );
  const card = $derived(recruitCard({ apprentice }));
</script>

{#if card}
  <CardFace title={card.title} text={card.text}>
    {#snippet mark()}
      <span data-testid="recruit-token"><ApprenticeToken def={card.def} size={52} label /></span>
    {/snippet}
  </CardFace>
{:else}
  <FallbackCard item={{ kind: 'recruit' }} />
{/if}
