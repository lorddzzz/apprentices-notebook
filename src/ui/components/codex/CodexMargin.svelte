<script lang="ts">
  import { type FrameView, levelNumeral, type MarginView } from '../../../app/desk';

  interface Props {
    margin: MarginView;
  }

  let { margin }: Props = $props();

  const rows = $derived([
    ...margin.lines.flatMap((l) => l.frames.map((f) => ({ f, title: `Level ${levelNumeral(f.level)}` }))),
    ...(margin.capstone ? [{ f: margin.capstone, title: 'Capstone' }] : []),
  ]);

  const written = $derived(rows.filter((r) => r.f.state === 'filled').length);

  const status = (f: FrameView): string =>
    f.state === 'filled'
      ? (f.variants.find((v) => v.chosen)?.text ?? 'Written')
      : f.state === 'open'
        ? 'Open: written at the desk, at home.'
        : `At ${f.threshold} points, ${f.missing} more.`;
</script>

{#if rows.length > 0}
  <div class="margin" data-testid="codex-margin">
    <p class="tally" data-testid="codex-margin-count">Margin, {written} / {rows.length} written</p>
    {#each rows as { f, title } (f.key)}
      <p class="frame {f.state}" data-testid="codex-frame-{f.key}" data-state={f.state}>
        <span class="title">{title}</span>
        <span class="status">{status(f)}</span>
      </p>
    {/each}
  </div>
{/if}

<style>
  .margin {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 6px;
  }
  .tally {
    margin: 0;
    font-size: 13px;
    color: var(--ink-faint);
  }
  .frame {
    display: flex;
    gap: var(--space-2);
    margin: 0;
    padding: 2px var(--space-2);
    border: 1px dashed var(--ink-faint);
    border-radius: var(--radius);
    font-size: 13px;
    line-height: 1.3;
    color: var(--ink-faint);
  }
  .frame.filled {
    border: 1px solid var(--ink);
    color: var(--accent);
    font-family: var(--font-serif);
    font-size: 14px;
  }
  .title {
    flex: none;
    padding-top: 2px;
    font-size: 13px;
    font-variant: small-caps;
    letter-spacing: 0.05em;
  }
</style>
