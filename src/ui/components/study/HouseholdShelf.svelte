<script lang="ts">
  import { APPRENTICES, type ApprenticeId } from '$data';
  import type { Profile } from '$engine';
  import { benchOf, cardOf, seatsOf, TRIP_LOCK } from '../../../app/study';
  import { toast } from '../../../app/toasts.svelte';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Sheet from '../common/Sheet.svelte';
  import ApprenticeFull from './ApprenticeFull.svelte';
  import { type DropTarget, drag, dragCard } from './drag.svelte';
  import SeatCard from './SeatCard.svelte';

  interface Props {
    profile: Profile;
    /** A trip is out: the seats are fixed. */
    locked: boolean;
    /** Whose page the editor shows. */
    open: ApprenticeId;
    onopen: (id: ApprenticeId) => void;
    /** Fills a seat (the next free one unless given); returns why not, or null. */
    onbring: (id: ApprenticeId, seat?: 0 | 1 | 2) => string | null;
    /** Empties their seat; returns why not, or null. */
    onhome: (id: ApprenticeId) => string | null;
  }

  let { profile, locked, open, onopen, onbring, onhome }: Props = $props();

  // The sheet: the whole bench, or one card in detail.
  let sheet = $state<'bench' | ApprenticeId | null>(null);

  const seats = $derived(seatsOf(profile));
  const bench = $derived(benchOf(profile));
  const lock = $derived(locked ? TRIP_LOCK : null);
  const dragging = $derived(drag.current);
  const ghost = $derived(dragging ? APPRENTICES[dragging.id] : null);
  const detail = $derived(
    sheet && sheet !== 'bench' && profile.household.members.includes(sheet) ? cardOf(profile, sheet) : null,
  );

  function say(why: string | null): boolean {
    if (why) toast(why, 'warn');
    return why === null;
  }

  function bring(id: ApprenticeId, seat?: 0 | 1 | 2): void {
    if (say(onbring(id, seat))) sheet = null;
  }

  function home(id: ApprenticeId): void {
    if (say(onhome(id))) sheet = null;
  }

  function opened(id: ApprenticeId): void {
    sheet = null;
    onopen(id);
  }

  function dropped(id: ApprenticeId, target: DropTarget | null): void {
    if (!target) return;
    if (target.kind === 'slot') bring(id, target.slot);
    else home(id);
  }

  function fillSeat(): void {
    if (bench.length === 0) toast('Nobody else is waiting on the bench');
    else sheet = 'bench';
  }
</script>

<section class="shelf" aria-label="The household" data-testid="shelf">
  <div class="row" style:--n={seats.length}>
    {#each seats as id, i (i)}
      <SeatCard
        seat={i as 0 | 1 | 2}
        card={id ? cardOf(profile, id) : null}
        open={id === open}
        over={dragging?.over?.kind === 'slot' && dragging.over.slot === i}
        onopen={opened}
        ondetail={(who) => (sheet = who)}
        onfill={fillSeat}
        ondrop={dropped}
      />
    {/each}
    <button
      type="button"
      class="benchtab"
      class:over={dragging?.over?.kind === 'bench'}
      data-drop="bench"
      data-testid="bench-open"
      aria-label="The bench, {bench.length} waiting"
      onclick={() => (sheet = 'bench')}
    >
      <span class="count">{bench.length}</span>
      <span class="word">Bench</span>
    </button>
  </div>
  {#if locked}<p class="lock" data-testid="shelf-lock">{TRIP_LOCK}</p>{/if}
</section>

<div class="sheets" class:dragging={dragging !== null}>
  <Sheet open={sheet === 'bench'} title="The bench" onclose={() => (sheet = null)}>
    {#if bench.length === 0}
      <p class="hint" data-testid="bench-empty">Nobody is waiting on the bench.</p>
    {:else}
      <p class="hint">
        Bring fills the next free seat. Or hold a card and drag it onto a seat.
      </p>
      <ul class="cards">
        {#each bench as id (id)}
          <li use:dragCard={{ id, ondrop: dropped }}>
            <ApprenticeFull
              card={cardOf(profile, id)}
              {lock}
              onopen={() => opened(id)}
              onbring={() => bring(id)}
              onhome={() => home(id)}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </Sheet>
  <Sheet open={detail !== null} title={detail?.def.name ?? ''} onclose={() => (sheet = null)}>
    {#if detail}
      <ApprenticeFull
        card={detail}
        {lock}
        onopen={() => opened(detail.def.id)}
        onbring={() => bring(detail.def.id)}
        onhome={() => home(detail.def.id)}
      />
    {/if}
  </Sheet>
</div>

{#if dragging && ghost}
  <div class="ghost" style:left="{dragging.x}px" style:top="{dragging.y}px" aria-hidden="true">
    <ApprenticeToken def={ghost} size={22} />
    <span>{ghost.name}</span>
  </div>
{/if}

<style>
  .shelf {
    flex: none;
    padding: var(--space-2) var(--space-2) 0;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr)) 52px;
    gap: 6px;
    align-items: stretch;
  }
  .benchtab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    padding: 0;
    border: 2px solid var(--wood-deep);
    border-radius: var(--radius);
    background: linear-gradient(var(--wood), var(--wood-dark));
    color: var(--parchment);
    cursor: pointer;
  }
  .benchtab.over {
    outline: 3px solid var(--lamp);
    outline-offset: 1px;
  }
  .count {
    font-size: 20px;
    line-height: 1;
  }
  .word {
    font-size: 11px;
    opacity: 0.85;
  }
  .lock {
    margin: 4px 0 0;
    font-size: 12px;
    text-align: center;
    color: rgba(241, 230, 204, 0.75);
  }
  .hint {
    margin: 0 0 var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* A card dragged out of a sheet: the sheet steps aside so the seats can be reached. */
  .sheets {
    display: contents;
  }
  .sheets.dragging :global(.overlay) {
    opacity: 0;
    pointer-events: none;
  }
  .ghost {
    position: fixed;
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 6px;
    border: 2px solid var(--lamp);
    border-radius: 999px;
    background: var(--parchment);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
    font-size: 14px;
    pointer-events: none;
    transform: translate(-50%, -130%);
  }
</style>
