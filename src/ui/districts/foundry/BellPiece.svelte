<script lang="ts">
  import { isTone } from '$data/districts/foundry';
  import { TONE_LOOK } from './tones';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const d = $derived((data ?? {}) as { tone?: unknown; hum?: unknown });
  const tone = $derived(isTone(d.tone) ? d.tone : 'low');
  const hum = $derived(d.hum === true);
  const look = $derived(TONE_LOOK[tone]);
  const BELL =
    'M50 12C58 12 62 18 62 26C62 44 70 52 76 70L24 70C30 52 38 44 38 26C38 18 42 12 50 12Z';
</script>

<!--
  A bell (BF-1, P14): silhouette size, colour, an inner pattern and 1 to 3 pips say the tone;
  a hum (the bell is sounding faintly) is a dashed ring around it and a dimmed pattern.
-->
<g transform="scale({k})" data-piece-art="foundry:bell" data-tone={tone} data-hum={hum}>
  <defs>
    <clipPath id="foundry-bell-clip-{tone}"><path d={BELL} /></clipPath>
  </defs>
  {#if hum}
    <circle cx="50" cy="50" r="46" fill="none" stroke="#f1e6cc" stroke-width="7" opacity="0.9" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="var(--ink)" stroke-width="3.5" stroke-dasharray="7 5" />
  {/if}
  <g transform="translate(50 50) scale({look.scale}) translate(-50 -44)" opacity={hum ? 0.7 : 1}>
    <path d={BELL} fill={look.fill} stroke="#f1e6cc" stroke-width={7 / look.scale} stroke-linejoin="round" />
    <path d={BELL} fill={look.fill} stroke="var(--ink)" stroke-width={3 / look.scale} stroke-linejoin="round" />
    <g clip-path="url(#foundry-bell-clip-{tone})" stroke={look.mark} fill={look.mark} opacity={hum ? 0.35 : 1}>
      {#if tone === 'low'}
        {#each [24, 34, 44, 54, 64] as y (y)}
          <path d="M20 {y}H80" stroke-width="3.2" fill="none" />
        {/each}
      {:else if tone === 'mid'}
        {#each [-40, -26, -12, 2, 16, 30, 44, 58] as o (o)}
          <path d="M{20 + o} 76L{80 + o} 6" stroke-width="3.2" fill="none" />
        {/each}
      {:else}
        {#each [26, 40, 54, 68] as y, row (y)}
          {#each [34, 50, 66] as x (x)}
            <circle cx={x + (row % 2) * 6 - 3} cy={y} r="3.6" stroke="none" />
          {/each}
        {/each}
      {/if}
    </g>
    <rect x="21" y="68" width="58" height="7" rx="3.5" fill={look.fill} stroke="var(--ink)" stroke-width={3 / look.scale} />
    <circle cx="50" cy="80" r="5" fill="var(--ink)" />
  </g>
  {#each Array.from({ length: look.pips }, (_, i) => i) as i (i)}
    <circle cx={10 + i * 12} cy="10" r="5.2" fill="var(--ink)" stroke="#f1e6cc" stroke-width="2" />
  {/each}
</g>
