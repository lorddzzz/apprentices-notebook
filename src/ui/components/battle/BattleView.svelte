<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DISTRICTS, type DistrictId } from '$data';
  import { canUndoMove, castableSpells, findUnit, members, roomsOf, tripParty } from '$engine';
  import { rulePreview } from '$engine/rules';
  import type { BattleSession } from '../../../app/battle.svelte';
  import { basicOf } from '../../../app/battleInput';
  import { actionLabel } from '../../../app/describe';
  import { game } from '../../../app/instance';
  import { spellChipModel } from '../../../app/spellChip';
  import { inSlotOrder } from '../../../app/view';
  import DistrictBanners from '../../districts/DistrictBanners.svelte';
  import BattleBoard from '../board/BattleBoard.svelte';
  import RuleMeter from '../board/RuleMeter.svelte';
  import ActionBar from './ActionBar.svelte';
  import BeatCard from './BeatCard.svelte';
  import BossHeader from './BossHeader.svelte';
  import Caption from './Caption.svelte';
  import EndOverlay, { type EndInspection, type EndSummary } from './EndOverlay.svelte';
  import FightHeader from './FightHeader.svelte';
  import Footer from './Footer.svelte';
  import LogSheet from './LogSheet.svelte';
  import PartyStrip from './PartyStrip.svelte';
  import Readout from './Readout.svelte';
  import RivalSheet from './RivalSheet.svelte';
  import SpellSheet from './SpellSheet.svelte';
  import TrickBanner from './TrickBanner.svelte';

  interface Props {
    session: BattleSession;
    /** Replaces the default top bar (the Lab puts its scenario picker here). */
    top: Snippet;
    continueLabel: string;
    oncontinue: () => void;
    /** The party in slot order for the strip; a trip's own slots by default, the battle's order in the Lab. */
    slots?: readonly string[];
    /** A trip fight's room: the district (header, scene and tile art) and whether it is an arena. */
    district?: DistrictId;
    arena?: boolean;
    /** The end overlay's extra lines (FT-23); absent = just the result. */
    summary?: EndSummary | null;
    inspection?: EndInspection | null;
    /**
     * The pocket notebook's slot (FT-27 mounts the sheet here). It gets whether the notebook is
     * open and how to close it; the header's notebook icon toggles that state.
     */
    pocket?: Snippet<[boolean, () => void]>;
  }

  let {
    session,
    top,
    continueLabel,
    oncontinue,
    slots,
    district,
    arena = false,
    summary = null,
    inspection = null,
    pocket,
  }: Props = $props();

  let logOpen = $state(false);
  let showNext = $state(false);
  let sheetOpen = $state(false);
  let pocketOpen = $state(false);

  // The fight's chrome (header, dark world, full bleed) is a trip fight's; Lab and the Threshold
  // keep their own top and the parchment page.
  const chrome = $derived(district !== undefined);
  const trip = $derived(session.mode === 'trip' ? game.save.trip : null);
  const room = $derived((trip?.encounter ?? 0) + 1);
  const rooms = $derived(trip ? roomsOf(trip).length : 0);
  const kit = $derived(district ? { district, arena } : undefined);

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
  // A gauge that spills over next round shows its warn tiles and harm rings unasked (BH-12).
  const danger = $derived(meters.some((m) => m.danger));
  const hasNext = $derived(
    view.tiles.some((t) => t.water) ||
      shapes.some((sh) => sh.kind !== 'meter') ||
      // Shapes a district adds in the app layer (the standing order's dusk marks, IQ-15).
      (session.overlay.next?.shapes.some((sh) => sh.kind !== 'meter') ?? false),
  );
  const selected = $derived.by(() => {
    const u = selectedId ? findUnit(battle, selectedId) : null;
    return u?.kind === 'member' ? u : null;
  });
  const spells = $derived(selected ? castableSpells(battle, selected.id) : []);
  const canBasic = $derived(
    !!selected && (basicOf(battle, selected.id)?.dirs.length ?? 0) > 0,
  );
  const canUndo = $derived(!!selected && canUndoMove(battle, selected.id));
  // The card is for a held beat; an ordinary step has none.
  const held = $derived.by(() => {
    const b = session.beat;
    return b && b.kind !== 'ordinary' ? { name: b.name, first: b.first, kind: b.kind } : null;
  });
  const chip = $derived(spellChipModel(spells, input));
  // The sheet is open only while it makes sense: nobody is selected, or a chain plays, closes it.
  const sheetShown = $derived(sheetOpen && !busy && !!selected);
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

<section
  class="battle"
  class:fight={chrome}
  data-world={chrome ? 'city' : undefined}
  data-district={district}
