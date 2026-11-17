<script lang="ts">
  import type { Profile } from '$engine';
  import { drawingsOf } from '$engine/drawing';
  import { BLANK_PAGE_LINE, underSeam } from '../../../app/city';
  import { DEPTH_WORDS } from '../../../app/drawing';
  import { pageLine } from './words';

  interface Props {
    profile: Profile;
    /** Opens Set out for the drawn page in this slot. */
    onopen: (slot: 0 | 1 | 2) => void;
  }

  let { profile, onopen }: Props = $props();
  const under = $derived(underSeam(profile));
  const drawings = $derived(drawingsOf(profile));
</script>

<!--
  The row after the stair (EN-7, DK-E5): up to three drawn pages in slot order, each a node that opens
  Set out for that page; after the handover with nothing drawn, a blank page and its line.
-->
{#if under.pages.length > 0 || under.blank}
  <div class="pages" data-testid="under-pages">
    {#each under.pages as page (page.slot)}
      {@const d = drawings[page.slot]}
      <button type="button" class="page" onclick={() => onopen(page.slot)} data-testid="page-{page.slot}" data-band={page.band}>
        <span class="name">{page.name}</span>
        {#if d}<span class="sub">{DEPTH_WORDS[page.band]} · {pageLine(d)}</span>{/if}
      </button>
    {/each}
    {#if under.blank}
      <p class="blank" data-testid="blank-page">{BLANK_PAGE_LINE}</p>
    {/if}
  </div>
{/if}

<style>
  .pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: var(--space-2);
    color: var(--ink-soft);
  }
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 220px;
    min-height: 44px;
    margin: 0;
    padding: 2px 4px;
    font-family: var(--hand);
    color: var(--ink);
    background: none;
    border: 0;
    border-bottom: 2px solid var(--ink);
    cursor: pointer;
  }
  .name {
    font-size: 17px;
    line-height: 20px;
  }
  .sub {
    font-family: Georgia, serif;
    font-size: 11px;
    line-height: 14px;
    color: var(--ink-soft);
    text-align: center;
  }
  .blank {
    margin: 0;
    padding: 8px 12px;
    width: 170px;
    box-sizing: border-box;
    font-family: var(--hand);
    font-size: 15px;
    font-style: italic;
    text-align: center;
    border: 1.5px dashed var(--ink-faint);
  }
</style>
