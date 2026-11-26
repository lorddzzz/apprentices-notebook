# UX fight (FT): pack briefs

Ready to spawn as written (format: `.claude/skills/implement/templates.md`). Plan: [ux-fight-plan.md](ux-fight-plan.md) (revised after review 2). Delete each brief when its pack merges. Every brief: Base commit `<main at spawn>`; Budget 90 min pack, 30 min per command. Svelte packs run the Svelte autofixer on each new or changed component until clean. Names below are `FT-D<n>` = the plan's Proposals. "New" marks new files and tests. Each phone-check pack uses its own port (5191–5197, FT only; other programs pick theirs).

---
## Pack 0: Playback logic, firsts and input (Strong: Opus high; Claude)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D1–D6), §4; `src/app/playback.ts`, `playback.svelte.ts`, `timing.ts`, `battle.svelte.ts` (`dispatch`, `swallow`, `onEvents`, the discovery announcement); `tests/app/playback.test.ts` (fake clock), `tests/app/battleInput.test.ts`.
Own: `src/app/beats.ts` (new), `src/app/playback.ts`, `src/app/playback.svelte.ts`, `src/app/timing.ts`, `src/app/fx.ts` (additive only), `src/app/battle.svelte.ts` (additive getters, knowledge snapshot in `dispatch`, discovery-announcement timing, `swallow` routing), `tests/app/beats.test.ts` (new), `tests/app/playbackControl.test.ts` (new), `tests/app/playback.test.ts`, `tests/app/battleInput.test.ts` (only for FT-D4 routing; a changed expectation is a Proposal).
Does NOT own (Pack 0b does): `fightArt.ts`, `districts/index.ts`, the component stubs.
Contract (C6, quoted): "The chain readout, numbered step markers, held beats for bursts, compounds and firsts, tap to speed up, Skip to result, reduced motion = cross-fades only. Timings come from `--dur-*` / a TS mirror scaled by the Motion pref (`normal|quick`, a device pref in localStorage, not in the save)."
Invariants:
- One projection `projectBatch(start, events, knowledge, scale)` over the emitted engine batches feeds markers, readout, the log and gold firsts. `buildSteps(start, events, scale, lead)` keeps its signature (new fields only). Start from the existing projection tests.
- Knowledge is snapshotted **before** `dispatch` appends the batch: `{ named, witnessed | null }`. `named` = compound/burst/idiom discoveries (`flow.newDiscoveries`, `profile.named`); `witnessed` = reaction **line** ids. A first is de-duplicated within the batch (one per id, on the first visible cause). `witnessed == null` (Lab) → no firsts. The discovery toast fires when its step is shown, never early.
- Each shown step (`ms > 0`; silent `trace`/`named` and zero-ms events fold into the next shown one) has `n` (from 1, per action), `srcIndex`, `actionId`, `text`, optional `anchor` and `first[]`. Events with no cell (phase, win) = readout-only steps. Two steps on one cell stack; a multi-cell burst has one anchor. Marker order equals log order. Skip leaves a complete log without replay; a resumed fight has a log and no markers. Zero-duration projection and the final snap are preserved. No save fields.
- Timing table (scale 1): ordinary `STEP_MS`; hold 800 ms; at ×2 the hold is **250 ms** (not 800/2), ordinary halves; at ×4 hold 100 ms, ordinary quarter; reduced-motion hold = 300 ms cross-fade (speed does not shorten it); mid-hold remaining = `min(remaining, table)`; never lengthens; speed resets at the next `dispatch`. Quick (`motionScale()` 0.5) and OS reduced motion are independent inputs.
- Busy input: board/readout taps → `speedUp()`; member select, spell, Undo, confirm, End turn are inert while busy; Skip is the only jump to result; the caption no longer skips; a pointer held across the end of playback is released without activating; enemy-turn playback follows the same table; end overlay: board inert. `onDone` resolves once on completion, skip, replace and dispose (fake clock with an elapsed-time source). `Playback` exposes `readout {n,total,text}|null`, `markers {n,at,first}[]`, `beat {kind,name,first}|null`, `dimmed`, `speedUp()`, `skip()`, `freezeAt(shownOrdinal)` (dev only, reads `router.params.get('step')`). `BattleSession` adds `readout`, `markers`, `beat`, `logLine`.
- `motionScale()` in `timing.ts` is a stand-in until UF-11 merges (R5); FT-3b (a later dispatch of this pack's owner) switches it.
Owed by this pack: `motionScale()` hookup point and the FT-3b task; `freezeAt` for UF-15's `fight-chain`/beat fixtures; the projection exported for the pocket Log (FT-24).

Done when:
- FT-1: tests `beat classifies burst compound first ordinary`, `snapshot is taken before dispatch appends`, `named discovery and witnessed line are distinct`, `a line inherited by several events is one first`, `null witnessed means no firsts`, `shown steps numbered from 1 skipping 0 ms`, `readout-only step for phase and win`, `shared cell stacks markers`, `multi-cell burst has one anchor`, `marker order equals log order`, `two actions in one round number separately`, `skip leaves a complete log without replay`, `resumed fight has a log and no markers`, `discovery toast fires when its step shows`.
- FT-2: tests `burst holds 800 ms`, `×2 hold is 250 ms`, `×4 hold is 100 ms`, `mid-hold remaining never lengthens`, `speed resets on next action`, `reduced motion holds 300 ms cross-fade`, `Quick halves time and reduced motion removes trails independently`, `natural completion skip replace dispose resolve once`, `skip during a hold fires onDone once`, `FX cleared at rest`.
- FT-3: tests through the real handlers: `board tap speeds up, other controls inert, Skip finishes`, `rapid taps cap at ×4`, `idle tap does nothing`, `held pointer across the end of playback does not activate`, `taps during the enemy turn`, `taps during the end overlay`, `logLine follows the shown step`, `no readout when idle`; existing `playback.test.ts`, `fx.test.ts` pass unchanged.
- FT-3b (later, when UF-11 is on main): the speed × motion matrix passes on the real pref.

Verify: `pnpm exec vitest run tests/app/beats.test.ts tests/app/playback.test.ts tests/app/playbackControl.test.ts tests/app/fx.test.ts tests/app/battleInput.test.ts --reporter=dot`
Phone check: no (logic only; the orchestrator checks with Pack C).

---
## Pack 0b: Art and prop contract (Default: Sonnet high; Claude; parallel to Pack 0)

Base commit: <main at spawn>. Budget: 60 min pack, 30 min per command.

Read: plan §2 (FT-D7, FT-D8); `src/ui/districts/index.ts`; `src/data/enemies.ts` (`ENEMY_IDS`, `boss`), the rivals table (`RIVALS`); UF-2's enemy-id → art-id mapping in `src/ui/art/` (Consumes: `enemyArtId`).
Own: `src/ui/components/board/fightArt.ts` (new), `src/ui/districts/index.ts` (additive only, R1: `fightTheme?: DistrictFightTheme`, `crestFor(id)`), stubs `src/ui/components/board/StepMarkerLayer.svelte`, `src/ui/components/battle/Readout.svelte`, `src/ui/components/battle/BeatCard.svelte` (render nothing, typed props named in the plan), `tests/ui/fightArt.test.ts` (new), `tests/ui/crest.test.ts` (new).
Contract: `DistrictFightTheme { id; scene?; sceneFocal?; arena?; tiles?; tileTone?; crest? }` is defined HERE and is the only district theming type; `FIGHT_KITS` is a lookup over `DISTRICT_UI[id].fightTheme` (R2). Art keyed by **owning definition** even when borrowed (`deadLetter` → `foes/inkQuarter/dead-letter` on a drawn page); lookup: owning district → shared → vector. `figureSize(assetId)`: true bosses 192×256 (feet y = 232), rivals (RIVALS membership, including boss-flagged rivals and Lamplighter) 128×176, mother and marginalia large. Typed context for callers: `{ district?: DistrictId; arena?: boolean }`; defaults for Lab, Gallery and UT's read-only board documented in the file. Documents the shape for UD.
Done when: tests `fightArtIds builds convention ids`, `borrowed foe resolves its owning district`, `figureSize by asset id`, `rival kind from RIVALS not boss flag`, `crestFor falls back to a disc`; `DistrictUi.fightTheme` compiles with districts untouched; stubs import cleanly; `pnpm exec tsc --noEmit` clean.
Verify: `pnpm exec vitest run tests/ui/fightArt.test.ts tests/ui/crest.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: no.

---
## Pack A1: Layout spike, scene, tiles, five-layer skeleton (Default: Sonnet high; Claude)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: Pack 0b (FT-4), UF-1…UF-4, UF's early `fight-wide-7x9` fixture. Read: plan §2 (FT-D7, D9, D10, D15), §3; board §6 "Fight (main state)" in `docs/plans/ux-board-snapshot.txt`; `docs/design/art-studies/seam-v2.png`; pattern: `src/ui/components/board/TileLayer.svelte`.
Own: `components/board/BattleBoard.svelte`, `TileLayer.svelte`, `SceneLayer.svelte` (new), `geometry.ts`, `art.ts`, `label.ts`, `tests/ui/geometry.test.ts`, `tests/ui/boardLayout.test.ts` (new).
Contract: C2 "`<ArtImage id fallback>` renders the art or the fallback snippet. Every screen must render correctly with zero art present." **Layout budget (FT-D9, program R20):** at 375×812 (734 px after 44/34 safe areas) a 7×9 board keeps ≥ 44 px cells; header 56 (boss/rival name, HP, rule folded into a second line); intent caption and trick banner overlay the board's top edge; bottom stack ≤ 200 (party 56, spell/action 56, one row of log icon + Skip + End turn 52, gaps); at 375×667 cells may drop to 38 px visual, the whole cell stays the hit target. `boardLayout(cols, rows, availW, availH)` uses the available rectangle including gutters and never clamps up. `BattleBoard` props unchanged, additive: `markers`, `beat`, `kit`, `readonly`. `readonly` = no `ontap`, no hit rects, cells not focusable (UT "See it", Lab placeholder). Hit rects one cell each, above all artwork. Layers: scene, tiles, units, overlay, fx, each a `<g data-layer="…">`; the `StepMarkerLayer` stub sits in the overlay group; the board scrim (30%) covers scene+tiles+units, never overlay or markers. District `boardLayers` keep their `under`/`badges` slots.
Task order: **FT-5s first (a gate)**, then FT-5…FT-8.
Done when:
- FT-5s: a measured table (committed in the pack's log) for every size in the plan's matrix at 375×812 with 44/34 insets and 375×667: first/last cell hit rects, primary control rects, top-row headroom, final board unobscured, in normal, tall, boss and end states; keyboard/hold targeting works. The orchestrator signs it before A2a or any UA scaling starts.
- FT-5: tests `7x9 at 375x812 is at least 44 px`, `matrix sizes never overflow`, `never clamps above the available rect`, `lap is a third of a cell`.
- FT-6: `fight-seam`, `fight-lampwater` render with zero art (scene wash fallback); screenshot.
- FT-7: all materials distinguishable in greyscale on `fight-seam` and `fight-wide-7x9` (screenshot pair).
- FT-8: existing board tests unchanged; DOM tests `layers appear in order scene<tiles<units<overlay<fx` and `readonly renders no hit rects and no focusable cells`.

Verify: `pnpm exec vitest run tests/ui --reporter=dot`
Phone check: yes, port 5191 (new layout rule; this is the spike).

---
## Pack A2a: Figures and HP pips (Default: Sonnet high; Claude; after A1 and FT-5s)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D8, D10), §3; board §7 "Combat camera and layers" in the snapshot; pattern: `UnitToken.svelte` (vector tokens become the fallback).
Own: `UnitToken.svelte` → `UnitFigure.svelte`, `PieceLayer.svelte`, `PieceGlyph.svelte`, the units block of `BattleBoard.svelte` (sole owner of that block), `tests/ui/fightFigures.test.ts` (new); old token tests only for renames.
Contract (quoted): C4 "unit and foe figures on a 128×176 transparent canvas, feet at a fixed baseline (y = 160) so they lap ~1/3 cell into the row above". Figures sorted by (y, x); art via `enemyArtId`/`figureSize` (Pack 0b); drawn with `<image href={artUrl(id)}>` when present, else the vector; HP pips under the foot in the overlay group at a fixed position; rim: party in apprentice hue, foes dark; hit rects stay above all art; `unitArt`/`ghostArt` of districts still work with the same `UnitArtProps`.
Done when:
- FT-9: `fight-seam` and `fight-wide-7x9`: figures lap the row above, each cell one hit target above the art, adjacent-cell taps land on their own cells (colour + greyscale pair); a test asserts the rendered `<image>` hrefs for a fixture.
- FT-10: HP of 6, 8 and 10+ readable at the minimum cell; selection ring visible in greyscale.

Verify: `pnpm exec vitest run tests/ui --reporter=dot`
Phone check: yes, port 5192.

---
## Pack A2b: Flat overlay and district-slot migration (Default: Sonnet high; Claude; after A2a merges)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D10), R9; board §7 "Tactical marks"; pattern: `HighlightLayer.svelte`.
Own: `HighlightLayer`, `IntentLayer`, `MarksLayer`, `StepLayer` (enemy telegraph/order pills stay independent of playback markers), `RivalMarks`, `BadgeLayer`, `JarLayer`, `SteamLayer`, `RulePreviewLayer`, `RuleMeter`, `src/ui/districts/{seam,canals}/index.ts` (FT-12 entries), `src/ui/districts/bridges/BridgeLayer.svelte` (by grant, producer side only: split surface pieces below figures from tactical signals — fracture perimeter, load path, carry arrow — in the overlay group; UD restyles later), an additive `BattleBoard.svelte` grant for the overlay and district-slot blocks, `tests/ui/fightOverlay.test.ts` (new), `tests/ui/overlapGate.test.ts` (new).
Contract (quoted): board §7 "Red arrows show danger. Dots mark reach. An outline marks the cast preview … Always show party harm in previews." C1 "Overlay tokens `--overlay-*` are never overridden under `[data-district]` or `[data-world]`". Fixed positions: HP under foot, side rim on the edge, intent above the head, target outline on the cell edge, masked party harm in a corner; plate/ground cues outside foot and shadow coverage. Masked previews never disclose.
Done when:
- FT-11: tests `overlay layers reference no district or world token` (file scan), a rendered computed-colour check on the fixture for tint or dim filters on a parent of the overlay, `preview shows party harm when masked`, `telegraph pills survive playback markers`; aim and confirm screenshots.
- FT-12: `fight-seam`, `fight-lampwater` render with and without art; district `unitArt` foes still draw.
- FT-12g (gate, orchestrator reviews): colour + greyscale + 3 px blur pairs, art and zero art, for: a vertically adjacent pair, a top-edge boss, an occupied jar / cloud / material, overlapping reach/intent/cast; the threatened cell, the harmed party member, the figure's side, HP and the underlying tile are identifiable; Thermae steam on three joined cells, an isolated cell and a bather (R9: failures come back to this pack with a required rerun).

Verify: `pnpm exec vitest run tests/ui tests/districts --reporter=dot`
Phone check: yes, port 5193.

---
## Pack B: Fight header, bottom stack and parent wiring (Default: Sonnet high; Claude; may run beside A1)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D9, D14), §5 Pack B; seam-v2.png and lampwater-v2.png; pattern: `PartyStrip.svelte`.
Own: `src/ui/screens/Combat.svelte`, `src/ui/components/battle/{BattleView,TopBar,FightHeader,Caption,PartyStrip,ActionBar,SpellSheet,Footer,LogLine,LogSheet}.svelte` (FightHeader, SpellSheet, LogLine new), `src/app/spellChip.ts` (new), `tests/app/spellChip.test.ts` (new), `tests/ui/battleView.test.ts` (new, server-render of the Combat and Lab hosts).
Depends on: FT Pack 0, Pack 0b, UF-3 and UF-8…UF-10, UF-12 (stubs suffice). Contract (quoted): C7 "`AppHeader` (world, title, back or crest, subtitle, right slot for icons, ⋯ always last), `ActionButton` (`primary|secondary|quiet`, one primary per screen), `Sheet` (existing API kept, restyled)". Layout (FT-D9): header 56 with crest (`crestFor(district)` snippet), district, "Round n · Room i/N", a **second line** carrying boss/rival name, HP and rule when present (Pack D fills its content), notebook icon (a real `onpocket` handler toggling the pocket controller), ⋯, no back; intent caption overlaying the board's top edge; stack ≤ 200: party 56, spell/action row 56, bottom row 52 (log icon button → LogSheet as field notes, Skip, End turn / Cast confirm), gaps. `BattleView` keeps its props (`session`, `top`, `continueLabel`, `oncontinue`, `slots`) and gains optional `district`, `arena`, `summary`, `inspection` so Lab compiles unchanged; Lab's top slot, continue action and log keep working. **Parent wiring (FT-D14), owned here:** mount typed stubs (`Readout` in the caption slot while `session.busy`, `BeatCard`, markers via `BattleBoard` props, `EndOverlay` with its props, the pocket slot), pass `district`/`arena` Combat → BattleView → BattleBoard, and wire the busy-input table (FT-D4: board/readout taps → `speedUp()`, other controls inert, Skip). Spell chip: `chooseSpell`, legal target selection, Shove/basic and Undo stay in the session; one usable spell arms on tap, several open `SpellSheet` (rune chain, charges); choosing another or switching during confirm clears the old preview. Confirm names the spell and warns when the party would be hurt (`hurtsParty`); the end-turn arming safeguard is kept. Dimmed party status reflects the **shown** step where it exposes HP or outcome.
Owed by this pack: the wiring above (leaf packs C, D, E edit leaves only); `onpocket` handler; test ids kept.
Done when:
- FT-13 (tests through the real handler): `single spell arms on tap`, `one usable among several known arms directly`, `two usable spells open the sheet`, `spent charges cannot arm`, `choosing another clears the old preview`, `switching during confirm clears it`, `unusable spell cannot arm`.
- FT-14: header matches seam-v2 on `fight-seam`; Lab fixture still renders.
- FT-15: `fight-lampwater` three party cards with status; spell sheet open; all taps ≥ 44 px.
- FT-16: stack ≤ 200 px at 375×812; states idle, aiming, confirm with party-harm warning, busy with Skip (screenshots, colour + greyscale).
- FT-16w: `tests/ui/battleView.test.ts` renders Combat and Lab hosts with every stub mounted; stub props type-check.

Verify: `pnpm exec vitest run tests/app/spellChip.test.ts tests/app/battleInput.test.ts tests/ui/battleView.test.ts --reporter=dot`
Phone check: yes, port 5194.

---
## Pack C: Chain playback presentation (Default: Sonnet high, escalate Opus high; Claude; after FT Pack 0, A1, B) — leaf files only

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D4, D5, D12), board "Fight during a chain" in the snapshot; Pack 0's `Playback` API; pattern: `StepLayer.svelte`.
Own: `components/board/StepMarkerLayer.svelte`, `FxLayer.svelte`, `components/battle/Readout.svelte`, `BeatCard.svelte`, `tests/ui/playbackView.test.ts` (new). Does not edit `Combat.svelte` or `BattleView` (Pack B mounted the stubs).
Contract (quoted): C6 as in Pack 0; C7 "`StepMarker` (number, gold variant)". Ordinary steps per `STEP_MS`; bursts, compounds and firsts hold once per cause (800 ms, 250 ms at ×2): board dims 30%, name card, gold for firsts. "Party and spells dim: no input but speed-up. Tap the board = faster; Skip = the result." Reduced motion: markers cross-fade, no flourish, no trails; the hold is a 300 ms cross-fade card. Markers: log order, stacked on a shared cell, one anchor per multi-cell burst, fade at the end; never cover layer 4 at rest. `FxLayer`'s own timers and CSS animations run on the shared scale and are cleared at rest. Flourish ids `props/shared/flourish-{burst,compound,name-flare,first-gold}` and FX strips `props/shared/fx-{fire,steam,spark,brass-ring,oil-catch,ink-splash,impact,shield-pulse}` (UA-12; four frames or one hero frame) with vector fallback.
Done when:
- FT-17: test `markers render in log order`; `fight-chain` frozen at shown ordinal 3 shows 1–3.
- FT-18: readout "Step n of N · cause" visible, readout-only steps handled; log line writes each step.
- FT-19: `fight-burst-beat`, `fight-first-beat` (gold) screenshots; tap speeds, other controls inert, Skip finishes (phone check).
- FT-20: rendered-FX-clear test; reduced-motion run with no trails or flourish; composited effects checked at ×4 and during Skip; one full chain played and skipped at 375×812.

Verify: `pnpm exec vitest run tests/ui/playbackView.test.ts tests/app --reporter=dot`
Phone check: yes, port 5195.

---
## Pack D: Boss, rival, trick, end overlay (Default: Sonnet high; Claude; after B and A2a/A2b) — leaves plus sequential grants

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (FT-D8, D14); board "Fight: boss / rival + end overlay"; pattern: `RivalSheet.svelte`.
Own: `components/battle/{BossHeader,TrickBanner,RivalSheet,EndOverlay}.svelte`, `components/board/UnitFigure.svelte` (boss size only, granted), **grant on `BattleView.svelte`** (after B: move the end panel out of the board wrapper, pass `summary` and `inspection`), `tests/ui/bossLayout.test.ts` (new).
Contract: the boss/rival name, HP and rule live in the header's **second line** (no 76 px band, FT-D9); the trick banner overlays the board's top edge (no reserved height); tap = rival sheet showing only content the existing inspection rules permit. Header kind comes from `RIVALS` membership, not `boss` (boss-flagged rivals and Lamplighter get the rival header). True bosses (not rivals) draw from the 192×256 canvas (feet y = 232) at cell/128, 1.5 × 2 cells, visual only, anchored to the one engine cell outlined by the overlay; headroom reserved at the top edge; rivals use 128×176; mother and marginalia sized as large art. End overlay replaces the bottom stack (`end-overlay`, `continue` ids kept); final board 100% visible; result, one field-note line, carried, firsts in gold, what decided it — **each derived from information available before `finishBattle`, omitted when absent**; the primary label names the real next action (win, loss, Lab); a loss that leads to Wiped does not say "Home".
Owed by this pack: arena variant (`fightTheme.arena`) for the Seam/Lampwater bosses.
Done when: FT-21 `fight-boss`, `fight-rival` (a boss-flagged rival and Lamplighter show the rival header); FT-22 boss cell outline visible, a neighbour under the painting tappable, top-edge boss not clipped; FT-23 `fight-won`, `fight-lost` and a Lab ending with the board fully visible, plus one whole end → next-screen transition exercised; all in colour + greyscale.

Verify: `pnpm exec vitest run tests/ui tests/rivals --reporter=dot`
Phone check: yes, port 5196.

---
## Pack E: Pocket notebook sheet (Default: Sonnet high; Claude; after B and UF-10; FT-25 after UH-3)

Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: Pack B (FT-16w); UF-10 (Sheet); UH-3 for FT-25 (R3: do not start FT-25 before UH-3's `readonly` is on main; FT-24 and FT-26 may proceed); FT-27 after Pack D. Read: plan §2 (FT-D11, D14); board "Pocket notebook sheet"; `src/ui/attach/latticePan.ts`; `resolveScreen` (doorway); pattern: `LogSheet.svelte`.
Own: `src/ui/components/pocket/*` (new: `PocketButton`, `PocketSheet`, `PocketController`/`pocketController.svelte.ts`, tabs), `tests/ui/pocket.test.ts` (new), `tests/app/pocketController.test.ts` (new); FT-27 grants: the pocket mount in `Combat.svelte`/`BattleView` (sequential after B and D) and the field-mode header of `Study.svelte` (UH grant, see the plan's Owed).
Contract: "One sheet from any trip screen (header icon). Sheet 86% tall, handle, ✕; the screen behind stays visible and unchanged." Pinned API (FT-D11): `PocketButton({ onclick, label? })`; `PocketSheet({ controller, context: 'fight'|'trip'|'field', primaryLabel, source: PocketSource, doorway?: { open } | null, onclose })`; `PocketSource = { party, pages, log | null, known: DiscoveryFilter }`; controller keeps its own view memory per page, separate from the Study's. Lattices: UH-3's `readonly` threaded Editor → Grid → Viewport (tap, hold/lift, Erase, keyboard blocked; seat tabs, page nav, pan, Fit allowed; the real gestures in `latticePan.ts`: one pointer pans, a second cancels). Quiet doorway: the pocket opens/closes without leaving the trip, banking, resetting the draft or bypassing Done; "Open in the Study" only when `doorway` is non-null, via the existing route and its draft/Done lifecycle. Log: field notes by action, newest first, from the single projection, numbers match markers; `null` log outside combat shows "Nothing yet". Codex: search + recent over `known` only (no unseen name leaks), unseen = UF `Unseen`; UH-8 entries if merged, else a filtered `$data` list.
Owed by this pack: export documented for UT's **integration task** (UT mounts on UT-4/7/8 after this merges; no temporary link as final delivery) and for the field header.
Done when: FT-24 fixture `pocket-sheet`, tests `log numbers match step markers`, `close and back`, `empty log outside combat`, `reload keeps nothing in the save`; FT-25 tests `read-only in a fight (tap, hold, Erase, keyboard do nothing)`, `quiet doorway opens and closes without banking or draft reset`, `no Open in the Study outside a doorway`, `browsing causes zero mutation`, lattice fits 351 px; FT-26 test `unseen names never appear in search`, opens from the fight header; FT-27 the sheet opens from `fight-seam` and from the doorway fixture.

Verify: `pnpm exec vitest run tests/ui/pocket.test.ts tests/app/pocketController.test.ts --reporter=dot`
Phone check: yes, port 5197.
