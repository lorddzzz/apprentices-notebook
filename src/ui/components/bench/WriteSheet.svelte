<script lang="ts">
  import { SOLVENTS, type SolventId } from '$data';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    open: boolean;
    name: string;
    placeholder: string;
    headline: string;
    solvent: SolventId | null;
    onname: (name: string) => void;
    onwrite: () => void;
    onclose: () => void;
  }

  let { open, name, placeholder, headline, solvent, onname, onwrite, onclose }: Props = $props();
</script>

<Sheet {open} title="Name it and write it" {onclose}>
  <p class="headline">{headline}</p>
  <label class="field">
    <span>Name</span>
    <input
      type="text"
      value={name}
      {placeholder}
      maxlength="24"
      autocomplete="off"
      data-testid="invention-name"
      oninput={(e) => onname(e.currentTarget.value)}
    />
  </label>
  <p class="cost" data-testid="write-cost">
    {solvent ? `Writing it spends one ${SOLVENTS[solvent].name}.` : 'Writing a plain invention is free.'}
  </p>
  <Button label="Write it" onclick={onwrite} testid="write-confirm" />
</Sheet>

<style>
  .headline {
    margin: 0 0 var(--space-3);
    font-family: var(--hand);
    font-size: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 13px;
    color: var(--ink-soft);
  }
  input {
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    font: 18px Georgia, serif;
  }
  .cost {
    margin: var(--space-2) 0 var(--space-3);
    font-size: 14px;
  }
</style>
