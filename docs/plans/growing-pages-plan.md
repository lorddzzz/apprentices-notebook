# Growing lattice pages: implementation plan

Design: [growing-pages.md](../design/growing-pages.md), especially §0–§4. Roadmap: **BL-103**, including **BL-88**. Project rules: [AGENTS.md](../../AGENTS.md). Execute with the [implement skill](../../.claude/skills/implement/SKILL.md). Where this plan conflicts with the accepted design, the design wins.

**State: plan only.** This document authorizes no implementation, status-file creation, build delegation, implementation commit or deployment. On the player's go, the orchestrator first creates and commits `docs/plans/growing-pages-status.md` using the skill's template, records usage and the contract decisions below, then starts W0. No status file is needed for this planning round.

## 1. Scope and settled rules

Ship growing paper for the existing Draughtsman and Stoker in Study, the quiet doorway, Lab lattice editing and Glyph revision. Recruitment, three-member parties, enlarged battle rooms, new rune mechanics and new progression rules remain outside this build. Do not revive the historical drafts feature mentioned in revision comments or older plans.

The accepted design settles these rules:

- Paper unfolds automatically in all four directions. Placements retain their coordinates; former member holes become writable. Disconnected spells and unused runes remain allowed on ordinary pages. Empty cells still stop flow.
- Ink per apprentice remains the build budget. Empty paper is free. Page width, height and area do not become another gameplay budget.
- Editing targets remain readable and tappable; dragging pans even when it starts over a rune. A drag must never place, rotate, select a Fair Copy cluster or lift a rune. Fit frames current wiring and a blank margin. No pinch gesture is required.
- Growth, pan and Fit are view changes, not spell edits. Existing proof, compiled behavior, Source keys/charges, Glyphs, their versions/records, open cells and exits retain their meaning.
- Glyph revision loses the separate 7×7 canvas restriction. Its other current rules remain: pinned local entry `(0,0)`, Spell/Payload kind, Source rules, arrows, reachability, touching auras, **3–8 flow cells**, ownership/ink, versioning and settings. Removing `revisionCanvasMax` does not remove `glyphMinCells` or `glyphMaxCells`.
- Erasure leaves surviving work in place and does not snap the view back. Fit ignores historical empty regions. Old valid notebooks and scenario layouts remain usable; malformed imports must be rejected atomically without cropping.

## 2. Proposals to build and tune

These are implementation defaults, **not additional decisions attributed to the player**. W0 must review and record the contract proposals before dependent work starts. Later deviations are reported as Proposals; they cannot silently change the accepted rules.

| ID | Proposal | Reason / how to judge it |
|---|---|---|
| P1 | Keep signed, stable integer lattice coordinates; add an explicit growing-paper shape mode while retaining fixed ASCII shapes. | Growth above/left must not rebase identity-bearing coordinates; fixed scenario holes still have meaning. |
| P2 | One blank cell around occupied bounds; an empty page initially frames a 5×5 patch centred on `(0,0)`. Existing nonempty pages initially frame their wiring at editing scale, with room visible for another start where the viewport permits. | Matches the design's starting margin proposal; pan can always reach more blank paper. Initial framing is a phone layout default. |
| P3 | Use a 60 CSS-pixel editing pitch initially, with the socket's interactive area at least 44×44; use a 10px drag threshold and existing 450ms hold delay. | Readable phone targets and a shared threshold with today's longpress slop. Tune at 375×812, preserving the interaction contract. |
| P4 | Preserve the world-to-screen transform through growth, erasure and ordinary edits; only explicit Fit, an explicit return to editing scale, or opening a different document changes framing. | The edited rune must not move because its bounds changed. |
| P5 | In a small-scale Fit overview, a tap recentres that region at editing scale and performs **no edit**. Provide an explicit “Edit scale” control too. | Makes overview navigation safe for tiny targets. The next tap edits normally. |
| P6 | Keep view state in memory, keyed by editing context and member/Glyph working session; do not add it to saved game state or Lab undo history. | View navigation must not affect proof, persistence or undo. Reset/import/new editor sessions have explicit framing reset boundaries. |
| P7 | Save envelope v8, with an identity-preserving v7 migration; keep sparse `Profile.lattices` as placements only. | Records the new coordinate semantics without saving empty paper or inventing a persistent page extent. |
| P8 | Add a versioned sparse lattice text form for growing pages; retain the existing dense ASCII parser/writer for fixed layouts. | Dense export of two distant runes must not allocate their bounding rectangle or lose negative coordinates. |
| P9 | Introduce explicit external-input resource budgets, separate from ink and geometry rules. Initial byte-budget proposal: 8 MiB per save/scenario import; aggregate collection/work limits must be measured and locked in W0. | Protect phone memory and compiler work, not a small playable grid. Reject an excessive input clearly and retain the original; never crop or partially install it. |

