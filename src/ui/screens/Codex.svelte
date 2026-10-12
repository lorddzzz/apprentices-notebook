<script lang="ts">
  import { href } from '../../app/routes';
</script>

<section>
  <h1>Codex</h1>
  <p>Placeholder. Coming in v0.</p>
  <a class="link" href={href('study')}>← Study</a>
</section>

<style>
  section {
    padding: var(--space-4) var(--space-3);
  }
  .link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  h1 {
    margin: 0 0 var(--space-2);
    font-weight: normal;
  }
</style>
