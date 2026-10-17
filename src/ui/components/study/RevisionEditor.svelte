<script lang="ts">
  import { RUNES } from '$data';
  import {
    type Coord,
    type GlyphInside,
    type InsideIssue,
    insideFlow,
    key,
    revisionCanvas,
    sameCoord,
  } from '$engine';
  import {
    canvasCells,
    insideInk,
    liftCell,
    paletteSlots,
    sameInside,
    tapCell,
  } from '../../../app/revision';
  import { NO_TOOL, type PaletteSlot, type ShelfTool } from '../../../app/study';
  import { toast } from '../../../app/toasts.svelte';
  import { longpress } from '../../attach/longpress';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import FlowOverlay from '../lattice/FlowOverlay.svelte';
  import RuneShelf from '../lattice/RuneShelf.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  /**
   * The revision editor (plan M18, M19): a full sheet to edit a Glyph's inside, reused by the desk
   * for drafts (M34). Tap to place the held rune, tap an arrow to turn it, hold (or use Erase) to lift.
   */
  interface Props {
    /** The inside to start from; null = closed. The editor keeps its own working copy. */
    inside: GlyphInside | null;
    title: string;
    /** Runes the inside may use, with how many (null = no limit). */
    palette: readonly PaletteSlot[];
    /** Live issues for the working copy (insideIssues, or the desk's view of it). */
    issues: (inside: GlyphInside) => readonly InsideIssue[];
    /** A warning to show before saving (M19: a page pushed over its ink), or null. */
    warning?: (inside: GlyphInside) => string | null;
    /** The save button's label (default "Save"). */
    saveLabel?: string;
    /**
     * Save a working copy that is allowed to be unfinished (the draft desk, M34): only blocking
     * issues stop Save; a stranded rune or a lone aura is just marked.
     */
    lenient?: boolean;
    /** Saves the working copy; returns why not, or null (then the editor closes). */
    onsave: (inside: GlyphInside) => string | null;
    onclose: () => void;
  }

  let {
    inside,
    title,
    palette,
    issues,
    warning,
    saveLabel = 'Save',
    lenient = false,
    onsave,
    onclose,
  }: Props = $props();

  // The working copy belongs to the inside it started from: a different inside starts afresh.
  const from = $derived(inside ? JSON.stringify(inside) : '');
  let edited = $state.raw<{ from: string; inside: GlyphInside } | null>(null);
  const current = $derived(edited && edited.from === from ? edited.inside : inside);
  let tool = $state.raw<ShelfTool>(NO_TOOL);
  let refused = $state<string | null>(null);

  const found = $derived(current ? issues(current) : []);
  const changed = $derived(inside !== null && current !== null && !sameInside(inside, current));
  const stopped = $derived(found.filter((i) => lenient ? i.blocking : true).length > 0);
  const note = $derived(current && changed ? (warning?.(current) ?? null) : null);
  const inkBefore = $derived(inside ? insideInk(inside) : 0);
  const inkAfter = $derived(current ? insideInk(current) : 0);
  const slots = $derived(current ? paletteSlots(palette, current) : []);
  const canvas = $derived(current ? revisionCanvas(current) : null);
  const cells = $derived(current ? canvasCells(current) : []);
  const flow = $derived(current ? insideFlow(current) : null);

  const worst = (at: Coord): InsideIssue | undefined => {
    const here = found.filter((i) => i.at && sameCoord(i.at, at));
    return here.find((i) => i.blocking) ?? here[0];
  };
  const placedAt = (at: Coord) => current?.cells.find((c) => sameCoord(c.at, at));

  function apply(next: { inside: GlyphInside; message: string | null }): void {
    refused = null;
    if (next.message) toast(next.message);
    if (next.inside !== current) edited = { from, inside: next.inside };
  }

  function tap(at: Coord): void {
    if (current) apply(tapCell(current, at, tool, palette));
  }

  function lift(at: Coord): void {
    if (current) apply(liftCell(current, at));
  }

  function reset(): void {
    edited = null;
    refused = null;
  }

  function leave(): void {
    reset();
    tool = NO_TOOL;
    onclose();
  }

  function save(): void {
    if (!current || stopped || !changed) return;
    refused = onsave(current);
    if (refused === null) {
      reset();
      tool = NO_TOOL;
    }
  }

  const cellLabel = (at: Coord): string => {
    const placed = placedAt(at);
    const issue = worst(at);
    const what = placed
      ? `${RUNES[placed.rune].name}${placed.dir ? ` ${placed.dir}` : ''}`
      : 'empty cell';
    return `${what}${current && sameCoord(at, current.entry) ? ', the entry' : ''}${issue ? `, ${issue.message}` : ''}`;
  };
