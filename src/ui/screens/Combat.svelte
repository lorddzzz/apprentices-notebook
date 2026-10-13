<script lang="ts">
  import { ENCOUNTERS } from '$data';
  import { game } from '../../app/instance';
  import BattleView from '../components/battle/BattleView.svelte';
  import TopBar from '../components/battle/TopBar.svelte';

  // The save says "fight"; the live battle is built from it (also after a reload).
  $effect(() => {
    game.ensureBattle();
  });

  const session = $derived(game.battle);
  const depth = $derived((game.save.trip?.encounter ?? 0) + 1);
</script>

{#if session}
  {#key session}
    <BattleView
      {session}
      continueLabel={session.state.phase === 'lost' ? 'See what is lost' : 'Gather the spoils'}
      oncontinue={() => game.finishBattle()}
    >
      {#snippet top()}
        <TopBar title={session.state.title} round={session.state.round}>
          <span class="depth">Depth {depth} / {ENCOUNTERS.length}</span>
        </TopBar>
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
