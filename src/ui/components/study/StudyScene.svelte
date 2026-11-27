<script lang="ts">
  /**
   * UH-1: the zero-art fallback of the attic strip, art only. AtticHeader (through HomeStrip)
   * paints it behind the header's own title and controls whenever `scenes/home/attic-header-night`
   * is not shipped. It holds no text and no control, so a painted and an unpainted Study have the
   * same single control per object. The SVG is 88 px tall and sits on the header's bottom edge;
   * whatever lies above it (the safe area) is the ceiling beam's colour.
   */

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

<div class="scene" data-testid="scene" aria-hidden="true">
  <svg class="art" viewBox="0 0 375 88" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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
      <clipPath id="panes"><rect x="18" y="16" width="76" height="56" /></clipPath>
    </defs>

    <rect width="375" height="88" fill="var(--wall)" />
    <!-- ceiling beam -->
    <rect width="375" height="9" fill="var(--wood-deep)" />
    <path d="M0 9h375" stroke="#000" stroke-opacity="0.35" />

    <!-- window -->
    <rect x="12" y="10" width="88" height="68" rx="3" fill="var(--wood)" />
    <rect x="18" y="16" width="76" height="56" fill="url(#night)" />
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
    <path d="M56 16v56M18 44h76" stroke="var(--wood)" stroke-width="4" />
    <rect x="8" y="74" width="96" height="6" rx="2" fill="var(--wood-dark)" />
    <!-- a pot plant on the sill -->
    <path d="M24 74l2-8h8l2 8z" fill="#8b3a2b" />
    <path d="M30 66c-5-4-6-9-3-12 3 2 4 7 3 12zM30 66c4-3 8-5 9-10-5 0-8 5-9 10z" fill="#4f6b3a" />

    <!-- hanging lamp -->
    <circle cx="300" cy="40" r="52" fill="url(#lamp-glow)" />
    <path d="M300 9v22" stroke="var(--wood-deep)" stroke-width="2" />
    <path d="M288 42a12 11 0 0 1 24 0z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="1.5" />
    <ellipse cx="300" cy="43" rx="9" ry="3.2" fill="var(--lamp)" />

    <!-- the shelf line the objects stand on -->
    <rect y="82" width="375" height="6" fill="var(--wood)" />
    <path d="M0 82h375" stroke="var(--lamp)" stroke-opacity="0.5" />
  </svg>
</div>

<style>
  .scene {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--wood-deep);
    pointer-events: none;
  }
  .art {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 88px;
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
