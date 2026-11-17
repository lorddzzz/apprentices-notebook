<script lang="ts">
  import type { ElementRow } from '../../../app/drawing';

  interface Props {
    title: string;
    note?: string;
    rows: ElementRow[];
    disabled: boolean;
    onpick: (row: ElementRow) => void;
  }

  let { title, note, rows, disabled, onpick }: Props = $props();
</script>

<section class="group" data-testid="drawing-group-{rows[0]?.element ?? title}">
  <h2>{title}</h2>
  {#if note}<p class="note">{note}</p>{/if}
  {#if rows.length === 0}
    <p class="none">Nothing met yet.</p>
  {/if}
  <ul>
    {#each rows as row (row.id)}
      <li>
        <button
          type="button"
          class="row"
          class:picked={row.picked}
          class:grey={row.greyed !== null && !row.picked}
          aria-pressed={row.picked}
          aria-disabled={disabled || (row.greyed !== null && !row.picked)}
          data-testid="drawing-row-{row.element}-{row.id}"
          onclick={() => {
            if (!disabled && (row.picked || row.greyed === null)) onpick(row);
          }}
        >
          <span class="label">{row.label}</span>
          <span class="cost" role="img" aria-label={row.cost === 0 ? 'free' : 'costs ink'}>
            {#each Array.from({ length: row.cost }, (_, i) => i) as i (i)}<i></i>{/each}
          </span>
          <span class="mark" aria-hidden="true">{row.picked ? '✓' : ''}</span>
          {#if row.greyed !== null}
            <span class="why" class:warn={row.picked}>{row.greyed}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  h2 {
    margin: var(--space-3) var(--space-1) var(--space-1);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .note,
  .none {
    margin: 0 var(--space-1) var(--space-1);
    font-size: 13px;
    color: var(--ink-soft);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 24px;
    align-items: center;
    column-gap: var(--space-2);
    width: 100%;
    min-height: 48px;
    padding: 6px var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .picked {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .grey {
    color: var(--ink-faint);
    cursor: default;
    background: transparent;
    border-style: dashed;
  }
  .label {
    overflow-wrap: anywhere;
  }
  .cost {
    display: inline-flex;
    gap: 3px;
  }
  .cost i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--m-ink);
  }
  .grey .cost i {
    background: var(--ink-faint);
  }
  .mark {
    text-align: center;
    font-weight: bold;
  }
  .why {
    grid-column: 1 / -1;
    padding-top: 2px;
    font: 13px/1.3 Georgia, serif;
    color: var(--ink-soft);
  }
  .why.warn {
    color: var(--danger);
  }
  .row:focus-visible {
    outline: 3px solid var(--select);
  }
</style>