P2–P5 are tune-by-playing choices already invited by the design. P1, P6–P9 are build-time contract proposals. W0 must settle their exact interfaces and resource numbers before dependent tasks; a conflict with design goes back through `design-round`. There is no proposed small width/height/area limit.

## 3. Current implementation and integration risks

| Area | What exists now | Required change / risk |
|---|---|---|
| Member pages | `Profile.lattices` stores sparse `Placed[]`. `run.ts:latticeOf` and `parseProfile` reconstruct zero-origin holed shapes from `MEMBERS[m].shape`. | Changing only the editor will still reject off-page placements and reloads. Replace both reconstruction paths; retain legacy geometry for validating v7 data. |
| Compiler and edits | `lattice.ts:isSocket` rejects negative/outside cells; `canPlace`, `canPlaceGlyph`, `study.ts` and `tidyCollapse` use it. | Growing mode must reach every safe lattice coordinate. Fixed shapes and holes remain fixed. Empty space never becomes a path. |
| Identity | `SpellKey` is the Source socket's `"x,y"`; charge maps, actions, proof, path/fired cells and trip tallies carry coordinates/keys. Canonical cluster proof already normalizes translation/rotation. | Never translate live work to keep an origin nonnegative. Audit keys as well as `Coord` objects, including local Glyph keys. |
| Save loading | `app/save.ts` is v7 and treats **any** older version as `OlderEditionError`. `run.ts` validates shape-bound placements; coordinate/key parsing is currently looser than safe-integer validation. | A bare version bump would erase valid v7 notebooks into the recovery path. Implement an explicit v7 route; preserve the pre-v7 edition boundary. |
| Revision | `revisionCanvas` caps each axis at `TUNING.revisionCanvasMax = 7`; `insideIssues` emits a canvas issue; `canvasCells` allocates the entire rectangle and gates placement. | Remove only the geometry cap and whole-box placement gate; keep the independent Glyph validity and version rules. |
| Notation / Lab | `parseLattice` reads zero-origin dense ASCII; `serializeLattice` scans the full rectangle. `ScenarioDef.lattices` is text. Lab supports scenario loading/copying and snapshot undo/reset, with no paste-import UI. | Keep the text boundary, add sparse growing notation and roundtrip tests. Do not introduce an unrelated import UI or change scenario battle-board notation. |
| Rendering | `LatticeGrid` creates `width × height` buttons and shrinks pitch to fit. `FlowOverlay` already accepts an origin; revision uses a separate grid. | A shared viewport must virtualize visible cells and align every overlay with the same signed coordinates. Avoid huge CSS grids/SVG surfaces. |
| Gestures | `longpress.ts` cancels its timer on movement but only swallows a click after a completed hold. | Merely adding pan leaves a click-after-drag bug. A single gesture owner must cancel both edit and hold, handle capture/cancel/cleanup, and preserve keyboard activation. |
| Other displays | `grid.label` / `parseLabel` assume one positive letter column; Fair Copy, revision issues and trip dead-cell text use them. Glyph profiler uses bounds-derived CSS grid positions. | Give lattice text a scalable signed label contract; keep board labels stable. Check read-only Glyph displays and arrows outside the old canvas too. |

Large sparse bounds must be cheap. Long connected Lab paths additionally expose recursion in compiler/walk helpers and combinatorial Fair Copy enumeration; area virtualization alone does not solve those. Measure these paths in W0 and handle accepted inputs safely in E1/E2 rather than hiding the problem behind a small page-size cap.

