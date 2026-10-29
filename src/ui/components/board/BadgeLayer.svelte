<script lang="ts">
  import { ENEMIES, MEMBERS } from '$data';
  import type { Coord } from '$engine';
  import type { Badge, Ghost } from '../../../app/overlay';
  import { cellCenter, cellOrigin } from './geometry';

  const taken = (at: Coord): boolean => occupied.some((o) => o.x === at.x && o.y === at.y);

  interface Props {
    badges: Badge[];
    ghosts: Ghost[];
    /** Tiles a unit stands on now: a ghost landing there (a swap) must not hide that unit's token. */
    occupied?: Coord[];
  }

  let { badges, ghosts, occupied = [] }: Props = $props();

  const FILL = { damage: 'var(--danger)', kill: 'var(--ink)', shield: 'var(--shield)' } as const;
  const tokenOf = (g: Ghost): string =>
    g.kind === 'member'
      ? MEMBERS[g.def as keyof typeof MEMBERS].token
      : ENEMIES[g.def as keyof typeof ENEMIES].token;
</script>

<g pointer-events="none">
  {#each ghosts as g (g.unit)}
    {@const c = cellCenter(g.at)}
    {#if taken(g.at)}
      <!-- A swap lands on a tile that is still occupied: a small ghost in the tile's corner, so both letters read. -->
      <g data-state="ghost-offset" opacity="0.85">
        <circle cx={c.x - 28} cy={c.y + 30} r="19" fill="var(--parchment)" fill-opacity="0.9" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 5" />
        <text x={c.x - 28} y={c.y + 40} text-anchor="middle" font-size="24" fill="var(--ink)" font-family="Georgia, serif">{tokenOf(g)}</text>
      </g>
    {:else}
    <circle cx={c.x} cy={c.y - 8} r="32" fill="var(--parchment)" fill-opacity="0.45" stroke="var(--ink)" stroke-width="4" stroke-dasharray="9 7" />
    <text x={c.x} y={c.y + 4} text-anchor="middle" font-size="34" fill="var(--ink)" opacity="0.6" font-family="Georgia, serif">{tokenOf(g)}</text>
    {/if}
  {/each}

  {#each badges as b, i (i)}
    {@const o = cellOrigin(b.at)}
    {#if b.kind === 'kill'}
      <g transform="translate({o.x + 82} {o.y + 66}) scale(0.85)">
        <circle r="19" fill="var(--ink)" stroke="var(--parchment)" stroke-width="3.5" />
        <path d="M-10 1a10 10 0 1 1 20 0v3h-3.5v5h-13v-5H-10z" fill="var(--parchment)" />
        <circle cx="-3.6" cy="-1" r="2.8" fill="var(--ink)" />
        <circle cx="3.6" cy="-1" r="2.8" fill="var(--ink)" />
      </g>
    {:else if b.kind === 'habit'}
      <!-- A habit decided here (AH-6): a small star on the tile's top-left. -->
      <g data-state="habit-badge" transform="translate({o.x + 20} {o.y + 20})">
        <circle r="16" fill="var(--habit)" stroke="var(--parchment)" stroke-width="3" />
        <path d="M0 -9 L2.6 -2.8 L9 -2.4 L4.2 1.8 L5.6 8 L0 4.6 L-5.6 8 L-4.2 1.8 L-9 -2.4 L-2.6 -2.8 Z" fill="var(--parchment)" />
      </g>
    {:else if b.kind === 'unharmed'}
      <!-- A warded hit (AH-6): a calm shield, never the red ring. -->
      <g data-state="unharmed-badge" transform="translate({o.x + 80} {o.y + 20})">
        <circle r="16" fill="var(--shield)" stroke="var(--parchment)" stroke-width="3" />
        <path d="M0 -9 L8 -5 V1 C8 6 4 9 0 11 C-4 9 -8 6 -8 1 V-5 Z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" />
      </g>
    {:else}
      <rect x={o.x + 38} y={o.y + 4} width="58" height="30" rx="15" fill={FILL[b.kind]} stroke="var(--parchment)" stroke-width="3" />
      <text x={o.x + 67} y={o.y + 26} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{b.text}</text>
    {/if}
  {/each}
</g>
