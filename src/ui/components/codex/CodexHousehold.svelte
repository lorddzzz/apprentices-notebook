<script lang="ts">
  import type { HouseholdRow } from '../../../app/codexHousehold';
  import { game } from '../../../app/instance';
  import { ACTION_INFO } from '../../../app/study';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import HabitFinePrint from '../common/HabitFinePrint.svelte';

  interface Props {
    row: HouseholdRow;
  }

  let { row }: Props = $props();
  const def = $derived(row.card.def);
  const habit = $derived(row.card.habit);
  const action = $derived(ACTION_INFO[def.action]);
</script>

<article class="who" style:--c="var(--hue-{def.look.hue})" data-testid="codex-household-{def.id}">
  <header>
    <ApprenticeToken {def} size={34} />
    <div>
      <h3>{def.name}</h3>
      <span class="met" data-testid="codex-household-met">{row.met}</span>
    </div>
  </header>
  <p class="blurb">{def.blurb}</p>
  <dl>
    <dt>Body</dt>
    <dd>{def.hp} HP · moves {def.move}</dd>
    <dt>Action</dt>
    <dd><b>{action.name}.</b> {action.rule}</dd>
    {#if habit}
      <dt>Habit</dt>
      <dd>
        {habit.line}
        {#if def.habit}<HabitFinePrint habit={def.habit} profile={game.profile} />{/if}
      </dd>
    {/if}
  </dl>
</article>

<style>
  .who {
    padding: var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--line);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  h3 {
    margin: 0;
    font-family: var(--hand);
    font-size: 20px;
    font-weight: normal;
    color: var(--c);
  }
  .met {
    font: 700 11px var(--mono);
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .blurb {
    margin: var(--space-1) 0 var(--space-2);
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  dl {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 4px var(--space-2);
    margin: 0;
    font-size: 14px;
  }
  dt {
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    min-width: 0;
  }
</style>
