<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
</script>

<!--
  "Return to sender" (IQ-15): a red rubber-stamp impression, a double ring with a U-turn arrow.
  Walkable and never blocks a shot; the token above it is the unit the stamp will send home.
-->
<g transform="scale({k})" data-piece-art="inkQuarter:return">
  <circle cx="50" cy="50" r="40" fill="var(--parchment)" fill-opacity="0.55" />
  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--danger)" stroke-width="6" />
  <circle cx="50" cy="50" r="32" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-dasharray="4 3" />
  <path d="M34 66V42a14 14 0 0 1 28 0v10" fill="none" stroke="var(--danger)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M52 46l10 12 10-12z" fill="var(--danger)" stroke="var(--danger)" stroke-width="3" stroke-linejoin="round" />
</g>
