<script lang="ts">
  import { href } from '../../app/routes';

  // W0 stub: U4 runs the threshold battle here.
</script>

<div class="threshold" data-testid="threshold">
  <h1>The way is barred</h1>
  <a href={href('map')}>Back to the map</a>
</div>

<style>
  .threshold {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
  }
</style>
