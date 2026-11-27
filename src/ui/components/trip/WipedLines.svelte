<script lang="ts">
  import ActionButton from '../common/ActionButton.svelte';

  /**
   * UT-D4. The Wiped page's account: the cause line first (as `wipeCause` wrote it, never
   * edited here) with "See it" beside it, then a line per room actually fought. A summary from
   * before the rooms were kept shows only the old "They fell at …" line.
   */
  interface Props {
    encounter: string;
    cause?: string;
    rooms?: readonly { place: string; result: 'cleared' | 'fell' }[];
    /** Absent when the summary has no final board: then there is no "See it". */
    onsee?: () => void;
  }

  let { encounter, cause, rooms, onsee }: Props = $props();
</script>

<div class="lines">
  <div class="cause">
    <p data-testid="wipe-cause">{cause ?? `They fell at ${encounter.toLowerCase()}.`}</p>
    {#if onsee}
      <ActionButton kind="quiet" onclick={onsee} testid="see-it">See it</ActionButton>
    {/if}
  </div>

  {#if rooms?.length}
    <ol class="rooms" data-testid="wipe-rooms">
      {#each rooms as room, i (i)}
        <li class={room.result}>
          <span class="place">{room.place}</span>
          <span class="result">{room.result === 'cleared' ? 'cleared' : 'fell here'}</span>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .lines {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .cause {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .cause p {
    margin: 0;
    font-size: var(--type-md, 16px);
    font-style: italic;
    color: var(--ink);
  }
  .cause :global(.action) {
    flex: none;
    min-height: 44px;
  }
  .rooms {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--line);
  }
  .result {
    font-size: var(--type-sm);
    font-variant-caps: all-small-caps;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  .fell .result {
    color: var(--danger);
  }
</style>
