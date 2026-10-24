<script lang="ts">
  import type { Snippet } from 'svelte';
  import { canUndoMove, castableSpells, findUnit, members, tripParty } from '$engine';
  import { rulePreview } from '$engine/rules';
  import type { BattleSession } from '../../../app/battle.svelte';
  import { basicOf } from '../../../app/battleInput';
  import { actionLabel } from '../../../app/describe';
  import { game } from '../../../app/instance';
  import { inSlotOrder } from '../../../app/view';
  import BattleBoard from '../board/BattleBoard.svelte';
  import RuleMeter from '../board/RuleMeter.svelte';
  import ActionBar from './ActionBar.svelte';
  import BossHeader from './BossHeader.svelte';
  import Caption from './Caption.svelte';
  import EndOverlay from './EndOverlay.svelte';
  import Footer from './Footer.svelte';
  import LogSheet from './LogSheet.svelte';
  import PartyStrip from './PartyStrip.svelte';

  interface Props {
    session: BattleSession;
    /** Replaces the default top bar (the Lab puts its scenario picker here). */
    top: Snippet;
    continueLabel: string;
    oncontinue: () => void;
    /** The party in slot order for the strip; a trip's own slots by default, the battle's order in the Lab. */
    slots?: readonly string[];
  }

  let { session, top, continueLabel, oncontinue, slots }: Props = $props();

  let logOpen = $state(false);
  let showNext = $state(false);

  const view = $derived(session.view);
  const battle = $derived(session.state);
  const input = $derived(session.input);
  const busy = $derived(session.busy);
  const selectedId = $derived(session.selected);
  const order = $derived(slots ?? (session.mode === 'trip' ? tripParty(game.profile) : undefined));
  const party = $derived(inSlotOrder(members(battle), order));
  // The rules' gauges are always on; the rest of "Next round" shows on request.
  const shapes = $derived(rulePreview(battle).flatMap((r) => [...r.shapes]));
  const meters = $derived(shapes.flatMap((sh) => (sh.kind === 'meter' ? [sh] : [])));
  const hasNext = $derived(view.tiles.some((t) => t.water) || shapes.some((sh) => sh.kind !== 'meter'));
  const selected = $derived.by(() => {
    const u = selectedId ? findUnit(battle, selectedId) : null;
    return u?.kind === 'member' ? u : null;
  });
  const spells = $derived(selected ? castableSpells(battle, selected.id) : []);
  const canBasic = $derived(
    !!selected && (basicOf(battle, selected.id)?.dirs.length ?? 0) > 0,
  );
  const canUndo = $derived(!!selected && canUndoMove(battle, selected.id));
  const targeting = $derived(
    input.kind === 'aim' || input.kind === 'basic' || input.kind === 'confirm',
  );
  const right = $derived(
    busy
      ? 'skip'
      : battle.phase !== 'player'
        ? 'none'
        : input.kind === 'confirm'
          ? 'confirm'
          : targeting
            ? 'confirm-wait'
            : 'end',
  );
  const confirmLabel = $derived(
    input.kind === 'confirm' ? actionLabel(battle, input.preview.action) : '',
  );
  // D3, P42: the confirm button says so when the party would be hurt.
  const hurtsParty = $derived(input.kind === 'confirm' && input.preview.hurt.length > 0);
</script>

<section class="battle">
  {@render top()}
  <BossHeader units={view.units} />

  <div class="board-wrap">
    <BattleBoard
      view={session.view}
      overlay={session.overlay}
      fx={session.fx}
      fxKey={session.fxKey}
      minimal={busy}
      {showNext}
      ontap={(at) => session.tapCell(at)}
      onhold={(at) => session.holdCell(at)}
    />
    {#if meters.length > 0}
      <div class="meters">
        {#each meters as m, i (i)}
          <RuleMeter label={m.label} value={m.value} max={m.max} />
        {/each}
      </div>
    {/if}
    {#if hasNext}
      <button
        class="next"
        class:on={showNext}
        type="button"
        aria-pressed={showNext}
        data-testid="next-toggle"
        onclick={() => (showNext = !showNext)}
      >
        Next round
      </button>
    {/if}
    {#if session.over && (battle.phase === 'won' || battle.phase === 'lost')}
      <EndOverlay phase={battle.phase} label={continueLabel} {oncontinue} onlog={() => (logOpen = true)} />
    {/if}
  </div>

  <Caption text={session.caption.text} tone={session.caption.tone} ontap={() => session.skip()} />

  <PartyStrip
    members={party}
    selected={selectedId}
    threatened={session.threatened}
    onselect={(id) => session.selectMember(id)}
  />

  <ActionBar
    member={selected}
    {spells}
    mode={input}
    {canBasic}
    {canUndo}
    onspell={(key) => session.chooseSpell(key)}
    onbasic={() => session.chooseBasic()}
    onundo={() => session.undoMove()}
  />

  <Footer
    left={targeting && !busy ? 'cancel' : 'log'}
    {right}
    armed={session.armed}
    {confirmLabel}
    {hurtsParty}
    onlog={() => (logOpen = true)}
    oncancel={() => session.cancel()}
    onconfirm={() => session.confirm()}
    onendturn={() => session.endTurn()}
    onskip={() => session.skip()}
  />
</section>

<LogSheet open={logOpen} log={session.log} onclose={() => (logOpen = false)} />

<style>
  .battle {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 0 var(--space-2) 16px;
  }
  .meters {
    position: absolute;
    bottom: 2px;
    left: 2px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-width: calc(100% - 118px);
  }
  .next {
    position: absolute;
    bottom: 2px;
    right: 2px;
    z-index: 2;
    min-height: 32px;
    padding: 0 var(--space-2);
    border: 2px solid var(--shield);
    border-radius: 16px;
    background: var(--parchment);
    color: var(--ink);
    font-size: 13px;
  }
  .next.on {
    background: var(--shield);
    color: #fff;
  }
  .board-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
