# Fight and districts — implementation review

## Summary verdict

Revise before spawning FT Pack 0 or scaling district art. Keep the square grid, high-¾ figures and one-cell rules.
The painted studies establish the look. Neither proves the layout with a nine-row board, safe areas and live rule controls.
The existing event projection and sequencer are the right foundation. The proposed firsts, numbering and input contracts disagree with the data they consume.
District code can ship with fallbacks once the placeholder board passes. Painted assets need the same check in the running fight before deployment.

## Must-fix

1. **Budget actual board space.** `ux-fight-plan.md` FT-D9, FT-5/16/21–23 and briefs A1/B/D. The four bottom rows sum to **224 px** (68 + 64 + 40 + 52), before gaps. With today's 8 px side padding and 24/100-cell SVG label gutter, width alone gives 359/6.24 = **57.5 px** or 359/7.24 = **49.6 px**. Nine rows at the minimum need **406.6 px** including the top gutter. With the planned header, caption, boss, trick and bottom rows, only **380 px** remain (812 − 64 − 40 − 76 − 28 − 224), before safe areas, district banners, gaps or the current 38 px Next-round/meter reserve. Hiding the log saves 40 px at most. Clamping the cell size creates overflow. Put a measured layout spike before A2/UA scaling. Use the available board rectangle including gutters, reserve the ≥44 px grid first, collapse optional chrome, combine boss/trick/caption space and replace the stack on results. Measure first/last hit rects, primary controls, top-row headroom and the unobscured final board in normal, tall, boss and end states with safe insets. Include keyboard/hold cell targeting; a drawing-space unit test cannot measure a tap.

   Actual fight dimensions below, counted from every authored room and variant in `src/data/districts/index.ts::DISTRICTS`, plus the runtime builders. Sizes are columns × rows.

   | District | Board sizes |
   |---|---|
   | Seam | 5×6, 6×6, 6×7, 6×8, 7×8 |
   | Lampwater | 5×9, 6×9, 7×7, 7×8 |
   | Verloren Corner | 6×8, 6×9, 7×9 |
   | Thermae | 6×8, 6×9, 7×8, 7×9 |
   | Fog Arches | 5×7, 6×6, 6×7, 6×9, 7×9 |
   | Klokhof | 5×7, 5×9, 6×7, 6×8, 7×9 |
   | Sestante | 6×8, 7×8, 7×9 |
   | Underjoin | 6×8 or 7×8, inherited from the floor's intrusion variants (`floorRoom`) |
   | Drawn page | Generator bounds 5–7 × 6–9; lent heart frames include 7×7 Marginalia, 7×8 Steward and 7×9 Lamp Mother (`drawing/generate.ts`, `drawing/frames/`) |

2. **Build one numbered presentation from real event batches.** `ux-fight-briefs.md` Pack 0/FT-1–3 and E/FT-24. `buildSteps` drops silent `trace` and `named` before timing. `named` identifies a compound/burst/idiom, whereas `witnessedIn` collects reaction **line** IDs. Several events can inherit one line. `BattleSession.dispatch` appends the whole batch and calls `onEvents` before playing it, so reading its current preview context can erase every first and the existing discovery toast can reveal the result early. Capture knowledge before append, distinguish named discoveries (`flow.newDiscoveries`, profile.named) from witnessed lines, deduplicate within the batch, and attach metadata to the appropriate visible cause once. Keep null knowledge in Lab. Preserve zero-duration projection and the final snap. Give each shown step a source log index, action boundary, text and optional anchor. Specify readout-only steps for unlocated events (phase/win), shared-cell marker collisions and one anchor for a multi-cell burst. Use that projection for the frozen fixture, field notes and board. Today's `LogSheet` groups described events by round, playback restarts per action and clears its steps at completion. Test two actions in one round, repeated lines, silent/zero tails, skip and resumed fights; skip must leave a complete log without replaying it. Grant the discovery announcement owner the timing change. No save fields.