## 4. Shared contracts (W0 handoff)

The following interfaces are the proposed contract shape. W0 may improve names, but its merged handoff must define their semantics, fixtures and call sites; downstream tasks report gaps instead of changing shared contracts independently.

### 4.1 Coordinates, shapes and derived bounds

- Keep `Coord`, `key`, `SpellKey` and saved placements in their current coordinate space. A valid lattice coordinate is a finite safe integer on each axis with arithmetic headroom for stepping and a margin; validate additions/subtractions and spans before using them. No normalization/rebasing of placements, Glyph locals, record keys, proof or trip actions.
- Separate lattice-coordinate/key parsing from battle-board validation: `run.ts:parseCoord` is shared today. Signed paper support must not relax battle dimensions, unit/aim/move coordinates, HP/intent label lookups or board bounds. Preserve each domain's current validation and check board references against the relevant encounter where required.
- Represent shapes as backward-compatible fixed shapes (existing literals default to fixed, zero-origin, with holes) or explicit growing shapes (`kind: 'growing'`, signed `origin`, derived `width`/`height`, no holes). Keep width/height available for existing callers, but document that they are **framing bounds**, not legal-coordinate bounds, in growing mode.
- `isSocket(fixed, at)` retains today's behavior. `isSocket(growing, at)` accepts any valid lattice coordinate, independent of framing bounds. This lets the viewport reveal writable paper without mutating the lattice or manufacturing empty cells.
- Put pure helpers in `src/engine/page.ts`: a `CellBounds { origin, width, height }` contract; bounds over sparse placements/inside cells plus a margin; `growingLattice(runes)`; conversion from a fixed lattice for an editor; visible-cell iteration over an explicit **bounded window**. Empty-page fallback and margin are data/layout defaults, not game-state budgets.
- Signed lattice/Glyph coordinates must use page-specific validators. Battle unit/tile/action coordinates retain their existing nonnegative board-bounds checks; do not globally relax a shared coordinate parser to admit page coordinates.
- Profile pages are reconstructed with `growingLattice` on every access. Starting placements retain their exact current coordinates, including Stoker's vertical layout; do not rewrite them merely to remove holes. Fixed member shapes cease to define active paper.
- Legacy dense ASCII still constructs fixed shapes. The Lab editor converts its loaded working lattices to growing paper with placements unchanged and former holes writable; scenario execution/tests can still compile fixed shapes directly. Exporting the Lab's growing copy uses the new form.
- `revisionCanvas` becomes uncapped content framing and uses the same bounds helper. Its result is not permission to enumerate an unbounded rectangle. Revision placement checks coordinate validity directly; visible cells come from the viewport window. Entry `(0,0)` never moves.

### 4.2 Persistence and identity

- v8 keeps the `SaveData`/`Profile` field layout and sparse placements. Do not save viewport transforms, margins, virtual cells or historical empty extents. v8 parsing reconstructs growing pages and validates coordinates, duplicates, rune/Glyph/invention references and existing structural rules.
- Add an explicit validated v7 decoder/migration using frozen v7 member shapes, independent of future member data. Run the old edition's structural checks before admitting its placements; do not first apply new canvas/record constraints to historical data that the v7 loader accepted. The normalized result is admitted to v8 without translating anything.
- `parseSaveText` dispatches: `<7` retains the existing older-edition message/back-up behavior; `7` decodes/migrates; `8` decodes current data; `>8` retains the newer-version error. Validate the envelope version as a finite integer, not just `typeof number`.
- Preserve current/archive Glyph definitions, `id@version` records, `params`/placed args, exits, extra exit, proof masks, live trip actions and charge maps, recap/tally keys, city/progression and seed counter. No new Glyph version, record reset, proof invalidation, charge refill or gameplay event on migration/reveal/pan/Fit.
- For a migrated mid-fight save, recompilation must produce the same old Source keys and replay the already-recorded actions against the same encounter/seed; assert the resulting battle state and events against the v7 baseline, including depleted charges. Migration must not restart the fight or silently drop its action history.
- Retain current stale-argument handling: a stale arg may be a page issue rather than a broken historical save. References in historical proof/tallies/charges cannot all be required to match the current layout: a doorway can legitimately remove or replace a Source. Validate syntax and the existing semantic distinction rather than deleting unmatched history.
- Keep storage recovery/back-up behavior for corrupt input. Resource refusal of an otherwise supported save must be distinguishable from corruption and must **not overwrite it with a fresh notebook**. Manual imports are atomic and leave the current notebook untouched on failure.

