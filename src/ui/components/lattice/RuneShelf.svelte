<script lang="ts">
  import { type Role, type RuneRef, TIER_MARKS } from '$data';
  import { hasArrow, type InventionLibrary, nameOf } from '$engine';
  import {
    type GlyphSlot,
    inventionSlots,
    type ShelfSlot,
    type ShelfTool,
    shelfGroups,
  } from '../../../app/study';
  import { longpress } from '../../attach/longpress';
  import { ROLE_COLOR } from '../../runeArt';
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
    /** Lead the shelf with the Erase tool (the lattice editor). */
    erase?: boolean;
    /** The household's inventions: drawn as their method over their first part. */
    inventions?: InventionLibrary;
    /** A long-press on a rune or an invention: show its headline and fine print. */
    ondetail?: (rune: RuneRef) => void;
    /** Opens "Your Glyphs, ranked" from the Fair copies tab (task U2 adds the link). */
    onranking?: () => void;
  }

  let {
    slots,
    tool,
    onselect,
    onreject,
    glyphs = [],
    inventions = {},
    ondetail,
    erase = false,
    onranking,
  }: Props = $props();

  // Unknown runes are the Codex's business; the shelf shows what can be inscribed.
  const groups = $derived(shelfGroups(slots));
  const made = $derived(inventionSlots(slots));
  const erasing = $derived(tool.kind === 'erase');
  const roleName = (r: Role): string => r.charAt(0).toUpperCase() + r.slice(1);

  type Tab = 'runes' | 'inventions' | 'glyphs';
  let picked = $state<Tab>('runes');
  // The tab can't stay on a list that has emptied (a save was replaced).
  const tab = $derived<Tab>(
    picked === 'glyphs' && glyphs.length === 0
      ? 'runes'
      : picked === 'inventions' && made.length === 0
        ? 'runes'
        : picked,
  );
  const tabbed = $derived(glyphs.length > 0 || made.length > 0);

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

