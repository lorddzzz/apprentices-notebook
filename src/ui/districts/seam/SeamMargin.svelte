<script lang="ts">
  import type { Profile } from '$engine';
  import Sheet from '../../components/common/Sheet.svelte';
  import { unheardHints } from './margin';

  interface Props {
    open: boolean;
    profile: Profile;
    onclose: () => void;
  }

  let { open, profile, onclose }: Props = $props();
  const hints = $derived(unheardHints(profile));
</script>

<!--
  The owner's margin (SM-5, P6): one `???` line for each district the Seam can still teach the
  notebook, in the owner's hand and about the deed, never the place. A line goes once it is heard.
-->
<Sheet {open} title="The owner's margin" {onclose}>
  {#if hints.length}
    <ul class="margin" data-testid="seam-margin">
      {#each hints as h (h.district)}
        <li data-testid="seam-hint"><span class="mark">???</span> {h.line}</li>
      {/each}
    </ul>
  {:else}
    <p class="quiet" data-testid="seam-margin-quiet">Nothing more is written in the margin.</p>
  {/if}
</Sheet>

<style>
  .margin {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    font-family: var(--hand);
    font-size: 19px;
    color: var(--ink);
  }
  .mark {
    margin-right: var(--space-1);
    font-family: var(--mono);
    font-size: 14px;
    color: var(--ink-faint);
  }
  .quiet {
    margin: 0;
    font-family: var(--hand);
    font-size: 19px;
    color: var(--ink-soft);
  }
</style>
