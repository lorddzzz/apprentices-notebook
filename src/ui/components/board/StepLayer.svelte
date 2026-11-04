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
    // A rival's action trick already has his name pill (RivalMarks): this one only adds the n/m and the rounds left.
    const tail = [
      st.sequence ? `${st.sequence[0]}/${st.sequence[1]}` : '',
      st.countdown !== null ? `${st.countdown}r` : '',
    ].filter(Boolean);
    if (st.trick === 'action') return tail.join(' ');
    const room = Math.max(3, 10 - tail.join(' ').length - (tail.length ? 1 : 0));
    const name = st.label.length > room ? `${st.label.slice(0, room - 1)}…` : st.label;
    return [name, ...tail].join(' ');
  }

  /** The pill is as wide as its text (14px mono is about 8.4 per character), so a short name leaves the token's face showing. */
  function pillWidth(st: StepDraw): number {
    return Math.min(92, Math.ceil(pill(st).length * 8.4) + 16);
  }
</script>

<!-- A stand-in foe's telegraphed step (DK-9): the tiles and units it is about, then its badge and name. The name pill sits above the token's HP row (y 76+), never over it. -->
<g pointer-events="none" data-layer="steps-{layer}">
  {#each steps as st, i (i)}
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
        {#each st.objects ?? [] as t (`${t.x},${t.y}`)}
          {@const c = cellCenter(t)}
          <polygon points="{c.x},{c.y - 26} {c.x + 26},{c.y} {c.x},{c.y + 26} {c.x - 26},{c.y}" fill="var(--parchment)" fill-opacity="0.9" stroke="var(--danger)" stroke-width="5" stroke-linejoin="round" data-step-object="{t.x},{t.y}" />
        {/each}
      {:else}
        {@const o = cellOrigin(st.from)}
        <g data-step={st.label} data-step-trick={st.trick}>
          {#if !st.trick}
            <circle cx={o.x + 16} cy={o.y + 16} r="16" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
            <text x={o.x + 16} y={o.y + 25} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{st.order}</text>
          {/if}
          {#if pill(st)}
            <rect x={o.x + 50 - pillWidth(st) / 2} y={o.y + 58} width={pillWidth(st)} height="18" rx="9" fill="var(--parchment)" fill-opacity="0.92" stroke="var(--danger)" stroke-width="2.5" stroke-dasharray={st.trick === 'mark' ? '6 4' : undefined} />
            <text x={o.x + 50} y={o.y + 71} text-anchor="middle" font-size="14" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{pill(st)}</text>
          {/if}
        </g>
      {/if}
    </g>
  {/each}
</g>
