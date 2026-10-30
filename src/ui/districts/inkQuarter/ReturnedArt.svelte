<script lang="ts">
  // Markup only: no props, the solved office is the same on every map.
</script>

<!--
  The dead-letter office, solved (IQ-16, art key `ink-returned`): an open envelope with the letter
  standing out of it and a red stamp beside. Drawn in the 24-unit mark box, ink on paper like the
  other districts' marks.
-->
<g data-art="ink-returned">
  <path d="M3 10L12 5L21 10V20H3z" class="env" />
  <path d="M3 20L10 14M21 20L14 14" class="env" />
  <path d="M7 12V4.5H17V12" class="paper" />
  <path d="M9.5 7H14.5M9.5 9.5H13" class="line" />
  <circle cx="19" cy="4.5" r="2.5" class="stamp" />
</g>

<style>
  .env,
  .paper,
  .line {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .line {
    stroke: var(--ink-soft);
    stroke-width: 1.3;
  }
  .stamp {
    fill: var(--danger);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
</style>
