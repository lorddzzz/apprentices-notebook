<script lang="ts">
  import { METHODS, type MethodId } from '$data';

  interface Props {
    methods: readonly MethodId[];
    chosen: MethodId | null;
    onpick: (m: MethodId) => void;
  }

  let { methods, chosen, onpick }: Props = $props();
</script>

<div class="row" data-testid="methods">
  {#each methods as m (m)}
    <button
      type="button"
      class="chip"
      class:on={chosen === m}
      aria-pressed={chosen === m}
      data-testid="method-{m}"
      onclick={() => onpick(m)}
    >
      {METHODS[m].name}
    </button>
  {:else}
    <p class="none">No method learned yet. Method pages are found on the road.</p>
  {/each}
</div>

<style>
  .row {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    flex: none;
  }
  .chip {
    flex: none;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px Georgia, serif;
    cursor: pointer;
  }
  .on {
    border-color: var(--ink);
    background: #f6e3b4;
    font-weight: bold;
  }
  .none {
    margin: 0;
    font-family: var(--hand);
    color: var(--ink-soft);
  }
</style>
