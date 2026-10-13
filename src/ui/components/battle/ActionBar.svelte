<script lang="ts">
  import { describeSpell, type MemberUnit, type Spell, type SpellKey } from '$engine';
  import type { InputMode } from '../../../app/battleInput';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    member: MemberUnit | null;
    spells: { spell: Spell; charges: number; usable: boolean }[];
    mode: InputMode;
    canShove: boolean;
    canUndo: boolean;
    onspell: (key: SpellKey) => void;
    onshove: () => void;
    onundo: () => void;
  }

  let { member, spells, mode, canShove, canUndo, onspell, onshove, onundo }: Props = $props();

  const activeSpell = $derived(
    mode.kind === 'aim' || mode.kind === 'confirm' ? mode.spell : null,
  );
  const shoving = $derived(
    mode.kind === 'shove' || (mode.kind === 'confirm' && mode.spell === null),
  );
</script>

<div class="bar" data-testid="actions">
  {#if member}
    {#each spells as { spell, charges, usable } (spell.key)}
      <button
        type="button"
        class="act spell"
        class:active={activeSpell === spell.key}
        class:unusable={!usable}
        aria-pressed={activeSpell === spell.key}
        aria-label="{describeSpell(spell)}, {charges} of {spell.charges} charges"
        onclick={() => onspell(spell.key)}
      >
        <RuneGlyph rune={spell.source} dir={spell.path[0]?.dir} size={36} />
        <span class="spell-text">
          <span class="desc">{describeSpell(spell)}</span>
          <Pips value={charges} max={spell.charges} tone="charge" />
        </span>
      </button>
    {:else}
      <span class="empty">No spells inscribed</span>
    {/each}
    <button
      type="button"
      class="act small"
      class:active={shoving}
      class:unusable={!canShove}
      aria-pressed={shoving}
      onclick={onshove}
    >
      <span class="icon" aria-hidden="true">⇥</span>Shove
    </button>
    <button type="button" class="act small" disabled={!canUndo} onclick={onundo}>
      <span class="icon" aria-hidden="true">↶</span>Undo move
    </button>
  {:else}
    <span class="empty">Select a party member to see their spells</span>
  {/if}
</div>

<style>
  .bar {
    display: flex;
    gap: var(--space-2);
    height: 60px;
    flex: none;
    align-items: stretch;
    overflow-x: auto;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 56px;
    padding: 4px 6px;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    cursor: pointer;
  }
  .spell {
    flex: 1 1 0;
    min-width: 0;
    text-align: left;
  }
  .spell-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .desc {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    font-size: 11px;
    line-height: 1.25;
  }
  .small {
    flex: none;
    width: 64px;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    font-size: 11px;
    line-height: 1.1;
  }
  .icon {
    font-size: 20px;
    line-height: 1;
  }
  .active {
    border-color: var(--select);
    box-shadow: 0 0 0 2px var(--select);
    background: #f6e3b4;
  }
  .unusable {
    opacity: 0.5;
  }
  .act:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .empty {
    align-self: center;
    margin: 0 auto;
    color: var(--ink-soft);
    font-size: 13px;
  }
</style>
