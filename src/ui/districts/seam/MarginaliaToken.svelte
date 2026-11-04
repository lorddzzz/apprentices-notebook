<script lang="ts">
  import { HAND_KINDS, KIND_FILL, type NextHand } from './hands';

  interface Props {
    glyph: string;
    /** The hand it will write next, from its telegraph; none = no finger lit. */
    next: NextHand | null;
  }

  let { glyph, next }: Props = $props();

  const CY = 42;
  /** Five fingers fanned over the palm, in cycle order, left to right. */
  const FINGERS = [-62, -31, 0, 31, 62].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const sx = Math.sin(a);
    const cx = Math.cos(a);
    return {
      kind: HAND_KINDS[i],
      x1: 50 + 16 * sx,
      y1: 58 - 12 * cx,
      x2: 50 + 16 * sx + 32 * sx,
      y2: 58 - 12 * cx - 32 * cx,
    };
  });
</script>

<!--
  The Marginalia (SM-2): the notebook's margin come alive, one great inked hand. The palm is a
  blot with the heart's glyph; its five fingers are the five hands of its cycle, and the one that
  writes next is lit in its kind's colour with a red rim (read from its telegraph).
-->
<g data-unit="marginalia" data-next={next?.kind ?? ''}>
  {#each FINGERS as f (f.kind)}
    {@const lit = next?.kind === f.kind}
    <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={lit ? 'var(--danger)' : 'var(--parchment)'} stroke-width={lit ? 19 : 17} stroke-linecap="round" />
    <line
      x1={f.x1}
      y1={f.y1}
      x2={f.x2}
      y2={f.y2}
      stroke={lit && f.kind ? KIND_FILL[f.kind] : 'var(--ink-soft)'}
      stroke-width="12"
      stroke-linecap="round"
      data-finger={f.kind}
      data-lit={lit ? 'true' : undefined}
    />
  {/each}
  <path
    d="M24 {CY + 12}c-4-14 6-27 26-27s30 13 26 27c-3 10-14 14-26 14s-23-4-26-14z"
    fill="var(--m-ink)"
    stroke="var(--parchment)"
    stroke-width="4"
    stroke-linejoin="round"
  />
  <text x="50" y={CY + 18} text-anchor="middle" font-size="28" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
</g>
