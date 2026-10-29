<script lang="ts">
  import { game } from '../../../app/instance';
  import { type NoteView, notesUnderDoor } from '../../../app/recruitNotes';
  import { toast } from '../../../app/toasts.svelte';
  import WelcomeSheet from './WelcomeSheet.svelte';

  // Notes only arrive at home, so none shows out on a trip or in a quiet doorway (RC-6, P3).
  const notes = $derived(game.save.trip || game.inDoorway ? [] : notesUnderDoor(game.profile));
  let reading = $state<NoteView['id'] | null>(null);
  const note = $derived(notes.find((n) => n.id === reading) ?? null);

  function welcome(): void {
    if (!note) return;
    const { id, name } = note;
    const why = game.welcome(id);
    if (why) {
      toast(why, 'warn');
      return;
    }
    toast(`${name} joins the household`);
    reading = null;
  }
</script>

{#each notes as n (n.id)}
  <button
    type="button"
    class="note"
    onclick={() => (reading = n.id)}
    data-testid="door-note-{n.id}"
  >
    <svg class="slip" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M3 5h16l-1 13H4z" fill="var(--parchment)" stroke="var(--wood-deep)" stroke-width="1.6" />
      <path d="M6 9h10M6 12h8M6 15h6" stroke="var(--ink-soft)" stroke-width="1" />
    </svg>
    <span class="words">
      <span class="label">A note under the door</span>
      <span class="caption">Someone has read your work</span>
    </span>
  </button>
{/each}

<WelcomeSheet {note} onwelcome={welcome} onclose={() => (reading = null)} />

<style>
  .note {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: none;
    width: calc(100% - 2 * var(--space-2));
    min-height: var(--tap);
    margin: var(--space-1) var(--space-2) 0;
    padding: 0 var(--space-3);
    border: 2px solid var(--lamp);
    border-radius: var(--radius);
    background: rgba(232, 176, 74, 0.14);
    color: var(--parchment);
    text-align: left;
  }
  .slip {
    flex: none;
  }
  .words {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .label {
    font-size: 15px;
    font-style: italic;
  }
  .caption {
    font-size: 12px;
    color: rgba(241, 230, 204, 0.7);
  }
</style>
