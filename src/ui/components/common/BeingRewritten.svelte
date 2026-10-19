<script lang="ts">
  import BackLink from './BackLink.svelte';

  interface Props {
    /** The page's name, shown as the heading. */
    title: string;
    /** One line in the owner's voice about what will be here. */
    line: string;
    testid: string;
  }

  let { title, line, testid }: Props = $props();
</script>

<section class="page" data-testid={testid}>
  <header>
    <BackLink to="study" label="Study" />
  </header>
  <div class="leaf">
    <h1>{title}</h1>
    <p class="notice" data-testid="being-rewritten">This page is being rewritten.</p>
    <p class="hand">{line}</p>
  </div>
</section>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
  }
  header {
    flex: none;
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  .leaf {
    flex: 1;
    min-height: 0;
    padding: var(--space-4) var(--space-3);
    background: repeating-linear-gradient(
      to bottom,
      transparent 0 27px,
      rgba(43, 33, 24, 0.06) 27px 28px
    );
  }
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: normal;
    letter-spacing: 0.03em;
  }
  .notice {
    margin: var(--space-3) 0 var(--space-1);
    font-size: 17px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .hand {
    margin: 0;
    font-family: var(--hand);
    font-size: 18px;
    line-height: 1.3;
    color: var(--accent);
  }
</style>