### 4.3 Notation, labels and resource safety

- Keep `parseLattice(text): Lattice` / `serializeLattice(lattice): string`; detect an unambiguous versioned header for growing text. Proposed canonical form: `@lattice 1 growing`, then one `x,y TOKEN` line per occupied cell in reading order. Reuse existing rune/Glyph/argument token parsing. Header alone is a valid empty growing page. Reject duplicate coordinates, `x` holes, unknown directives and trailing junk in this form.
- Fixed ASCII retains `.`/`x`, exact dimensions and existing tokens. Fixed serialization stays dense; growing serialization stays sparse, including widely separated cells. Never silently choose a different origin, omit a placed cell or crop output. Scenario lattice fields remain strings, so `toScenarioDef`/`formatScenario` need no parallel geometry payload.
- Add lattice-specific labels instead of changing battle labels: preserve `A1` through `Z…`, extend positive columns to `AA…`; when either coordinate is negative, use explicit `(x,y)` signed zero-based notation. Define/test the inverse if a lattice label parser is exposed. Machine keys and sparse notation always remain signed `x,y`. Audit every lattice-only label consumer; leave board labels/HP/intent lookups and event wording unchanged.
- Centralize external-input budgets in a named import-policy module/data contract, separate from gameplay tuning. Check text bytes before parsing; cap aggregate entries/tokens/nesting/work before maps, spread calls, recursion or dense allocation. Arithmetic must not overflow through coordinates, keys, dimensions or margin expansion. Bounds area is never used to allocate sparse saves, sparse notation, Fit or the editable DOM.
- W0 records concrete byte/entry/work budgets from phone-oriented measurements, with fixtures at and beyond each threshold. The 8 MiB byte limit is a Proposal; do not ship an unexplained number. Budgets must accommodate valid v7 saves and ordinary long/wide experiments. Over-budget external data gets a readable resource error and preserves the original, with no partial load. Live growing paper has no small geometry cap; if measurements expose an engine limitation, fix the traversal or report the contract issue before merging.

### 4.4 Shared viewport and gesture lifecycle

- New pure `src/app/latticeViewport.ts` owns world↔screen transforms, edit/Fit modes, fit bounds, bounded visible windows and overview-to-edit navigation. New `LatticeViewport.svelte` owns clipping, resize observation, pointer capture and persistent controls, with a cell-rendering snippet/callback contract usable by ordinary and revision editors.
- The screen position of a world cell derives from world coordinates and the transform, **not from an automatically recentered content origin**. Resizing preserves the working anchor in edit mode; Fit may recompute while explicitly in Fit. Member/context keys prevent one page's transform leaking into another.
- Edit mode renders only viewport cells plus a small overscan. Fit may render occupied cells and flow sparsely without an empty-cell button for every gap; when targets fall below the editing minimum it is a navigation surface. Do not mount an enormous transformed element just because its world bounds are enormous.
- One pointer controller owns pending tap/hold/pan. Crossing the drag threshold cancels the hold and consumes the following click even if released on a different cell. Capture the pointer so dragging outside a cell still pans. `pointercancel`, lost capture, a second pointer, window blur, context change and unmount clear pending timers/actions. A completed longpress consumes its click and ends that gesture's editing action; later movement must not produce a second edit.
- Keep keyboard button activation and focus usable. Scoped `touch-action` on the paper permits panning without trapping the surrounding sheet's normal scrolling; shelf, ink, Fit and editing-scale controls stay outside the transformed paper. Native browser scroll/click behavior must be checked on the actual browser tooling.
- View-only navigation never calls edit/persist/checkpoint/rebase functions. Lab undo restores its existing domain snapshot; reset/reload creates a new viewport session. Revision Reset restores the original working copy without saving a version, cancels gestures and deliberately resets framing; ordinary erasure does not.

