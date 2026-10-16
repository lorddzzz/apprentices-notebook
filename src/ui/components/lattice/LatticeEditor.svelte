<script lang="ts">
  import type { Snippet } from 'svelte';
  import { INTERACTION_IDS, type InteractionId, MEMBER_IDS, MEMBERS, type MemberId, RUNES } from '$data';
  import {
    type CellKey,
    type CompiledLattice,
    type Coord,
    describeSpell,
    type GlyphId,
    type GlyphLibrary,
    glyphCost,
    inkCost,
    inkUsed,
    isGlyph,
    key,
    type Lattice,
    type SpellKey,
    socketAt,
  } from '$engine';
  import { spellRecipe, stepNumbers } from '../../../app/recipe';
  import type { GlyphSlot, ShelfSlot, ShelfTool } from '../../../app/study';
  import Pips from '../common/Pips.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import InkPot from './InkPot.svelte';
  import LatticeGrid from './LatticeGrid.svelte';
  import RuneShelf from './RuneShelf.svelte';
  import SpellList from './SpellList.svelte';

  interface Props {
    lattice: Lattice;
    compiled: CompiledLattice;
    /** null = unlimited ink (Lab). */
    capacity: number | null;
    slots: ShelfSlot[];
    tool: ShelfTool;
    ontool: (tool: ShelfTool) => void;
    onsocket: (at: Coord, longPress: boolean) => void;
    member: MemberId;
    onmember: (member: MemberId) => void;
    /** Why a shelf slot can't be picked up. */
    onreject?: (reason: string) => void;
    /** Interactions the recipe may name (the rest are hinted at). Default: all (Lab). */
    known?: readonly InteractionId[];
    /** The profile's Fair copies (Glyph sockets, ink, the shelf tab). Default: none (Lab). */
    glyphs?: GlyphLibrary;
    glyphSlots?: GlyphSlot[];
    /** Open the Glyph sheet (peek inside, rename). */
    onpeek?: (glyph: GlyphId) => void;
    /** Fair copy mode (Study only): the button shows when something is proven. */
    fair?: {
      available: boolean;
      active: boolean;
      glow: ReadonlySet<string>;
      selected: ReadonlySet<string>;
      /** The idiom the selection matches and its cost, or what a trim just broke. */
      chip?: { text: string; lost: boolean } | null;
      ontoggle: () => void;
      ontap: (at: Coord) => void;
    };
    /** What the info panel shows while Fair copy mode is on. */
    fairinfo?: Snippet;
    /** Opens "Your Glyphs, ranked" (the shelf's Fair copies tab). */
    onranking?: () => void;
    /** Opens the argument picker for the Glyph on `at` (placement, or its card's "Arguments"; task U4). */
    onargs?: (at: Coord) => void;
    /** Cells of plain spells that never fired on the last trip (M15), ringed on the page. */
    deadCells?: ReadonlySet<CellKey>;
  }

  let {
    lattice,
    compiled,
    capacity,
    slots,
    tool,
    ontool,
    onsocket,
    member,
    onmember,
    onreject,
    known = INTERACTION_IDS,
    glyphs = {},
    glyphSlots = [],
    onpeek,
    fair,
    fairinfo,
    onranking,
    deadCells = new Set(),
  }: Props = $props();

  let focus = $state<SpellKey | null>(null);
  let inspected = $state<Coord | null>(null);
  // The full spell list and recipe live in a sheet so the board keeps the room.
  let reading = $state(false);

  // A focus on a spell that no longer exists (rune removed, member switched) falls back to the first.
  const liveFocus = $derived(
    compiled.spells.some((s) => s.key === focus) ? focus : (compiled.spells[0]?.key ?? null),
  );
  const focusedSpell = $derived(compiled.spells.find((s) => s.key === liveFocus) ?? null);
  const recipe = $derived(
    focusedSpell ? spellRecipe(focusedSpell, MEMBERS[member].affinity, known) : null,
  );
  const numbers = $derived(recipe ? stepNumbers(recipe) : new Map<string, number>());
  const inspectedRune = $derived.by(() => {
    const p = inspected ? socketAt(lattice, inspected) : null;
    return p && !isGlyph(p) ? p.rune : null;
  });
  const inspectedGlyph = $derived.by(() => {
    const p = inspected ? socketAt(lattice, inspected) : null;
    return p && isGlyph(p) ? p : null;
  });
  const inspectedGlyphDef = $derived(inspectedGlyph ? (glyphs[inspectedGlyph.glyph] ?? null) : null);
  const held = $derived(tool.kind === 'rune' ? tool.rune : null);
  const heldGlyph = $derived(tool.kind === 'glyph' ? (glyphs[tool.glyph] ?? null) : null);
  const pending = $derived(
    held ? inkCost(held) : heldGlyph ? glyphCost(heldGlyph) : 0,
  );
  const fairOn = $derived(fair?.active === true);

  function tap(at: Coord, longPress: boolean): void {
    if (fair?.active && !longPress) {
      fair.ontap(at);
      return;
    }
    const placed = socketAt(lattice, at);
    if (!longPress && tool.kind === 'none' && placed) {
      // Arrow runes turn on tap, so keep the spell list (it shows what the turn did).
      // A Glyph turns too, but stays inspected so its card can open the sheet.
      inspected = !isGlyph(placed) && RUNES[placed.rune].arrow ? null : at;
      const spell = compiled.spells.find((s) => s.key === key(at));
      if (spell) focus = spell.key;
    } else {
      inspected = null;
    }
    onsocket(at, longPress);
  }

  function pick(next: ShelfTool): void {
    inspected = null;
    if (fair?.active) fair.ontoggle();
    ontool(next);
  }

  function switchMember(id: MemberId): void {
    inspected = null;
    focus = null;
    onmember(id);
  }

  const infoRune = $derived(held ?? inspectedRune);
  const spellIndex = $derived(compiled.spells.findIndex((s) => s.key === liveFocus));
