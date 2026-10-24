<script lang="ts">
  import type { HabitId } from '$data';
  import { habitFinePrint, type Profile } from '$engine';
  import { lineTextFor } from '../../../app/bench';

  interface Props {
    habit: HabitId;
    profile: Profile;
  }

  let { habit, profile }: Props = $props();
  // Witnessed lines read in full; the rest are only counted, never hinted at (D1).
  const fine = $derived(habitFinePrint(profile, habit));
</script>

{#if fine.seen.length > 0 || fine.unseen > 0}
  <div class="fine" data-testid="habit-fine-print-{habit}">
    <p class="head">
      fine print {fine.seen.length} / {fine.seen.length + fine.unseen}
    </p>
    {#each fine.seen as line (line.id)}
      <p class="line" data-testid="habit-fine-line">{lineTextFor(profile, line.id)}</p>
    {/each}
    {#if fine.unseen > 0}
      <p class="unseen" data-testid="habit-fine-unseen">
        {fine.unseen} more {fine.unseen === 1 ? 'line' : 'lines'} not yet seen
      </p>
    {/if}
  </div>
{/if}

<style>
  .fine {
    margin-top: 2px;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.35;
  }
  .head {
    font-variant: small-caps;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  .line {
    margin-top: 2px;
    font-style: italic;
  }
  .unseen {
    margin-top: 2px;
    color: var(--ink-faint);
  }
</style>
