<script lang="ts">
  import { isInvention, type MethodId, type Role, RUNES, type RuneRef } from '$data';
  import type { Dir } from '$engine';
  import { DIRECTIONAL_ART, FILLED_ART, METHOD_ART, ROLE_COLOR, RUNE_ART } from '../runeArt';

  interface Props {
    rune: RuneRef | null;
    dir?: Dir;
    size?: number;
    dim?: boolean;
    selected?: boolean;
    /** Draw a compiled Glyph socket (folded tile, initial) instead of a rune. */
    glyphName?: string;
    glyphKind?: 'spell' | 'payload';
    /** For an invention (`inv:…`): its method (the art) and the role it makes (the frame). */
    method?: MethodId;
    role?: Role;
  }

  let {
    rune,
    dir,
    size = 48,
    dim = false,
    selected = false,
    glyphName,
    glyphKind = 'spell',
    method,
    role,
  }: Props = $props();

  const DEG: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

  const invented = $derived(rune !== null && isInvention(rune));
  const def = $derived(rune && !isInvention(rune) ? RUNES[rune] : null);
  const frameRole = $derived<Role | null>(def ? def.role : invented ? (role ?? 'action') : null);
  const frameColor = $derived(frameRole ? `var(${ROLE_COLOR[frameRole]})` : 'var(--ink-faint)');
  const art = $derived(
    def ? RUNE_ART[def.id] : method ? METHOD_ART[method] : null,
  );
  const glyphFrame = $derived(glyphKind === 'payload' ? 'var(--role-shape)' : 'var(--role-source)');
  const notch = $derived(
    glyphName ? (dir ? DEG[dir] : null) : def?.arrow && dir ? DEG[dir] : null,
  );
  const glyphTurn = $derived(
    def && dir && DIRECTIONAL_ART.has(def.id) ? DEG[dir] - 90 : 0,
  );
  const inventionName = $derived(rune && invented ? rune.slice(4) : '');
  const label = $derived(
    glyphName
      ? `${glyphName} Glyph${dir ? ` ${dir}` : ''}`
      : def
        ? `${def.name}${dir ? ` ${dir}` : ''}`
        : invented
          ? inventionName
          : 'Unknown rune',
  );
  const initial = $derived(
    (glyphName ?? inventionName).trim().charAt(0).toUpperCase(),
  );
</script>

<svg
  class="glyph"
  class:dim={dim}
  width={size}
  height={size}
  viewBox="0 0 40 40"
  role="img"
  aria-label={label}
  data-role={frameRole}
  style:color="var(--ink)"
>
  {#if selected}
    <circle cx="20" cy="20" r="19" fill="var(--select)" opacity="0.35" />
    <circle cx="20" cy="20" r="19" fill="none" stroke="var(--select)" stroke-width="2" />
  {/if}

  {#if glyphName}
    <path
      d="M5 5H27L35 13V35H5Z"
      fill="var(--parchment)"
      stroke={glyphFrame}
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path
      d="M27 5V13H35Z"
      fill={glyphFrame}
      fill-opacity="0.3"
      stroke={glyphFrame}
      stroke-width="2"
      stroke-linejoin="round"
    />
    {#if notch !== null}
      <path d="M20 0.5 15.5 6.5h9z" fill={glyphFrame} transform="rotate({notch} 20 20)" />
    {/if}
    <text x="20" y="27" text-anchor="middle" font-size="18" fill={glyphFrame} font-family="var(--hand)">{initial}</text>
  {:else if !rune}
    <circle cx="20" cy="20" r="16" fill="none" stroke={frameColor} stroke-width="2" stroke-dasharray="4 3" />
    <text x="20" y="26.5" text-anchor="middle" font-size="18" fill={frameColor} font-family="var(--hand)">?</text>
  {:else}
    {#if frameRole === 'source'}
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke={frameColor} stroke-width="2.5" />
    {:else if frameRole === 'action'}
      <rect x="4.5" y="4.5" width="31" height="31" rx="7" fill={frameColor} fill-opacity="0.25" stroke={frameColor} stroke-width="2" />
    {:else if frameRole === 'kind'}
      <circle cx="20" cy="20" r="16.5" fill={frameColor} fill-opacity="0.28" stroke={frameColor} stroke-width="2" />
    {:else if frameRole === 'shape'}
      <rect x="5" y="5" width="30" height="30" fill="var(--parchment)" stroke={frameColor} stroke-width="2" />
    {:else if frameRole === 'trigger'}
      <path d="M20 2 38 20 20 38 2 20z" fill="var(--parchment)" stroke={frameColor} stroke-width="2" stroke-linejoin="round" />
    {:else if frameRole === 'seal'}
      <path d="M12 4h16l9 16-9 16H12L3 20z" fill="var(--parchment)" stroke={frameColor} stroke-width="2.5" stroke-linejoin="round" />
    {:else}
      <circle cx="20" cy="20" r="18" fill={frameColor} fill-opacity="0.18" />
      <circle cx="20" cy="20" r="15" fill="none" stroke={frameColor} stroke-width="2" stroke-dasharray="3.5 2.5" />
    {/if}

    {#if notch !== null}
      <path d="M20 0.5 15.5 6.5h9z" fill={frameColor} transform="rotate({notch} 20 20)" />
    {/if}

    {#if art}
      <g transform="translate(20 20) rotate({glyphTurn}) scale(0.7) translate(-12 -12)">
        <path
          d={art}
          fill={def && FILLED_ART.has(def.id) ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    {:else}
      <text x="20" y="26.5" text-anchor="middle" font-size="18" fill="currentColor" font-family="var(--hand)">{initial}</text>
    {/if}
  {/if}
</svg>

<style>
  .glyph {
    display: block;
    flex: none;
    overflow: visible;
  }
  .dim {
    opacity: 0.35;
  }
</style>
