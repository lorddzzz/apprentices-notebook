<script lang="ts">
  import type { Snippet } from 'svelte';
  import { canUndoMove, castableSpells, findUnit, members, shoveDirs } from '$engine';
  import type { BattleSession } from '../../../app/battle.svelte';
  import { actionLabel } from '../../../app/describe';
  import BattleBoard from '../board/BattleBoard.svelte';
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
  }

  let { session, top, continueLabel, oncontinue }: Props = $props();

  let logOpen = $state(false);
  let showDrift = $state(false);

  const view = $derived(session.view);
  const battle = $derived(session.state);
  const input = $derived(session.input);
  const busy = $derived(session.busy);
  const selectedId = $derived(session.selected);
  const selected = $derived.by(() => {
    const u = selectedId ? findUnit(battle, selectedId) : null;
    return u?.kind === 'member' ? u : null;
  });
  const spells = $derived(selected ? castableSpells(battle, selected.id) : []);
  const canShove = $derived(
    !!selected && !selected.acted && shoveDirs(battle, selected.id).length > 0,
  );
  const canUndo = $derived(!!selected && canUndoMove(battle, selected.id));
  const targeting = $derived(
    input.kind === 'aim' || input.kind === 'shove' || input.kind === 'confirm',
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
      {showDrift}
      ontap={(at) => session.tapCell(at)}
    />
    {#if view.tiles.some((t) => t.water)}
      <button
        class="drift"
        class:on={showDrift}
        type="button"
        aria-pressed={showDrift}
        data-testid="drift-toggle"
        onclick={() => (showDrift = !showDrift)}
      >
        Current
      </button>
    {/if}
    {#if session.over && (battle.phase === 'won' || battle.phase === 'lost')}
      <EndOverlay phase={battle.phase} label={continueLabel} {oncontinue} onlog={() => (logOpen = true)} />
    {/if}
  </div>

  <Caption text={session.caption.text} tone={session.caption.tone} ontap={() => session.skip()} />

  <PartyStrip
    members={members(battle)}
    selected={selectedId}
    threatened={session.threatened}
    onselect={(id) => session.selectMember(id)}
  />

  <ActionBar
    member={selected}
    {spells}
    mode={input}
    {canShove}
    {canUndo}
    onspell={(key) => session.chooseSpell(key)}
    onshove={() => session.chooseShove()}
    onundo={() => session.undoMove()}
  />

  <Footer
    left={targeting && !busy ? 'cancel' : 'log'}
    {right}
    armed={session.armed}
    {confirmLabel}
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
  .drift {
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
  .drift.on {
    background: var(--shield);
    color: #fff;
  }
  .board-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
