<script lang="ts">
  import { APPRENTICES } from '$data';
  import type { LootItem, Profile } from '$engine';
  import { lootName } from '../../../app/describe';
  import { carriedHome } from '../../../app/tripUx';
  import { offerLabelFor } from '../../districts';
  import LootMark from './LootMark.svelte';

  /**
   * UT-8. What the party carries home as one list, firsts (finds the notebook does not have)
   * first and in gold. Scrolls inside its own 230 px when the trip was rich.
   */
  interface Props {
    profile: Profile;
    loot: readonly LootItem[];
  }

  let { profile, loot }: Props = $props();

  const entries = $derived(carriedHome(profile, loot));
</script>

<ul class="list" data-testid="loot-list">
  {#each entries as { item, first }, i (i)}
    <li class="row" class:first data-kind={item.kind}>
      <span class="mark"><LootMark {item} /></span>
      <span class="name">{item.kind === 'recruit' ? APPRENTICES[item.apprentice].name : (offerLabelFor(item) ?? lootName(item))}</span>
      {#if first}<span class="gold" data-testid="carried-first">New</span>{/if}
    </li>
  {:else}
    <li class="none">Nothing carried.</li>
  {/each}
</ul>

<style>
  .list {
    max-height: 230px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
    border: 1px solid var(--parchment-deep);
    border-radius: var(--radius);
    background: var(--parchment);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 40px;
    padding: 2px var(--space-3) 2px var(--space-2);
    border-left: 4px solid transparent;
    font-size: var(--type-md);
  }
  .row + .row {
    border-top: 1px solid var(--line);
  }
  .first {
    border-left-color: var(--gold);
  }
  .mark {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 32px;
  }
  .name {
    flex: 1;
    min-width: 0;
  }
  .gold {
    flex: none;
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    background: var(--gold);
    color: var(--ink);
    font-size: var(--type-xs);
    font-variant-caps: all-small-caps;
    letter-spacing: 0.08em;
  }
  .none {
    padding: var(--space-3);
    font-style: italic;
    color: var(--ink-soft);
  }
</style>