## 5. Waves, ownership and tasks

Use the current skill mappings: **Strong** = Sol 6.1 High; **Medium** = Sol 6.1 Medium; **Fast** = Luna 6 Max, or the skill's corresponding runtime roles. The orchestrator owns contract review, integration, status, docs and final verification. Tasks use isolated worktrees; do not overlap file ownership concurrently. Run `pnpm check` before every commit. A wave is not a barrier: start a task once all its dependencies are merged.

| Wave | Task | Role | Size | Depends on | Purpose |
|---|---|---|---|---|---|
| 0 | W0 | Strong | L | Player's implementation go | Mergeable contracts, helpers, measurement and fixtures |
| 1 | E1 | Strong | L | W0 | Growing engine pages, validated v7 migration and current save parsing |
| 1 | E2 | Medium | M | W0 | Uncapped revision geometry with Glyph invariants |
| 1 | N1 | Medium | M | W0 | Sparse notation and resource-safe text boundaries |
| 1 | V1 | Medium | L | W0 | Shared viewport math and pointer lifecycle |
| 2 | A1 | Medium | M | E1, N1 | Study/Lab reducer integration, snapshots and exports |
| 2 | U1 | Medium | L | E1, A1, V1 | Ordinary editor/Grid integration for Study, doorway and Lab |
| 2 | U2 | Medium | M | E2, V1; U1 for any shared component changes | Revision editor integration and read-only Glyph checks |
| 3 | R1 | Medium | M | E1, E2, N1, A1 | Cross-feature identity/regression tests |
| 3 | Q1 | Fast | M | U1, U2, A1, R1 | Independent phone QA with screenshots |
| 4 | F1 | Strong orchestrator + Medium review | M | All above | Review, docs/status, final checks and delivery |

### W0 — freeze and prove the contracts

**Own:** `src/engine/types.ts`, `src/engine/grid.ts`, new `src/engine/page.ts`, new `src/engine/importPolicy.ts`, `src/engine/index.ts`, `src/data/types.ts`, `src/data/tuning.ts`; new `tests/engine/page.test.ts`, `tests/engine/importPolicy.test.ts`, new `tests/fixtures/growing-pages/` fixtures. `src/engine/lattice.ts` only for the shape-aware `isSocket` change required to keep the new union mergeable.

**Accept:** settle P1/P6–P9 and signatures, fixed/growing semantics, safe coordinate/key policy, exception/error kinds and viewport callback/gesture interface in a handoff. Add tested page helpers and lattice labels; add import-policy constants/helpers without exposing unfinished screens. Existing fixed fixtures/checks stay green. Prepare deterministic v7 fixtures for home, mid-fight and doorway, with spent charges, proof, current/archive Glyphs, records, open cells/args/exits and recap data; also an empty page and distant signed placements. Capture baseline decoded data and replay results before modifying semantics.

Measure connected-chain compilation, Fair Copy enumeration and sparse bounds. Inspect recursive paths (`compileLattice`, `stepsOf`, revision walk, cluster tree enumeration and downstream spell consumers); record which accepted-input sizes require iterative work in E1/E2. No whole-area allocation. If the contract cannot be merged without breaking checks, split W0 into green commits with compatibility adapters; dependent agents still wait for the reviewed complete handoff.

### E1 — engine growing pages and save compatibility

**Own:** `src/engine/run.ts`, `src/engine/lattice.ts` after W0, `src/engine/cluster.ts`, `src/engine/glyph.ts`, `src/app/save.ts`, `src/app/game.svelte.ts`, `src/app/flow.ts`, `src/app/App.svelte` for load/resource-refusal handling, new `src/engine/legacyV7.ts`; `tests/engine/lattice.test.ts`, `tests/engine/cluster.test.ts`, `tests/app/save.test.ts`, `tests/run/save.test.ts`, new `tests/run/growing-pages.test.ts`. Any additional recursive consumer needing edits is assigned explicitly by the orchestrator before work, avoiding another task's files.

