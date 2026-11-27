<script lang="ts">
  import { roomsOf, tripParty } from '$engine';
  import { game } from '../../app/instance';
  import BattleView from '../components/battle/BattleView.svelte';
  import { roomLineFor } from '../districts';

  // The save says "fight"; the live battle is built from it (also after a reload).
  $effect(() => {
    game.ensureBattle();
  });

  const session = $derived(game.battle);
  // The strip follows the party's slots, not whoever the battle listed first.
  const slots = $derived(tripParty(game.profile));
  const trip = $derived(game.save.trip);
  const district = $derived(trip?.district);
  // The heart room is the district's arena (FT-D7): a boss fights on the arena floor.
  const arena = $derived(trip ? (roomsOf(trip)[trip.encounter]?.heart ?? false) : false);
  // The inspection rules (RV-8): what the household has witnessed, null when nothing is masked.
  const inspection = $derived({ witnessed: new Set<string>(game.profile.witnessed) });
  // A district's line under the header (the canals' bonus pick, CN-10).
  const RoomLine = $derived(roomLineFor(game.save.trip?.district));
</script>

{#if session}
  {#key session}
    <BattleView
      {session}
      {slots}
      {district}
      {arena}
      {inspection}
      continueLabel={session.state.phase === 'lost' ? 'See what is lost' : 'Gather the spoils'}
      oncontinue={() => game.finishBattle()}
    >
      {#snippet top()}
        {#if RoomLine && trip}<RoomLine {trip} view={session.view} />{/if}
      {/snippet}
    </BattleView>
  {/key}
{:else if game.inking}
  <p class="inking" data-testid="inking">
    {game.inkFailed ? 'The room would not ink.' : 'inking the room…'}
  </p>
  {#if game.inkFailed}
    <div class="failed">
      <button type="button" data-testid="ink-retry" onclick={() => game.retryInking()}>Try again</button>
      <button type="button" data-testid="ink-home" onclick={() => game.leaveInking()}>Home</button>
    </div>
  {/if}
{/if}

<style>
  .inking {
    margin: 0;
    padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) var(--space-4);
    font-family: var(--hand);
    font-size: 20px;
    text-align: center;
    color: var(--ink-soft);
  }
  .failed {
    display: flex;
    justify-content: center;
    gap: var(--space-3);
  }
  .failed button {
    min-width: 96px;
    min-height: 44px;
    font-family: var(--hand);
    font-size: 18px;
    color: var(--ink);
    background: none;
    border: 0;
    border-bottom: 2px solid var(--ink);
    cursor: pointer;
  }
</style>
