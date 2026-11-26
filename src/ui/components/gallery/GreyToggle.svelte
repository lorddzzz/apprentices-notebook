<script lang="ts">
  import { go, router } from '../../../app/router.svelte';

  /**
   * UF-6: the greyscale check for every Gallery part. `?grey=1` greys the whole page with CSS
   * `filter: grayscale(1)` on the root, the same mechanism the fixture loader uses for
   * `#/fixture?name=…&grey=1` (src/app/dev/loader.ts); the toggle only writes the param, so a
   * link with it works and the filter follows the URL. It clears the filter only when it set it,
   * so a fixture that routes here with the loader's own filter on keeps it.
   */
  const on = $derived(router.params.get('grey') === '1');

  $effect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.style.filter = 'grayscale(1)';
    return () => {
      root.style.filter = '';
    };
  });

  function toggle(): void {
    const params = Object.fromEntries(router.params);
    if (on) delete params.grey;
    else params.grey = '1';
    go('gallery', params, { replace: true });
  }
</script>

<button
  type="button"
  class="grey-toggle"
  aria-pressed={on}
  data-testid="grey-toggle"
  onclick={toggle}
>
  Greyscale {on ? 'on' : 'off'}
</button>

<style>
  .grey-toggle {
    margin-left: auto;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--type-sm);
    cursor: pointer;
  }
  .grey-toggle[aria-pressed='true'] {
    background: var(--ink);
    color: var(--parchment);
  }
</style>