**Accept:** profile reconstruction, `canPlace`/`canPlaceGlyph`, compiler, validation and `setMemberLattice` work at signed/new-edge coordinates with no member holes. Fixed shape tests still reject holes/outside cells. Fair Copy collapse/tidy's socket guard accepts valid grown targets while preserving collision checks and behavioral identity; recompute framing from placements where needed without moving them. Blank growth changes no spells/events/ink/proof/charges. Land v8 parsing and validated v7 migration together; no version bump without migration. The v7 fixtures retain every identity-bearing value and replay behavior; v8 signed data roundtrips. Pre-v7 and future editions keep their distinct existing outcomes. Reject malformed/duplicate/non-safe coordinates and invalid references, with atomic resource refusal. Address measured stack/enumeration failures for accepted inputs rather than adding a hidden page cap.

### E2 — revision engine and reducer

**Own:** `src/engine/revision.ts`, `src/app/revision.ts`, `src/data/tuning.ts` and `src/data/types.ts` after W0 solely to remove the obsolete revision canvas cap; `tests/run/revision.test.ts`, `tests/app/revision.test.ts`, new `tests/run/growing-revision.test.ts`. W0 leaves the existing `revisionCanvasMax` declarations intact for a green contract merge; E2 removes them together with their consumers after W0, so no concurrent tuning edits.

**Accept:** uncapped signed bounds and placement beyond every old revision edge; no `width × height` allocation to decide a tap. Remove the canvas-only validation failure and obsolete tests. Keep entry, kind, one/no Source, 3–8 flow cells, stranded/aura/arrow/duplicate rules, ink warnings and palette semantics. Save makes one new version with its existing archive/record/settings policy; reset/cancel/pan make none. Revert restores the exact version/record; open-cell keys, local fired counts, args and exits remain stable. Test a valid eight-cell straight inside reaching local `x=7` and its blank margin past 7, plus a valid bent inside visiting negative coordinates; merely placing a ninth flow rune must still fail the independent size rule. Recompute exits using the real walk, not canvas edges.

### N1 — notation and import boundaries

**Own:** `src/engine/notation.ts`, `src/engine/scenario.ts`; `tests/engine/notation.test.ts`, new `tests/engine/growing-notation.test.ts`. Update the notation legend in `.claude/skills/scenario/SKILL.md` only for the new text contract.

**Accept:** fixed ASCII fixtures and their holes roundtrip unchanged; sparse growing text preserves negative/wide/distant placements, Glyph args/directions and empty pages. Share token validation, reject duplicate/malformed coordinates/references where libraries are supplied, and enforce W0's resource budgets before expensive work. Two runes very far apart use storage/time proportional to occupied entries, not bounds area. Invalid text fails without a partially parsed lattice. Scenario load/export/replay accepts the new string format; battle board text/labels remain unchanged. No new paste UI.

### V1 — shared viewport and gesture controller

**Own:** new `src/app/latticeViewport.ts`, new `src/ui/attach/latticePan.ts`, new `src/ui/components/lattice/LatticeViewport.svelte`, `src/ui/attach/longpress.ts`; new `tests/app/latticeViewport.test.ts`, new `tests/ui/latticePan.test.ts`, `tests/ui/longpress.test.ts`.

**Accept:** transform/fit/visible-window math covers negative coordinates, aspect ratio, empty page, resize, erasure and distant cells. Growth preserves a known cell's screen position. Fit bounds ignore historical empty regions. Overview tap and “Edit scale” return to a region without calling edit callbacks. DOM/visible-cell counts stay bounded by the viewport. Gesture tests cover tap, jitter, threshold crossing, filled/empty-cell drag, timer cancellation, post-drag click consumption, completed hold, release outside, cancel/lost capture, second pointer and teardown. Existing non-lattice longpress users keep working. Run component checks and a 375×812 preview of the shared viewport before handoff.

### A1 — app, Lab snapshots and lattice text consumers

**Own:** `src/app/study.ts`, `src/app/lab.ts`, `src/app/lab.svelte.ts`, `src/app/faircopy.ts`, `src/app/tripviews.ts`; `tests/app/study.test.ts`, `tests/app/lab.test.ts`, `tests/app/faircopy.test.ts`, `tests/app/tripviews.test.ts`, new `tests/app/growing-lab.test.ts`.

