<script lang="ts">
  import type { DistrictId } from '$data';
  import type { Profile } from '$engine';
  import { underSeam } from '../../../app/city';

  interface Props {
    profile: Profile;
    /** Opens Set out for the lower Seam. */
    onsetout: () => void;
    /** A fixture's floors (dev checks); the profile's own when absent. */
    floors?: readonly DistrictId[];
  }

  let { profile, onsetout, floors }: Props = $props();
  const under = $derived(underSeam(profile, undefined, floors));
</script>

<!--
  The slot under the Seam node (DK-16, SM-11): a stair when the Marginalia has fallen, one label
  per floor in opening order, a quiet line (nothing below yet / tuned for three), and the owner's
  door at the foot (nothing while hidden, shut when sealed, ajar when open).
-->
<div class="under" data-testid="under-seam" data-stair={under.stair} data-door={under.door}>
  {#if under.stair}
    <span class="stem"></span>
    <svg class="stair" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 20h5v-4h5v-4h5V8h3" />
    </svg>
    {#if under.canSetOut}
      <ol class="floors" data-testid="stair-floors">
        {#each under.floors as f (f.id)}
          <li data-testid="floor-{f.id}">{f.label}</li>
        {/each}
      </ol>
      <button type="button" class="go" onclick={onsetout} data-testid="open-lowerSeam">Go down</button>
    {/if}
    {#if under.quiet}<p class="quiet" data-testid="stair-quiet">{under.quiet}</p>{/if}
    {#if under.door !== 'hidden'}
      <svg
        class="door {under.door}"
        viewBox="0 0 24 28"
        aria-label="the owner's door, {under.door}"
        role="img"
        data-testid="door-art"
      >
        <path d="M5 27V8a7 7 0 0 1 14 0v19M5 27h14" />
        {#if under.door === 'sealed'}
          <path d="M5 13h14M5 19h14" />
        {:else}
          <path d="M12 3.5v23.5l7-3V6.5z" class="leaf" />
        {/if}
      </svg>
    {/if}
  {/if}
</div>

<style>
  .under {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: var(--ink-soft);
  }
  .stem {
    width: 0;
    height: 16px;
    border-left: 2px dashed var(--ink-faint);
  }
  .stair {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .floors {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    line-height: 20px;
    white-space: nowrap;
    color: var(--ink);
  }
  .go {
    margin: 0;
    padding: 0 var(--space-1);
    min-height: var(--tap);
    font-family: var(--hand);
    font-size: 17px;
    color: var(--ink);
    background: none;
    border: 0;
    border-bottom: 2px solid var(--ink);
    cursor: pointer;
  }
  .quiet {
    margin: 0;
    font-size: 12px;
    font-style: italic;
  }
  .door {
    width: 28px;
    height: 32px;
    margin-top: var(--space-1);
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .door.sealed {
    stroke: var(--ink-faint);
  }
  .door .leaf {
    fill: var(--parchment-dark);
  }
</style>
