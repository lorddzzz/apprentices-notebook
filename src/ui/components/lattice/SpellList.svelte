<script lang="ts">
  import { describeSpell, type Spell, type SpellKey } from '$engine';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    spells: Spell[];
    /** Charges left per spell; defaults to each spell's maximum. */
    charges?: Record<SpellKey, number>;
    focus: SpellKey | null;
    /** Tapping the focused spell again clears the focus (null). */
    onfocus: (key: SpellKey | null) => void;
  }

  let { spells, charges, focus, onfocus }: Props = $props();
</script>

<ul class="spells" data-testid="spells">
  {#each spells as s (s.key)}
    <li>
      <button
        type="button"
        class="spell"
        class:focused={focus === s.key}
        aria-pressed={focus === s.key}
        onclick={() => onfocus(focus === s.key ? null : s.key)}
      >
        <RuneGlyph rune={s.source} dir={s.path[0]?.dir} size={28} />
        <span class="text">{describeSpell(s)}</span>
        <Pips value={charges?.[s.key] ?? s.charges} max={s.charges} tone="charge" />
      </button>
    </li>
  {:else}
    <li class="empty">No spell yet. A Source rune (Bolt, Splash, Ward) starts the flow.</li>
  {/each}
</ul>

<style>
  .spells {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .spell {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-height: var(--tap);
    padding: 2px var(--space-2);
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .spell.focused {
    border-color: var(--f-source);
    background: rgba(139, 58, 43, 0.1);
  }
  .text {
    flex: 1;
    font-size: 14px;
    line-height: 1.25;
  }
  .empty {
    padding: var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
</style>
