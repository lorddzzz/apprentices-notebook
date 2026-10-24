<script lang="ts">
  import { game } from '../../../app/instance';
  import { ACTION_INFO, type CardView } from '../../../app/study';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import HabitFinePrint from '../common/HabitFinePrint.svelte';
  import ActionIcon from './ActionIcon.svelte';

  interface Props {
    card: CardView;
    /** Why the seats cannot change right now (a trip is out), else null. */
    lock: string | null;
    onopen: () => void;
    onbring: () => void;
    onhome: () => void;
  }

  let { card, lock, onopen, onbring, onhome }: Props = $props();
  const def = $derived(card.def);
  const seated = $derived(card.slot !== null);
</script>

<article class="full" style:--c="var(--hue-{def.look.hue})" data-testid="card-{def.id}">
  <header>
    <ApprenticeToken {def} size={34} />
    <div class="who">
      <h3>{def.name}</h3>
      <span class="where">{seated ? `In seat ${(card.slot ?? 0) + 1}` : 'On the bench'}</span>
    </div>
  </header>
  <p class="blurb">{def.blurb}</p>
  <dl>
    <div>
      <dt>Body</dt>
      <dd>{def.hp} HP · moves {def.move}</dd>
    </div>
    <div>
      <dt>Action</dt>
      <dd class="action">
        <ActionIcon action={def.action} />
        <span><b>{ACTION_INFO[def.action].name}.</b> {ACTION_INFO[def.action].rule}</span>
      </dd>
    </div>
    <div>
      <dt>Lean</dt>
      <dd class="chips">
        {#if card.gifted === null && def.lean.gifted}
          <span class="chip">{card.trained}, trained and gifted</span>
        {:else}
          <span class="chip">Trained: {card.trained}</span>
          {#if card.gifted}<span class="chip">Gifted: {card.gifted}</span>{/if}
        {/if}
      </dd>
    </div>
    {#if card.habit}
      <div>
        <dt>Habit</dt>
        <dd>
          {card.habit.line}
          <span class="kind">({card.habit.kind === 'body' ? 'body' : 'page'})</span>
          {#if card.dormant}
            <span class="dormant" data-testid="dormant-{def.id}"
              >Dormant: needs {card.habit.leansOn ?? 'a rune'}</span
            >
          {/if}
          {#if def.habit}<HabitFinePrint habit={def.habit} profile={game.profile} />{/if}
        </dd>
      </div>
    {/if}
  </dl>
  <footer>
    <Button variant="quiet" label="Open page" onclick={onopen} testid="open-{def.id}" />
    {#if seated}
      <Button
        variant="quiet"
        label="Leave home"
        disabled={lock !== null}
        onclick={onhome}
        testid="home-{def.id}"
      />
    {:else}
      <Button label="Bring" disabled={lock !== null} onclick={onbring} testid="bring-{def.id}" />
    {/if}
  </footer>
  {#if lock}<p class="lock">{lock}</p>{/if}
</article>

<style>
  .full {
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--c);
    border-radius: var(--radius);
    background: var(--parchment);
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: normal;
    color: var(--c);
  }
  .where {
    font-size: 12px;
    color: var(--ink-soft);
  }
  .blurb {
    margin: var(--space-1) 0 var(--space-2);
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  dl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }
  dl > div {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: var(--space-2);
    font-size: 14px;
  }
  dt {
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    min-width: 0;
  }
  .action {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .action :global(svg) {
    margin-top: 2px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--parchment-dark);
    font-size: 13px;
  }
  .kind {
    font-size: 12px;
    color: var(--ink-soft);
  }
  .dormant {
    display: inline-block;
    margin-top: 2px;
    padding: 0 6px;
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    background: var(--danger-tint);
    font-size: 12px;
    color: var(--danger);
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .lock {
    margin: var(--space-1) 0 0;
    font-size: 12px;
    color: var(--ink-soft);
  }
</style>