**Accept:** ordinary edit decisions accept growing coordinates and keep ink/knowledge checks. Lab scenario/fallback/profile working copies use growing paper while direct fixed scenario execution remains intact. One rune edit creates one existing snapshot/rebase; pan/Fit/reveal create none. Undo restores exact signed placements, compiled battle spells, base/actions/log; reset reloads original scenario placements and clears undo as before. Copy lattices/copy scenario then parse/load reproduces coordinates, Source keys and demo results without allocating blank rectangles. Player save is untouched by Lab work. Use lattice-specific labels in Fair Copy and dead-cell text, including negative and multi-letter columns.

### U1 — ordinary lattice UI

**Own:** `src/ui/components/lattice/LatticeGrid.svelte`, `src/ui/components/lattice/LatticeEditor.svelte`, `src/ui/components/lattice/FlowOverlay.svelte`, `src/ui/components/study/FairCopySheet.svelte`; new `tests/app/growingFlowGeometry.test.ts`. `src/ui/screens/Study.svelte` / `src/ui/screens/Lab.svelte` only if session keys need wiring; claim these in the task prompt before editing.

**Accept:** replace auto-shrink/full-rectangle rendering with V1's viewport, cell windows and shared gesture owner. Study, doorway and Lab get identical pan/Fit/edit-scale behavior; all four margins reachable before editing offscreen. Preserve flow/auras, focus/step numbers, inspected state, proof glow, Fair Copy selection and dead-cell rings at signed coordinates. Overlay origin/window/transform align with rendered cells in both modes; panning through a rune does not invoke selection/edit/detail/args side effects. Ink/shelf/page controls stay visible; no horizontal page overflow. Keep keyboard cell activation and minimum edit targets. Phone screenshots include growth above/left, a wide second spell, Fit and doorway controls.

### U2 — revision UI and Glyph displays

**Own:** `src/ui/components/study/RevisionEditor.svelte`, `src/ui/components/study/GlyphProfiler.svelte`, `src/app/profiler.ts`; `tests/app/profiler.test.ts`. It may change `LatticeViewport.svelte` / `FlowOverlay.svelte` only after U1 is merged and ownership is transferred; otherwise request interface fixes from their owners.

**Accept:** revision uses the same viewport and pointer lifecycle while retaining entry/issue marks, palette, ink warning and Save/Reset/Cancel. No full `canvasCells` materialization. Save disabled for real existing issues, never just for passing 7×7. Controls/issues remain reachable within the phone sheet. Check profile/settings/read-only inside displays for grown geometry: no clipped rune, misleading entry/exit marker or tiny editing control. No unrelated redesign of Glyph sheets. Screenshots show a valid long revision, negative local cells, Fit navigation and successful version/revert display.

### R1 — cross-feature regression evidence

**Own:** new `tests/scenarios/growing-pages.test.ts`, new `tests/run/growing-compatibility.test.ts`, new `tests/scenarios/growing-glyph-identity.test.ts`. Existing `tests/run/doorway.test.ts`, `tests/run/proof.test.ts`, `tests/scenarios/glyph-identity.test.ts` may be extended only after their owning engine tasks merge. Read the `scenario` skill for event-log assertions.

**Accept:** deterministic tests use real compiler/casts and assert meaningful outcomes, not only helper output:

1. Same placements compiled in old fixed bounds and growing paper have identical spells/keys and combat events; reveal-only geometry changes leave ink/proof/records unchanged. Include empty gaps, unused runes, disconnected second spells, Fork/Bend and auras.
2. Extend past each original member edge and into former holes, including negative axes. Reload/import/export retains every placement and Source identity.
3. Prove a cluster, reveal/pan-equivalent framing, then Fair Copy at negative coordinates; eligibility and canonical proof survive, flatten/collapse behavior matches, and tidy targets outside old bounds obey collision/identity rules.
4. At a quiet doorway, hold Sources of the same rune/Glyph type with **distinct partially spent counts**. Reveal alone leaves per-key charges untouched. Rewire past top/left edges, apply doorway, save/reload and begin the next encounter: counts follow the existing stay/move/type matching policy, without swapping or refilling. Cover pending loot picks too.
5. Revise beyond 7×7, set an open cell/arg at a signed local key, compile/cast against a flat counterpart, save/reload, revise/revert: versions, records, exits and active-reward semantics retain current meaning. Canvas growth alone cannot create a version or reset a record.
6. Hostile/huge sparse geometry is handled in bounded work; tests cover rejected input at budget boundaries, duplicate cells, non-safe numbers, malformed keys and invalid refs. Accepted long connected inputs do not overflow a traversal. Existing Lab demos and v7 live-trip replay stay unchanged.

