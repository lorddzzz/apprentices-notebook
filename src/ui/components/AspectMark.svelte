<script lang="ts">
  import { ASPECTS, type Aspect } from '$data';
  import { ASPECT_GLYPH } from '../glyphs';

  interface Props {
    aspect: Aspect;
    size?: number;
  }

  let { aspect, size = 24 }: Props = $props();
</script>

<svg
  class="mark"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role="img"
  aria-label={ASPECTS[aspect].name}
  style:color="var(--ink)"
>
  <path
    d={ASPECT_GLYPH[aspect]}
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .mark {
    display: block;
    flex: none;
    overflow: visible;
  }
</style>
