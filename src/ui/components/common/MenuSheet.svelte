<script lang="ts">
  import Sheet from './Sheet.svelte';

  /** C7 (frozen props). Stub: UF-12 fills it (Settings, Install, About, Copy/Paste save, Start a
   *  new notebook, the Lab, the Gallery in dev). */
  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();
</script>

<Sheet {open} title="The notebook" {onclose}>
  <p class="stub" data-testid="menu-sheet">Settings and the rest arrive here.</p>
</Sheet>

<style>
  .stub {
    margin: 0;
    font-family: var(--font-serif);
    color: var(--ink-soft);
  }
</style>
