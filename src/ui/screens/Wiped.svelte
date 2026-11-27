<script lang="ts">
  import { wipeLine } from '$data/narration';
  import { namedTitle } from '../../app/describe';
  import { game } from '../../app/instance';
  import ArtImage from '../art/ArtImage.svelte';
  import type { ArtId } from '../art/registry';
  import ActionButton from '../components/common/ActionButton.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import SeeItSheet from '../components/trip/SeeItSheet.svelte';
  import WipedLines from '../components/trip/WipedLines.svelte';

  const wipe = $derived(game.wipe);
  let seeing = $state(false);
</script>

{#snippet dusk()}
  <svg viewBox="0 0 375 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M0 170 L120 140 L255 140 L375 170 L375 220 L0 220 Z" fill="var(--city-stone)" opacity="0.6" />
    <rect x="186" y="96" width="3" height="60" fill="var(--ink-soft)" opacity="0.7" />
    <circle cx="187" cy="92" r="6" fill="var(--lamp)" opacity="0.5" />
  </svg>
{/snippet}

{#if wipe}
  <section class="wiped" data-world="city" data-testid="wiped">
    <div class="scene" aria-hidden="true">
      <ArtImage id={'scenes/shared/wiped' as ArtId} fit="cover" fallback={dusk} />
    </div>

    <div class="body">
      <h1>{wipeLine(wipe.encounter)}</h1>

      <WipedLines
        encounter={wipe.encounter}
        cause={wipe.cause}
        rooms={wipe.rooms}
        onsee={wipe.final ? () => (seeing = true) : undefined}
      />

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
              <li class="chip new">{namedTitle(id)}</li>
            {/each}
          </ul>
        {:else}
          <p class="none">Nothing new this time.</p>
        {/if}
      </div>
    </div>

    <footer>
      <ActionButton onclick={() => game.dismissWipe()} testid="back-to-study">Home</ActionButton>
      <ActionButton kind="secondary" onclick={() => game.readTrip()} testid="read-trip"
        >Read the trip</ActionButton
      >
    </footer>

    {#if wipe.final}
      <SeeItSheet open={seeing} final={wipe.final} onclose={() => (seeing = false)} />
    {/if}
  </section>
{/if}

<style>
  .wiped {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: var(--font-serif);
    color: var(--ink);
    background: linear-gradient(var(--parchment), var(--parchment-dark));
  }
  .scene {
    flex: none;
    height: 220px;
    overflow: hidden;
    background: linear-gradient(var(--city-night), var(--city-stone));
  }
  .scene :global(img),
  .scene :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .body {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: var(--space-4);
    min-height: 0;
    padding: var(--space-3);
    overflow-y: auto;
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: normal;
    color: var(--danger);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--type-sm);
    font-weight: normal;
    font-variant-caps: all-small-caps;
    letter-spacing: 0.06em;
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
  .chip.new {
    border-color: var(--gold);
  }
  footer {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3) calc(var(--space-3) + 14px);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
  footer :global(.action) {
    width: 100%;
    min-height: 52px;
    font-size: 18px;
  }
</style>
