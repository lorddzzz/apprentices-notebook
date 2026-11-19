<script lang="ts">
  import { APPRENTICES, DISTRICTS } from '$data';
  import { CREDITS_LINES } from '$data/ending';
  import { creditsOf, endingOf, seeCredits } from '$engine/drawing';
  import { namedTitle } from '../../app/describe';
  import { game } from '../../app/instance';
  import { go } from '../../app/router.svelte';
  import { placeInText } from '../../app/tripviews';

  // Read once on arrival: the scroll is a record of the moment, not a live view.
  const profile = game.profile;
  const credits = creditsOf(profile);
  const keepers = credits.household.map((id) => APPRENTICES[id].name);
  const { biggest } = credits;
  const chainLine = biggest
    ? CREDITS_LINES.chain
        .replace('{chain}', () => String(biggest.chain))
        .replace('{caster}', () => placeInText(APPRENTICES[biggest.caster].name))
        .replace('{name}', () => biggest.name)
    : null;
  const tally = CREDITS_LINES.tally
    .replace('{trips}', () => String(credits.trips))
    .replace('{casts}', () => String(credits.casts));

  // Watched to the end or skipped, it counts as seen; leaving any other way (history back, a
  // reduced-motion scroll with no animation end) is a skip too.
  function finish(): void {
    if (!endingOf(game.profile).creditsSeen) game.updateProfile(seeCredits);
  }
  $effect(() => finish);
  function skip(): void {
    finish();
    go('study');
  }
</script>

<section class="credits" data-testid="credits">
  <div class="window">
    <div class="reel" data-testid="credits-reel" onanimationend={finish}>
      <h2>{CREDITS_LINES.household}</h2>
      <p>{keepers.join(', ')}</p>

      <h2>{CREDITS_LINES.districts}</h2>
      {#each credits.districts as d (d)}<p>{DISTRICTS[d].name}</p>{/each}

      <h2>{CREDITS_LINES.idioms}</h2>
      {#each credits.idioms as i (i)}<p>{namedTitle(i)}</p>
      {:else}<p class="soft">{CREDITS_LINES.noIdioms}</p>{/each}

      <h2>{CREDITS_LINES.counts}</h2>
      <p>{tally}</p>
      {#if chainLine}<p>{chainLine}</p>{/if}

      <p class="close">{CREDITS_LINES.close}</p>
    </div>
  </div>
  <button type="button" class="skip" onclick={skip} data-testid="credits-skip">Skip</button>
</section>

<style>
  .credits {
    position: relative;
    height: 100%;
    background: var(--parchment);
  }
  /* The scroll starts below the Skip button, so no line passes under it. */
  .window {
    position: absolute;
    inset: calc(var(--tap) + var(--space-3) + var(--safe-top)) 0 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(43, 33, 24, 0.06) 27px 28px);
  }
  .reel {
    padding: 60vh var(--space-4);
    text-align: center;
    font-family: var(--hand);
    animation: roll 50s linear forwards;
  }
  h2 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  p {
    margin: 0 0 var(--space-1);
    font-size: 22px;
    line-height: 30px;
    color: var(--ink);
  }
  .soft {
    font-style: italic;
    color: var(--ink-soft);
  }
  .close {
    margin-top: var(--space-4);
    font-size: 26px;
  }
  .skip {
    position: absolute;
    top: calc(var(--space-2) + var(--safe-top));
    right: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-3);
    font: 700 14px var(--mono);
    color: var(--ink);
    background: var(--parchment-dark);
    border: 1px solid var(--ink-faint);
    border-radius: 18px;
  }
  @keyframes roll {
    /* Ends with the closing line still on the page (the reel's bottom padding is 60vh). */
    to {
      transform: translateY(calc(-100% + 100vh));
    }
  }
  /* Without motion the credits are a page to scroll, and the skip button still leaves. */
  @media (prefers-reduced-motion: reduce) {
    .reel {
      animation: none;
      padding-block: var(--space-6, 48px);
    }
  }
</style>
