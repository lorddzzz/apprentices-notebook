<script lang="ts" module>
  import {
    ART_FAMILIES,
    ART_SCOPES,
    type ArtFamily,
    type ArtMeta,
    type ArtScope,
    BUDGETS,
    type BudgetGroup,
    budgetFor,
    budgetGroup,
    DISTRICT_SCOPES,
    parseArtId,
  } from '../../art/spec';

  export interface ArtRow {
    id: string;
    url: string;
    /** Null when the asset ships without a usable sidecar (art:check fails it). */
    meta: ArtMeta | null;
  }
  export interface ScopeBlock {
    scope: ArtScope;
    rows: ArtRow[];
    /** Shipped bytes of the rows that have metadata. */
    bytes: number;
  }
  export interface FamilyBlock {
    family: ArtFamily;
    scopes: ScopeBlock[];
  }
  export interface BudgetRow {
    group: BudgetGroup;
    count: number;
    bytes: number;
    budget: number;
  }

  /** Rows by family, then scope, in the contract's order; ids off the path rule are left out. */
  export function groupArt(rows: readonly ArtRow[]): FamilyBlock[] {
    const out: FamilyBlock[] = [];
    for (const family of ART_FAMILIES) {
      const scopes: ScopeBlock[] = [];
      for (const scope of ART_SCOPES) {
        const own = rows.filter((r) => {
          const p = parseArtId(r.id);
          return p?.family === family && p.scope === scope;
        });
        if (own.length === 0) continue;
        scopes.push({ scope, rows: own, bytes: own.reduce((n, r) => n + (r.meta?.bytes ?? 0), 0) });
      }
      if (scopes.length > 0) out.push({ family, scopes });
    }
    return out;
  }

  /** Shipped bytes per budget group (C5: shared + home, map, each district), non-empty groups only. */
  export function budgetRows(rows: readonly ArtRow[]): BudgetRow[] {
    const order: BudgetGroup[] = ['shared+home', 'map', ...DISTRICT_SCOPES];
    const byGroup: Partial<Record<BudgetGroup, BudgetRow>> = {};
    for (const r of rows) {
      const p = parseArtId(r.id);
      if (!p) continue;
      const group = budgetGroup(p);
      const row = byGroup[group] ?? { group, count: 0, bytes: 0, budget: budgetFor(group) };
      row.count += 1;
      row.bytes += r.meta?.bytes ?? 0;
      byGroup[group] = row;
    }
    return order.flatMap((g) => byGroup[g] ?? []);
  }

  export function kb(bytes: number): string {
    return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(2)} MB` : `${(bytes / 1000).toFixed(1)} KB`;
  }
</script>

<script lang="ts">
  import { artIds, artMeta, artUrl } from '../../art/registry';

  /**
   * UF-7: the Gallery `art` page, the final-review contact view (not available to the anchor
   * packs, R22). Every registered ArtId at real size grouped by family and scope, shipped bytes
   * per budget group against C5, and a flag where the sidecar is missing. Art is authored at
   * 2 device pixels per CSS pixel (the Study strip is 750 wide for a 375 px screen), so each
   * image is drawn at half its decoded size: one image pixel per device pixel on an iPhone.
   */
  const rows: ArtRow[] = artIds().flatMap((id) => {
    const url = artUrl(id);
    return url ? [{ id, url, meta: artMeta(id) }] : [];
  });
  const families = groupArt(rows);
  const budgets = budgetRows(rows);
  const total = rows.reduce((n, r) => n + (r.meta?.bytes ?? 0), 0);
  const missing = rows.filter((r) => r.meta === null).length;
  const subject = (id: string) => id.split('/').slice(2).join('/');
</script>

<div class="art" data-testid="art-page">
  {#if rows.length === 0}
    <p class="empty" data-testid="art-empty">No art is shipped yet (src/assets/art is empty).</p>
  {:else}
    <p class="note">
      {rows.length} asset{rows.length === 1 ? '' : 's'}, {kb(total)} of {kb(BUDGETS.total)}.
      Drawn at half the decoded size (2 device pixels per CSS pixel).
      {#if missing > 0}<strong class="flag" data-testid="art-missing-total">
          {missing} without a sidecar.
        </strong>{/if}
    </p>

    <h2 class="label">Budgets (C5)</h2>
    <ul class="budgets" data-testid="art-budgets">
      {#each budgets as b (b.group)}
        <li class:over={b.bytes > b.budget} data-group={b.group}>
          <span class="group">{b.group}</span>
          <span class="bar"><span style:width="{Math.min(100, (b.bytes / b.budget) * 100)}%"></span></span>
          <span class="nums">{kb(b.bytes)} / {kb(b.budget)}</span>
        </li>
      {/each}
    </ul>

    {#each families as fam (fam.family)}
      {#each fam.scopes as sc (sc.scope)}
        <h2 class="label" data-testid="art-group">
          {fam.family} / {sc.scope} · {sc.rows.length} · {kb(sc.bytes)}
        </h2>
        <ul class="items">
          {#each sc.rows as r (r.id)}
            <li data-testid="art-item" data-id={r.id}>
              <div class="frame">
                <img
                  src={r.url}
                  alt={r.id}
                  width={r.meta ? r.meta.w / 2 : undefined}
                  height={r.meta ? r.meta.h / 2 : undefined}
                  draggable="false"
                />
              </div>
              <p class="cap">
                <span class="id">{subject(r.id)}</span>
                {#if r.meta}
                  <span>{r.meta.role} · {r.meta.w}×{r.meta.h} · {kb(r.meta.bytes)}</span>
                {:else}
                  <span class="flag" data-testid="art-no-sidecar">missing sidecar</span>
                {/if}
              </p>
            </li>
          {/each}
        </ul>
      {/each}
    {/each}
  {/if}
</div>

<style>
  .art {
    font-family: var(--font-serif);
  }
  h2 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: var(--type-sm);
    font-weight: 400;
    color: var(--ink-soft);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .note,
  .empty {
    margin: var(--space-2) 0;
    font-size: var(--type-sm);
  }
  .flag {
    color: var(--danger);
    font-weight: 600;
  }
  .budgets li {
    display: grid;
    grid-template-columns: 96px 1fr auto;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    font-family: var(--font-mono);
    font-size: var(--type-xs);
  }
  .bar {
    height: 8px;
    border: 1px solid var(--line);
  }
  .bar > span {
    display: block;
    height: 100%;
    background: var(--ink);
  }
  .over .bar > span {
    background: var(--danger);
  }
  .over .nums {
    color: var(--danger);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .frame {
    max-width: 100%;
    overflow-x: auto;
    line-height: 0;
    background:
      repeating-conic-gradient(var(--parchment-dark) 0 25%, var(--parchment) 0 50%) 0 0 / 16px 16px;
  }
  img {
    display: block;
    max-width: none;
  }
  .cap {
    display: flex;
    flex-direction: column;
    margin: var(--space-1) 0 0;
    font-size: var(--type-xs);
    color: var(--ink-soft);
  }
  .id {
    font-size: var(--type-sm);
    color: var(--ink);
  }
</style>
