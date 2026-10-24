<script lang="ts">
  import { game } from '../../../app/instance';
  import type { NoteView } from '../../../app/recruitNotes';
  import { ACTION_INFO } from '../../../app/study';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import HabitFinePrint from '../common/HabitFinePrint.svelte';
  import Sheet from '../common/Sheet.svelte';
  import ActionIcon from '../study/ActionIcon.svelte';

  interface Props {
    /** The note being read, or null when the sheet is closed. */
    note: NoteView | null;
    onwelcome: () => void;
    onclose: () => void;
  }

  let { note, onwelcome, onclose }: Props = $props();
  const def = $derived(note?.card.def ?? null);
</script>

<Sheet open={note !== null} title="A note under the door" {onclose}>
  {#if note && def}
    <article class="welcome" style:--c="var(--hue-{def.look.hue})" data-testid="welcome-sheet">
      <p class="paper" data-testid="note-text">&ldquo;{note.text}&rdquo;</p>
      <section class="who" data-testid="welcome-card-{def.id}">
        <header>
          <ApprenticeToken {def} size={34} />
          <h3>{def.name}</h3>
        </header>
        <p class="blurb">{def.blurb}</p>
        <dl>
          <dt>Body</dt>
          <dd>{def.hp} HP · moves {def.move}</dd>
          <dt>Action</dt>
          <dd class="action">
            <ActionIcon action={def.action} />
            <span><b>{ACTION_INFO[def.action].name}.</b> {ACTION_INFO[def.action].rule}</span>
          </dd>
          <dt>Lean</dt>
          <dd>
            {#if note.card.gifted === null && def.lean.gifted}
              {note.card.trained}, trained and gifted
            {:else}
              Trained: {note.card.trained}{#if note.card.gifted}, gifted: {note.card.gifted}{/if}
            {/if}
          </dd>
          {#if note.card.habit}
            <dt>Habit</dt>
            <dd>
              {note.card.habit.line}
              {#if def.habit}<HabitFinePrint habit={def.habit} profile={game.profile} />{/if}
            </dd>
          {/if}
        </dl>
      </section>
      <div class="row">
        <Button variant="quiet" label="Not yet" onclick={onclose} testid="welcome-later" />
        <Button label="Welcome in" onclick={onwelcome} testid="welcome-go" />
      </div>
      <p class="hint">Welcomed, they wait on the bench with their own page until you bring them.</p>
    </article>
  {/if}
</Sheet>

<style>
  .paper {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-left: 4px solid var(--lamp);
    background: var(--parchment-dark);
    font-family: var(--hand);
    font-size: 20px;
    line-height: 1.25;
  }
  .who {
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--c);
    border-radius: var(--radius);
    background: var(--parchment);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: normal;
    color: var(--c);
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
  }
  .action {
    display: flex;
    gap: var(--space-1);
    align-items: flex-start;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .hint {
    margin: var(--space-2) 0 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
</style>