>
  {#if chrome && district}
    <FightHeader
      {district}
      title={DISTRICTS[district].name}
      round={battle.round}
      {room}
      {rooms}
      busy={busy}
      onpocket={() => (pocketOpen = !pocketOpen)}
    />
  {/if}
  <div class="body">
    <!-- Lab and Threshold put their own top here; the fight's own lines (banners, the boss, a
         rival's tricks) stay in flow until FT-21 folds them into the header and the board. -->
    <div class="lead" class:legacy={chrome}>
      {@render top()}
      <DistrictBanners {battle} trip={session.mode === 'trip' ? game.save.trip : null} log={session.log} />
      <TrickBanner tricks={session.overlay.tricks ?? []} />
      <BossHeader units={view.units} />
    </div>

    <div class="board-wrap" class:reserve={hasNext || meters.length > 0}>
      <BattleBoard
        view={session.view}
        overlay={session.overlay}
        fx={session.fx}
        fxKey={session.fxKey}
        playbackActive={busy}
        minimal={busy}
        showNext={showNext || danger}
        {kit}
        markers={session.markers}
        beat={session.beat}
        cellInputEpoch={() => session.cellInputEpoch}
        ontap={(at, pressedAt) => session.tapCell(at, pressedAt)}
        onhold={(at, pressedAt) => session.holdCell(at, pressedAt)}
      />
      <div class="board-top">
        <Caption text={session.caption.text} tone={session.caption.tone} />
        {#if busy}
          <Readout readout={session.readout} onspeedup={() => session.tapReadout()} />
        {/if}
      </div>
      <BeatCard beat={held} onspeedup={() => session.tapReadout()} onskip={() => session.skip()} />
      {#if meters.length > 0}
        <div class="meters">
          {#each meters as m, i (i)}
            <RuleMeter label={m.label} value={m.value} max={m.max} forecast={m.forecast} danger={m.danger} />
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
        <EndOverlay
          phase={battle.phase}
          label={continueLabel}
          {oncontinue}
          onlog={() => (logOpen = true)}
          {summary}
          {inspection}
        />
      {/if}
    </div>

    <!-- While a chain plays only the board (tap faster) and Skip answer; the rest is inert (FT-D4). -->
    <div class="stack-row" inert={busy}>
      <PartyStrip
        members={party}
        selected={selectedId}
        threatened={session.threatened}
        shown={busy ? view.units : null}
        onselect={(id) => session.selectMember(id)}
      />
    </div>

    <div class="stack-row actions-row" inert={busy}>
      <ActionBar
        member={selected}
        {spells}
        mode={input}
        {canBasic}
        {canUndo}
        onspell={(key) => session.chooseSpell(key)}
        onsheet={() => (sheetOpen = true)}
        onbasic={() => session.chooseBasic()}
        onundo={() => session.undoMove()}
      />
    </div>

    <Footer
      left={targeting && !busy ? 'cancel' : 'log'}
      {right}
      armed={session.armed}
      {confirmLabel}
      {hurtsParty}
      logLine={session.logLine}
      onlog={() => (logOpen = true)}
      oncancel={() => session.cancel()}
      onconfirm={() => session.confirm()}
      onendturn={() => session.endTurn()}
      onskip={() => session.skip()}
    />
  </div>
</section>

<RivalSheet view={session.rivalSheet} onclose={() => session.cancel()} />
<LogSheet open={logOpen} log={session.log} onclose={() => (logOpen = false)} />
<SpellSheet
  open={sheetShown}
  who={selected?.name ?? ''}
  {spells}
  {chip}
  onchoose={(key) => session.chooseSpell(key)}
  onclose={() => (sheetOpen = false)}
/>
{@render pocket?.(pocketOpen, () => (pocketOpen = false))}

<style>
  .battle {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    padding: 0 var(--space-2) 16px;
  }
  /* The trip's fight: the city night world, edge to edge (the screen's safe padding is taken back
     so the header's own inset and the page colour reach the notch). Stack gaps are 12 (FT-D9). */
  .battle.fight {
    --header-lift: 0px;
    height: calc(100% + var(--safe-top) + var(--safe-bottom));
    margin: calc(-1 * var(--safe-top)) calc(-1 * var(--safe-right)) calc(-1 * var(--safe-bottom))
      calc(-1 * var(--safe-left));
    background: var(--world-bg);
    color: var(--world-fg);
    font-family: var(--font-serif);
  }
  .fight .body {
    gap: 12px;
    padding: 0 calc(var(--space-2) + var(--safe-right)) calc(12px + var(--safe-bottom))
      calc(var(--space-2) + var(--safe-left));
  }
  /* Lines not yet folded into the header or the board stay readable on a paper strip. */
  .legacy {
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
  }
  .lead:not(:has(*)) {
    display: none;
  }
  .stack-row {
    flex: none;
  }
  .actions-row[inert] {
    opacity: 0.55;
  }
  .board-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 4;
    pointer-events: none;
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
    min-height: 44px;
    padding: 0 var(--space-3);
    border: 2px solid var(--shield);
    border-radius: 22px;
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
  /* The floating gauges and the Next round toggle get their own strip: they never cover a tile. */
  .board-wrap.reserve {
    padding-bottom: 46px;
  }
</style>
