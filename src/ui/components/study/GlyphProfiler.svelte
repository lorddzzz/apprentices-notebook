<script lang="ts">
  import { IDIOMS } from '$data';
  import type { GlyphDef, GlyphId, Profile } from '$engine';
  import { profilerView } from '../../../app/profiler';
  import Button from '../common/Button.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  /**
   * The profiler on the Glyph sheet (plan M8–M13, U1): tiers, the inside with dead cells faded, stats,
   * current form, one suggestion, and the Versions list.
   */
  interface Props {
    /** The current version as saved (`profile.glyphs`), not the effective view. */
    glyph: GlyphDef;
    /** Records, the archive and the effective view are read from here. */
    profile: Profile;
    /** In a doorway: no Revert, no Revise. */
    readonly: boolean;
    /** Reverts to an archived version; returns why not, or null. */
    onrevert: (id: GlyphId, version: number) => string | null;
    /** Opens the revision editor; null hides the button. */
    onrevise?: ((id: GlyphId) => void) | null;
  }

  let { glyph, profile, readonly, onrevert, onrevise = null }: Props = $props();

  const view = $derived(profilerView(profile, glyph));
  const idiomName = $derived(IDIOMS.find((i) => i.id === glyph.idiom)?.name ?? null);
  const ARROW = { up: '↑', right: '→', down: '↓', left: '←' } as const;

  let showVersions = $state(false);
  let confirming = $state<number | null>(null);
  let error = $state<string | null>(null);

  function revert(version: number): void {
    error = onrevert(glyph.id, version);
    if (error === null) confirming = null;
  }
</script>

<section class="profiler" data-testid="glyph-profiler">
  <p class="head" data-testid="glyph-header">{view.header}</p>
  <p class="meta">
    {glyph.kind} · {glyph.cells.length} runes{idiomName ? ` · idiom: ${idiomName}` : ''}
  </p>

  <div class="body">
    <div
      class="inside"
      class:up={view.inside.extraExit === 'up'}
      class:down={view.inside.extraExit === 'down'}
      class:right={view.inside.extraExit === 'right'}
      data-testid="glyph-inside"
      style:--cols={view.inside.cols}
      style:--rows={view.inside.rows}
    >
      <span class="door" aria-hidden="true">in</span>
      {#each view.inside.cells as c (c.key)}
        <span
          class="cell"
          class:entry={c.entry}
          class:dead={c.dead}
          style:grid-column={c.col}
          style:grid-row={c.row}
          data-dead={c.dead ? 'true' : undefined}
          title={c.dead ? 'Never fired' : undefined}
        >
          <RuneGlyph rune={c.rune} dir={c.dir} size={34} />
          {#if c.open}<span class="open" data-testid="glyph-open-cell">( )</span>{/if}
        </span>
      {/each}
      {#if view.inside.extraExit}
        <span class="exit {view.inside.extraExit}" data-testid="glyph-extra-exit" title="Extra exit">
          {ARROW[view.inside.extraExit]}
        </span>
      {/if}
    </div>

    <dl class="stats">
      <div><dt>Casts</dt><dd>{view.casts}</dd></div>
      <div><dt>Avg harm a cast</dt><dd>{view.avgHarm ?? '–'}</dd></div>
      <div><dt>Ink</dt><dd data-testid="glyph-ink">{view.inkText}</dd></div>
      <div>
        <dt>Form</dt>
        <dd data-testid="glyph-form">
          {#if view.form.full}
            {view.form.tiers.economy.mark} {view.form.economy.toFixed(1)} ink · {view.form
              .tiers.reliability.mark} {Math.round(view.form.reliability * 100)}%
          {:else}
            {view.form.progress}
          {/if}
        </dd>
      </div>
    </dl>
  </div>

  {#if view.suggestion}
    <p class="suggest" data-testid="glyph-suggestion">{view.suggestion}</p>
  {/if}

  {#if view.versions.length > 1}
    <button
      type="button"
      class="fold"
      aria-expanded={showVersions}
      data-testid="glyph-versions-toggle"
      onclick={() => (showVersions = !showVersions)}
    >
      <span aria-hidden="true">{showVersions ? '▾' : '▸'}</span> Versions · {view.versions.length}
    </button>
    {#if showVersions}
      <ul class="versions" data-testid="glyph-versions">
        {#each view.versions as v (v.version)}
          <li class:current={v.current}>
            <span class="line">{v.line}{v.current ? ' · current' : ''}</span>
            {#if !v.current && !readonly}
              {#if confirming === v.version}
                <span class="confirm">
                  <span>Make v{v.version} the current one?</span>
                  <Button variant="quiet" label="Cancel" onclick={() => (confirming = null)} />
                  <Button label="Revert" testid="glyph-revert-confirm" onclick={() => revert(v.version)} />
                </span>
              {:else}
                <Button
                  variant="quiet"
                  label="Revert"
                  testid="glyph-revert"
                  onclick={() => {
                    error = null;
                    confirming = v.version;
                  }}
                />
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
      {#if error}<p class="err">{error}</p>{/if}
    {/if}
  {/if}

  {#if onrevise && !readonly}
    <Button variant="quiet" label="Revise…" testid="glyph-revise" onclick={() => onrevise(glyph.id)} />
  {/if}
</section>

<style>
  .profiler {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  p {
    margin: 0;
  }
  .head {
    font-size: 15px;
    font-weight: 700;
  }
  .meta,
  .suggest {
    font-size: 14px;
    color: var(--ink-soft);
  }
  .suggest {
    color: var(--ink);
    padding: var(--space-1) var(--space-2);
    border-left: 3px solid var(--lamp);
    background: var(--parchment-dark);
  }
  .body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
  }
  .inside {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--cols), 40px);
    grid-auto-rows: 40px;
    gap: 2px;
    width: max-content;
    max-width: 100%;
    margin: 0 0 0 24px;
    padding: var(--space-1);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
  .inside.up {
    margin-top: 22px;
  }
  .inside.down {
    margin-bottom: 22px;
  }
  .inside.right {
    margin-right: 22px;
  }
  .door {
    position: absolute;
    left: -22px;
    top: 50%;
    translate: 0 -50%;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .exit {
    position: absolute;
    font: 700 20px var(--mono);
    line-height: 1;
    color: var(--lamp);
  }
  .exit.up {
    top: -22px;
    left: 50%;
    translate: -50% 0;
  }
  .exit.down {
    bottom: -22px;
    left: 50%;
    translate: -50% 0;
  }
  .exit.right {
    right: -20px;
    top: 50%;
    translate: 0 -50%;
  }
  .cell {
    position: relative;
    display: grid;
    place-items: center;
    border-radius: var(--radius);
  }
  .cell.entry {
    background: rgba(232, 176, 74, 0.35);
  }
  .cell.dead {
    opacity: 0.35;
  }
  .open {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 0 3px;
    white-space: nowrap;
    border-radius: 3px;
    background: var(--parchment);
    font: 700 11px var(--mono);
    line-height: 14px;
    color: var(--ink);
  }
  .stats {
    flex: 1 1 140px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    font-size: 14px;
  }
  .stats div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
  dt {
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .fold {
    align-self: flex-start;
    min-height: var(--tap);
    padding: 0 var(--space-1);
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .versions {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 14px;
  }
  .versions li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1) var(--space-2);
  }
  .versions li.current {
    font-weight: 700;
  }
  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
  }
  .err {
    font-size: 13px;
    color: var(--danger);
  }
</style>
