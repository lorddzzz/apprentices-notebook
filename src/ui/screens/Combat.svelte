<script lang="ts">
  import { href } from '../../app/router.svelte';
</script>

<section>
  <h1>Combat</h1>
  <p>Placeholder. Coming in v0.</p>
  <a href={href('study')}>← Study</a>
</section>

<style>
  section {
    padding: var(--space-4) var(--space-3);
  }
  h1 {
    margin: 0 0 var(--space-2);
    font-weight: normal;
  }
</style>
