<script lang="ts">
  import { APPRENTICES, type ApprenticeId } from '$data';
  import type { Profile } from '$engine';
  import { benchOf, cardOf, seatsOf, TRIP_LOCK } from '../../../app/study';
  import { toast } from '../../../app/toasts.svelte';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
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
    /** The household sheet is showing. */
    show: boolean;
    onclose: () => void;
    onopen: (id: ApprenticeId) => void;
    /** Fills a seat (the next free one unless given); returns why not, or null. */
    onbring: (id: ApprenticeId, seat?: 0 | 1 | 2) => string | null;
    /** Empties their seat; returns why not, or null. */
    onhome: (id: ApprenticeId) => string | null;
  }

  let { profile, locked, open, show, onclose, onopen, onbring, onhome }: Props = $props();

  // One card in detail, over the household sheet.
  let sheet = $state<ApprenticeId | null>(null);

  const seats = $derived(seatsOf(profile));
  const bench = $derived(benchOf(profile));
  const lock = $derived(locked ? TRIP_LOCK : null);
  const dragging = $derived(drag.current);
  const ghost = $derived(dragging ? APPRENTICES[dragging.id] : null);
  const detail = $derived(
    sheet && profile.household.members.includes(sheet) ? cardOf(profile, sheet) : null,
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
    onclose();
    onopen(id);
  }

  function dropped(id: ApprenticeId, target: DropTarget | null): void {
    if (!target) return;
    if (target.kind === 'slot') bring(id, target.slot);
    else home(id);
  }

  function fillSeat(): void {
    if (bench.length === 0) toast('Nobody else is at home');
  }
</script>

<div class="sheets">
  <Sheet open={show} title="The household" {onclose}>
    <p class="hint">Three go out. {locked ? TRIP_LOCK : 'Hold a card and drag it onto a seat.'}</p>
    <section class="row" style:--n={seats.length} aria-label="Seats" data-testid="shelf">
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
    </section>
    {#if locked}<p class="lock" data-testid="shelf-lock">{TRIP_LOCK}</p>{/if}
    <h3 class="homehead" class:over={dragging?.over?.kind === 'bench'} data-drop="bench" data-testid="bench-open">
      At home ({bench.length})
    </h3>
    {#if bench.length === 0}
      <p class="hint" data-testid="bench-empty">Nobody is at home.</p>
    {:else}
      <ul class="tiles" data-drop="bench">
        {#each bench as id (id)}
          {@const c = cardOf(profile, id)}
          <li use:dragCard={{ id, ondrop: dropped }}>
            <button
              type="button"
              class="tile"
              style:--c="var(--hue-{c.def.look.hue})"
              data-testid="card-{id}"
              aria-label="{c.def.name}, {c.def.hp} HP. About them"
              onclick={() => (sheet = id)}
            >
              <ApprenticeToken def={c.def} size={30} />
              <span class="tname">{c.def.name}</span>
              <span class="tstats">{c.def.hp} · {c.def.move}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="hint">Tap a card for lean, action and habit. Drag it onto a seat to bring them; drag a seat down to send them home.</p>
    <Button label="Done" onclick={onclose} testid="household-done" />
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
  .row {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: 6px;
    align-items: stretch;
    padding-top: var(--space-1);
  }
  .homehead {
    margin: var(--space-3) 0 var(--space-1);
    font-size: 15px;
  }
  .homehead.over {
    outline: 3px solid var(--lamp);
    outline-offset: 2px;
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tiles li {
    -webkit-touch-callout: none;
    touch-action: manipulation;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 76px;
    min-height: 84px;
    padding: 6px 2px;
    border: 2px solid var(--c);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    cursor: pointer;
  }
  .tname {
    max-width: 100%;
    overflow: hidden;
    font-size: 12px;
    font-weight: bold;
    color: var(--c);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tstats {
    font: 11px var(--mono);
    color: var(--ink-soft);
  }
  .lock {
    margin: 4px 0 0;
    font-size: 12px;
    text-align: center;
    color: var(--ink-soft);
  }
  .hint {
    margin: var(--space-2) 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .sheets {
    display: contents;
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
