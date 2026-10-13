<script lang="ts">
  import { interactionTitle } from '../../app/describe';
  import { game } from '../../app/instance';
  import Button from '../components/common/Button.svelte';
  import LootChips from '../components/trip/LootChips.svelte';

  const wipe = $derived(game.wipe);
</script>

{#if wipe}
  <section class="wiped" data-testid="wiped">
    <header>
      <h1>The party is wiped out.</h1>
      <p>They fell at {wipe.encounter.toLowerCase()}.</p>
    </header>

    <div class="mid">
      <div class="block">
        <h2>Lost with them</h2>
        {#if wipe.lost.length}
          <LootChips items={wipe.lost} lost />
        {:else}
          <p class="none">They had found nothing yet.</p>
        {/if}
      </div>

      <div class="block">
        <h2>The notebook keeps what you learned</h2>
        {#if wipe.learned.length}
          <ul class="learned" data-testid="learned">
            {#each wipe.learned as id (id)}
              <li class="chip">{interactionTitle(id)}</li>
            {/each}
          </ul>
        {:else}
          <p class="none">Nothing new this time.</p>
        {/if}
      </div>
    </div>
    <Button onclick={() => game.dismissWipe()} testid="back-to-study">Back to the study</Button>
  </section>
{/if}

<style>
  .wiped {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-4) var(--space-3) calc(var(--space-3) + 14px);
    background: linear-gradient(var(--parchment), var(--parchment-dark));
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: normal;
    color: var(--danger);
  }
  header p {
    margin: 4px 0 0;
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font: 13px var(--mono);
    color: var(--ink-soft);
  }
  .none {
    margin: 0;
    font-style: italic;
    color: var(--ink-soft);
  }
  .learned {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mid {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-4);
  }
  .wiped :global(.btn) {
    min-height: 56px;
    width: 100%;
    font-size: 18px;
  }
</style>
