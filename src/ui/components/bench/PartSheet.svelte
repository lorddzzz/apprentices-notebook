<script lang="ts">
  import type { RuneRef } from '$data';
  import type { InventionLibrary } from '$engine';
  import type { Choice } from '../../../app/bench';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    open: boolean;
    title: string;
    choices: readonly Choice[];
    inventions: InventionLibrary;
    onpick: (ref: RuneRef) => void;
    onclose: () => void;
  }

  let { open, title, choices, inventions, onpick, onclose }: Props = $props();
  let why = $state<string | null>(null);

  function tap(c: Choice): void {
    if (c.reason) why = c.reason;
    else {
      why = null;
      onpick(c.ref);
    }
  }

  function close(): void {
    why = null;
    onclose();
  }
</script>

<Sheet {open} {title} onclose={close}>
  <p class="why" data-testid="part-why" aria-live="polite">{why ?? 'Tap a rune to use it.'}</p>
  <div class="grid" data-testid="part-grid">
    {#each choices as c (c.ref)}
      <button
        type="button"
        class="part"
        class:grey={c.reason !== null}
        aria-disabled={c.reason !== null}
        data-testid="part-{c.ref}"
        onclick={() => tap(c)}
      >
        <RuneGlyph rune={c.ref} size={40} dim={c.reason !== null} {inventions} />
        <span>{c.name}</span>
      </button>
    {/each}
  </div>
</Sheet>

<style>
  .why {
    min-height: 2.6em;
    margin: 0 0 var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-1);
  }
  .part {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-height: 68px;
    padding: 4px 2px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    font: 12px Georgia, serif;
    cursor: pointer;
  }
  .grey {
    opacity: 0.45;
  }
</style>
