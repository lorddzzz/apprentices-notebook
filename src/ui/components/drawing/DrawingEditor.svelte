<script lang="ts">
  import type { Drawing } from '$data';
  import { NAME_MAX } from '$engine/drawing';
  import {
    type ElementRow,
    LENGTH_WORD,
    LENGTHS,
    slotName,
    type TableView,
  } from '../../../app/drawing';
  import Button from '../common/Button.svelte';
  import ElementGroup from './ElementGroup.svelte';
  import PageTabs from './PageTabs.svelte';
  import PenPot from './PenPot.svelte';

  interface Props {
    view: TableView;
    slot: 0 | 1 | 2;
    /** Focus the name field on mount (the Gallery's keyboard-up state). */
    focusName?: boolean;
    onslot: (slot: 0 | 1 | 2) => void;
    onpick: (row: ElementRow) => void;
    onname: (name: string) => void;
    onlength: (length: Drawing['length']) => void;
    onsave: () => void;
    onclear: () => void;
  }

  let { view, slot, focusName = false, onslot, onpick, onname, onlength, onsave, onclear }: Props =
    $props();

  let nameField = $state<HTMLInputElement>();
  $effect(() => {
    if (focusName) nameField?.focus();
  });

  const over = $derived(view.issues.some((i) => i.element === 'pen'));
  const stored = $derived(view.slots[slot] !== null);
  const notes = $derived(view.issues.filter((i) => i.id === null));
  const fill = $derived(view.cost / Math.max(1, view.pen.total));
</script>

<div class="editor" data-testid="drawing-editor">
  <PageTabs slots={view.slots} {slot} {onslot} />

  <h2 class="page">{slotName(slot)}</h2>
  {#if view.locked}
    <p class="locked" role="status" data-testid="drawing-locked">
      This page is in use by a trip. Finish or abandon the trip, then redraw it at home.
    </p>
  {/if}

  <label class="name">
    <span>Name</span>
    <input
      bind:this={nameField}
      type="text"
      value={view.draft.name}
      maxlength={NAME_MAX}
      placeholder="a district not yet drawn"
      autocomplete="off"
      disabled={view.locked}
      data-testid="drawing-name"
      oninput={(e) => onname(e.currentTarget.value)}
    />
  </label>

  <div class="gauge" data-testid="drawing-gauge">
    <PenPot {fill} {over} label={over ? 'The pen is overdrawn' : view.depth} />
    <div>
      <p class="depth" data-testid="drawing-depth">{view.depth}</p>
      {#if over}
        {#each view.issues.filter((i) => i.element === 'pen') as issue (issue.reason)}
          <p class="pen-line" data-testid="drawing-pen-issue">{issue.reason}</p>
        {/each}
      {/if}
    </div>
  </div>

  <ElementGroup
    title="Board rule"
    rows={view.rows.rule}
    disabled={view.locked}
    {onpick}
  />
  <ElementGroup
    title="Foes"
    note="One to three kinds."
    rows={view.rows.foe}
    disabled={view.locked}
    {onpick}
  />
  <ElementGroup
    title="Pieces"
    note="Up to two extra kinds; a rule brings its own."
    rows={view.rows.piece}
    disabled={view.locked}
    {onpick}
  />
  <ElementGroup
    title="Trip shape"
    rows={view.rows.shape}
    disabled={view.locked}
    {onpick}
  />

  <section data-testid="drawing-length">
    <h3>Length</h3>
    <div class="lengths" role="group" aria-label="Length">
      {#each LENGTHS as n (n)}
        <button
          type="button"
          class="len"
          class:picked={view.draft.length === n}
          aria-pressed={view.draft.length === n}
          disabled={view.locked}
          onclick={() => onlength(n)}>{LENGTH_WORD[n]}</button
        >
      {/each}
    </div>
  </section>

  <ElementGroup title="Heart" rows={view.rows.heart} disabled={view.locked} {onpick} />

  {#each notes.filter((i) => i.element !== 'pen') as issue (issue.reason)}
    <p class="note-issue" data-testid="drawing-issue">{issue.reason}</p>
  {/each}

  <div class="actions">
    <Button
      label={stored ? 'Redraw this page' : 'Ink this page'}
      disabled={!view.canSave}
      onclick={onsave}
      testid="drawing-save"
    />
    {#if stored}
      <Button
        variant="quiet"
        label="Wipe the page"
        disabled={view.locked}
        onclick={onclear}
        testid="drawing-clear"
      />
    {/if}
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .page {
    margin: var(--space-3) var(--space-1) 0;
    font-family: var(--hand);
    font-size: 22px;
    font-weight: normal;
  }
  h3 {
    margin: var(--space-3) var(--space-1) var(--space-1);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .locked {
    margin: 0;
    padding: var(--space-2);
    border: 2px solid var(--danger);
    border-radius: var(--radius);
    background: var(--danger-tint);
    font-size: 14px;
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  input {
    min-height: 48px;
    padding: 0 var(--space-2);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    font: 18px Georgia, serif;
  }
  input:focus-visible {
    outline: 3px solid var(--select);
  }
  .gauge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
  }
  .depth {
    margin: 0;
    font-family: var(--hand);
    font-size: 20px;
  }
  .pen-line,
  .note-issue {
    margin: 2px 0 0;
    font-size: 14px;
    color: var(--danger);
  }
  .note-issue {
    margin: var(--space-2) var(--space-1) 0;
  }
  .lengths {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .len {
    min-height: 48px;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .len.picked {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .len:focus-visible {
    outline: 3px solid var(--select);
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-3) 0 var(--space-4);
  }
</style>
