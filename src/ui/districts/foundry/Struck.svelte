<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at }: Props = $props();
  const c = $derived(cellCenter(at));
  const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
</script>

<!-- The bell a previewed cast would strike (BF-17): a gold ring with eight rays. -->
<g data-district="foundry:struck" pointer-events="none">
  <circle cx={c.x} cy={c.y} r="47" fill="var(--m-brass)" fill-opacity="0.18" stroke="var(--parchment)" stroke-width="12" />
  <circle cx={c.x} cy={c.y} r="47" fill="none" stroke="var(--m-brass)" stroke-width="7" />
  {#each RAYS as a (a)}
    <path d="M{c.x} {c.y - 50}V{c.y - 62}" stroke="var(--parchment)" stroke-width="9" stroke-linecap="round" transform="rotate({a} {c.x} {c.y})" />
    <path d="M{c.x} {c.y - 50}V{c.y - 62}" stroke="var(--m-brass)" stroke-width="5" stroke-linecap="round" transform="rotate({a} {c.x} {c.y})" />
  {/each}
</g>