</script>

<Sheet open={inside !== null} {title} onclose={leave}>
  {#if current && canvas}
    <div class="editor" data-testid="revision-editor">
      <p class="ink" data-testid="revision-ink">
        Ink {inkBefore} &rarr; <b class:up={inkAfter > inkBefore}>{inkAfter}</b>
        <small>before any discount</small>
      </p>

      <div class="pad" style:--cols={canvas.width} style:--rows={canvas.height}>
        <div class="grid" data-testid="revision-canvas">
          {#each cells as at (key(at))}
            {@const placed = placedAt(at)}
            {@const issue = worst(at)}
            {@const entry = sameCoord(at, current.entry)}
            <button
              type="button"
              class="cell"
              class:filled={placed !== undefined}
              class:entry
              class:blocking={issue?.blocking === true}
              class:soft={issue !== undefined && !issue.blocking}
              aria-label={cellLabel(at)}
              data-at={key(at)}
              onclick={() => tap(at)}
              {@attach longpress(() => lift(at))}
            >
              {#if placed}
                <RuneGlyph rune={placed.rune} dir={placed.dir} size={44} />
              {/if}
              {#if entry}<span class="lock" aria-hidden="true">in</span>{/if}
            </button>
          {/each}
          {#if flow}
            <FlowOverlay
              compiled={flow}
              focus={null}
              cols={canvas.width}
              rows={canvas.height}
              origin={canvas.origin}
            />
          {/if}
        </div>
      </div>

      <p class="rule">Tap to place the held rune. Tap an arrow to turn it. Hold a rune, or use Erase, to lift it.</p>

      <RuneShelf {slots} {tool} onselect={(t) => (tool = t)} onreject={(r) => toast(r)} erase />

      {#if found.length > 0}
        <ul class="issues" data-testid="revision-issues">
          {#each found as issue (issue.kind + issue.message + (issue.at ? key(issue.at) : ''))}
            <li class:blocking={issue.blocking}>{issue.message}</li>
          {/each}
        </ul>
      {/if}
      {#if note}<p class="warn" role="status" data-testid="revision-warning">{note}</p>{/if}
      {#if refused}<p class="warn" role="alert" data-testid="revision-refused">{refused}</p>{/if}

      <div class="bar">
        <Button variant="quiet" label="Reset" disabled={!changed} onclick={reset} testid="revision-reset" />
        <Button variant="quiet" label="Cancel" onclick={leave} testid="revision-cancel" />
        <Button
          label={saveLabel}
          disabled={stopped || !changed}
          onclick={save}
          testid="revision-save"
        />
      </div>
    </div>
  {/if}
</Sheet>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .ink {
    margin: 0;
    font-size: 15px;
  }
  .ink small {
    margin-left: var(--space-1);
    font-size: 12px;
    color: var(--ink-soft);
  }
  .up {
    color: var(--danger);
  }
  .pad {
    container-type: inline-size;
    display: flex;
    justify-content: center;
  }
  .grid {
    position: relative;
    --pitch: min(56px, calc(100cqw / var(--cols)));
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--pitch));
    grid-auto-rows: var(--pitch);
  }
  .cell {
    position: relative;
    display: grid;
    place-items: center;
    margin: calc(var(--pitch) * 0.08);
    padding: 0;
    border: 1.5px dashed var(--ink-faint);
    border-radius: var(--radius);
    background: rgba(255, 252, 240, 0.35);
    cursor: pointer;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
  }
  .cell.filled {
    border-style: solid;
    border-color: var(--line);
    background: rgba(255, 252, 240, 0.7);
  }
  .cell.entry {
    border-color: var(--lamp);
    border-width: 2.5px;
  }
  .cell.soft {
    border: 2.5px dashed var(--lamp);
  }
  .cell.blocking {
    border: 2.5px solid var(--danger);
  }
  .cell :global(svg) {
    width: 82%;
    height: 82%;
  }
  .lock {
    position: absolute;
    top: -6px;
    left: -6px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--lamp);
    color: var(--ink);
    font: 700 10px/14px var(--mono);
    pointer-events: none;
  }
  .rule {
    margin: 0;
    font-size: 12px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .issues {
    margin: 0;
    padding-left: var(--space-3);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .issues .blocking {
    color: var(--danger);
  }
  .warn {
    margin: 0;
    padding: var(--space-1) var(--space-2);
    border: 1.5px solid var(--lamp);
    border-radius: var(--radius);
    background: rgba(232, 176, 74, 0.2);
    font-size: 13px;
  }
  .bar {
    position: sticky;
    bottom: calc(-1 * var(--space-3));
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin: 0 calc(-1 * var(--space-3)) calc(-1 * var(--space-3));
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
</style>
