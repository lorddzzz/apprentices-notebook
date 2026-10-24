<script lang="ts">
  import type { StepDraw } from '../../../app/overlay';
  import { cellCenter, cellOrigin } from './geometry';

  interface Props {
    steps: StepDraw[];
    /** Tiles go under the units; the foe's order badge and label go on top. */
    layer: 'under' | 'badges';
  }

  let { steps, layer }: Props = $props();

  /** The pill's text: the label cut to leave room for `2/4` or a countdown (about 10 characters fit). */
  function pill(st: StepDraw): string {
    const tail = [
      st.sequence ? `${st.sequence[0]}/${st.sequence[1]}` : '',
      st.countdown !== null ? `${st.countdown}r` : '',
    ].filter(Boolean);
    const room = Math.max(3, 10 - tail.join(' ').length - (tail.length ? 1 : 0));
    const name = st.label.length > room ? `${st.label.slice(0, room - 1)}…` : st.label;
    return [name, ...tail].join(' ');
  }
</script>

<!-- A stand-in foe's telegraphed step (DK-9): the tiles and units it is about, then its badge and name. -->
<g pointer-events="none" data-layer="steps-{layer}">
  {#each steps as st (st.order)}
    <g opacity={st.emphasis === 'dim' ? 0.35 : 1}>
      {#if layer === 'under'}
        {#each st.tiles as t (`${t.x},${t.y}`)}
          {@const o = cellOrigin(t)}
          <g data-step-tile="{t.x},{t.y}">
            <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="var(--danger-tint)" />
            <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="url(#hatch)" />
            <rect x={o.x + 5} y={o.y + 5} width="90" height="90" fill="none" stroke="var(--danger)" stroke-width={st.emphasis === 'strong' ? 7 : 5} stroke-dasharray="14 9" />
          </g>
        {/each}
        {#each st.units as u (`${u.x},${u.y}`)}
          {@const c = cellCenter(u)}
          <circle cx={c.x} cy={c.y} r="44" fill="none" stroke="var(--danger)" stroke-width="5" stroke-dasharray="4 8" stroke-linecap="round" data-step-unit="{u.x},{u.y}" />
        {/each}
      {:else}
        {@const o = cellOrigin(st.from)}
        <g data-step={st.label}>
          <circle cx={o.x + 16} cy={o.y + 16} r="16" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
          <text x={o.x + 16} y={o.y + 25} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{st.order}</text>
          <rect x={o.x + 4} y={o.y + 76} width="92" height="20" rx="10" fill="var(--parchment)" fill-opacity="0.92" stroke="var(--danger)" stroke-width="2.5" />
          <text x={o.x + 50} y={o.y + 91} text-anchor="middle" font-size="14" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{pill(st)}</text>
        </g>
      {/if}
    </g>
  {/each}
</g>