### Q1 — independent phone verification

**Own:** screenshots and a concise `docs/plans/growing-pages-verification.md` report only; report bugs to the orchestrator rather than editing another task's code. Follow the `verify` skill with a real browser at **375×812**. Reserve 5173 for the orchestrator; one UI agent at a time uses 5190 unless another explicit isolated port is assigned.

**Accept:** exercise actual touch/pointer interactions in Study, quiet doorway, Lab and revision. Extend beyond all original edges, start a second spell, pan from a filled rune with a tool and in Fair Copy mode, hold/lift normally, drag past viewport edges, navigate Fit/return to edit scale, erase without a jump, switch members, undo/reset Lab, and revise beyond 7×7/save/revert. Inspect screenshots, tap sizes, overlay alignment, shelf/ink/buttons and sheet scrolling; check no horizontal overflow or console errors. Include empty and distant sparse pages, and prove the Fit tap did not edit. Report exact screenshot paths and any browser/device-only checks unavailable. Browser work does not substitute for engine identity/charge tests.

### F1 — integration, docs and delivery

**Own:** `docs/plans/growing-pages-status.md`, `docs/plans/growing-pages-verification.md`, `DESIGN.md` §11, `docs/design/growing-pages.md` §0/status, `TECH.md` §7, `docs/ROADMAP.md`, `docs/design/README.md`; targeted integration fixes only after explicit ownership transfer.

**Accept:** review the full diff with the available code-review tool or a Medium reviewer; resolve material findings. On merged `main`, run `pnpm check` and `pnpm build`, then verify the complete growth/edit → battle/proof → doorway → Fair Copy/revision → save/reload/Lab roundtrip at 375×812 with screenshots. Every changed/new Svelte component gets Svelte MCP autofixer until clean when connected; otherwise use official Svelte docs plus project checks and explicitly report the unavailable autofixer. Do not claim phone verification when tooling cannot perform it.

Record accepted Proposals as *Proposal* defaults in the feature doc/design log, implementation choices in TECH (coordinate/shape distinction, v7→v8 migration, sparse notation, viewport/gesture ownership and measured import budgets), BL-103/BL-88 completion and any real follow-ups in ROADMAP, and final task/usage/verification state in the status file. Preserve existing references and the separate BL-43 scope. During implementation only, follow the skill's commit/push/CI verification and worktree cleanup workflow. Confirm deployment of the actual pushed commit, then hand over what can be played, checks/limitations and 2–4 questions about phone feel.

## 6. Merge gates and remaining choices

1. **Before W0:** player authorizes implementation; create/commit the status file, record usage and available tools. This plan-only round stops before that gate.
2. **Before Wave 1:** W0 is green, reviewed and merged with fixed/growing semantics, migration strategy, sparse notation grammar, safe-coordinate policy, concrete resource budgets and viewport/gesture signatures. The orchestrator tests each contract against downstream acceptance criteria. No dependent agent builds against an unmerged sketch.
3. **Before enabling UI:** E1/E2/N1/V1 contracts and save roundtrips pass. Do not expose half-integrated growing editors that cannot persist/reload their placements.
4. **Before delivery:** cross-feature regressions, phone screenshots, review, checks/build, docs/status and same-commit deployment evidence are complete. Missing tooling or material unresolved limits are recorded plainly.

The remaining contract choices are P1's exact type names, P7's decoder/migration module boundary, P8's sparse header spelling and P9's measured aggregate/work budgets. This plan supplies defaults and a mandatory W0 resolution point; it does not present them as settled player design. Margin, pitch, drag threshold, initial/empty framing and Fit-return placement remain tune-by-playing Proposals. None permits cropping work, rebasing identities or restoring a small page-area budget.
