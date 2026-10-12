<script lang="ts">
  import { MEMBER_IDS, MEMBERS, type MemberId, RUNES } from '$data';
  import {
    type CompiledLattice,
    type Coord,
    inkCost,
    inkUsed,
    key,
    type Lattice,
    type SpellKey,
    socketAt,
  } from '$engine';
  import type { ShelfSlot, ShelfTool } from '../../../app/study';
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
  }: Props = $props();

  let focus = $state<SpellKey | null>(null);
  let inspected = $state<Coord | null>(null);

  // A focus on a spell that no longer exists (rune removed, member switched) falls away.
  const liveFocus = $derived(compiled.spells.some((s) => s.key === focus) ? focus : null);
  const inspectedRune = $derived(inspected ? (socketAt(lattice, inspected)?.rune ?? null) : null);
  const held = $derived(tool.kind === 'rune' ? tool.rune : null);

  function tap(at: Coord, longPress: boolean): void {
    const placed = socketAt(lattice, at);
    if (!longPress && tool.kind === 'none' && placed) {
      // Arrow runes turn on tap, so keep the spell list (it shows what the turn did).
      inspected = placed && RUNES[placed.rune].arrow ? null : at;
      const spell = compiled.spells.find((s) => s.key === key(at));
      if (spell) focus = spell.key;
    } else {
      inspected = null;
    }
    onsocket(at, longPress);
  }

  function pick(next: ShelfTool): void {
    inspected = null;
    ontool(next);
  }

  function switchMember(id: MemberId): void {
    inspected = null;
    focus = null;
    onmember(id);
  }

  function toggleErase(): void {
    pick(tool.kind === 'erase' ? { kind: 'none' } : { kind: 'erase' });
  }

  const infoRune = $derived(held ?? inspectedRune);
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
    <InkPot used={inkUsed(lattice)} {capacity} pending={held ? inkCost(held) : 0} />
  </div>

  <div class="page">
    <button
      type="button"
      class="erase"
      class:on={tool.kind === 'erase'}
      aria-pressed={tool.kind === 'erase'}
      data-testid="erase"
      onclick={toggleErase}
    >
      Erase
    </button>
    <LatticeGrid
      {lattice}
      {compiled}
      focus={liveFocus}
      {inspected}
      ontap={(at) => tap(at, false)}
      onlongpress={(at) => tap(at, true)}
    />
  </div>

  <div class="info" data-testid="info">
    {#if tool.kind === 'erase'}
      <p class="line">Tap a rune to erase it. Holding a rune also lifts it.</p>
    {:else if infoRune}
      {@const def = RUNES[infoRune]}
      <div class="rune">
        <RuneGlyph rune={infoRune} dir={def.arrow ? 'right' : undefined} size={36} />
        <div>
          <p class="line">
            <b>{def.name}</b> · {def.family} · {inkCost(infoRune)} ink
          </p>
          <p class="rule">{def.rule}{def.arrow ? ' Tap it to turn.' : ''}</p>
        </div>
      </div>
    {:else}
      <SpellList spells={compiled.spells} focus={liveFocus} onfocus={(k) => (focus = k)} />
    {/if}
  </div>

  <RuneShelf {slots} {tool} onselect={pick} {onreject} />
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
  }
  .mark {
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--tint);
    border-bottom: none;
    border-radius: var(--radius) var(--radius) 0 0;
    background: transparent;
    color: var(--tint);
    font-size: 15px;
    cursor: pointer;
  }
  .mark.on {
    background: var(--tint);
    color: var(--parchment);
  }
  .page {
    position: relative;
    flex: 1;
    min-height: 0;
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
  .erase {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    z-index: 1;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment);
    font-size: 14px;
    cursor: pointer;
  }
  .erase.on {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--parchment);
  }
  .info {
    flex: none;
    height: 92px;
    overflow-y: auto;
  }
  .rune {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-1) var(--space-2);
  }
  .line {
    margin: 0;
    font-size: 14px;
  }
  .rule {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .info > .line {
    padding: var(--space-2);
  }
</style>
