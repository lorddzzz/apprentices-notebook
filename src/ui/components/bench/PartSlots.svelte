<script lang="ts">
  import { BIND_EVENT_PHRASE, type BindEvent, METHODS, type MethodId, type RuneRef } from '$data';
  import { type InventionLibrary, nameOf } from '$engine';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    method: MethodId;
    parts: readonly (RuneRef | null)[];
    inventions: InventionLibrary;
    event: BindEvent | null;
    events: readonly BindEvent[];
    onslot: (slot: number) => void;
    onevent: (e: BindEvent) => void;
  }

  let { method, parts, inventions, event, events, onslot, onevent }: Props = $props();
  const def = $derived(METHODS[method]);
</script>

<div class="slots" data-testid="slots">
  {#each def.slots as slot, i (i)}
    {@const part = parts[i] ?? null}
    <button
      type="button"
      class="slot"
      class:empty={part === null}
      disabled={slot.accepts === 'carrier'}
      data-testid="slot-{i}"
      onclick={() => onslot(i)}
    >
      <span class="art">
        {#if part}<RuneGlyph rune={part} size={36} {inventions} />{:else}+{/if}
      </span>
      <span class="what">
        <b>{part ? nameOf(part, inventions) : 'Choose'}</b>
        <small>{slot.label}</small>
      </span>
    </button>
  {/each}
</div>
{#if def.events}
  <div class="events" data-testid="events">
    <span>Until it</span>
    {#each events as e (e)}
      <button
        type="button"
        class="ev"
        class:on={event === e}
        aria-pressed={event === e}
        data-testid="event-{e}"
        onclick={() => onevent(e)}>{BIND_EVENT_PHRASE[e]}</button
      >
    {:else}
      <em>no event learned</em>
    {/each}
  </div>
{/if}

<style>
  .slots {
    display: flex;
    gap: var(--space-2);
    flex: none;
  }
  .slot {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 52px;
    padding: 4px var(--space-2);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .slot:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .empty {
    border-style: dashed;
    border-color: var(--line);
  }
  .art {
    flex: none;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    font-size: 26px;
    color: var(--ink-soft);
  }
  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  small {
    font-size: 11px;
    line-height: 1.2;
    color: var(--ink-soft);
  }
  .events {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: none;
    font-size: 14px;
  }
  .ev {
    min-height: 40px;
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 14px Georgia, serif;
    cursor: pointer;
  }
  .on {
    border-color: var(--ink);
    background: #f6e3b4;
  }
</style>
