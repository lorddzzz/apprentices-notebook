<script lang="ts">
  import { GIFT_LINE, HANDOVER_PAGES } from '$data/ending';
  import { nameOf } from '$engine';
  import { endingOf, handover, missingGifts } from '$engine/drawing';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import BackLink from '../components/common/BackLink.svelte';
  import Button from '../components/common/Button.svelte';

  // What the scene will teach, read once on arrival: after the handover nothing is missing any more.
  const gifts = missingGifts(game.profile);
  let page = $state(0);
  let closed = $state(false);
  const last = $derived(page === HANDOVER_PAGES.length - 1);
  // `*like this*` is the owner underlining a line.
  const parts = (text: string) => text.split('*').map((t, i) => ({ t, em: i % 2 === 1 }));

  function next() {
    if (!last) {
      page += 1;
      return;
    }
    // Closing the last page is what the handover is; leaving earlier loses nothing.
    game.updateProfile(handover);
    closed = true;
  }
  const replay = $derived(endingOf(game.profile).handover && !closed);
</script>

<section class="handover" data-testid="handover">
  <header>
    <BackLink to="map" label="Map" />
    {#if !closed}<span class="count" data-testid="handover-count">{page + 1} / {HANDOVER_PAGES.length}</span>{/if}
  </header>

  {#if closed}
    <div class="leaf" data-testid="handover-close">
      <p class="body">The owner takes a seat on the bench. The drawing table is on the desk.</p>
      {#if gifts.length > 0}
        <ul class="gifts" data-testid="handover-gifts">
          {#each gifts as id (id)}
            <li><b>{nameOf(id)}</b> learned <em>{GIFT_LINE}</em></li>
          {/each}
        </ul>
      {/if}
    </div>
    <div class="actions">
      <a class="btn-link" href={href('credits')} data-testid="handover-credits">Read the credits</a>
      <a class="btn-link quiet" href={href('study')} data-testid="handover-study">To the study</a>
    </div>
  {:else}
    <button type="button" class="leaf" onclick={next} data-testid="handover-page" aria-label="Next page">
      <p class="body" data-page={page}>
        {#each parts(HANDOVER_PAGES[page] ?? '') as s, i (i)}{#if s.em}<em>{s.t}</em>{:else}{s.t}{/if}{/each}
      </p>
    </button>
    <div class="actions">
      <Button onclick={next} testid="handover-next">
        {last ? (replay ? 'Close the book' : 'Close the page') : 'Turn the page'}
      </Button>
    </div>
  {/if}
</section>

<style>
  .handover {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  .count {
    font: 700 14px var(--mono);
  }
  .leaf {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4) var(--space-3);
    border: 0;
    text-align: left;
    color: var(--ink);
    background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(43, 33, 24, 0.06) 27px 28px);
  }
  .body {
    margin: 0;
    font-family: var(--hand);
    font-size: 21px;
    line-height: 28px;
  }
  .gifts {
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--hand);
    font-size: 18px;
  }
  .gifts li {
    padding: var(--space-1) 0;
  }
  .gifts em {
    color: var(--ink-soft);
  }
  .actions {
    flex: none;
    padding: var(--space-3) var(--space-3) calc(var(--space-3) + 14px);
  }
  .actions :global(.btn),
  .btn-link {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 56px;
    width: 100%;
    font-size: 18px;
  }
  .btn-link.quiet {
    margin-top: var(--space-2);
    color: var(--ink);
    background: none;
    border: 1px solid var(--ink-faint);
  }
  .btn-link {
    color: var(--parchment);
    text-decoration: none;
    background: var(--ink);
    border-radius: 6px;
  }
</style>
