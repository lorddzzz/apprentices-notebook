# UX districts: briefs (ready to spawn)

Plan: [ux-districts-plan.md](ux-districts-plan.md) (revised after review 2). Spawn format: [templates.md](../../.claude/skills/implement/templates.md) "Spawn prompt". Paste a brief's text into the prompt; delete it when its pack merges. Role for all: Default (Sonnet 5.5 high, Claude, `pack-worker`). Gates (`UD-G*`) and Pack Z belong to the orchestrator and are not spawned. **Order: Pack 0, then Pack 7 (the proving pass), then Packs 1–6.** Every pack owns its own pair of test files; no pack edits a shared test.

## Pack 0: Foundation

```
Pack 0 of docs/plans/ux-districts-plan.md: tasks UD-1 → UD-2 → UD-3.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UF-1, UF-6, UF-15 (staged fight-<id> fixtures); FT-4 and FT-12 on main. Read: plan §2 (Proposals 1–3, 7), §3, §4; board §7 "Tactical marks" via docs/plans/ux-board-snapshot.txt lines 391–507; pattern: tests/ui/rule-preview-layer.test.ts.
Own: src/ui/districts/index.ts (confirm FT-4's field and crestFor; add only the Underjoin crest fallback and the drawn-page blank crest registration), src/ui/districts/fixtures.ts (new), src/ui/screens/galleryDistricts.ts (new Gallery adapter), tests/ui/districtMarks/harness.ts (new), tests/ui/fixtures.test.ts (additions only: a case per district id), one skeleton file per district under tests/ui/districtMarks/<dir>.test.ts and tests/ui/districtTheme/<id>.test.ts (new; owned afterwards by that district's pack), tests/fixtures/saves/ (new files for lowerSeam and inkedPage only, only if a recipe cannot reach a state), and these 11 files for the attribute rename only: foundry/{Struck,Hung,Muffled,Halo}.svelte, inkQuarter/{ForwardRing,SentBackGhost,ThreadHighlight,ClockCount}.svelte, seam/HandTile.svelte, cartographers/{LinkMark,CircleMark}.svelte. Additive one-line edit allowed in src/ui/screens/galleryFixtures.ts (hand the recipes to the adapter); list it under Proposals.
Contract (on main):
- C1: `[data-district="<id>"]` sets --district-dark|mid|light (UF-1 writes all nine blocks as `[data-world][data-district="<id>"]`; keep that root scoping after the rename, R7/R8); `--overlay-*` is never overridden under `[data-district]` or `[data-world]`.
- C2: `artUrl(id)` returns string|null; every screen renders with zero art.
- From FT-4 (on main; R1/R2, do NOT redefine): `DistrictFightTheme { id; scene?; sceneFocal?; arena?; tiles?; tileTone?; crest? }` in components/board/fightArt.ts, `DistrictUi.fightTheme?` and `crestFor(id: DistrictId)` (disc fallback). Seam and Lampwater entries exist from FT-12.
- Two signal classes (plan Proposal 3): DECORATIVE marks: shape/pattern carries meaning, no --danger, red-hue hex, --gold (except firsts) or --overlay-* as fill, inside the mark's own cell, never over HP/intent/reach/preview; the allowlist covers these only. TACTICAL signals (real danger or a rules fact: fracture perimeter, load path, carry arrow, current/flow, pulse rings, conduction path, cloud-edge joins, erased-space danger, standing-order triggers): drawn in the shared overlay vocabulary (overlay group, --overlay-*/--danger), never a district hue, may span cells, not in any allowlist.
Owed by this pack: DISTRICT_REVIEW_RECIPES for all nine ids: { fixture: 'fight-<id>' (canals -> fight-lampwater, seam -> fight-seam), size, taps?, step? (frozen SHOWN ordinal), zeroArt, safeInsets 44/34, expected observations }, built on UF's staged sessions with the real sizes (Seam 5x6..7x8, Lampwater 5x9..7x8, Verloren Corner 6x8/6x9/7x9, Thermae 6x8..7x9, Fog Arches 5x7..7x9, Klokhof 5x7..7x9, Sestante 6x8/7x8/7x9, Underjoin 6x8/7x8, drawn page 5-7 x 6-9 incl. lent 7x7/7x8/7x9); the adapter the Gallery renders; the harness; ask UF (status Owed) to keep [data-world] scoping and report whether the nine blocks exist.

Done when:
- UD-1: per-district theme test files exist and pass; `grep -rniE 'data-district="[a-z]+:' src` is empty (case-insensitive, covers inkQuarter and CircleMark); report whether the nine [data-world][data-district] blocks exist in src/ui/theme.css (do not edit it).
- UD-2: harness passes with each current R2 offender (red hex band hue 340-20, sat > 50%; `--overlay-` fill; `--gold`) listed in ITS district's allowlist constant; a case adds a red literal in a temp string and fails; a case asserts no selector overrides --overlay-*; tactical signals are asserted to render in the overlay group and are not in any allowlist.
- UD-3: every recipe opens at 375x812 from the Gallery adapter with greyscale (UF-6) and zero art; tests/ui/fixtures.test.ts has a case per id and passes.

Verify: `pnpm exec vitest run tests/ui --reporter=dot && pnpm exec tsc --noEmit`
Phone check: no (the orchestrator checks the Gallery recipes).
```

