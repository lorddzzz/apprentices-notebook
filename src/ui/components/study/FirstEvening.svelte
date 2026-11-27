<script lang="ts">
  import { FIRST_EVENING } from '$data/narration';
  import { isFirstEvening } from '../../../app/firstEvening';
  import { game } from '../../../app/instance';
  import Sheet from '../common/Sheet.svelte';

  // Local state on purpose: reading it closes it for the session, and the first cast ends it for good.
  let read = $state(false);
  let open = $state(false);
  const show = $derived(!read && isFirstEvening(game.profile, game.save.trip !== null));

  function close(): void {
    open = false;
    read = true;
  }
</script>

{#if show}
  <button type="button" class="evening" onclick={() => (open = true)} data-testid="first-evening">
    <span class="lamp">{FIRST_EVENING.lamp}</span>
    <span class="caption">The first page of the evening</span>
  </button>
{/if}

<Sheet {open} title="The Leaning House" onclose={close}>
  <div class="page" data-testid="first-evening-page">
    <p class="place">{FIRST_EVENING.place}</p>
    <p class="lamp">{FIRST_EVENING.lamp}</p>
    <p>{FIRST_EVENING.notebook}</p>
    <button type="button" class="pen" onclick={close} data-testid="first-evening-close">
      {FIRST_EVENING.dismiss}
    </button>
  </div>
</Sheet>

<style>
  .evening {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 2px;
    width: calc(100% - 2 * var(--space-2));
    min-height: var(--tap);
    margin: var(--space-1) var(--space-2) 0;
    padding: var(--space-1) var(--space-3);
    border: 2px solid var(--lamp);
    border-radius: var(--radius);
    background: rgba(232, 176, 74, 0.14);
    color: var(--parchment);
    text-align: left;
  }
  .evening .lamp {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 17px;
  }
  .caption {
    font-size: 12px;
    opacity: 0.8;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-family: var(--font-serif);
    font-size: 19px;
    line-height: 26px;
  }
  .page p {
    margin: 0;
  }
  .place {
    line-height: 20px;
    font-size: 14px;
    opacity: 0.75;
  }
  .page .lamp {
    font-style: italic;
  }
  .pen {
    align-self: flex-start;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--parchment);
    font-family: inherit;
    font-size: 17px;
  }
</style>
