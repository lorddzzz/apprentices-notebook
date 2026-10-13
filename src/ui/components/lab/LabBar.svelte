<script lang="ts">
  import type { ScenarioDef } from '$data';
  import type { LabMode } from '../../../app/lab.svelte';

  interface Props {
    scenarios: readonly ScenarioDef[];
    current: ScenarioDef;
    round: number;
    mode: LabMode;
    onmode: (mode: LabMode) => void;
    onpick: (id: string) => void;
    onmenu: () => void;
  }

  let { scenarios, current, round, mode, onmode, onpick, onmenu }: Props = $props();

  const MODES: { id: LabMode; label: string }[] = [
    { id: 'play', label: 'Play' },
    { id: 'board', label: 'Board' },
    { id: 'lattices', label: 'Lattices' },
  ];
</script>

<header class="lab-bar">
  <div class="row">
    <a class="back tap" href="#/study" aria-label="Back to the study">&larr;</a>
    <label class="picker">
      <span class="sr">Scenario</span>
      <select
        data-testid="scenario-picker"
        value={current.id}
        onchange={(e) => onpick(e.currentTarget.value)}
      >
        {#each scenarios as s (s.id)}
          <option value={s.id}>{s.title}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="menu tap" aria-label="Lab menu" data-testid="lab-menu" onclick={onmenu}>⋯</button>
  </div>
  <div class="row modes">
    <!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
    <div class="seg" role="group" aria-label="Lab mode">
      {#each MODES as m (m.id)}
        <button
          type="button"
          class="mode"
          class:on={mode === m.id}
          aria-pressed={mode === m.id}
          data-testid="mode-{m.id}"
          onclick={() => onmode(m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>
    <span class="round">Round {round}</span>
  </div>
  <p class="note">{current.note}</p>
</header>

<style>
  .lab-bar {
    display: flex;
    flex-direction: column;
    flex: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
  }
  .back,
  .menu {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    color: var(--ink);
    font-size: 22px;
    text-decoration: none;
    cursor: pointer;
  }
  .picker {
    flex: 1;
    min-width: 0;
  }
  select {
    width: 100%;
    height: 44px;
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px Georgia, serif;
  }
  .modes {
    padding: 0 var(--space-1);
  }
  .seg {
    display: flex;
    flex: 1;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .mode {
    flex: 1;
    height: 44px;
    border: 0;
    border-right: 1px solid var(--line);
    background: var(--parchment-dark);
    color: var(--ink-soft);
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .mode:last-child {
    border-right: 0;
  }
  .mode.on {
    background: var(--ink);
    color: var(--parchment);
    font-weight: 700;
  }
  .round {
    font: 13px var(--mono);
    color: var(--ink-soft);
    padding: 0 2px;
  }
  .note {
    margin: 0;
    padding: 0 var(--space-1);
    color: var(--ink-soft);
    font-size: 12px;
    font-style: italic;
    text-align: left;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
