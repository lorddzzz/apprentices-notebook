<script lang="ts">
  import type { VariantGroup } from '../../../app/lab';
  import Sheet from '../common/Sheet.svelte';

  let { open, groups, on, ontoggle, onclose }: {
    open: boolean;
    groups: readonly VariantGroup[];
    on: readonly string[];
    ontoggle: (id: string, value: boolean) => void;
    onclose: () => void;
  } = $props();
</script>

<Sheet {open} title="Footnote variants" {onclose}>
  <div class="variants" data-testid="lab-variant-list">
    <p>
      Switch a written margin on for Lab battles. A slot holds one variant, as on the Desk, so
      switching one on switches its slot-mate off. Rival notes are listed whether or not you hold
      the page.
    </p>
    {#each groups as group (group.subject)}
      <section>
        <h3>{group.name}</h3>
        {#each group.rows as row (row.id)}
          <label class="row" data-testid="variant-{row.id}">
            <span class="text">
              <span class="slot">{row.slot}</span>
              <span class="line">{row.line}</span>
              <span class="variant">{row.text}</span>
            </span>
            <input
              type="checkbox"
              checked={on.includes(row.id)}
              onchange={(e) => ontoggle(row.id, e.currentTarget.checked)}
            />
          </label>
        {/each}
      </section>
    {/each}
  </div>
</Sheet>

<style>
  .variants {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  section {
    display: grid;
    gap: var(--space-1);
  }
  h3 {
    margin: 0;
    font: 16px Georgia, serif;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 44px;
    padding: 4px 0;
    border-bottom: 1px solid var(--line-soft, rgba(0, 0, 0, 0.12));
    cursor: pointer;
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
    font-size: 14px;
    line-height: 1.3;
  }
  .slot {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  .line {
    font-size: 12px;
    font-style: italic;
    color: var(--ink-soft);
  }
  input[type='checkbox'] {
    flex: none;
    width: 44px;
    height: 28px;
    margin: 0;
    accent-color: var(--ink);
    cursor: pointer;
  }
</style>
