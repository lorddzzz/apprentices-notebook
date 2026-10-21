<script lang="ts">
  import { IDIOMS } from '$data';
  import { type GlyphDef, type GlyphId, type Profile, revertWarning } from '$engine';
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
  /** BL-90: the ink, ownership and discount note for the version being confirmed. */
  const warning = $derived(
    confirming === null ? null : revertWarning(profile, glyph.id, confirming),
  );

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
    <!-- svelte-ignore a11y_no_noninteractive_tabindex: keyboard focus lets the inside scroll with arrow keys. -->
    <!-- biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users need to scroll long insides. -->
    <section class="inside-scroll" tabindex="0" aria-label="Glyph inside; scroll to see all runes">
    <div
      class="inside"
      data-testid="glyph-inside"
      style:--cols={view.inside.cols}
      style:--rows={view.inside.rows}
    >
      <span class="door" style:grid-column={view.inside.entry.col} style:grid-row={view.inside.entry.row} aria-hidden="true">in</span>
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
      {#each view.inside.exits as exit, i (i)}
        <span class="exit {exit.dir}" style:grid-column={exit.col} style:grid-row={exit.row}
          data-testid={exit.extra ? 'glyph-extra-exit' : 'glyph-exit'} title={exit.extra ? 'Extra exit' : 'Exit'}>
          {ARROW[exit.dir]}
        </span>
      {/each}
    </div>
    </section>

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
                {#if warning}
                  <p class="warn" role="status" data-testid="glyph-revert-warning">{warning}</p>
                {/if}
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
  .inside-scroll {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow: auto;
    padding: 24px;
    box-sizing: border-box;
  }
  .inside {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--cols), 40px);
    grid-template-rows: repeat(var(--rows), 40px);
    gap: 2px;
    width: max-content;
    padding: var(--space-1);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
  .door, .exit {
    position: relative;
    align-self: center;
    justify-self: center;
    z-index: 1;
    pointer-events: none;
  }
  .door {
    translate: -30px 0;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .exit {
    font: 700 20px/1 var(--mono);
    color: var(--lamp);
  }
  .exit.up { translate: 0 -28px; }
  .exit.down { translate: 0 28px; }
  .exit.right { translate: 28px 0; }
  .exit.left { translate: -28px 0; }
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
  .warn {
    flex-basis: 100%;
    margin: 0;
    padding: var(--space-1) var(--space-2);
    border: 1.5px solid var(--lamp);
    border-radius: var(--radius);
    background: rgba(232, 176, 74, 0.2);
    font-size: 13px;
  }
  .err {
    font-size: 13px;
    color: var(--danger);
  }
</style>