3. **Specify speed and busy input once.** `ux-fight-plan.md` FT-D4–6, briefs 0/B/C, program C6/R5. A general change to `swallow()` also speeds up from member select, spell, Undo, confirm and End turn. Caption currently calls skip, and press/hold has its own release suppression. Route board/readout taps to acceleration, make other combat controls inert, and keep Skip as the sole jump to result during playback. Test actual handlers, rapid taps, idle taps and a held pointer crossing the end of playback. Pin one timing table: 800 ms / 2 is 400 ms, while D4 requires 250 ms. Specify ×4, mid-hold remaining time and reset on the next action. Keep device Quick and OS reduced motion independent; the existing `scale < 1` branch removes trails/slides and `FxLayer` runs its own float timers and CSS animations. Use fake time with an elapsed-time source, test natural completion/skip/replace/dispose resolving once, and check the rendered FX clear at rest. A reduced-motion screenshot alone cannot prove cross-fades. Assign the UF-11 hookup to a named owner.

4. **Make the five layers enforce tactical meaning under overlap.** `ux-fight-briefs.md` A1/A2/C/D and `ux-districts-briefs.md` UD-2/6/8. `BridgeLayer`'s single “under” slot mixes nearly opaque fog with lethal crack outlines and carry arrows. Moving that slot wholesale above figures hides units; leaving it below hides danger. Separate surfaces/pieces, silhouettes and invariant signals at their producers. Preserve the enemy telegraph/order pills in `StepLayer` independently of playback markers. Give HP, side rim, intent, target outline and masked party harm fixed readable positions; reserve plate/ground cues outside foot and shadow coverage. Gate a vertically adjacent pair, a top-edge boss, an occupied jar/cloud/material and overlapping reach/intent/cast on a real 44–50 px cell. Check colour, greyscale and 3 px blur with and without art; identify the threatened cell, harmed party member, figure side, HP and underlying tile. Keep hit rects above all artwork and demonstrate adjacent taps. Limit UD's cell-local colour rule to decorative marks. Preserve multi-cell safety signals (fracture perimeter, load path, carry arrow), using shared tactical ink for genuine danger. A red-literal scan cannot prove geometry, shape or computed contrast.

5. **Bind art to real IDs and mounts.** `ux-fight-plan.md` FT-4/8/12/22, `ux-districts-plan.md` UD-14/15 and UA-20–26. `BoardView` carries no district ID; FT's plan mentions a kit prop but A1 only adds markers/beat. Specify who passes district/arena from Combat through BattleView to BattleBoard, and defaults for Lab, Gallery and UT's read-only board. Key foe/prop art by owning definition even when borrowed. For example, `deadLetter` must resolve to `foes/inkQuarter/dead-letter` on a drawn page. Specify shared-material lookup, floor variants, stateful district art and SVG `<image href={artUrl(...)}>` fallback; a boolean asset-exists test misses unused drops. Wire Underjoin and drawn-page scenes/floors actually commissioned by UA-25/26, with the proposed Seam tint as fallback. Explicitly size **mother and marginalia** as large art. Several named rivals also have `boss: true`, while Lamplighter needs a rival header independently of that flag. Verify one true boss and both kinds of rival, arena selection, legal cell outline and a neighbouring target under the painting. Only expose rival-sheet content the existing inspection rules permit.

6. **Assign the missing integration work.** `ux-fight-briefs.md` B–E and UT-4/7/8. B owns the parent screens, while C owns leaf views, D needs to move the end panel out of the board wrapper and pass summary/inspection data, and E owns only new pocket files. A header callback alone never opens a sheet. Have B mount typed stubs and wire handlers, or grant sequential parent edits to each consumer. Include a mounted BeatCard, markers, an actually read-only UT board (today `ontap` is required and cells are focusable), and preserve Lab's top slot, continue action and log. Specify a pocket controller with open/close, selected seats/pages, available log scope and discovery-filtered Codex data for each host. A plain search over all data leaks unseen names. `resolveScreen` selects Study field mode only when the trip is in `doorway`; a Study hash cannot create that permission. Link only through an already legal doorway path, using its draft/Done lifecycle. Test close/back, empty logs outside combat, reload and zero mutation from browsing. Assign a UT follow-up if the temporary Codex link ships before FT-24.

