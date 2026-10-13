<script lang="ts">
  import { RUNES } from '$data';
  import type { GlyphSlot, ShelfSlot, ShelfTool } from '../../../app/study';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    slots: ShelfSlot[];
    tool: ShelfTool;
    /** Picks a rune, or drops the tool when the selected one is tapped again. */
    onselect: (tool: ShelfTool) => void;
    /** A slot that can't be picked up was tapped; say why. */
    onreject?: (reason: string) => void;
    /** The profile's Fair copies. The Fair copies tab shows only when there is one (plan P12). */
    glyphs?: GlyphSlot[];
  }

  let { slots, tool, onselect, onreject, glyphs = [] }: Props = $props();

  let picked = $state<'runes' | 'glyphs'>('runes');
  // The tab can't stay on a list that has emptied (a save was replaced).
  const tab = $derived(glyphs.length === 0 ? 'runes' : picked);

  function tapGlyph(slot: GlyphSlot): void {
    if (!slot.usable) {
      if (slot.reason) onreject?.(slot.reason);
      return;
    }
    const same = tool.kind === 'glyph' && tool.glyph === slot.glyph.id;
    onselect(same ? { kind: 'none' } : { kind: 'glyph', glyph: slot.glyph.id });
  }

  function tap(slot: ShelfSlot): void {
    if (!slot.usable) {
      if (slot.reason) onreject?.(slot.reason);
      return;
    }
    const same = tool.kind === 'rune' && tool.rune === slot.rune;
    onselect(same ? { kind: 'none' } : { kind: 'rune', rune: slot.rune });
  }
</script>

{#if glyphs.length > 0}
  <div class="tabs" role="tablist" aria-label="Shelf">
    <button
      type="button"
      role="tab"
      class="tab"
      class:on={tab === 'runes'}
      aria-selected={tab === 'runes'}
      data-testid="tab-runes"
      onclick={() => (picked = 'runes')}
    >
      Runes
    </button>
    <button
      type="button"
      role="tab"
      class="tab"
      class:on={tab === 'glyphs'}
      aria-selected={tab === 'glyphs'}
      data-testid="tab-glyphs"
      onclick={() => (picked = 'glyphs')}
    >
      Fair copies <small>{glyphs.length}</small>
    </button>
  </div>
{/if}

{#if tab === 'glyphs'}
  <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
  <div class="copies" data-testid="shelf" role="group" aria-label="Fair copies">
    {#each glyphs as slot (slot.glyph.id)}
      {@const selected = tool.kind === 'glyph' && tool.glyph === slot.glyph.id}
      <button
        type="button"
        class="copy"
        class:selected
        class:spent={!slot.usable}
        aria-pressed={selected}
        aria-label={`${slot.glyph.name}, ${slot.glyph.kind} Fair copy, ${slot.cost} ink${slot.runesFree ? ', its runes are free' : ', some runes are in use'}`}
        data-glyph={slot.glyph.id}
        onclick={() => tapGlyph(slot)}
      >
        <RuneGlyph
          rune={null}
          glyphName={slot.glyph.name}
          glyphKind={slot.glyph.kind}
          dir={slot.glyph.kind === 'spell' ? 'right' : undefined}
          size={34}
          dim={!slot.usable}
        />
        <span class="meta">
          <b>{slot.glyph.name}</b>
          <small class:poor={slot.usable && !slot.affordable}>
            {slot.glyph.kind} · {slot.cost} ink · {slot.runesFree ? 'runes free' : 'runes in use'}
          </small>
        </span>
      </button>
    {/each}
  </div>
{:else}
<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="shelf" data-testid="shelf" role="group" aria-label="Rune shelf">
  {#each slots as slot (slot.rune)}
    {@const selected = tool.kind === 'rune' && tool.rune === slot.rune}
    <button
      type="button"
      class="slot"
      class:selected
      class:spent={slot.known && !slot.usable}
      class:unknown={!slot.known}
      aria-pressed={selected}
      aria-label={slot.known
        ? `${RUNES[slot.rune].name}, ${slot.free === null ? 'unlimited' : `${slot.free} of ${slot.owned} left`}`
        : 'Unknown rune'}
      data-rune={slot.rune}
      onclick={() => tap(slot)}
    >
      <RuneGlyph
        rune={slot.known ? slot.rune : null}
        dir={slot.known && RUNES[slot.rune].arrow ? 'right' : undefined}
        size={30}
        dim={slot.known && !slot.usable}
      />
      {#if slot.known}
        <span class="count" class:poor={slot.usable && !slot.affordable}>
          <b>{slot.free === null ? '∞' : slot.free}</b>{#if slot.owned !== null}<small>/{slot.owned}</small>{/if}
        </span>
      {/if}
    </button>
  {/each}
</div>
{/if}

<style>
  .shelf {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: 48px;
    gap: 2px;
  }
  .tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: 2px;
  }
  .tab {
    flex: 1;
    min-height: 32px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: rgba(241, 230, 204, 0.18);
    color: var(--parchment);
    font-size: 14px;
    cursor: pointer;
  }
  .tab.on {
    background: var(--parchment-dark);
    color: var(--ink);
    font-weight: 700;
    border-color: var(--parchment);
  }
  .tab small {
    font: 11px var(--mono);
  }
  .copies {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 48px;
    gap: 2px;
    /* three rows like the rune shelf, then it scrolls */
    max-height: 148px;
    overflow-y: auto;
  }
  .copy {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    height: 48px;
    padding: 0 var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    text-align: left;
    cursor: pointer;
  }
  .copy.selected {
    border: 2px solid var(--select);
    background: rgba(232, 176, 74, 0.35);
  }
  .copy.spent {
    opacity: 0.6;
  }
  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.15;
  }
  .meta b {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta small {
    overflow: hidden;
    font-size: 10.5px;
    color: var(--ink-soft);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta small.poor {
    color: var(--danger);
  }
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    height: 48px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    cursor: pointer;
  }
  .slot.selected {
    border: 2px solid var(--select);
    background: rgba(232, 176, 74, 0.35);
  }
  .slot.unknown {
    cursor: default;
    background: transparent;
    border-style: dashed;
  }
  .slot:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .count {
    font: 11px/1 var(--mono);
    color: var(--ink);
  }
  .count b {
    font-size: 13px;
  }
  .count small {
    color: var(--ink-soft);
    font-size: 10px;
  }
  .spent .count {
    opacity: 0.5;
  }
  .poor b {
    color: var(--danger);
  }
</style>
