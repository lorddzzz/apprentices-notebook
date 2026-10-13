<script lang="ts">
  import { IDIOMS } from '$data';
  import { type GlyphDef, glyphCost } from '$engine';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    /** The Glyph to look inside, or null (closed). */
    glyph: GlyphDef | null;
    onclose: () => void;
    /** Renames (free). Returns why not, or null. */
    onrename: (id: string, name: string) => string | null;
  }

  let { glyph, onclose, onrename }: Props = $props();

  let typed = $state<string | null>(null);
  let error = $state<string | null>(null);
  const name = $derived(typed ?? glyph?.name ?? '');

  // The inner cells in the Glyph's own frame (the way in is the left edge), shifted to start at 0.
  const frame = $derived.by(() => {
    const cells = glyph?.cells ?? [];
    const minX = Math.min(0, ...cells.map((c) => c.at.x));
    const minY = Math.min(0, ...cells.map((c) => c.at.y));
    const maxX = Math.max(0, ...cells.map((c) => c.at.x));
    const maxY = Math.max(0, ...cells.map((c) => c.at.y));
    return {
      cols: maxX - minX + 1,
      rows: maxY - minY + 1,
      cells: cells.map((c) => ({ ...c, col: c.at.x - minX + 1, row: c.at.y - minY + 1 })),
    };
  });
  const idiomName = $derived(IDIOMS.find((i) => i.id === glyph?.idiom)?.name ?? null);

  function close(): void {
    typed = null;
    error = null;
    onclose();
  }

  function save(): void {
    if (!glyph) return;
    error = onrename(glyph.id, name);
    if (error === null) close();
  }
</script>

<Sheet open={glyph !== null} title={glyph ? `${glyph.name} (Fair copy)` : 'Fair copy'} onclose={close}>
  {#if glyph}
    <p class="meta">
      {glyph.kind} · {glyph.cells.length} runes · {glyphCost(glyph)} ink{idiomName
        ? ` · idiom: ${idiomName}`
        : ''}
    </p>
    <div
      class="inside"
      data-testid="glyph-inside"
      style:--cols={frame.cols}
      style:--rows={frame.rows}
    >
      <span class="door" aria-hidden="true">in</span>
      {#each frame.cells as c (`${c.at.x},${c.at.y}`)}
        <span class="cell" class:entry={c.at.x === glyph.entry.x && c.at.y === glyph.entry.y} style:grid-column={c.col} style:grid-row={c.row}>
          <RuneGlyph rune={c.rune} dir={c.dir} size={34} />
        </span>
      {/each}
    </div>
    <p class="hint">Inside, the way in always points right. The page turns the whole Glyph.</p>
    <label class="field">
      <span>Name</span>
      <input
        type="text"
        value={name}
        maxlength="24"
        autocomplete="off"
        spellcheck="false"
        oninput={(e) => (typed = e.currentTarget.value)}
        data-testid="glyph-name"
      />
    </label>
    {#if error}<p class="err">{error}</p>{/if}
    <div class="row">
      <Button variant="quiet" label="Close" onclick={close} />
      <Button label="Rename" onclick={save} disabled={name.trim() === ''} testid="glyph-rename" />
    </div>
  {/if}
</Sheet>

<style>
  .meta {
    margin: 0 0 var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .inside {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--cols), 40px);
    grid-auto-rows: 40px;
    gap: 2px;
    width: max-content;
    max-width: 100%;
    margin: var(--space-2) 0 var(--space-2) 24px;
    padding: var(--space-1);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
  .door {
    position: absolute;
    left: -22px;
    top: 50%;
    translate: 0 -50%;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .cell {
    display: grid;
    place-items: center;
    border-radius: var(--radius);
  }
  .cell.entry {
    background: rgba(232, 176, 74, 0.35);
  }
  .hint {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  input {
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px var(--hand);
  }
  .err {
    margin: var(--space-1) 0 0;
    font-size: 13px;
    color: var(--danger);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
