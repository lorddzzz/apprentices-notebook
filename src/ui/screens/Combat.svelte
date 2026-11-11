<script lang="ts">
  import { roomsOf, tripParty } from '$engine';
  import { game } from '../../app/instance';
  import BattleView from '../components/battle/BattleView.svelte';
  import TopBar from '../components/battle/TopBar.svelte';
  import { roomLineFor } from '../districts';

  // The save says "fight"; the live battle is built from it (also after a reload).
  $effect(() => {
    game.ensureBattle();
  });

  const session = $derived(game.battle);
  // The strip follows the party's slots, not whoever the battle listed first.
  const slots = $derived(tripParty(game.profile));
  const depth = $derived((game.save.trip?.encounter ?? 0) + 1);
  const rooms = $derived(game.save.trip ? roomsOf(game.save.trip).length : 0);
  // A district's line under the header (the canals' bonus pick, CN-10).
  const RoomLine = $derived(roomLineFor(game.save.trip?.district));
</script>

{#if session}
  {#key session}
    <BattleView
      {session}
      {slots}
      continueLabel={session.state.phase === 'lost' ? 'See what is lost' : 'Gather the spoils'}
      oncontinue={() => game.finishBattle()}
    >
      {#snippet top()}
        <TopBar title={session.state.title} round={session.state.round}>
          <span class="depth">Depth {depth} / {rooms}</span>
        </TopBar>
        {#if RoomLine && game.save.trip}<RoomLine trip={game.save.trip} view={session.view} />{/if}
      {/snippet}
    </BattleView>
  {/key}
{/if}

<style>
  .depth {
    flex: none;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
</style>
