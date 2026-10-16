<script lang="ts">
  import { type MemberId, RUNES } from '$data';
  import {
    type CellKey,
    type Coord,
    type GlyphArg,
    type GlyphDef,
    key,
    type Profile,
    turnRight,
  } from '$engine';
  import { argOptions } from '../../../app/study';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  /**
   * The argument picker (plan M21, M25): one rune per open cell of a placed Glyph, from the
   * collection, pre-filled with what it holds (its defaults at first). An arrow rune can be turned.
   */
  interface Props {
    /** The placed Glyph (effective view) and its current arguments; null = closed. */
    target: { at: Coord; glyph: GlyphDef; args: Readonly<Record<CellKey, GlyphArg>> } | null;
    /** What is owned and free is read from here (canPlaceGlyph with args). */
    profile: Profile;
    member: MemberId;
    /** Applies the arguments; returns why not, or null (then the picker closes). */
    onapply: (args: Readonly<Record<CellKey, GlyphArg>>) => string | null;
    onclose: () => void;
  }

  let { target, profile, member, onapply, onclose }: Props = $props();

  // Edits on top of what the Glyph holds; cleared when the picker closes or applies.
  let edits = $state<Record<CellKey, GlyphArg>>({});
  let error = $state<string | null>(null);

  /** What each open cell holds now: the edit, else the placed argument, else the default. */
  const rows = $derived.by(() => {
    if (!target) return [];
    const t = target;
    const all = t.glyph.cells;
    return t.glyph.params.flatMap((k, i) => {
      const cell = all.find((c) => key(c.at) === k);
      if (!cell) return [];
      const arg: GlyphArg = edits[k] ?? t.args[k] ?? { rune: cell.rune, dir: cell.dir };
      return [{ k, i, cell, arg, position: all.indexOf(cell) + 1 }];
    });
  });

  /** Every cell's current choice, as the engine reads it. */
  const chosen = $derived(Object.fromEntries(rows.map((r) => [r.k, r.arg])));

  function options(k: CellKey): ReturnType<typeof argOptions> {
    return target ? argOptions(profile, member, target.at, k, chosen) : [];
  }

  function pick(k: CellKey, rune: GlyphArg['rune'], dir?: GlyphArg['dir']): void {
    error = null;
    edits[k] = RUNES[rune].arrow ? { rune, dir: dir ?? 'right' } : { rune };
  }

  $effect(() => {
    if (!target) {
      edits = {};
      error = null;
    }
  });

  function reset(): void {
    edits = {};
    error = null;
  }

  function close(): void {
    reset();
    onclose();
  }

  function apply(): void {
    error = onapply(chosen);
    if (error === null) edits = {};
  }
</script>

<Sheet open={target !== null} title="Arguments" onclose={close}>
  {#if target}
    <div data-testid="arg-picker">
      <p class="intro">
        <b>{target.glyph.name}</b> takes {rows.length === 1 ? 'one rune' : `${rows.length} runes`} from
        your collection. Ink stays the same.
      </p>
      {#each rows as row (row.k)}
        <section class="cell" data-testid="arg-cell" data-cell={row.k}>
          <p class="title">
            Rune {row.position} of {target.glyph.cells.length} · {RUNES[row.cell.rune].family}
            <span class="soft">(default {RUNES[row.cell.rune].name})</span>
          </p>
          <div class="runes">
            {#each options(row.k) as o (o.rune)}
              {@const on = row.arg.rune === o.rune}
              <button
                type="button"
                class="rune"
                class:on
                aria-pressed={on}
                disabled={!on && o.free === 0}
                title={o.free === 0 && !on ? `No ${RUNES[o.rune].name} left` : RUNES[o.rune].name}
                data-testid="arg-rune"
                data-rune={o.rune}
                onclick={() => pick(row.k, o.rune, row.arg.dir ?? row.cell.dir)}
              >
                <RuneGlyph
                  rune={o.rune}
                  dir={RUNES[o.rune].arrow ? (on ? row.arg.dir : (row.cell.dir ?? 'right')) : undefined}
                  size={32}
                />
                <span class="count">{o.free}</span>
              </button>
            {/each}
          </div>
          {#if RUNES[row.arg.rune].arrow}
            <div class="turn">
              <Button
                variant="quiet"
                label="Turn"
                testid="arg-turn"
                onclick={() => pick(row.k, row.arg.rune, turnRight(row.arg.dir ?? 'right'))}
              />
              <span class="soft">points {row.arg.dir ?? 'right'}, as the Fair copy sees it</span>
            </div>
          {/if}
        </section>
      {/each}
      {#if error}<p class="err" data-testid="arg-error">{error}</p>{/if}
      <div class="foot">
        <Button variant="quiet" label="Not yet" onclick={close} />
        <Button label="Apply" onclick={apply} testid="arg-apply" />
      </div>
    </div>
  {/if}
</Sheet>

<style>
  p {
    margin: 0;
  }
  .intro {
    margin-bottom: var(--space-2);
    font-size: 14px;
  }
  .cell {
    margin-bottom: var(--space-2);
  }
  .title {
    margin-bottom: var(--space-1);
    font-size: 14px;
    font-weight: 700;
  }
  .soft {
    font-size: 13px;
    font-weight: 400;
    color: var(--ink-soft);
  }
  .runes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .rune {
    position: relative;
    display: grid;
    place-items: center;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    cursor: pointer;
  }
  .rune.on {
    border-color: var(--lamp);
    background: rgba(232, 176, 74, 0.35);
  }
  .rune:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .count {
    position: absolute;
    right: 2px;
    bottom: 0;
    font: 11px var(--mono);
    color: var(--ink-soft);
  }
  .turn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }
  .err {
    margin-top: var(--space-1);
    font-size: 13px;
    color: var(--danger);
  }
  .foot {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
