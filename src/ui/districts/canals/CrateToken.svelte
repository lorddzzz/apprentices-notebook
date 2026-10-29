<script lang="ts">
  interface Props {
    /** Tied to its mooring: a rope round the crate and a brass tag. */
    moored?: boolean;
    /** Drawn as the "next round" ghost: dashed, faint. */
    ghost?: boolean;
  }

  let { moored = false, ghost = false }: Props = $props();
</script>

<!--
  The barge's crate (CN-10), drawn in a 100-wide cell like a unit token: a wooden box riding the
  water. A parchment halo under the ink outline keeps it readable under oil, fire and the water
  tint. Moored, it sits still and wears a rope and a brass tag; adrift it bobs.
-->
<g data-unit="crate" data-moored={moored || undefined} opacity={ghost ? 0.65 : 1}>
  <ellipse cx="50" cy="76" rx="34" ry="7" fill="var(--shield)" opacity="0.5" />
  <g class:bob={!moored && !ghost}>
    <rect x="17" y="22" width="66" height="50" rx="5" fill="var(--wood)" stroke="var(--parchment)" stroke-width="10" stroke-linejoin="round" />
    <rect x="17" y="22" width="66" height="50" rx="5" fill="var(--wood)" stroke="var(--ink)" stroke-width="4" stroke-dasharray={ghost ? '9 6' : undefined} />
    <path d="M17 39H83M17 56H83" stroke="var(--wood-dark)" stroke-width="3" />
    <path d="M35 22V72M65 22V72" stroke="var(--wood-dark)" stroke-width="3" />
    <path d="M20 25 80 69M80 25 20 69" stroke="var(--wood-deep)" stroke-width="3" opacity="0.55" />
    <rect x="17" y="22" width="66" height="9" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="2" />
    {#if moored}
      <path d="M12 46C28 36 44 62 60 50S78 38 88 48" fill="none" stroke="var(--parchment)" stroke-width="8" stroke-linecap="round" />
      <path d="M12 46C28 36 44 62 60 50S78 38 88 48" fill="none" stroke="var(--m-brass-dark)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="7 3" />
      <circle cx="50" cy="12" r="9" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="3" />
      <path d="M50 6v12M45 11h10" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" />
    {/if}
  </g>
</g>

<style>
  .bob {
    animation: bob 2.4s ease-in-out infinite;
  }
  @keyframes bob {
    50% {
      transform: translateY(-3px) rotate(-1.5deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bob {
      animation: none;
    }
  }
</style>
