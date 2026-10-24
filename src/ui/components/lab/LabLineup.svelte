<script lang="ts">
  import { APPRENTICE_IDS, APPRENTICES, type ApprenticeId } from '$data';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  let { open, lineup, starts, canField, ontoggle, onfield, onredraw, onclose }: {
    open: boolean;
    lineup: readonly ApprenticeId[];
    /** How many start points (P) the board holds. */
    starts: number;
    canField: boolean;
    ontoggle: (id: ApprenticeId) => void;
    onfield: () => void;
    onredraw: () => void;
    onclose: () => void;
  } = $props();
</script>

<Sheet {open} title="Lineup" {onclose}>
  <div class="lineup" data-testid="lab-lineup">
    <p>
      A board with start points (P) fields this lineup, one to three apprentices, on a seeded draw of
      the points. Anyone in the registry can stand in, with their notebook page or their starter page.
    </p>
    <ul class="who" aria-label="Apprentices">
      {#each APPRENTICE_IDS as id (id)}
        {@const a = APPRENTICES[id]}
        {@const place = lineup.indexOf(id)}
        <li>
          <button
            type="button"
            class="pick"
            class:on={place >= 0}
            aria-pressed={place >= 0}
            data-testid="lineup-{id}"
            onclick={() => ontoggle(id)}
          >
            <ApprenticeToken def={a} size={28} />
            <span class="name">{a.name}</span>
            {#if place >= 0}<span class="slot">{place + 1}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
    <p class="count" data-testid="lineup-count">
      {lineup.length} in the lineup, {starts} start {starts === 1 ? 'point' : 'points'} on the board.
      {#if starts === 0}Paint P in Board mode.{:else if !canField}Paint at least {lineup.length}.{/if}
    </p>
    <div class="buttons">
      <Button variant="quiet" label="Field the lineup" disabled={!canField} onclick={onfield} testid="lineup-field" />
      <Button variant="quiet" label="Redraw spots" disabled={!canField} onclick={onredraw} testid="lineup-redraw" />
    </div>
  </div>
</Sheet>

<style>
  .lineup {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .who {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    min-height: 44px;
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .pick.on {
    border-color: var(--select);
    background: #f6e3b4;
    font-weight: 700;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .slot {
    flex: none;
    font: 700 13px var(--mono);
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
</style>