7. **Give district verification runnable inputs and disjoint owners.** `ux-districts-briefs.md` Packs 0–7/Z, `ux-fight-briefs.md` A1 and UF-15. A UF-4 seed fight cannot satisfy wide, compound, boss or district checks. A plain `BoardView` builder cannot exercise cast previews, busy FX, meters, borrowed banners or trip context. Provide deterministic staged fight sessions or explicit view + overlay + context + FX recipes; pin taps/actions, frozen **shown** ordinal, zero-art switch, safe areas and expected observations. Map `canals` to fixture `fight-lampwater`. Use the curated fixtures as soon as FT-3/UF-15 are available, shorten the A1 prerequisite by providing its wide fixture early. UD-3 needs ownership of `tests/ui/fixtures.test.ts` and the Gallery renderer/adapter; a spread into `galleryFixtures.ts` alone has no consumer contract. All parallel UD packs currently edit the same two tests despite “dir only”. Put expectations/exceptions in district-specific files or let the integrator remove exceptions and enable tests per merge. Run the grep for R7 across **11** components including `cartographers/CircleMark.svelte`; its lowercase-only pattern also misses `inkQuarter`. Keep UF's root selector. Schedule a proving pass for Seam/Lampwater as soon as FT A2, B and the fixtures land, before copying the pattern. Each later district can merge on passing fallback evidence. Hold any failing UA asset off deployable main until its composite passes; repeat when either side changes. Assign R9 failures back to FT with a required rerun.

## Should-fix

- **FT-13–16.** Keep `chooseSpell`, legal target selection, Shove/basic and Undo in the session. Test single usable spell among multiple known ones, spent charges and switching during confirm through the real handler. Retain one primary per input state and the existing end-turn arming safeguard. Check that dimmed party status reflects the shown step where it exposes HP or outcome.
- **FT-21/23.** Define “carried”, “firsts” and “what decided it” from information available *before* `finishBattle`; omit absent sections. Use the real next action for win, loss and Lab. “Home” on loss currently leads to Wiped. Keep the control label honest and exercise the whole transition once.
- **UD-15.** Exact-district banner filtering is known. Include a lent heart whose rule needs a visible tell; establish the current source of the tell. If the redesign hides an existing warning, make fixing and retesting its presentation an owned task. Keep unrelated existing content gaps in the backlog.
- **Brief hygiene.** Mark new components and tests explicitly, including FT-4 art-ID/crest tests missing from Owns. Replace UD template test paths with real files (e.g. `tests/districts/lower-seam-floor.test.ts`; no `tests/districts/lower-seam/`). Verify rendered structure/target sizes in a browser or server-render markup as appropriate; the Vitest config supplies no browser layout. Add `battleInput` to Pack 0's actual Verify command.

## Decision verdicts

