<script lang="ts">
  import { isTone } from '$data/districts/foundry';
  import { TONE_LOOK } from './tones';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const tone = $derived(
    isTone((data as { tone?: unknown } | null)?.tone) ? (data as { tone: 'low' | 'mid' | 'high' }).tone : 'low',
  );
  const look = $derived(TONE_LOOK[tone]);
</script>

<!-- A rope (BF-17): the footing a Ringer pulls; its tuft is the tone's colour with the tone's pips. -->
<g transform="scale({k})" data-piece-art="foundry:rope" data-tone={tone}>
  <path d="M50 4V58" stroke="#f1e6cc" stroke-width="12" stroke-linecap="round" />
  <path d="M50 4V58" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" stroke-dasharray="6 3" />
  <rect x="26" y="58" width="48" height="26" rx="9" fill={look.fill} stroke="#f1e6cc" stroke-width="7" />
  <rect x="26" y="58" width="48" height="26" rx="9" fill={look.fill} stroke="var(--ink)" stroke-width="3" />
  {#each Array.from({ length: look.pips }, (_, i) => i) as i (i)}
    <circle cx={50 + (i - (look.pips - 1) / 2) * 12} cy="71" r="4.4" fill={look.mark} />
  {/each}
</g>
