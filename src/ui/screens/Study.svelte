<script lang="ts">
  import { href } from '../../app/routes';
</script>

<section>
  <svg viewBox="0 0 375 812" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The study: a rainy window, a lamp and a desk">
    <rect width="375" height="812" fill="var(--parchment)" />
    <!-- window -->
    <rect x="50" y="90" width="190" height="200" fill="var(--night)" stroke="var(--ink)" stroke-width="8" />
    <path d="M145 90v200M50 190h190" stroke="var(--ink)" stroke-width="5" />
    <g stroke="var(--parchment-dark)" stroke-width="2" stroke-linecap="round" opacity="0.8">
      <path d="M70 110l-8 20M105 140l-8 20M135 105l-8 20M175 150l-8 20M205 115l-8 20M225 220l-8 20M85 230l-8 20M120 250l-8 20M190 245l-8 20" />
    </g>
    <!-- lamp -->
    <circle cx="305" cy="170" r="46" fill="var(--lamp)" opacity="0.25" />
    <circle cx="305" cy="170" r="22" fill="var(--lamp)" />
    <path d="M305 110v38" stroke="var(--ink)" stroke-width="4" />
    <!-- desk -->
    <rect x="20" y="470" width="335" height="14" fill="var(--ink)" />
    <rect x="40" y="484" width="14" height="190" fill="var(--ink)" />
    <rect x="321" y="484" width="14" height="190" fill="var(--ink)" />
    <!-- notebook + ink pot -->
    <path d="M110 470l20-36h110l20 36z" fill="var(--parchment-dark)" stroke="var(--ink)" stroke-width="3" />
    <path d="M185 434v36" stroke="var(--ink)" stroke-width="2" />
    <rect x="290" y="440" width="28" height="30" rx="5" fill="var(--ink)" />
  </svg>

  <h1>The Study</h1>
  <nav>
    <a href={href('codex')}>Codex</a>
    <a href={href('lab', { scenario: 'smoke' })}>Lab</a>
  </nav>
</section>

<style>
  section {
    position: relative;
    height: 100%;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  h1 {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    margin: 0;
    font-size: 22px;
    font-weight: normal;
    letter-spacing: 0.04em;
  }
  nav {
    position: absolute;
    left: var(--space-3);
    right: var(--space-3);
    bottom: calc(var(--space-4) + 20px);
    display: flex;
    gap: var(--space-3);
  }
  nav a {
    flex: 1;
    padding: var(--space-3);
    text-align: center;
    text-decoration: none;
    background: var(--ink);
    color: var(--parchment);
    border-radius: 6px;
  }
</style>
