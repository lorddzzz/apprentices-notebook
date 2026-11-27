<script lang="ts">
  import { actionOf, describeSpell, type MemberUnit, type Spell, type SpellKey } from '$engine';
  import { activeAction, type InputMode } from '../../../app/battleInput';
  import { BASIC_LABEL } from '../../../app/describe';
  import { spellChipModel, tapChip } from '../../../app/spellChip';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    member: MemberUnit | null;
    spells: { spell: Spell; charges: number; usable: boolean }[];
    mode: InputMode;
    canBasic: boolean;
    canUndo: boolean;
    onspell: (key: SpellKey) => void;
    /** Two or more usable spells: the chip opens the spell sheet instead of arming. */
    onsheet?: () => void;
    onbasic: () => void;
    onundo: () => void;
  }

  let { member, spells, mode, canBasic, canUndo, onspell, onsheet = () => {}, onbasic, onundo }: Props =
    $props();

  const chip = $derived(spellChipModel(spells, mode));
  const shown = $derived(chip.shown);
  const text = $derived.by(() => {
    const full = shown ? describeSpell(shown.spell) : '';
    const at = full.indexOf(' → ');
    return at < 0 ? { name: full, chain: '' } : { name: full.slice(0, at), chain: full.slice(at + 3) };
  });
  const lit = $derived(activeAction(mode));
  const basic = $derived(member ? actionOf(member) : null);
  const basicLabel = $derived(basic ? BASIC_LABEL[basic] : null);

  /** A tap goes through the model; an inert chip still asks the session, which says why. */
  function tapSpell(): void {
    if (chip.tap.kind === 'none') {
      if (shown) onspell(shown.spell.key);
      return;
    }
    tapChip(chip, { choose: onspell, openSheet: onsheet });
  }
</script>

<div class="bar" data-testid="actions">
  {#if member && shown}
    <button
      type="button"
      class="act chip"
      class:active={lit.spell !== null && lit.spell === shown.spell.key}
      class:unusable={chip.tap.kind === 'none'}
      aria-pressed={lit.spell !== null && lit.spell === shown.spell.key}
      aria-haspopup={chip.tap.kind === 'sheet' ? 'dialog' : undefined}
      aria-label="{describeSpell(shown.spell)}, {shown.charges} of {shown.spell.charges} charges{chip.tap.kind === 'sheet'
        ? ', choose another'
        : ''}"
      data-testid="spell-chip"
      onclick={tapSpell}
    >
      <RuneGlyph rune={shown.spell.source} dir={shown.spell.path[0]?.dir} size={34} />
      <span class="chip-text">
        <span class="name">{text.name}</span>
        {#if text.chain}<span class="chain">{text.chain}</span>{/if}
        <Pips value={shown.charges} max={shown.spell.charges} tone="charge" />
      </span>
      {#if chip.tap.kind === 'sheet'}<span class="chev" aria-hidden="true">▾</span>{/if}
    </button>
    {#if basicLabel}
      <button
        type="button"
        class="act small"
        class:active={lit.basic}
        class:unusable={!canBasic}
        aria-pressed={lit.basic}
        data-testid="basic-action"
        onclick={onbasic}
      >
        <span class="icon" aria-hidden="true">{basicLabel.icon}</span>{basicLabel.name}
      </button>
    {/if}
    <button type="button" class="act small" disabled={!canUndo} onclick={onundo}>
      <span class="icon" aria-hidden="true">↶</span>Undo move
    </button>
  {:else if member}
    <span class="empty">No spells inscribed</span>
    {#if basicLabel}
      <button
        type="button"
        class="act small"
        class:active={lit.basic}
        class:unusable={!canBasic}
        aria-pressed={lit.basic}
        data-testid="basic-action"
        onclick={onbasic}
      >
        <span class="icon" aria-hidden="true">{basicLabel.icon}</span>{basicLabel.name}
      </button>
    {/if}
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
    gap: 6px;
    height: 56px;
    flex: none;
    align-items: stretch;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    min-height: 56px;
    padding: 4px 8px;
    border: 2px solid var(--world-line, var(--line));
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--world-bg, var(--parchment-dark)) 82%, var(--world-fg, var(--ink)) 6%);
    color: var(--world-fg, var(--ink));
    font-family: var(--font-serif);
    font-size: var(--type-sm);
    cursor: pointer;
  }
  /* The chip is the paper-coloured control of the row, as in the studies. */
  .chip {
    flex: 1 1 0;
    text-align: left;
    background: var(--world-paper, var(--parchment));
    border-color: var(--world-paper, var(--line));
    color: var(--home-ink);
  }
  .chip-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
    line-height: 1.15;
  }
  .name {
    font-size: var(--type-md);
    white-space: nowrap;
  }
  .chain {
    overflow: hidden;
    font-size: var(--type-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chev {
    flex: none;
    font-size: var(--type-md);
  }
  .small {
    flex: none;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    width: 80px;
    padding: 4px 2px;
    font-size: var(--type-xs);
    line-height: 1.15;
  }
  .small:last-child {
    width: 84px;
  }
  .icon {
    font-size: var(--type-lg);
    line-height: 1;
  }
  .act:focus {
    outline: none;
  }
  .act:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  /* Only the mode in use is lit; a button that merely was tapped earlier is not. */
  .act.active {
    border-color: var(--select);
    box-shadow: 0 0 0 2px var(--select);
  }
  .unusable {
    border-style: dashed;
    opacity: 0.55;
  }
  .act:disabled {
    border-style: dashed;
    opacity: 0.4;
    cursor: default;
  }
  .empty {
    align-self: center;
    flex: 1;
    min-width: 0;
    font-size: var(--type-sm);
    opacity: 0.8;
  }
</style>