{#snippet eraser()}
  {#if erase}
    <button
      type="button"
      class="slot eraser"
      class:on={erasing}
      aria-pressed={erasing}
      data-testid="erase"
      onclick={() => onselect(erasing ? { kind: 'none' } : { kind: 'erase' })}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
        <path d="M4 15l9-9a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-8 8H8z" />
        <path d="M9 10l6 6M11 20h9" />
      </svg>
      <span class="ename">Erase</span>
    </button>
  {/if}
{/snippet}

{#snippet cost(slot: ShelfSlot)}
  {#if slot.base !== undefined && slot.base > slot.cost}
    <s class="was" title="Trained: one ink less">{slot.base}</s>
  {/if}
  <b>{slot.cost}</b>
{/snippet}

{#if tabbed}
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
    {#if made.length > 0}
      <button
        type="button"
        role="tab"
        class="tab"
        class:on={tab === 'inventions'}
        aria-selected={tab === 'inventions'}
        data-testid="tab-inventions"
        onclick={() => (picked = 'inventions')}
      >
        Inventions <small>{made.length}</small>
      </button>
    {/if}
    {#if glyphs.length > 0}
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
    {/if}
  </div>
{/if}

{#if tab === 'inventions'}
  <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
  <div class="copies" data-testid="shelf" role="group" aria-label="Inventions">
    {@render eraser()}
    {#each made as slot (slot.rune)}
      {@const selected = tool.kind === 'rune' && tool.rune === slot.rune}
      <button
        type="button"
        class="copy"
        class:selected
        class:spent={!slot.usable}
        aria-pressed={selected}
        aria-label={`${nameOf(slot.rune, inventions)}, invention, ${slot.cost} ink`}
        data-rune={slot.rune}
        onclick={() => tap(slot)}
        {@attach longpress(() => ondetail?.(slot.rune))}
      >
        <RuneGlyph rune={slot.rune} {inventions} size={34} dim={!slot.usable} />
        <span class="meta">
          <b>{nameOf(slot.rune, inventions)}</b>
          <small class:poor={slot.usable && !slot.affordable}>
            {slot.role} · {@render cost(slot)} ink
          </small>
        </span>
      </button>
    {/each}
  </div>
{:else if tab === 'glyphs'}
  {#if onranking}
    <div class="ranked-row">
      <button type="button" class="ranked" data-testid="ranked" onclick={() => onranking()}>
        Ranked ›
      </button>
    </div>
  {/if}
  <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
  <div class="copies" data-testid="shelf" role="group" aria-label="Fair copies">
    {@render eraser()}
    {#each glyphs as slot (slot.glyph.id)}
      {@const selected = tool.kind === 'glyph' && tool.glyph === slot.glyph.id}
      <button
        type="button"
        class="copy"
        class:selected
        class:spent={!slot.usable}
        aria-pressed={selected}
        aria-label={`${slot.glyph.name}, ${slot.glyph.kind} Fair copy, ${slot.cost} ink`}
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
            {slot.glyph.kind} · {slot.cost} ink
          </small>
        </span>
        <span class="badges" aria-hidden="true">
          <span class="marks">{TIER_MARKS[slot.tiers.economy]}{TIER_MARKS[slot.tiers.reliability]}</span>
          {#if slot.open > 0}<span class="open">( )</span>{/if}
        </span>
      </button>
    {/each}
  </div>
{:else}
<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="shelf" data-testid="shelf" role="group" aria-label="Rune shelf">
  {#each groups as group, i (group.role)}
    <span class="role" style:--dot="var({ROLE_COLOR[group.role]})" data-role-head={group.role}>
      {roleName(group.role)}
    </span>
    {#if i === 0}{@render eraser()}{/if}
    {#each group.slots as slot (slot.rune)}
      {@const selected = tool.kind === 'rune' && tool.rune === slot.rune}
      <button
        type="button"
        class="slot"
        class:selected
        class:spent={!slot.usable}
        aria-pressed={selected}
        aria-label={`${nameOf(slot.rune)}, ${slot.cost} ink`}
        data-rune={slot.rune}
        onclick={() => tap(slot)}
        {@attach longpress(() => ondetail?.(slot.rune))}
      >
        <RuneGlyph
          rune={slot.rune}
          dir={hasArrow(slot.rune) ? 'right' : undefined}
          size={30}
          dim={!slot.usable}
        />
        <span class="count" class:poor={slot.usable && !slot.affordable}>
          {@render cost(slot)}
        </span>
      </button>
    {/each}
  {/each}
</div>
{/if}

<style>
  /* Two rows and a peek of the third, then it scrolls: the board above keeps the room. */
  .shelf {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: auto;
    gap: 2px;
    max-height: 150px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .role {
    display: flex;
    align-items: center;
    gap: 5px;
    grid-column: 1 / -1;
    font: 700 11px/14px var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--parchment);
  }
  .role::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--dot);
    border: 1px solid var(--parchment);
  }
  .was {
    margin-right: 3px;
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-soft);
    text-decoration-thickness: 1.5px;
  }
  .eraser {
    gap: 1px;
    color: var(--ink);
  }
  .eraser.on {
    border-color: var(--danger);
    background: var(--danger);
    color: var(--parchment);
  }
  .ename {
    font-size: 11px;
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
  .ranked-row {
    display: flex;
    justify-content: flex-end;
  }
  .ranked {
    min-height: 24px;
    padding: 0 var(--space-2);
    border: 0;
    background: none;
    color: var(--parchment);
    font-size: 13px;
    text-decoration: underline;
    cursor: pointer;
  }
  .badges {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: flex-end;
    margin-left: auto;
    font: 11px/1.15 var(--mono);
    color: var(--ink);
  }
  .badges .open {
    color: var(--ink-soft);
  }
  .copies {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 48px;
    gap: 2px;
    /* like the rune shelf: two rows and a peek, then it scrolls */
    max-height: 122px;
    overflow-y: auto;
    overscroll-behavior: contain;
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
  .spent .count {
    opacity: 0.5;
  }
  .poor b {
    color: var(--danger);
  }
</style>
