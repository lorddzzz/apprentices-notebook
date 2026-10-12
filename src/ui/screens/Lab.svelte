<script lang="ts">
  import { router } from '../../app/router.svelte';
  import { href } from '../../app/routes';

  const scenario = $derived(router.params.get('scenario'));
</script>

<section>
  <h1>Lab</h1>
  <p data-testid="scenario">Scenario: {scenario ?? '(none)'}</p>
  <a class="link" href={href('study')}>← Study</a>
  <a class="link" href={href('gallery', { part: 'glyphs' })}>Gallery</a>
</section>

<style>
  section {
    padding: var(--space-4) var(--space-3);
  }
  .link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-right: var(--space-3);
  }
  h1 {
    margin: 0 0 var(--space-2);
    font-weight: normal;
  }
</style>
