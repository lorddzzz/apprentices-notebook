<script lang="ts">
  interface Props {
    oncodex: () => void;
    onmenu: () => void;
    /** Set once the Bench is unlocked; null hides the entry. */
    onbench?: (() => void) | null;
  }

  let { oncodex, onmenu, onbench = null }: Props = $props();

  // Rain streaks inside the window: [x, y, delay in ms]. Fixed so the scene never reshuffles.
  const DROPS: readonly (readonly [number, number, number])[] = [
    [8, 4, 0],
    [19, 22, 310],
    [30, 10, 120],
    [41, 30, 520],
    [52, 2, 230],
    [63, 18, 430],
    [72, 34, 60],
  ];
</script>

<header class="scene" data-testid="scene">
  <svg class="art" viewBox="0 0 375 84" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="lamp-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.75" />
        <stop offset="0.45" stop-color="var(--lamp)" stop-opacity="0.22" />
        <stop offset="1" stop-color="var(--lamp)" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16202e" />
        <stop offset="1" stop-color="#2b3d52" />
      </linearGradient>
      <clipPath id="panes"><rect x="18" y="16" width="76" height="52" /></clipPath>
    </defs>

    <rect width="375" height="84" fill="var(--wall)" />
    <!-- ceiling beam -->
    <rect width="375" height="9" fill="var(--wood-deep)" />
    <path d="M0 9h375" stroke="#000" stroke-opacity="0.35" />

    <!-- window -->
    <rect x="12" y="10" width="88" height="64" rx="3" fill="var(--wood)" />
    <rect x="18" y="16" width="76" height="52" fill="url(#night)" />
    <g clip-path="url(#panes)">
      <circle cx="78" cy="30" r="9" fill="#cdd8e2" opacity="0.18" />
      <g class="rain" stroke="#b7c7d6" stroke-width="1.4" stroke-linecap="round" opacity="0.7">
        {#each DROPS as [x, y, delay] (x)}
          <path d="M{18 + x} {16 + y}l-2 7" style:animation-delay="{delay}ms" />
        {/each}
        {#each DROPS as [x, y, delay] (x)}
          <path d="M{18 + x + 6} {16 + y + 26}l-2 7" style:animation-delay="{delay + 160}ms" />
        {/each}
      </g>
    </g>
    <path d="M56 16v52M18 42h76" stroke="var(--wood)" stroke-width="4" />
    <rect x="8" y="70" width="96" height="6" rx="2" fill="var(--wood-dark)" />
    <!-- a pot plant on the sill -->
    <path d="M24 70l2-8h8l2 8z" fill="#8b3a2b" />
    <path d="M30 62c-5-4-6-9-3-12 3 2 4 7 3 12zM30 62c4-3 8-5 9-10-5 0-8 5-9 10z" fill="#4f6b3a" />

    <!-- hanging lamp -->
    <circle cx="238" cy="40" r="52" fill="url(#lamp-glow)" />
    <path d="M238 9v22" stroke="var(--wood-deep)" stroke-width="2" />
    <path d="M226 42a12 11 0 0 1 24 0z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="1.5" />
    <ellipse cx="238" cy="43" rx="9" ry="3.2" fill="var(--lamp)" />
  </svg>

  <h1>The Study</h1>

  <div class="buttons">
    {#if onbench}
      <button type="button" class="knob" aria-label="The bench (research)" data-testid="bench-button" onclick={onbench}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
          <path d="M7.5 15h9" />
        </svg>
      </button>
    {/if}
    <button type="button" class="knob" aria-label="Read the notebook (codex)" data-testid="codex-button" onclick={oncodex}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
        <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z" />
        <path d="M12 6v13" />
      </svg>
    </button>
    <button type="button" class="knob" aria-label="Menu" data-testid="menu-button" onclick={onmenu}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
      </svg>
    </button>
  </div>
</header>

<style>
  .scene {
    position: relative;
    flex: none;
    height: 84px;
    overflow: hidden;
    border-bottom: 5px solid var(--wood);
    box-shadow: 0 3px 0 var(--wood-deep);
  }
  .art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  h1 {
    position: absolute;
    left: 112px;
    top: 28px;
    margin: 0;
    font-size: 21px;
    font-weight: normal;
    font-style: italic;
    letter-spacing: 0.03em;
    color: var(--parchment);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
  }
  .buttons {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    display: flex;
    gap: var(--space-1);
  }
  .knob {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    padding: 0;
    border: 1.5px solid rgba(241, 230, 204, 0.45);
    border-radius: 50%;
    background: rgba(26, 18, 12, 0.55);
    color: var(--parchment);
    cursor: pointer;
  }
  .knob:active {
    background: rgba(232, 176, 74, 0.35);
  }
  .knob:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
  .rain path {
    animation: fall 0.85s linear infinite;
  }
  @keyframes fall {
    from {
      transform: translateY(-14px);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    to {
      transform: translateY(30px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rain path {
      animation: none;
    }
  }
</style>