## Template brief for Packs 1–7 (one per district)

Fill `<…>` from the table below. One pack per row; each pairs with that district's UA art pack, which touches only `src/assets/art/` and `art-src/` (no overlap). Code merges on passing zero-art evidence; the art deploys only after the readability gate passes on painted art.

```
Pack <N> (<district>) of docs/plans/ux-districts-plan.md: tasks <restyle ID> → <theme ID>.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §1 (table row for <id>), §2 (Proposals 1, 3, 4, 7), §6 checklist; board rule: "<bible rule>" (snapshot lines 415–475); pattern: src/ui/districts/<pattern>.
Own: <dir> only, plus your two test files tests/ui/districtMarks/<dir>.test.ts and tests/ui/districtTheme/<id>.test.ts (the only tests you edit). Optional additive field in another file only as the plan's Proposals allow; list under Proposals.
Contract (on main):
- DECORATIVE marks obey: shape/pattern first (hue second), no --danger, red hex, --gold except firsts, --overlay-* fills, own cell only, never over HP, intent, reach, preview. Remove this dir's rows from YOUR allowlist constant until the test passes without them.
- TACTICAL signals (<tactical list>) are drawn in the shared overlay vocabulary (overlay group, --overlay-*/--danger), never a district hue, and may span cells; keep them readable and unchanged in meaning.
- Scene chrome and art tint may read --district-dark|mid|light (C1); the overlay never does. Hex literals move to tokens or stay only as pattern ink inside a decorative mark.
- `DistrictUi.fightTheme: DistrictFightTheme` (FT-4) is set in <dir>/index.ts: { id: '<id>', scene: '<scenes id>', tiles: <per art list>, crest: Crest }. `crestFor('<id>')` returns it. Crest: a Svelte component taking { size }, vector, 96x96 viewBox, one tint + ink, readable at 24 px; the header snippet is built at the call site.
- C2: every mark and the theme render with zero art (art ids optional, fallbacks are today's shapes). Art ids belong to the owning district even when borrowed.
Owed by this pack: <theme ID>'s fightTheme entry, Crest.svelte, your theme test enabled.

Done when:
- <restyle ID>: <per-district Done when>. Evidence from DISTRICT_REVIEW_RECIPES['<id>'] (largest size and one mid size, taps/step per recipe) at 375x812: colour, greyscale and 3 px blur, zero art, in docs/plans/ux-districts-evidence/<id>-{colour,grey,blur}.png; include an overlapping adjacent pair, HP, intents and previews on the same board.
- <theme ID>: Gallery shows the crest at 24 and 96 px; the theme registers; theme test enabled; zero-art render unchanged.

Verify: `pnpm exec vitest run tests/ui/districtMarks/<dir>.test.ts tests/ui/districtTheme/<id>.test.ts <tests area> --reporter=dot && pnpm exec tsc --noEmit`
Phone check: no (the orchestrator runs the gate UD-G<k> afterwards; painted-art evidence is re-run when the UA pack lands).
Sims: not needed (no engine or rules change).
```

### Per-district differences

