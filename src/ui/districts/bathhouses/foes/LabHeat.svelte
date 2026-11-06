<script lang="ts">
  import type { BattleState } from '$engine';
  import { BOIL_OVER_RULE_ID } from '$engine/districts/bathhouses/types';
  import type { Json, RuleId } from '$engine/districts/types';
  import { labHeatOf } from './lab';

  interface Props {
    state: BattleState;
    onrule: (id: RuleId, config: Json | null) => void;
  }

  let { state, onrule }: Props = $props();

  const heat = $derived(labHeatOf(state));
  const HEATS = [1, 2, 3, 4] as const;
</script>

<!--
  The Lab's menu sheet (BH-14): the boil-over rule off, or on at a heat. The rule is the bathhouses'
  round-end gauge; a Lab board lists it the way a bathhouse room does, so clouds and vents fill the
  strip above the board and a full strip storms everyone standing in a cloud. Choosing a heat
  starts a fresh gauge at 0.
-->
<section class="heat" data-testid="lab-heat">
  <h3>Boil-over rule</h3>
  <p>
    The thermae's gauge: every cloud tile and vent fills it each round, and a full gauge storms
    whoever stands in a cloud. Pick a heat to switch it on.
  </p>
  <fieldset class="row" aria-label="Boil-over heat">
    <button
      type="button"
      class:on={heat === null}
      aria-pressed={heat === null}
      data-testid="lab-heat-off"
      onclick={() => onrule(BOIL_OVER_RULE_ID, null)}
    >
      Off
    </button>
    {#each HEATS as h (h)}
      <button
        type="button"
        class:on={heat === h}
        aria-pressed={heat === h}
        data-testid="lab-heat-{h}"
        onclick={() => onrule(BOIL_OVER_RULE_ID, { heat: h })}
      >
        Heat {h}
      </button>
    {/each}
  </fieldset>
</section>

<style>
  .heat {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line);
  }
  h3 {
    margin: 0;
    font: 16px Georgia, serif;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .row {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
  button {
    min-height: var(--tap);
    padding: 0 4px;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 14px Georgia, serif;
    cursor: pointer;
  }
  button.on {
    border-color: var(--ink);
    background: var(--select);
    font-weight: bold;
  }
</style>
