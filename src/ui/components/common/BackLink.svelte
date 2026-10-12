<script lang="ts">
  import { href, type Route } from '../../../app/routes';

  interface Props {
    to: Route;
    label: string;
  }

  let { to, label }: Props = $props();
</script>

<a class="back" href={href(to)}>&larr; {label}</a>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    color: var(--ink);
    text-decoration: none;
  }
  .back:focus-visible {
    outline: 3px solid var(--select);
  }
</style>