| Decision ID | Agree/disagree | Reason | Suggested change |
|---|---|---|---|
| FT-D1 | Agree | Pure projection and injected-clock tests catch presentation errors before UI work. | Start from emitted engine batches and existing projection tests. |
| FT-D2 | Disagree | Named and witnessed IDs have different meanings; post-append knowledge includes the action under review. | Snapshot both before dispatch and deduplicate. |
| FT-D3 | Agree | Visible beats make useful ordinals. | Index source events and define action-scoped history and unlocated beats. |
| FT-D4 | Agree | A stray tap can accelerate without losing the chain. | Board/readout only; label Skip and test real inputs. |
| FT-D5 | Agree | A short hold can explain a burst. | One hold per cause; define rate precedence and test FX cutoff. |
| FT-D6 | Agree | Device preference needs no save migration. | Consume UF's stub where possible; separate speed from motion suppression. |
| FT-D7 / R2 | Agree | One optional district entry supports art-free and borrowed boards. | Type the subject/lookup order, asset aliases and context for every caller. |
| FT-D8 / R13 / UA-D3 | Agree | Oversized paintings fit existing targeting and movement. | Key dimensions by asset ID; reserve headroom at edges. |
| FT-D9 | Disagree | Fixed row sums and gutter/safe-area math invalidate guaranteed cell sizes. | Accept measured minima against the size matrix. |
| FT-D10 | Agree | Row ordering gives depth while a single top overlay preserves threats. | Test stacked units, ground marks, pips and rim contrast at minimum size. |
| FT-D11 / R3 | Agree | A shared inspection sheet can reuse UH-3. | Wire host and knowledge filters; give UT a stable early API. |
| FT-D12 | Agree | Vector FX and one hero frame can carry the meaning when strips fail. | Check composited effects at ×4 and during Skip. |
| FT-D13 | Agree | Timing and projection warrant the experienced implementer. | Move independent art contracts/stubs out of the timing pack. |
| UD-D1 | Agree | FT defines the type once and districts supply entries locally. | Pin borrowed-asset precedence. |
| UD-D2 | Disagree as written | Shape-first is sound; a blanket ink/geometry ban removes real district danger cues. | Split decorative marks from shared tactical signals. |
| UD-D3 | Agree | The orchestrator can gate fallback and painted composites without a player round. | Make painted failure block the asset merge. |
| UD-D4 / R16 | Agree | One vector scales from header to credits. | Return a component and adapt it to the header snippet at the call site; own both proving crests. |
| UD-D5 | Agree | Evidence per district makes the gate repeatable. | Align the IDs: proposal 5 describes the gate already called UD-D3. |
| UD-D6 | Agree | A lent rule needs its original visual tell. | Resolve blank-page versus Seam crest wording and consume UA-26's scene. |
| R7 | Agree | Root and mark attributes have different purposes. | Include the eleventh file and mixed-case IDs. Label rename as proposal 2, distinct from UD-D2's public mark-rules ID. |
| R8 | Agree | UF owns theme.css and the nine palettes. | Retain root scoping even after the rename. |
| R9 | Agree | Steam connectivity belongs to one shared renderer. | Test three joined cells, an isolated cell and a bather during FT A2. |
| R17 | Agree | Inspecting a lattice must preserve its state everywhere. | Offer field editing only at a legal doorway; no quiet-room shortcut in a fight. |
| Program D1–3, D6 | Agree | Placeholders, the early fight and anchor review limit asset rework. | Prove the smallest composited board before mass generation. |
| Program D7–9 / R5 | Agree | Motion is local; tactics and simulation stay invariant. | Test computed overlay colours and speed/reduced-motion combinations. |
| R1 / R6 / R18 | Agree | Ordered grants and deterministic fixture entry points support independent packs. | Add parent wiring grants and define a frozen step by visible ordinal. |

## Cuts/simplifications

- Keep one event projection, one timer and one marker sequence. Reuse the pocket Log for the footer when available; avoid building a second numbered history or persisting it in the save.
- Split FT Pack 0 into a playback/firsts pack and a small independent art/prop contract pack. A2 covers figure replacement plus roughly a dozen layer files; separate figure/HP work from district-slot migration with one BattleBoard owner. UD packs of two district tasks are otherwise a reasonable size.
- Use a shared parameterized district checklist, one colour/grey/blur evidence set per distinct candidate and one live loop per genuinely different interaction. Drop nine duplicate end-to-end excursions and duplicate UA/UD screenshots of identical states.

## Questions only the player can answer

- At the optional fight-feel playtest, does ×4 still let you follow the cause of a hit, or is ×2 the useful cap? Keep ×2 then ×4 until tried.
- At anchor approval, do the portrait and silhouettes still feel like these apprentices after fitting them inside the measured overlap budget? Layout feasibility and tactical legibility are implementation gates.
