<script lang="ts">
  // Markup only: no props, the solved lock is the same on every map.
</script>

<!--
  The canals' solved lock on the city map (CN-11, BL-119): the chamber walls stand with both gate
  leaves swung back open to the outside, water in the chamber and a brass winch across the top.
  Drawn in the 24-unit mark box, ink on paper like the district's other marks. No char, no flame.
-->
<g data-art="canal-lock">
  <path d="M6 3V21M18 3V21" class="wall" />
  <path d="M6 21L2 13M18 21L22 13" class="gate" />
  <path d="M8 16Q10 14 12 16T16 16" class="water" />
  <path d="M6 6H9.5M14.5 6H18" class="beam" />
  <circle cx="12" cy="6" r="2.5" class="winch" />
</g>

<style>
  .wall,
  .gate,
  .beam {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .beam {
    stroke-width: 1.5;
  }
  .water {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
  .winch {
    fill: var(--m-brass);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
</style>