</script>

<div class="editor" data-testid="editor">
  <div class="bookmarks" role="tablist" aria-label="Party member">
    {#each MEMBER_IDS as id (id)}
      <button
        type="button"
        role="tab"
        class="mark"
        class:on={id === member}
        style:--tint="var(--member-{id})"
        aria-selected={id === member}
        data-member={id}
        onclick={() => switchMember(id)}
      >
        {MEMBERS[id].name}
      </button>
    {/each}
    <span class="grow"></span>
    <InkPot used={inkUsed(lattice, glyphs)} {capacity} {pending} />
  </div>

  <div class="page">
    {#if fair?.available}
      <button
        type="button"
        class="fair"
        class:on={fairOn}
        aria-pressed={fairOn}
        data-testid="fair-mode"
        onclick={() => {
          inspected = null;
          fair.ontoggle();
        }}
      >
        Fair copy
      </button>
    {/if}
    <LatticeGrid
      {lattice}
      {compiled}
      focus={liveFocus}
      {numbers}
      {inspected}
      {glyphs}
      glow={fair?.glow}
      selection={fair?.selected}
      {deadCells}
      ontap={(at) => tap(at, false)}
      onlongpress={(at) => tap(at, true)}
    />
  </div>

  <div class="info" data-testid="info">
    {#if tool.kind === 'erase'}
      <p class="line pad">Tap a rune to erase it. Holding a rune also lifts it.</p>
    {:else if heldGlyph}
      <p class="line pad">
        <b>{heldGlyph.name}</b> · Fair copy · {pending} ink. Tap an empty socket. It takes its runes from your
        collection.
      </p>
    {:else if inspectedGlyph && inspectedGlyphDef}
      <div class="rune">
        <RuneGlyph
          rune={null}
          glyphName={inspectedGlyphDef.name}
          glyphKind={inspectedGlyphDef.kind}
          dir={inspectedGlyph.dir}
          size={36}
        />
        <div class="grow">
          <p class="line">
            <b>{inspectedGlyphDef.name}</b> · {inspectedGlyphDef.kind} Fair copy · {glyphCost(inspectedGlyphDef)} ink
          </p>
          <p class="rule">{inspectedGlyphDef.cells.length} runes inside. Tap it to turn.</p>
        </div>
        <button
          type="button"
          class="peek"
          data-testid="peek"
          onclick={() => onpeek?.(inspectedGlyphDef.id)}
        >
          Look inside
        </button>
      </div>
    {:else if infoRune}
      {@const def = RUNES[infoRune]}
      <div class="rune">
        <RuneGlyph rune={infoRune} dir={def.arrow ? 'right' : undefined} size={36} />
        <div class="grow">
          <p class="line">
            <b>{def.name}</b> · {def.family} · {inkCost(infoRune)} ink
          </p>
          <p class="rule clamp">{def.rule}{def.arrow ? ' Tap it to turn.' : ''}</p>
        </div>
      </div>
    {:else if focusedSpell}
      <button
        type="button"
        class="reading"
        data-testid="reading"
        aria-haspopup="dialog"
        onclick={() => (reading = true)}
      >
        <RuneGlyph rune={focusedSpell.source} dir={focusedSpell.path[0]?.dir} size={30} />
        <span class="grow">
          <span class="summary">{describeSpell(focusedSpell)}</span>
          <span class="more">
            {#if compiled.spells.length > 1}Spell {spellIndex + 1} of {compiled.spells.length} · {/if}
            {recipe && recipe.steps.length > 0
              ? `${recipe.steps.length} ${recipe.steps.length === 1 ? 'step' : 'steps'} · tap to read`
              : 'Tap to read'} &rsaquo;
          </span>
        </span>
        <Pips value={focusedSpell.charges} max={focusedSpell.charges} tone="charge" />
      </button>
    {:else}
      <p class="line pad soft">No spell yet. A Source rune (Bolt, Splash, Ward) starts the flow.</p>
    {/if}
  </div>

  {#if fairOn && fairinfo}
    <div class="fairpanel">
      {#if fair?.chip}
        <p class="chip" class:lost={fair.chip.lost} data-testid="fair-chip">{fair.chip.text}</p>
      {/if}
      {@render fairinfo()}
    </div>
  {:else}
    <RuneShelf {slots} {tool} onselect={pick} {onreject} glyphs={glyphSlots} erase {onranking} />
  {/if}

  <Sheet open={reading} title="Spells on this page" onclose={() => (reading = false)}>
    <SpellList spells={compiled.spells} focus={liveFocus} {recipe} onfocus={(k) => (focus = k)} />
  </Sheet>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    min-height: 0;
  }
  .bookmarks {
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
    flex: none;
    min-height: var(--tap);
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .mark {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    padding: 0 12px;
    border: 1px solid var(--line);
    border-bottom: none;
    border-radius: var(--radius) var(--radius) 0 0;
    background: transparent;
    color: var(--ink-soft);
    font-size: 15px;
    cursor: pointer;
  }
  /* A small tint flag keeps each member recognisable without reading as selected. */
  .mark::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--tint);
    opacity: 0.6;
  }
  /* The selected tab is the page's own tab: filled, taller, joined to the page below. */
  .mark.on {
    z-index: 2;
    min-height: calc(var(--tap) + 6px);
    margin-bottom: -1px;
    border-color: var(--tint);
    background: var(--tint);
    color: var(--parchment);
    font-weight: 700;
  }
  .mark.on::before {
    background: var(--parchment);
    opacity: 1;
  }
  /* The board is the centrepiece: it takes every pixel the strip, shelf and door leave. */
  .page {
    position: relative;
    flex: 1;
    min-height: 160px;
    display: grid;
    place-items: center;
    container-type: size;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background:
      repeating-linear-gradient(to bottom, transparent 0 27px, rgba(43, 33, 24, 0.07) 27px 28px),
      var(--parchment-dark);
  }
  .page > :global(.lattice) {
    place-self: center;
  }
  .fair {
    position: absolute;
    bottom: var(--space-1);
    left: var(--space-1);
    z-index: 1;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--lamp);
    border-radius: var(--radius);
    background: rgba(232, 176, 74, 0.35);
    font-size: 14px;
    cursor: pointer;
  }
  .fair.on {
    background: var(--lamp);
    border-color: var(--ink);
    font-weight: 700;
  }
  .chip {
    display: inline-block;
    margin: var(--space-1) var(--space-2) 0;
    padding: 2px var(--space-2);
    border: 1px solid var(--lamp);
    border-radius: 999px;
    background: rgba(232, 176, 74, 0.35);
    font-size: 13px;
    font-weight: 700;
    transition:
      opacity 0.3s,
      background 0.3s;
  }
  .chip.lost {
    border-style: dashed;
    border-color: var(--ink-soft);
    background: transparent;
    color: var(--ink-soft);
    font-weight: 400;
    opacity: 0.75;
  }
  .peek {
    flex: none;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment);
    font-size: 14px;
    cursor: pointer;
  }
  /* One compact strip under the board: what is held or inspected, else the focused spell. */
  .info {
    flex: none;
    height: 64px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
  .rune {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    height: 100%;
    padding: 0 var(--space-2);
  }
  .line {
    margin: 0;
    font-size: 14px;
    line-height: 1.25;
  }
  .pad {
    padding: var(--space-2);
  }
  .soft {
    color: var(--ink-soft);
  }
  .rule {
    margin: 1px 0 0;
    font-size: 12.5px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .clamp {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  .reading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 100%;
    padding: 0 var(--space-2);
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .reading .grow {
    display: flex;
    flex-direction: column;
  }
  .summary {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    font-size: 14px;
    line-height: 1.25;
  }
  .more {
    font-size: 12px;
    color: var(--f-source);
  }
  .fairpanel {
    flex: none;
    border: 1px solid var(--lamp);
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
</style>