| Pack | District / id / dir | IDs (restyle, theme, gate) | Bible rule (quote into the brief) | Pattern file | Tactical signals | Per-district Done when | Crest | `tests` area (real paths) |
|---|---|---|---|---|---|---|---|---|
| 7 (first) | Seam + Lampwater marks / `seam`, `canals` / both dirs | UD-16, UD-17, UD-G7 | Lampwater: "Show the current with directional ripples and a crisp flow indicator." Seam: marks only | `seam/HandTile.svelte` | Lampwater current / flow indicator (FT's) | allowlist empty for both dirs; the flow indicator is directional on the `canals` board (5×9 and 7×8); proving gate passes; no crest or theme work (FT did) | none (FT) | `tests/districts/canal-floor.test.ts tests/districts/canal-ledgers.test.ts tests/districts/marginalia.test.ts` |
| 1 | Verloren Corner / `inkQuarter` / `inkQuarter/` | UD-4, UD-5, UD-G1 | "Give Return to Sender, Forwarding and Standing Order distinct stamps." | `inkQuarter/ReturnPiece.svelte` | standing-order triggers | three stamps differ by outline and glyph in greyscale; wax, clock count and sent-back ghost are decorative-clean | a stamped envelope corner, tint #A28D6D | `tests/districts/inkQuarter` |
| 2 | The Thermae / `bathhouses` / `bathhouses/` | UD-6, UD-7, UD-G2 | "Cloud edges show exactly which cells join; treatment inside the cell stays translucent … Bathers dissolve into the same cloud." | `bathhouses/BoilFx.svelte` | cloud-edge joins (FT's `SteamLayer`, read-only; R9) | a 1-cell and a 3-cell cloud have visibly different edges; a bather inside a cloud stays readable; any `SteamLayer` failure is reported to FT with a required rerun | a scalloped cloud over a mosaic tile, #5F8482 | `tests/districts/bathhouses tests/districts/bath-foes-lab.test.ts` |
| 3 | The Fog Arches / `bridges` / `bridges/` | UD-8, UD-9, UD-G3 | "Distinguish sound, chipped, cracked and collapsing stone by fracture shape and edge. Keep the load path to a pier visible." | `bridges/PierPiece.svelte` | fracture perimeter, load path, carry arrow (producer split done by FT A2b) | four span states tell apart in greyscale by outline alone; load path to a pier visible across fog; a unit on a cracked span legible | an arch over a pier cap, #596D79 | `tests/districts/bridges` |
| 4 | Klokhof / `foundry` / `foundry/` | UD-10, UD-11, UD-G4 | "Match bells by pattern as well as hue. Draw the pulses around separated bells; reserve a connected path for brass conduction." | `foundry/BellPiece.svelte` | pulse rings, brass conduction path | the three tones tell apart at 24 px in greyscale; a dashed pulse ring and a solid connected brass path differ on one board; keep `tones.ts` cues | a bell with rope, #B19060 | `tests/districts/foundry` |
| 5 | The Sestante / `cartographers` / `cartographers/` | UD-12, UD-13, UD-G5 | "Ghosted pencil, solid ink and empty erased space are three distinct reads." | `cartographers/OutlinePiece.svelte` | erased-space danger | pencil (dashed, thin), ink (solid, heavy), erased (notch, no fill) on one board, distinct in greyscale and squint | a set square over a pencil line, #768890 | `tests/districts/cartographers` |
| 6 | Underjoin + drawn / `lowerSeam`, `inkedPage` / both dirs | UD-14, UD-15, UD-15b (only if needed), UD-G6 | "Bring one borrowed material … lead toward the owner's sealed door" / "A borrowed heart keeps its visual tell." | `lowerSeam/StairSlot.svelte` | lent rules' tells (borrowed pieces/banners) | map-side pieces use the system look; fixtures `map-lower-seam`, `fight-lowerSeam`, `map-inked-pages`, `fight-inkedPage` open; with a lent shape (7×7, 7×8, 7×9) borrowed pieces keep their look and every lent rule's tell shows, else UD-15b fixes it test-first | Seam crest + dashed lower line; blank page (own component), #867A72 | `tests/districts/lower-seam-floor.test.ts tests/districts/lower-seam-door.test.ts tests/districts/lower-seam-trip.test.ts tests/districts/inkedPage tests/districts/trip-shapes-lent.test.ts tests/districts/heart-frames.test.ts` |

Pack 7 runs first, after FT-12, FT A2b and FT Pack B merged, and proves the recipe, harness and checklist before the pattern is copied. UA pairing: Pack 1 ↔ UA-20, 2 ↔ UA-21, 3 ↔ UA-22, 4 ↔ UA-23, 5 ↔ UA-24, 6 ↔ UA-25 + UA-26, 7 ↔ UA-10/UA-11/UA-13 (already landed). Pack 6's restyle and theme are one task each (UD-14, UD-15); UD-15b exists only if UD-15 finds a hidden tell.

## Pack Z (orchestrator, not spawned)

Checklist: allowlists empty; per-district tests enabled; `pnpm check`; open the Gallery recipes with greyscale on, squint (blur 3 px) for all nine, save `docs/plans/ux-districts-evidence/grid-grey.png`; one `code-review` of `src/ui/districts` and the per-district tests; one live loop per genuinely different interaction (fracture, steam, conduction/pulse, erase, stamps, lent heart); log rows; status Owed list cleared; re-run each gate when its UA art pack lands; hold any failing asset off deployable main.
