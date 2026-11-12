<script lang="ts">
  // Markup only: no props, the solved dome is the same on every map.
</script>

<!--
  The bathhouses' solved dome on the city map (FU-10): the roof stands open at the crown, a vent
  stack puffing steam. Drawn in the 24-unit mark box, ink on paper like the other districts' marks.
-->
<g data-art="bath-dome">
  <path d="M3 20H21M5 20V15A7 7 0 0 1 9.5 8.5M19 20V15A7 7 0 0 0 14.5 8.5" class="wall" />
  <path d="M9.5 8.5L10 5H14L14.5 8.5" class="wall" />
  <path d="M9 3Q10.5 1.5 12 3T15 3" class="steam" />
  <path d="M10 16Q11 14.5 12 16T14 16" class="steam" />
</g>

<style>
  .wall {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .steam {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
</style>
