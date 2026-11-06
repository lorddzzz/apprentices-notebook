<script lang="ts">
  import { ENEMIES } from '$data';
  import { crackedTiles, hasBridges } from '../../../app/bridgeView';
  import type { BoardView } from '../../../app/view';
  import { cellCenter, cellOrigin } from '../../components/board/geometry';
  import { carryArrow, chalkOf, perimeter } from './view';

  interface Props {
    view: BoardView;
    /** `under` (fog, outlines, telegraphs) goes beneath the tokens; `badges` above them. */
    layer: 'under' | 'badges';
  }

  let { view, layer }: Props = $props();

  const bridged = $derived(hasBridges(view));
  const cracked = $derived(crackedTiles(view));
  const fog = $derived(
    view.tiles.flatMap((t, i) =>
      t.drop ? [{ x: i % view.width, y: Math.floor(i / view.width) }] : [],
    ),
  );
  /** Apprentices and foes that will fall with their tile (a flier never does). */
  const standing = $derived(
    view.units.filter((u) => {
      if (!u.alive) return false;
      if (u.kind === 'enemy' && ENEMIES[u.def as keyof typeof ENEMIES].flies) return false;
      return cracked.some((c) => c.x === u.pos.x && c.y === u.pos.y);
    }),
  );
  const telegraphs = $derived(chalkOf(view.units));
  const carries = $derived(telegraphs.filter((t) => t.kind === 'carry'));
  const circles = $derived(telegraphs.filter((t) => t.kind === 'chalk'));
</script>

<!--
  The bridges' board marks (BR-14). Under the tokens: fog over every fallen tile, a dashed outline
  round each cracked section (the section that will fall at dusk), the Warden's chalk circle on its
  victim and the Gargoyle's carry arrow. Above them: a badge on each unit standing on a crack.
-->
{#if bridged}
  <g pointer-events="none" data-layer="bridges-{layer}">
    {#if layer === 'under'}
      {#each fog as at (`${at.x},${at.y}`)}
        {@const o = cellOrigin(at)}
        <g data-fog="{at.x},{at.y}">
          <rect x={o.x} y={o.y} width="100" height="100" fill="var(--parchment)" opacity="0.95" /><rect x={o.x} y={o.y} width="100" height="100" fill="var(--m-steam)" opacity="0.5" />
          <g class="mist" fill="none" stroke="var(--parchment)" stroke-width="6" stroke-linecap="round" opacity="0.95">
            <path d="M{o.x + 8} {o.y + 32}q14-12 28 0t28 0 28 0" />
            <path d="M{o.x + 4} {o.y + 62}q14-12 28 0t28 0 28 0" />
            <path d="M{o.x + 14} {o.y + 86}q12-9 24 0t24 0" />
          </g>
        </g>
      {/each}

      {#if cracked.length > 0}
        <path d={perimeter(cracked)} fill="none" stroke="var(--parchment)" stroke-width="11" stroke-linecap="round" opacity="0.9" />
        <path d={perimeter(cracked)} fill="none" stroke="var(--danger)" stroke-width="6" stroke-dasharray="14 9" stroke-linecap="round" data-outline="cracked" />
      {/if}

      {#each circles as c (c.id)}
        {@const m = cellCenter(c.to)}
        <g data-chalk={c.id}>
          <ellipse cx={m.x} cy={m.y + 4} rx="42" ry="39" fill="none" stroke="var(--ink)" stroke-width="9" opacity="0.5" />
          <ellipse cx={m.x} cy={m.y + 4} rx="42" ry="39" fill="none" stroke="var(--parchment)" stroke-width="5" stroke-dasharray="26 5 9 5" stroke-linecap="round" />
          <path d="M{m.x - 26} {m.y + 38}q26 8 52 0" fill="none" stroke="var(--parchment)" stroke-width="3" stroke-linecap="round" opacity="0.8" />
        </g>
      {/each}

      {#each carries as c (c.id)}
        {@const a = carryArrow(c.from, c.to)}
        <g data-carry={c.id}>
          <path d={a.line} fill="none" stroke="var(--parchment)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" />
          <path d={a.line} fill="none" stroke="var(--danger)" stroke-width="8" stroke-linecap="round" stroke-dasharray="3 14" />
          <path d={a.head} fill="none" stroke="var(--parchment)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
          <path d={a.head} fill="none" stroke="var(--danger)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      {/each}
    {:else}
      {#each standing as u (u.id)}
        {@const o = cellOrigin(u.pos)}
        <g data-fall-badge={u.id} transform="translate({o.x + 83} {o.y + 17})">
          <circle r="15" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3.5" />
          <path d="M-8 -5L0 4L8 -5M-8 3L0 12L8 3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.75) translate(0 -3)" />
        </g>
      {/each}
    {/if}
  </g>
{/if}

<style>
  .mist {
    animation: mist 5s ease-in-out infinite alternate;
  }
  @keyframes mist {
    to {
      transform: translateX(6px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mist {
      animation: none;
    }
  }
</style>
