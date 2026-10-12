<script lang="ts">
  import { ENEMIES, MEMBERS } from '$data';
  import type { Badge, Ghost } from '../../../app/overlay';
  import { cellCenter, cellOrigin } from './geometry';

  interface Props {
    badges: Badge[];
    ghosts: Ghost[];
  }

  let { badges, ghosts }: Props = $props();

  const FILL = { damage: 'var(--danger)', kill: 'var(--ink)', shield: 'var(--shield)' } as const;
  const tokenOf = (g: Ghost): string =>
    g.kind === 'member'
      ? MEMBERS[g.def as keyof typeof MEMBERS].token
      : ENEMIES[g.def as keyof typeof ENEMIES].token;
</script>

<g pointer-events="none">
  {#each ghosts as g (g.unit)}
    {@const c = cellCenter(g.at)}
    <circle cx={c.x} cy={c.y - 8} r="32" fill="var(--parchment)" fill-opacity="0.45" stroke="var(--ink)" stroke-width="4" stroke-dasharray="9 7" />
    <text x={c.x} y={c.y + 4} text-anchor="middle" font-size="34" fill="var(--ink)" opacity="0.6" font-family="Georgia, serif">{tokenOf(g)}</text>
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
    {:else}
      <rect x={o.x + 38} y={o.y + 4} width="58" height="30" rx="15" fill={FILL[b.kind]} stroke="var(--parchment)" stroke-width="3" />
      <text x={o.x + 67} y={o.y + 26} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{b.text}</text>
    {/if}
  {/each}
</g>
