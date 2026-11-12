# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Trimmed in the design window of 2026-11-12c: waves 8–13 merged except ED, F5, O and I (their briefs deleted); C3b is new (bridges-plan P24).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Packs on one line own disjoint files and may run together. None of these runs `tests/sim`.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 8b | **C3b** bridges carried variants (`brink-cap-fall`, `chalk-network-ring`) | now |
| 9 | **ED** ledger and owner | C3b |
| 10 | **F5** foundry footnote audit · **O** FU-21 | F5: ED · O: ED |
| 11 | **I** FU-2–5 | F5 |

File clashes that set this order: **C3b and ED share the cast paths** (`src/engine/resolve.ts` and `src/engine/inventions.ts`; ED also edits `bursts.ts`, whose `unitsNear` C3 changed), so C3b runs and merges before ED starts; ED, F5 and I all edit `src/data/lines.ts`; ED and O both touch `src/engine/solvents.ts`; I owns `src/engine/events.ts` (C3b adds no event). C3b alone edits `schedule.ts`, `turn.ts`, `src/engine/types.ts`, `districts/{api,types}.ts` and `districts/bridges/**`. No pack here needs a UI port.

Every brief's "Leaves for later" items are also in the status file's Owed list.

## Pack C3b: bridges carried variants (Strong: Sonnet high; escalate to Opus high)

Starts now (C3 merged). Runs before ED: both edit the cast paths (`resolve.ts`, `inventions.ts`). Strong by role: it adds a queue kind, a `DistrictModule` reader and writer and a bridges-state field, ordered inside the dusk, and C3 at Default stopped on exactly these two.

