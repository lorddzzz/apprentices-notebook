<script lang="ts">
  import type { RivalSheetView } from '../../../app/describe';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    /** The rival being read, or null when none is. */
    view: RivalSheetView | null;
    onclose: () => void;
  }

  let { view, onclose }: Props = $props();
</script>

<Sheet open={view !== null} title={view?.name ?? 'Rival'} {onclose}>
  {#if view}
    <div class="rival" data-testid="rival-sheet">
      <p class="plan" data-testid="rival-plan">{view.plan}</p>
      <p class="blurb">{view.blurb} <span class="hp">{view.hp}/{view.maxHp} HP</span></p>

      {#each view.spells as sp (sp.id)}
        <section class="spell" data-testid="rival-spell-{sp.id}">
          <h3>
            {sp.name}
            <span class="charges" data-testid="rival-charges-{sp.id}">{sp.charges} of {sp.max} left</span>
          </h3>
          <div
            class="lattice"
            role="img"
            aria-label="{sp.name}: {sp.headlines.map((h) => h.name).join(', ')}"
            style:--cols={sp.cols}
            style:--rows={sp.rows}
          >
            {#each sp.cells as c, i (i)}
              <span class="socket" style:grid-column={c.col + 1} style:grid-row={c.row + 1}>
                <RuneGlyph rune={c.rune} dir={c.dir} size={40} />
              </span>
            {/each}
          </div>
          <ul class="heads">
            {#each sp.headlines as h (h.rune)}
              <li><b>{h.name}:</b> {h.text}</li>
            {/each}
          </ul>
          {#if sp.fine.length > 0}
            <ul class="fine" data-testid="rival-fine-{sp.id}">
              {#each sp.fine as line, i (i)}
                <li>{line}</li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}

      {#if view.trick}
        <div class="trick" data-testid="rival-trick">
          <span class="tag">His trick, not a spell</span>
          <b>{view.trick.name}</b>
          <p>{view.trick.text}</p>
        </div>
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .rival {
    padding: var(--space-2) var(--space-3) var(--space-3);
    overflow-wrap: anywhere;
  }
  .plan {
    margin: 0 0 var(--space-1);
    font-family: var(--hand);
    font-size: 18px;
    line-height: 1.3;
    color: var(--accent);
  }
  .blurb {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .hp {
    font: 700 11px var(--mono);
    font-style: normal;
    color: var(--ink-faint);
    white-space: nowrap;
  }
  .spell {
    padding: var(--space-2) 0;
    border-top: 1px solid var(--line);
  }
  h3 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0 0 var(--space-1);
    font-family: var(--hand);
    font-size: 20px;
    font-weight: normal;
  }
  .charges {
    font: 700 11px var(--mono);
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .lattice {
    display: grid;
    grid-template-columns: repeat(var(--cols), 44px);
    grid-template-rows: repeat(var(--rows), 44px);
    gap: 2px;
    width: max-content;
    max-width: 100%;
    margin: 0 0 var(--space-1);
    padding: 4px;
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .socket {
    display: grid;
    place-items: center;
  }
  ul {
    margin: 0;
    padding-left: var(--space-3);
    font-size: 13px;
    line-height: 1.4;
  }
  .fine {
    margin-top: var(--space-1);
    color: var(--ink-soft);
  }
  .trick {
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px dashed var(--accent);
    border-radius: 6px;
    font-size: 13px;
  }
  .trick p {
    margin: 2px 0 0;
  }
  .tag {
    display: block;
    font: 700 10px var(--mono);
    text-transform: uppercase;
    color: var(--accent);
  }
</style>
