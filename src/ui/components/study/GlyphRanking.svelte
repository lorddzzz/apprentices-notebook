<script lang="ts">
  import type { GlyphId, Profile } from '$engine';
  import { rankGlyphs } from '../../../app/ranking';
  import Sheet from '../common/Sheet.svelte';

  /** "Your Glyphs, ranked" (plan M14, U2). */
  interface Props {
    open: boolean;
    /** Current versions and their records. */
    profile: Profile;
    /** A row was tapped: open that Glyph's sheet. */
    onpick: (id: GlyphId) => void;
    onclose: () => void;
  }

  let { open, profile, onpick, onclose }: Props = $props();

  const rows = $derived(rankGlyphs(profile));
</script>

<Sheet {open} title="Your Glyphs, ranked" {onclose}>
  {#if rows.length === 0}
    <p class="soon">No Glyphs yet. Fold a proven chain into a Fair copy first.</p>
  {:else}
    <ol class="rank" data-testid="glyph-ranking">
      {#each rows as row (row.id)}
        <li>
          <button
            type="button"
            class="row"
            data-testid="rank-row"
            data-glyph={row.id}
            onclick={() => onpick(row.id)}
          >
            <span class="top">
              <b>{row.name}</b>
              <small>v{row.version}</small>
              <span
                class="marks"
                title={`Economy ${row.economy.name}, Reliability ${row.reliability.name}`}
              >
                <span>E {row.economy.mark}</span>
                <span>R {row.reliability.mark}</span>
              </span>
            </span>
            <span class="meta">
              {row.harm ?? '–'} harm a cast · {row.casts} {row.casts === 1 ? 'cast' : 'casts'}
            </span>
            {#if row.toTier}
              <span class="to">{row.toTier}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</Sheet>

<style>
  .soon {
    margin: 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .rank {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    min-height: var(--tap);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .top {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    min-width: 0;
  }
  .top b {
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .top small {
    flex: none;
    font: 11px var(--mono);
    color: var(--ink-soft);
  }
  .marks {
    display: flex;
    flex: none;
    gap: var(--space-1);
    margin-left: auto;
    font: 12px var(--mono);
  }
  .meta,
  .to {
    font-size: 13px;
    color: var(--ink-soft);
  }
  .to {
    font-style: italic;
  }
</style>
