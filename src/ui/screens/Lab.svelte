<script lang="ts">
  import { href, router } from '../../app/router.svelte';

  const scenario = $derived(router.params.get('scenario'));
</script>

<section>
  <h1>Lab</h1>
  <p data-testid="scenario">Scenario: {scenario ?? '(none)'}</p>
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
