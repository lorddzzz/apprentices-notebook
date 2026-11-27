<script lang="ts">
  import type { DistrictId } from '$data';
  import type { ThresholdSpec } from '$data/districts/index';
  import type { BattleSession } from '../../../app/battle.svelte';
  import { thresholdPictogram } from '../../../app/tripUx';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';
  import BattleBoard from '../board/BattleBoard.svelte';
  import ActionButton from '../common/ActionButton.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  /**
   * UT-6, the Threshold's first stage. The banner (painted when it ships, else a vector dusk), a
   * rule card, and the live room's own session drawn read-only, so Enter starts what was shown.
   * No parent of the board carries a tint or a dim filter: the overlay is drawn as it is in play.
   */
  interface Props {
    district: DistrictId;
    room: ThresholdSpec;
    session: BattleSession;
    onenter: () => void;
  }

  let { district, room, session, onenter }: Props = $props();

  const pictogram = $derived(thresholdPictogram(room.goal));
  const banner = $derived(`scenes/${district}/threshold` as ArtId);
  const view = $derived(session.view);
</script>

{#snippet dusk()}
  <svg viewBox="0 0 375 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect x="130" y="60" width="115" height="160" fill="var(--district-dark)" opacity="0.8" />
    <path d="M142 220 V110 a45 45 0 0 1 91 0 V220 Z" fill="var(--district-mid)" opacity="0.6" />
    <path d="M165 100 V220 M188 92 V220 M210 100 V220" stroke="var(--district-light)" stroke-width="3" opacity="0.7" />
    <circle cx="188" cy="48" r="8" fill="var(--lamp)" />
    <circle cx="188" cy="48" r="24" fill="var(--lamp)" opacity="0.18" />
  </svg>
{/snippet}

<div class="intro" data-testid="threshold-intro">
  <div class="body">
    <div class="banner" data-testid="threshold-banner" aria-hidden="true">
      <ArtImage id={banner} fit="cover" fallback={dusk} />
    </div>

    <div class="page">
      <section class="rule" data-testid="threshold-rule">
        <span class="picto" data-picto={pictogram} aria-hidden="true">
          {#if pictogram === 'goal'}
            <svg viewBox="0 0 24 24" width="32" height="32" role="img" aria-label="Goal">
              <path d="M12 3 21 12 12 21 3 12Z" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          {:else}
            <RuneGlyph rune={pictogram} size={32} />
          {/if}
        </span>
        <div class="text">
          <p class="goal" data-testid="threshold-goal">{room.goalText}</p>
          <p class="note">{room.note}</p>
        </div>
      </section>

      <div class="preview" data-testid="threshold-preview" style:aspect-ratio="{view.width} / {view.height}">
        <BattleBoard
          {view}
          overlay={session.overlay}
          kit={{ district, arena: false }}
          showNext
          readonly
        />
      </div>
    </div>
  </div>

  <footer>
    <ActionButton onclick={onenter} testid="threshold-enter">Enter</ActionButton>
  </footer>
</div>

<style>
  .intro {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    font-family: var(--font-serif);
    color: var(--ink);
  }
  .body {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
  .banner {
    flex: none;
    height: 208px;
    overflow: hidden;
    background: linear-gradient(var(--district-dark, var(--city-night)), var(--district-mid, var(--city-stone)));
  }
  .banner :global(img),
  .banner :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .rule {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    background: var(--parchment);
  }
  .picto {
    flex: none;
    color: var(--ink);
  }
  .text {
    min-width: 0;
  }
  .goal {
    margin: 0 0 var(--space-1);
    font-size: var(--type-md, 17px);
    font-weight: bold;
  }
  .note {
    margin: 0;
    color: var(--ink-soft);
    font-size: 14px;
    font-style: italic;
  }
  .preview {
    width: 100%;
    max-height: 300px;
    margin: 0 auto;
    pointer-events: none;
  }
  footer {
    flex: none;
    padding: var(--space-2) var(--space-3) calc(var(--space-3) + 14px);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
  footer :global(.action) {
    width: 100%;
    min-height: 52px;
    font-size: 18px;
  }
</style>
