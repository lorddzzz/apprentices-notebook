<script lang="ts">
  import BackLink from '../components/common/BackLink.svelte';

  // The desk where the owner's drafts are mended (plan M31–M36). W0 stub: task U5 builds it.
</script>

<section class="desk" data-testid="desk">
  <header>
    <BackLink to="study" label="Study" />
  </header>
  <p class="soon">The owner's drafts will be laid out here.</p>
</section>

<style>
  .desk {
    height: 100%;
    padding: var(--space-2) var(--space-3);
    overflow-y: auto;
  }
  .soon {
    margin: var(--space-3) 0;
    font-size: 15px;
    color: var(--ink-soft);
  }
</style>
