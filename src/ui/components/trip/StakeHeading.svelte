<script lang="ts">
  /** UT-8. The script heading of the Crossroads and Cleared, with its one line of voice. */
  interface Props {
    heading: string;
    line?: string;
  }

  let { heading, line }: Props = $props();
</script>

<header class="stake">
  <h1>{heading}</h1>
  {#if line}<p>{line}</p>{/if}
</header>

<style>
  .stake {
    flex: none;
  }
  h1 {
    margin: 0;
    font-family: var(--font-script);
    font-size: 28px;
    font-weight: normal;
    line-height: 1.25;
  }
  p {
    margin: 2px 0 0;
    font-size: var(--type-sm);
    font-style: italic;
    color: var(--ink-soft);
  }
</style>
