<script lang="ts">
  import { encountersOf } from '$data';
  import { tripParty } from '$engine';
  import { shapeOf } from '$engine/trip/shape';
  import { openTermLine } from '../../app/inkTerms';
  import { game } from '../../app/instance';
  import BattleView from '../components/battle/BattleView.svelte';
  import TopBar from '../components/battle/TopBar.svelte';
  import { BonusLine } from '../districts/canals';
  import { TermBanner } from '../districts/inkQuarter';

  // The save says "fight"; the live battle is built from it (also after a reload).
  $effect(() => {
    game.ensureBattle();
  });

  const session = $derived(game.battle);
  // The strip follows the party's slots, not whoever the battle listed first.
  const slots = $derived(tripParty(game.profile));
  const depth = $derived((game.save.trip?.encounter ?? 0) + 1);
  const rooms = $derived(encountersOf(game.save.trip?.district ?? 'seam').length);
  // The room's optional bonus (CN-10): a crate goal reads its state off the board.
  const bonus = $derived.by(() => {
    const trip = game.save.trip;
    return trip ? (shapeOf(trip.district).bonuses?.[trip.encounter] ?? null) : null;
  });
  // A signed ink-quarter term, with the live round count (IQ-17).
  const term = $derived(openTermLine(game.save.trip, session?.state.round ?? 1));
  const bonusStatus = $derived.by(() => {
    const crate = session?.view.units.find((u) => u.def === 'barge');
    if (!crate || !bonus || !('happens' in bonus.goal)) return 'open';
    return crate.moored ? 'met' : crate.alive ? 'open' : 'lost';
  });
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
        {#if bonus}<BonusLine text={bonus.text} status={bonusStatus} />{/if}
        {#if term}<TermBanner line={term} />{/if}
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
