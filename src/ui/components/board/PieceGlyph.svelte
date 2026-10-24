<script lang="ts">
  interface Props {
    label: string;
    size?: number;
  }

  let { label, size = 100 }: Props = $props();

  const letter = $derived(label.trim().charAt(0).toUpperCase() || '?');
  const k = $derived(size / 100);
</script>

<!-- A piece with no registered art: a diamond with its initial, so the board never hides one. -->
<g transform="scale({k})" data-fallback="piece">
  <path d="M50 12 88 50 50 88 12 50z" fill="var(--parchment-dark)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
  <path d="M50 24 76 50 50 76 24 50z" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="5 5" />
  <text x="50" y="62" text-anchor="middle" font-size="34" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{letter}</text>
</g>
