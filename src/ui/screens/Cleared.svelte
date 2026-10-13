<script lang="ts">
  import { game } from '../../app/instance';
  import Button from '../components/common/Button.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';

  const trip = $derived(game.save.trip);
</script>

{#if trip}
  <section class="cleared" data-testid="cleared">
    <header>
      <h1>The heart of the Seam is quiet.</h1>
      <p>Nothing deeper answers. Take it all home.</p>
    </header>

    <div class="mid">
      <TripStatus {trip} profile={game.profile} large />

      <div class="finds">
        <h2>Carried home</h2>
        <LootChips items={trip.loot} />
      </div>
    </div>

    <Button onclick={() => game.returnHome()} testid="return">
      Return home with {trip.loot.length} {trip.loot.length === 1 ? 'find' : 'finds'}
    </Button>
  </section>
{/if}

<style>
  .cleared {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-3) var(--space-3) calc(var(--space-3) + 14px);
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: normal;
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
  .mid {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-3);
    min-height: 0;
    overflow-y: auto;
  }
  .cleared :global(.btn) {
    min-height: 56px;
    width: 100%;
    font-size: 18px;
  }
</style>
