<script lang="ts">
  /** C7 (frozen props). A numbered disc; gold (firsts) adds a double ring, readable in greyscale. */
  interface Props {
    n: number;
    gold?: boolean;
    size?: 24 | 32;
  }

  let { n, gold = false, size = 24 }: Props = $props();
</script>

<span class={['step', { gold }]} style:--size="{size}px" data-size={size}>{n}</span>

<style>
  .step {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--size);
    height: var(--size);
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: var(--parchment);
    color: var(--ink);
    font-family: var(--font-serif);
    font-size: calc(var(--size) * 0.55);
    line-height: 1;
  }
  .gold {
    border-color: var(--gold);
    box-shadow:
      0 0 0 2px var(--parchment),
      0 0 0 4px var(--gold);
  }
</style>
