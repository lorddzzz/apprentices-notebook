<script lang="ts">
  import { ENCOUNTERS } from '$data';
  import { encounterTitle } from '../../app/describe';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import Button from '../components/common/Button.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';

  const trip = $derived(game.save.trip);
  const next = $derived(trip ? trip.encounter + 1 : 0);
</script>

{#if trip}
  <section class="crossroads" data-testid="crossroads">
    <header>
      <h1>The Seam goes on.</h1>
      <p>You are deeper than the lamplight reaches. Look at what you have left.</p>
    </header>

    <div class="mid">
      <TripStatus {trip} profile={game.profile} large />

      <div class="finds">
        <h2>Carried, not yet safe</h2>
        <LootChips items={trip.loot} />
      </div>
    </div>

    <div class="choices">
      <Button onclick={() => game.pushOn()} testid="push">
        <span class="big">Push on</span>
        <span class="sub">{encounterTitle(next)} (depth {next + 1} of {ENCOUNTERS.length})</span>
      </Button>
      <Button variant="quiet" onclick={() => game.returnHome()} testid="return">
        <span class="big">Return home</span>
        <span class="sub">keep {trip.loot.length} {trip.loot.length === 1 ? 'find' : 'finds'}</span>
      </Button>
      <a class="link" href={href('codex')}>Read the notebook</a>
    </div>
  </section>
{/if}

<style>
  .crossroads {
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
    font-size: 13px;
    font-weight: normal;
    font-family: var(--mono);
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
  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .choices :global(.btn) {
    flex-direction: column;
    gap: 0;
    min-height: 60px;
    width: 100%;
  }
  .big {
    font-size: 19px;
  }
  .sub {
    font-size: 13px;
    opacity: 0.85;
  }
  .link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
  }
</style>
