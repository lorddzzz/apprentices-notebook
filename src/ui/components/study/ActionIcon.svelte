<script lang="ts">
  import type { BasicActionId } from '$data';
  import { ACTION_INFO } from '../../../app/study';

  interface Props {
    action: BasicActionId;
    size?: number;
  }

  let { action, size = 16 }: Props = $props();

  // One glyph per basic action: a push, a hook, a leap and a trade.
  const PATHS: Record<BasicActionId, string> = {
    shove: 'M2 8h8M7 5l3 3-3 3M13.5 3.5v9',
    pull: 'M14 8H6M9 5L6 8l3 3M2.5 3.5v9',
    hop: 'M2 12.5C4 3 12 3 14 12.5M11.5 9.5l2.5 3 3-2',
    swap: 'M2 5h11M10 2l3 3-3 3M14 11H3M6 8l-3 3 3 3',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  role="img"
  aria-label={ACTION_INFO[action].name}
>
  <path d={PATHS[action]} />
</svg>

<style>
  svg {
    flex: none;
  }
</style>
