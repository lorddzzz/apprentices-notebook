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
</script>

<!-- A muffled bell (BF-17): a steam cloud lies over it, so a strike stays silent (P4). -->
<g data-district="foundry:muffled" pointer-events="none">
  <g transform="translate({c.x} {c.y - 6})">
    <path
      d="M-34 18C-48 18-48 -2-34 -4C-34 -22-10 -28-2 -14C10 -26 34 -16 32 2C46 2 46 18 32 18Z"
      fill="var(--parchment)"
      fill-opacity="0.5"
      stroke="var(--ink-soft)"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <path d="M-24 8Q-14 0-4 8M4 4Q14-2 24 6" fill="none" stroke="var(--ink-soft)" stroke-width="3" stroke-linecap="round" opacity="0.6" />
  </g>
</g>
