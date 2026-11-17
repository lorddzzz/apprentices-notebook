<script lang="ts">
  import type { Drawing } from '$data';
  import {
    blankDrawing,
    type ElementRow,
    rename,
    saveDraft,
    setLength,
    tableView,
    toggle,
  } from '../../app/drawing';
  import { game } from '../../app/instance';
  import { toast } from '../../app/toasts.svelte';
  import BackLink from '../components/common/BackLink.svelte';
  import DrawingEditor from '../components/drawing/DrawingEditor.svelte';

  let slot = $state<0 | 1 | 2>(0);
  let draft = $state.raw<Drawing | null>(null);

  const profile = $derived(game.save.profile);
  const view = $derived(tableView(profile, slot, draft, game.save.trip));

  function choose(s: 0 | 1 | 2): void {
    slot = s;
    draft = null;
  }

  function edit(change: (d: Drawing) => Drawing): void {
    if (view.locked) return;
    draft = change(view.draft);
  }

  function commit(next: Drawing | null, done: string): void {
    const message = game.updateProfile((p) => saveDraft({ ...game.save, profile: p }, slot, next).profile);
    if (message !== null) {
      toast(message, 'warn');
      return;
    }
    draft = null;
    toast(done);
  }

  function wipe(): void {
    commit(null, 'The page is clear again.');
    draft = blankDrawing(profile);
  }
</script>

<section class="table" data-testid="drawing-table">
  <header>
    <BackLink to="desk" label="Desk" />
    <h1>The drawing table</h1>
  </header>

  <div class="leaf">
    <DrawingEditor
      {view}
      {slot}
      onslot={choose}
      onpick={(row: ElementRow) => edit((d) => toggle(d, row.element, row.id))}
      onname={(name) => edit((d) => rename(d, name))}
      onlength={(n) => edit((d) => setLength(d, n))}
      onsave={() => commit({ ...view.draft, name: view.draft.name.trim() }, 'The page is inked.')}
      onclear={wipe}
    />
  </div>
</section>

<style>
  .table {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
    overflow: hidden;
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  h1 {
    margin: 0 auto;
    font-size: 20px;
    font-weight: normal;
    letter-spacing: 0.03em;
  }
  .leaf {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-2);
  }
</style>
