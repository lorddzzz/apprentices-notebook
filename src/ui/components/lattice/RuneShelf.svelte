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
  import { plate } from './plate';

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
    /**
     * A drawer (the Study): at rest one row that scrolls sideways through every role; pulled up
     * (swipe or the arrow) it is the whole shelf by role. Picking a rune drops it back to one row.
     */
    drawer?: boolean;
    /** The drawer is pulled up. */
    up?: boolean;
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
    drawer = false,
    up = $bindable(false),
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

  // On short phones the drawer's closed ends shrink to the tabs row alone (UH-D2), so a tab opens it.
  let compact = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-height: 740px)');
    const sync = (): void => {
      compact = query.matches;
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  });
  function pickTab(next: Tab): void {
    picked = next;
    if (drawer && compact && !up) up = true;
  }

  // Dropped to one row after a pick; a swipe up or down on the handle moves it.
  const open = $derived(drawer && up);
  const resting = $derived(drawer && !up);
  function choose(next: ShelfTool): void {
    if (drawer) up = false;
    onselect(next);
  }
  let swipeFrom: number | null = null;
  function swipeStart(e: PointerEvent): void {
    swipeFrom = e.clientY;
  }
  function swipeEnd(e: PointerEvent): void {
    if (swipeFrom === null) return;
    const dy = e.clientY - swipeFrom;
    swipeFrom = null;
    if (dy < -20) up = true;
    else if (dy > 20) up = false;
  }

  function tapGlyph(slot: GlyphSlot): void {
    if (!slot.usable) {
      if (slot.reason) onreject?.(slot.reason);
      return;
    }
    const same = tool.kind === 'glyph' && tool.glyph === slot.glyph.id;
    choose(same ? { kind: 'none' } : { kind: 'glyph', glyph: slot.glyph.id });
  }

  function tap(slot: ShelfSlot): void {
    if (!slot.usable) {
      if (slot.reason) onreject?.(slot.reason);
      return;
    }
    const same = tool.kind === 'rune' && tool.rune === slot.rune;
    choose(same ? { kind: 'none' } : { kind: 'rune', rune: slot.rune });
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
      onclick={() => choose(erasing ? { kind: 'none' } : { kind: 'erase' })}
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

{#snippet tabsrow()}
  <div
    class="tabs"
    class:drawer
    role={drawer ? 'tablist' : 'presentation'}
    onpointerdown={drawer ? swipeStart : undefined}
    onpointerup={drawer ? swipeEnd : undefined}
    onpointercancel={drawer ? () => (swipeFrom = null) : undefined}
  >
    {#if drawer}
      <button
        type="button"
        role="tab"
        class="tab"
        class:on={tab === 'runes'}
        aria-selected={tab === 'runes'}
        data-testid="tab-runes"
        onclick={() => pickTab('runes')}
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
          onclick={() => pickTab('inventions')}
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
          onclick={() => pickTab('glyphs')}
        >
          Glyphs <small>{glyphs.length}</small>
        </button>
      {/if}
      <button
        type="button"
        class="pull"
        data-testid="drawer-pull"
        aria-expanded={up}
        aria-label={up ? 'Put the drawer down' : 'Pull the drawer up for every role'}
        onclick={() => (up = !up)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d={up ? 'M4 7l5 5 5-5' : 'M4 11l5-5 5 5'} />
        </svg>
      </button>
    {:else if tabbed}
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
    {/if}
  </div>
{/snippet}

{#snippet body()}
{#if tab === 'inventions'}
  <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
  <div class="copies" class:rest={resting} class:open data-testid="shelf" role="group" aria-label="Inventions">
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
  {#if onranking && !resting}
    <div class="ranked-row">
      <button type="button" class="ranked" data-testid="ranked" onclick={() => onranking()}>
        Ranked ›
      </button>
    </div>
  {/if}
  <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
  <div class="copies" class:rest={resting} class:open data-testid="shelf" role="group" aria-label="Fair copies">
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
<div class="shelf" class:rest={resting} class:open data-testid="shelf" role="group" aria-label="Rune shelf">
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
        style:--dot="var({ROLE_COLOR[group.role]})"
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
{/snippet}

{#if drawer}
  <!-- The drawer keeps one reserved footprint in the layout; opening grows the panel upward over
       the strip and the page's lower edge, so nothing above it resizes (UH-D4). -->
  <div class="dw" class:compact style:--plate-top={plate('drawer-top')} style:--plate-mid={plate('drawer-mid')} style:--plate-bottom={plate('drawer-bottom')} style:--plate-card={plate('rune-card')}>
    <div class="panel" class:open class:rested={resting} data-testid="drawer">
      {@render tabsrow()}
      <div class="mid">{@render body()}</div>
      <div class="cap" aria-hidden="true"></div>
    </div>
  </div>
{:else}
  {#if tabbed}{@render tabsrow()}{/if}
  {@render body()}
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
  /* The resting drawer: one row, every role in order, scrolling sideways. */
  .rest {
    display: flex;
    gap: 4px;
    max-height: none;
    overflow: auto hidden;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .rest .role {
    display: none;
  }
  .rest .slot {
    flex: none;
    width: 52px;
    border-top: 3px solid var(--dot);
    scroll-snap-align: start;
  }
  .rest .copy {
    flex: none;
    width: 150px;
  }
  .shelf.open,
  .copies.open {
    max-height: min(44vh, 330px);
  }
  .tabs.drawer {
    touch-action: pan-x;
  }
  .pull {
    flex: none;
    width: 44px;
    min-height: 32px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: rgba(241, 230, 204, 0.18);
    color: var(--parchment);
    font-size: 14px;
    cursor: pointer;
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
  .tabs .tab {
    min-width: 0;
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

  /* ── The drawer (the Study, UH-D4) ──
     A reserved footprint in the layout; the panel is anchored to its bottom edge and grows upward
     as an overlay, so the page above never resizes. Painted plates when shipped, wood and ivory
     in CSS without them. */
  .dw {
    --closed: 124px;
    position: relative;
    flex: none;
    height: var(--closed);
  }
  .dw.compact {
    --closed: 56px;
  }
  .panel {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 6;
    display: flex;
    flex-direction: column;
    border-radius: 10px 10px 0 0;
    background: var(--plate-mid, linear-gradient(var(--wood), var(--wood-dark)));
    background-size: 100% auto;
    box-shadow: 0 -2px 0 rgba(232, 176, 74, 0.35), 0 -6px 14px rgba(0, 0, 0, 0.35);
    color: var(--parchment);
    font-family: var(--font-serif);
  }
  .panel.open {
    box-shadow: 0 -2px 0 rgba(232, 176, 74, 0.5), 0 -10px 24px rgba(0, 0, 0, 0.5);
  }
  .dw .tabs {
    flex: none;
    align-items: flex-end;
    height: 48px;
    margin: 0;
    padding: 0 var(--space-1);
    gap: 4px;
    border-radius: 10px 10px 0 0;
    background: var(--plate-top, linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.12)));
    background-size: 100% 100%;
  }
  .dw .tab {
    flex: 0 1 auto;
    min-width: 0;
    height: 44px;
    min-height: 44px;
    padding: 0 var(--space-3);
    border: 1px solid rgba(241, 230, 204, 0.3);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    background: rgba(241, 230, 204, 0.16);
    color: var(--parchment);
    font: 16px/1 var(--font-serif);
    font-variant-caps: small-caps;
    letter-spacing: 0.04em;
  }
  .dw .tab.on {
    border-color: var(--home-paper);
    background: var(--home-paper);
    color: var(--home-ink);
    font-weight: 600;
  }
  .dw .tab small {
    font: 12px var(--font-serif);
    font-variant-numeric: lining-nums;
    opacity: 0.8;
  }
  .dw .pull {
    width: var(--tap);
    min-height: var(--tap);
    margin-left: auto;
    border: 0;
    background: none;
    color: var(--parchment);
    display: grid;
    place-items: center;
  }
  .mid {
    flex: none;
    height: 68px;
    padding: 4px var(--space-1) 0;
    overflow: hidden;
  }
  .panel.open .mid {
    height: auto;
    padding-bottom: 4px;
  }
  .dw.compact .panel.rested .mid {
    display: none;
  }
  .cap {
    flex: none;
    height: 8px;
    background: var(--plate-bottom, linear-gradient(transparent, rgba(0, 0, 0, 0.35)));
    background-size: cover;
    background-position: top;
  }
  .dw .shelf,
  .dw .copies {
    padding: 0;
    background: none;
    box-shadow: none;
  }
  .dw .rest {
    height: 100%;
    align-items: stretch;
  }
  .dw .shelf.open,
  .dw .copies.open {
    max-height: min(40vh, 290px);
  }
  .dw .role {
    font: 600 12px/14px var(--font-serif);
    font-variant-caps: small-caps;
    letter-spacing: 0.08em;
  }
  .dw .slot,
  .dw .copy {
    border: 1px solid #b9a679;
    background: var(--plate-card, none), var(--home-paper);
    background-size: 100% 100%;
    color: var(--home-ink);
  }
  .dw .slot.selected,
  .dw .copy.selected {
    border: 2px solid var(--select);
    box-shadow: 0 0 8px rgba(232, 176, 74, 0.7);
  }
  .dw .count,
  .dw .badges {
    font: 12px/1 var(--font-serif);
    font-variant-numeric: lining-nums;
  }
  .dw .ename {
    font: 12px var(--font-serif);
    font-variant-caps: small-caps;
  }
  .dw .ranked {
    color: var(--parchment);
    font-family: var(--font-serif);
  }
  .dw .meta small {
    font-family: var(--font-serif);
    font-size: 12px;
  }
</style>
