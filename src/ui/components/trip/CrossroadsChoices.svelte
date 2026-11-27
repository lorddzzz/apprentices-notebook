<script lang="ts">
  import type { CrossroadsView } from '../../../app/crossroads';
  import ChoiceCard from './ChoiceCard.svelte';

  /**
   * UT-8. Every way on as a card. Push on is a card that only informs (its button is the primary
   * in `CrossroadsActions`); any other way (a span, a doorway) is a card you tap. The way home is
   * not here: it stays separate (UT-D7).
   */
  interface Props {
    view: CrossroadsView;
    onway: (id: string) => void;
  }

  let { view, onway }: Props = $props();
</script>

<div class="ways" data-testid="ways">
  {#each view.ways as w (w.id)}
    {#if w.id === 'push'}
      <ChoiceCard sub={w.sub} note={w.note} warn={w.warn} disabled={w.disabled} />
    {:else}
      <ChoiceCard
        label={w.label}
        note={w.note}
        sub={w.sub}
        warn={w.warn}
        disabled={w.disabled}
        onpick={() => onway(w.id)}
        testid={w.testid}
      />
    {/if}
  {/each}
</div>

<style>
  .ways {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
