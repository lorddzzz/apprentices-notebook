<script lang="ts">
  import {
    type CellKey,
    canBeOpen,
    type Dir,
    extraExitSides,
    type GlyphDef,
    type GlyphId,
    key,
    nameOf,
    type Profile,
    recordOf,
    rewardsOf,
    roleOf,
  } from '$engine';
  import RuneGlyph from '../RuneGlyph.svelte';

  /**
   * A Glyph's settings on its sheet (plan M20, M22, M26): open-cell toggles within the allowance and
   * the extra exit's side. Folded by default; read-only in a doorway.
   */
  interface Props {
    /** The current version as saved (`profile.glyphs`), not the effective view. */
    glyph: GlyphDef;
    profile: Profile;
    /** In a doorway everything is read-only. */
    readonly: boolean;
    /** Returns why not, or null. */
    onopencells: (id: GlyphId, cells: CellKey[]) => string | null;
    onextraexit: (id: GlyphId, dir: Dir | null) => string | null;
  }

  let { glyph, profile, readonly, onopencells, onextraexit }: Props = $props();

  const ARROW = { up: '↑', right: '→', down: '↓', left: '←' } as const;
  const SIDE = { up: 'Up', right: 'Right', down: 'Down', left: 'Left' } as const;

  const rewards = $derived(rewardsOf(recordOf(profile, glyph.id, glyph.version)));
  const cells = $derived(glyph.cells.filter((c) => canBeOpen(c.rune)));
  const sides = $derived(extraExitSides(glyph));
  const open = $derived(new Set(glyph.params));
  const full = $derived(open.size >= rewards.params);
  // The extra exit stays saved but sleeps below silver (a revision keeps it, M20).
  const exitOn = $derived(rewards.extraExit);

  let shown = $state(false);
  let error = $state<string | null>(null);

  const summary = $derived(
    [
      open.size > 0 ? `${open.size} open` : null,
      glyph.extraExit && exitOn ? `exit ${glyph.extraExit}` : null,
    ]
      .filter((x): x is string => x !== null)
      .join(' · '),
  );

  function toggle(k: CellKey): void {
    let next: CellKey[];
    if (open.has(k)) next = glyph.params.filter((x) => x !== k);
    else if (!full) next = [...glyph.params, k];
    // With one slot, tapping another cell moves the open cell there.
    else next = rewards.params === 1 ? [k] : [...glyph.params];
    error = onopencells(glyph.id, next);
  }

  function pickExit(dir: Dir | null): void {
    error = onextraexit(glyph.id, dir);
  }
</script>

{#if cells.length > 0 || exitOn}
  <section class="settings" data-testid="glyph-settings">
    <button
      type="button"
      class="fold"
      aria-expanded={shown}
      data-testid="glyph-settings-toggle"
      onclick={() => (shown = !shown)}
    >
      <span aria-hidden="true">{shown ? '▾' : '▸'}</span> Settings{summary
        ? ` · ${summary}`
        : ''}
    </button>

    {#if shown}
      {#if readonly}<p class="note">Settings change at home.</p>{/if}

      <div class="group">
        <p class="title">
          Open cells <span class="count" data-testid="glyph-open-count">{open.size} of {rewards.params}</span>
        </p>
        <p class="note">
          An open cell takes a rune of its own kind when you put the Fair copy down. Ink stays the
          same: it is counted per kind.
        </p>
        <div class="row">
          {#each cells as c (key(c.at))}
            {@const k = key(c.at)}
            {@const on = open.has(k)}
            <button
              type="button"
              class="cell"
              class:on
              aria-pressed={on}
              disabled={readonly || (!on && full && rewards.params > 1)}
              title={`${nameOf(c.rune)} (${roleOf(c.rune) ?? 'rune'})`}
              data-testid="glyph-open-toggle"
              data-cell={k}
              onclick={() => toggle(k)}
            >
              <RuneGlyph rune={c.rune} dir={c.dir} size={30} />
              {#if on}<span class="badge">( )</span>{/if}
            </button>
          {/each}
        </div>
        {#if rewards.params === 1}
          <p class="note">Reliability gold allows a second open cell.</p>
        {/if}
      </div>

      <div class="group">
        <p class="title">Extra exit</p>
        {#if !exitOn}
          <p class="note" data-testid="glyph-exit-locked">
            Reliability silver lets the flow leave by a second side{glyph.extraExit
              ? ` (${SIDE[glyph.extraExit].toLowerCase()} is saved and wakes then)`
              : ''}.
          </p>
        {:else if sides.length === 0}
          <p class="note">Every side already has an exit.</p>
        {:else}
          <p class="note">
            After its first branch ends, the flow also leaves by this side (turning with the Fair
            copy).
          </p>
          <div class="row">
            <button
              type="button"
              class="side"
              class:on={glyph.extraExit === null}
              aria-pressed={glyph.extraExit === null}
              disabled={readonly}
              data-testid="glyph-exit-none"
              onclick={() => pickExit(null)}
            >
              None
            </button>
            {#each sides as d (d)}
              <button
                type="button"
                class="side"
                class:on={glyph.extraExit === d}
                aria-pressed={glyph.extraExit === d}
                disabled={readonly}
                data-testid="glyph-exit-side"
                data-side={d}
                onclick={() => pickExit(d)}
              >
                <span aria-hidden="true">{ARROW[d]}</span> {SIDE[d]}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if error}<p class="err" data-testid="glyph-settings-error">{error}</p>{/if}
    {/if}
  </section>
{/if}

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  p {
    margin: 0;
  }
  .fold {
    align-self: flex-start;
    min-height: var(--tap);
    padding: 0 var(--space-1);
    border: none;
    background: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .title {
    font-size: 14px;
    font-weight: 700;
  }
  .count {
    margin-left: var(--space-1);
    font: 12px var(--mono);
    font-weight: 400;
    color: var(--ink-soft);
  }
  .note {
    font-size: 13px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .cell,
  .side {
    position: relative;
    display: inline-grid;
    place-items: center;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .cell {
    padding: 0;
  }
  .cell.on,
  .side.on {
    border-color: var(--lamp);
    background: rgba(232, 176, 74, 0.35);
    font-weight: 700;
  }
  .cell:disabled,
  .side:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 0 3px;
    border-radius: 3px;
    background: var(--parchment);
    font: 700 11px var(--mono);
    line-height: 14px;
  }
  .err {
    font-size: 13px;
    color: var(--danger);
  }
</style>