```
Pack C3b of docs/plans/bridges-plan.md: task BR-19c (`brink-cap-fall`, `chalk-network-ring`).

Read: bridges-plan.md P24 (this contract, in full) and P21–P23; docs/design/footnotes-content/bridges.md §2
Brink-III, §4 Chalk-network-II and §8; DESIGN §11's last row; pattern: src/engine/schedule.ts (`run`,
`disturbRepeats`, `runScheduled`), `crackedTiles` in src/engine/districts/api.ts with `unsupported` in
src/engine/districts/types.ts and src/engine/districts/bridges.ts, `collapseOnce` in
src/engine/districts/bridges/collapse.ts, C3's tests in tests/scenarios/footnotes/bridges-{brink,chalk}.test.ts.
Own:
- src/engine/runes/brink.ts (new): `brinkOutcome` and `fogWard` moved verbatim from src/engine/resolve.ts
  (commit the move alone first as `refactor:`, every test green and unchanged), then the cap-fall record;
  src/engine/resolve.ts (the import and the Brink branch's calls only; not the settle calls).
- src/engine/schedule.ts (the three functions below; `'brink'` skipped in `runScheduled` and counted in `run`'s
  `again`), src/engine/types.ts (`Scheduled.kind` only), src/engine/turn.ts (one call at the end of `roundEnd`).
- src/engine/inventions.ts (`conduct`: the ring join and spend only), src/engine/districts/api.ts (two
  functions), src/engine/districts/types.ts (two optional `DistrictModule` hooks), src/engine/districts/bridges.ts
  (two hook lines in the module object only), src/engine/districts/bridges/types.ts (`BridgesState`,
  `parseBridges`), src/engine/districts/bridges/collapse.ts (both records, the replay call, the spend).
- src/data/footnotes/bridges.ts (the ring entry; the header's "not here yet" paragraph goes);
  tests/scenarios/footnotes/bridges-brink.test.ts, tests/scenarios/footnotes/bridges-chalk.test.ts,
  tests/districts/bridges/carriers.test.ts (new), tests/data/footnotes.test.ts (the count 239 → 240 only).
Contract (bridges-plan P24; on main: C3's batch, `exposedStep`, `crackedTiles`):
- Ids final. `brink-cap-fall` is already in the data (inert until now): keep its entry and text, "When the target
  falls this dusk, Brink's rest acts once more on the tile it was standing on." Add after `chalk-network-kin`:
  `{ id: 'chalk-network-ring', subject: 'chalk', slot: { line: 'chalk:network', level: 2 },
     text: 'A network cut by a fall still reaches from where the brass stood, once.' }`
  No new event types, lines or `Meets` values.
- Cap-fall carrier. src/engine/types.ts:
  `kind: 'repeat' | 'margin' | 'wick' | 'graphite' | 'filings' | 'thunderhead' | 'pitch' | 'brink';`
  (doc: `brink` is `brink-cap-fall` waiting for `hit` to fall this dusk). src/engine/schedule.ts:
  `export function awaitFall(ctx: Ctx, e: Omit<Scheduled, 'kind' | 'when'> & { hit: UnitId }): void`
    pushes `{ ...cloneData(e), kind: 'brink', when: 'roundEnd' }` and emits nothing;
  `export function replayFallen(ctx: Ctx, fell: readonly { unit: UnitId; at: Coord }[]): void`
    takes every `'brink'` entry whose `hit` is in `fell` out of the queue and, in queue order, runs each once
    as `run(ctx, { ...e, target: { kind: 'tile', at } })` inside `withLine(ctx, 'brink:cracked', …)`;
  `export function lapseFallReplays(ctx: Ctx): void` drops every `'brink'` entry, no event.
  `runScheduled` leaves `'brink'` entries in the queue (beside `thunderhead`); `run` counts `'brink'` in
  `again` (a replay is a repeat: nothing in it waits again). turn.ts: `lapseFallReplays(ctx)` is the last line
  of `roundEnd`, after `slot(ctx, 'late', rules)`.
- Cap-fall record (src/engine/runes/brink.ts, from the Brink branch once the groups are known): when
  `hasFootnote(ctx, 'brink-cap-fall')`, `st.next` is not null and `!flow.repeated`, one `awaitFall` per living
  unit the rest is queued for (every group's targets: plain, weaker, `found`; never `passedOver`), with
  `owner: flow.caster`, `step: st.next`, `target` the Brink target, `hit` that unit's id, `heading` the group
  flow's heading for the target (or null), `origin: flow.origin`, `solvent: group.flow.solvent ?? null`,
  `context: sealedContext(group.flow)`.
- Cap-fall replay (collapse.ts `collapseOnce`): collect `{ unit, at }` for each faller that falls (after the
  right-of-way `continue`; a minion `hold-cap-crush` kills and an elite that re-lands count), then call
  `replayFallen(ctx, fell)` once after the fall loop, before `next` is built. `epilogueFall` never calls it.
- Ring carrier. src/engine/districts/bridges/types.ts:
  `export type BridgesState = { stone: …; originals: string[]; cuts: …; fallenBrass?: string[] };`
  (doc: `chalk-network-ring`'s brass tiles lost to a fall; reading order, no duplicates; P24). `parseBridges`
  reads it as it reads `originals` (KEY-valid strings, deduplicated, sorted in reading order) and sets the key
  only when the list is non-empty; `initBridges` is unchanged. src/engine/districts/types.ts, `DistrictModule`
  beside `unsupported`:
  `fallenBrass?(s: BattleState): readonly Coord[];`
  `spendFallenBrass?(ctx: Ctx, tiles: readonly Coord[]): void;`
  src/engine/districts/api.ts beside `crackedTiles`:
  `export function fallenBrassTiles(state: BattleState): Coord[]` (union over modules in registry order, no
  duplicates) and `export function spendFallenBrass(ctx: Ctx, tiles: readonly Coord[]): void` (every module's
  hook, registry order). Bridges: `fallenBrass` = the recorded tiles still `terrain.drop` (a mended tile is
  forgotten); `spendFallenBrass` (in collapse.ts) removes their keys from the rule state.
- Ring record (collapse.ts `collapseOnce`): when `hasFootnote(ctx, 'chalk-network-ring')`, the falling tiles
  with `isBrass(ctx.s, at)` are read before the clear loop and added to `next.fallenBrass`.
- Ring read (inventions.ts `conduct`): once `net` is found on brass (not the `conduct-cap-cloud` fallback), when
  `flow.solvent === 'chalk'` and `hasFootnote(ctx, 'chalk-network-ring')`, the tiles of
  `fallenBrassTiles(ctx.s)` 4-adjacent to a net tile are appended to `net` before `reach`, `farEnd` and
  `unitsNear` read it, then `spendFallenBrass(ctx, those)` runs (used or not). Events carry the conduct's line
  as Chalk's other variants do.
- Core files read bridges state only through `districts/api`, and the one write to it (the spend) is an api
  call; the queue is core state, read by the bridges module through schedule.ts. Behaviour-neutral without the
  two variants: nothing is queued, `fallenBrass` is never written, goldens, fixtures and scenario output are
  unchanged. Tests import `$engine` before any district file (the kit's lazy import cycle).
Owed by this pack: nothing from the status file. Leaves for later: C3's hygiene items (status Owed, the
bridges Close code review).

Tests first: write every test below as `it.fails` before the engine change (each must fail), then un-mark each
as it lands.

Done when:
- In bridges-brink.test.ts: "brink-cap-fall: a target that falls at dusk takes Brink's rest again on the tile it
  stood on" (a rest whose effect on that tile reaches a unit beside it), "brink-cap-fall: a target that walks
  off, is set down by hold-cap-hang or keeps its tile by right of way gets no replay", "brink-cap-fall: a caster
  who falls in the same collapse has no replay", "brink-cap-fall: the replay keeps half's strength and never
  records another" and "brink-cap-fall: no brink entry outlives the dusk, on a board without bridges too" pass;
  the existing Brink tests pass unchanged.
- In bridges-chalk.test.ts: "chalk:network fourCombos: square or end, then kin or ring" (replaces "chalk:network
  combos: square or end, with kin (ring is not built yet)"), "chalk-network-ring: a Chalk conduct on a network
  cut by a fall reaches from where the brass stood", "chalk-network-ring: the remembered tile is spent by the
  first Chalk conduct that touches it", "chalk-network-ring: a plain Conduct, or none written, does not read the
  fallen tile" and "chalk-network-ring: a tile the Mason mends is forgotten" pass.
- In tests/districts/bridges/carriers.test.ts: "P24: parseBridges keeps fallenBrass and omits it when empty",
  "P24: fallenBrassTiles lists the recorded tiles still fog, in reading order" and "P24: without the two variants
  a dusk fall leaves the bridges state and the queue as before" pass.
- tests/data/footnotes.test.ts passes with only its count changed; tests/data/integrity.test.ts passes;
  tests/districts/bridges, tests/rivals, tests/engine and tests/run pass unchanged; `git status tests/fixtures`
  is clean. Any other test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/districts/bridges tests/engine tests/run --reporter=dot`
Phone check: no (no screen changes; the orchestrator checks at the wave's end that the Chalk margin lists the ring at level II).
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | D5 merged and the player's timings in |
| BF-FG | orchestrator review of the foundry footnote draft; brief for Pack J (BF-F2 → BF-F3) | F5 merged |
| EN-12 | the handover text draft (orchestrator, docs only) | any design window |
| CG A… | cartographers Packs A–J briefs | CW0 merged |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1) | EN-G0 |
| CL | platform-closure Pack N | the end |
