<script lang="ts">
  import { describeSpell, type Spell, type SpellKey } from '$engine';
  import type { Recipe } from '../../../app/recipe';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    spells: Spell[];
    /** Charges left per spell; defaults to each spell's maximum. */
    charges?: Record<SpellKey, number>;
    focus: SpellKey | null;
    /** The focused spell written out step by step. */
    recipe: Recipe | null;
    onfocus: (key: SpellKey) => void;
  }

  let { spells, charges, focus, recipe, onfocus }: Props = $props();
</script>

<ul class="spells" data-testid="spells">
  {#each spells as s (s.key)}
    {@const open = focus === s.key && recipe !== null}
    <li>
      <button
        type="button"
        class="spell"
        class:focused={focus === s.key}
        aria-pressed={focus === s.key}
        aria-expanded={open}
        onclick={() => onfocus(s.key)}
      >
        <RuneGlyph rune={s.source} dir={s.path[0]?.dir} size={28} />
        <span class="text">{open ? recipe.source : describeSpell(s)}</span>
        <Pips value={charges?.[s.key] ?? s.charges} max={s.charges} tone="charge" />
      </button>
      {#if open}
        <ol class="recipe" data-testid="recipe">
          {#each recipe.steps as st (st.n)}
            <li class="step" style:--depth={st.depth}>
              <span class="num">{st.n}</span>
              <span class="body">
                {st.text}
                {#each st.reactions as r (r)}
                  <span class="reaction">→ {r}</span>
                {/each}
                {#if st.note}<span class="note">{st.note}</span>{/if}
              </span>
            </li>
          {/each}
          {#each recipe.notes as n (n)}
            <li class="note general">{n}</li>
          {/each}
        </ol>
      {/if}
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
  .recipe {
    margin: 2px 0 var(--space-1);
    padding: 0 var(--space-2);
    list-style: none;
  }
  .step {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin-top: 3px;
    padding-left: calc(var(--depth) * 14px);
    font-size: 13px;
    line-height: 1.3;
  }
  .num {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--f-source);
    color: var(--parchment);
    font: 700 11px var(--mono);
  }
  .body {
    display: flex;
    flex-direction: column;
  }
  .reaction {
    color: var(--m-fire);
    font-weight: 600;
  }
  .note {
    color: var(--ink-soft);
    font-style: italic;
  }
  .note.general {
    margin-top: 3px;
    font-size: 12.5px;
  }
  .empty {
    padding: var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
</style>
