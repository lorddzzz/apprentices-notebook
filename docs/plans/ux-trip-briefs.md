# UX trip briefs (UT)

Spawn briefs for [ux-trip-plan.md](ux-trip-plan.md), in the `implement` skill's "Spawn prompt" format. Paste the text into the `pack-worker` prompt. Fill `<main at spawn>` at spawn time. Review 3 resolutions are copied into the briefs. Dev ports for UT: **5193–5194** (UH 5191–5192, UE 5195–5196). Fixture ids are UF's only; states in a transient store (`game.found`, `threshold.solved`, `game.wipe`) use UF recipes named in the plan §4 (status Owed), and UF-14/UF-15 are verification dependencies. Fixtures load a memory save and lose it on refresh: reload checks use a persisted test save in an isolated browser. Standing rules: every existing `data-testid` on these screens stays; Svelte 5 runes only; run the Svelte autofixer on each changed component; the screen renders with zero art (C2).

## Pack A: Trip views (UT-1 → UT-2 → UT-3)

```
Pack A of docs/plans/ux-trip-plan.md: tasks UT-1 → UT-2 → UT-3.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UT-D2 to UT-D5, UT-D10), §4; src/app/tripviews.ts and tests/app/tripviews.test.ts (pattern); src/app/flow.ts (`WipeSummary`, `endBattle`); src/engine/trip/start.ts (a run can start past a checkpoint); src/app/view.ts (`viewOf`).
Own: src/app/tripUx.ts, tests/app/trip-ux.test.ts; additive edit of src/app/flow.ts (`WipeSummary` optional fields, the `wipe` object in `endBattle`; nothing else).
Contract (on main): engine and save are frozen. `WipeSummary { encounter; lost; learned }` stays valid; add optional `rooms?: {place: string; result: 'cleared'|'fell'}[]`, `cause?: string`, `final?: BattleState`. Provide pure:
 offerNovelty(profile, item): 'new' | null  (rune ∉ known, method ∉ methods, solvent ∉ solventsFound, recruit ∉ household.members; ink, vellum, doorway, key and unknown kinds → null)
 carriedHome(profile, loot): {item, first: boolean}[]  (firsts first, otherwise stable order; identical unbanked finds de-duplicated when marking firsts)
 wipeRooms(trip): only rooms actually fought: from the trip's start index (a checkpoint start does not credit earlier rooms) to the current index, using the incoming trip's current encounter index and completed-fight count; completed = 'cleared', current = 'fell'
 wipeCause(final, log): one sentence from the terminal events tied to the last party casualty (and its supporting events in the same chain), in describeLog's voice; when no cause is provable, a neutral observed-loss line built from the room name; never an invented cause (the old "They ran out of room to move." is removed)
 frontierMarks(profile): a mark only for a genuinely visible frontier (visible, attached to the visible path, not yet heard); otherwise none (the default leaves the paper blank); both `hearsAs` entries and hidden under-Seam entries excluded
 thresholdPictogram(goal): PictogramId for every KitGoal kind (exhaustive switch); compound and extension goals use an existing neutral pictogram
 wipeFixture(kind: 'seam' | 'first-room' | 'nothing-lost'): three distinct WipeSummary payloads for UF's loader: seam = two rooms from zero, a provable cause, a final; first-room = checkpoint start, one fell line, neutral cause, a final; nothing-lost = an older minimal summary (encounter, lost [], learned; no rooms/cause/final).
 The See it board is built with viewOf(final) (read-only, no actions or focus targets); `final` is app state only and never serialised.
Owed by this pack: wipe fixture export (to UF C8, before UF's final wipe recipes); flow.ts additive edit (needs the orchestrator's grant message).

Done when:
- UT-1: tests `offerNovelty: new rune, known rune, ink never`, `offerNovelty: method, solvent, recruit`, `carriedHome: firsts lead, order stable`, `carriedHome: identical unbanked finds mark one first` pass
- UT-2: tests `wipeRooms: cleared then fell`, `wipeRooms: checkpoint start lists only rooms fought`, `wipeRooms: start from zero across the checkpoint lists all`, `wipeCause: names the attack that downed the last casualty`, `wipeCause: neutral line when no cause is provable`, `endBattle: wipe carries rooms and final`, a real `finishBattle` → wipe → viewOf(final) → dismiss/read-trip sequence, `an older minimal summary renders`, `lastTrip survives reload and the serialized save has no final board` pass; tests/app/flow.test.ts unchanged and green
- UT-3: tests `frontierMarks: none when no visible frontier`, `frontierMarks: hearsAs entries and hidden under-Seam entries excluded`, `thresholdPictogram: every goal kind maps` pass
Write each test first and see it fail.

Verify: `pnpm vitest run tests/app/trip-ux.test.ts tests/app/flow.test.ts tests/app/tripviews.test.ts --reporter=dot`
Phone check: no (app layer only)
```

## Pack B: Map and set-out (UT-4 → UT-5)

```
Pack B of docs/plans/ux-trip-plan.md: tasks UT-4 → UT-5.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UT-D8, UT-D9, UT-D10), §3 first bullet; src/ui/art/ metadata module (UF: per-id size and bbox, build-time); board snapshot "6-layouts" frames l6-mp-* (docs/plans/ux-board-snapshot.txt lines 240-270); pattern: UF's AppHeader/Sheet/ActionButton usage.
Own: src/ui/screens/Map.svelte, src/ui/components/map/* (DistrictNode, SetOutSheet and new files here).
Depends on: UF-1…UF-4, UF-8, UF-10, UF-14/UF-15 (map fixtures and the art metadata module), UT-3, FT-4 (`crestFor`); FT-24's `PocketButton` goes in the header's right slot once it is on main (R3). Contract (on main, from ux-program): C1 tokens, `data-world="city"` on the root; C2 `<ArtImage id fallback>` (ids `map/city/halvemeer`, `map/city/ink-<districtId>`: UA-17), registry never throws on missing art; C7 `AppHeader` (back ← Study, title, ⋯ last), `ActionButton` (one primary), `Sheet`, `Unseen` for ???; C8 map fixtures. From Pack A: `frontierMarks(profile)` (UT-3).
 Keep: `MAP_PAGE_HEIGHT` layout in src/app/city.ts (read-only), `mapNodes`/`mapPaths`/`mapPageHeight`, `DISTRICT_UI` slots (mapSheet, lowerSeam.underNode, inkedPage.underPages, solvedArt), the fresh-ink `seeMap` effect, `game.setOut` call. The base plate (750×3800, C4) is pinned to the **node layer's actual width × 1900 CSS px at every width (375, 430, the 480 column)**, not width 100% of the page; the **same transform** applies to the base plate, every ink crop (top-left bbox in 750×3800 master pixels, from the art metadata module), the paths and the marks; the growing under-Seam content stays below, in its existing slot. Known ink stays visible on revisit; only a fresh reveal animates (reduced motion: instant). Unheard districts draw nothing; `frontierMarks` returns a mark only for a genuine visible frontier (default none); both `hearsAs` entries are excluded.
Owed by this pack: nothing (UA-17 delivers the 750×3800 plate).

Done when:
- UT-4: fixtures map-fresh, map-frontier, map-lower-seam, map-inked-pages at 375×812, 430 wide and the 480 column: city header 64 px, inked node, pencilled node, a frontier mark only if genuine, fresh ink fades in (instant under reduced motion) and known ink is plain on revisit, opens scrolled to the frontier; node/crop alignment compared before and after a revisit, with under-Seam pages, and with zero art; testids `map`, `node-*`, `open-*`, `try-lock-*`, `checkpoint-*`, `sheet-*`, `map-back` kept; tests/app/city-map.test.ts and lower-seam-map.test.ts green
- UT-5: fixtures setout-seam (a remembered Cartographers checkpoint gives the start-point radios; the Seam has none; UF opens the sheet with taps), setout-empty-party (Set out disabled, hint shown), setout-drawn-page: Sheet with district, depth, start rows ≥ 44 px, party chips, Set out as the one primary; testids `set-out`, `not-yet`, `no-party`, `carry`, `start-checkpoint`, `start-first`, `drawn-page` kept

Verify: `pnpm vitest run tests/app/city-map.test.ts tests/app/lower-seam-map.test.ts tests/app/city.test.ts --reporter=dot && pnpm check:fast`
Phone check: yes, port 5193 (375×812, 430 and 480-column screenshots of the map fixtures and the set-out sheet)
```

## Pack C: Threshold (UT-6)

```
Pack C of docs/plans/ux-trip-plan.md: task UT-6.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UF-8, UF-9, UT-3, FT-8's board contract (preview), FT-4; not UT-5. Read: plan §2 UT-D1, §3 second bullet; src/ui/screens/Threshold.svelte, src/app/threshold.svelte.ts; board frame l6-th2-* (snapshot lines 243-250, 257-271).
Own: src/ui/screens/Threshold.svelte, src/ui/components/trip/ThresholdIntro.svelte.
Contract (on main): the route is `#/threshold?d=<id>`, entered from the map's "Try the lock"; `planThreshold`, `thresholdRoom`, `threshold` store (`load`, `retry`, `finish`, `leave`, `won`, `solved`) are unchanged. Two stages: intro (banner via `<ArtImage id="scenes/<districtId>/threshold" fallback>` (UA-18, 750×580) or `DistrictBanners`, rule card from `room.goalText` and `room.note` plus `thresholdPictogram(goal)` from Pack A, read-only room preview with the real overlay, drawn from the same `BattleSession` as the live room, Enter = ActionButton primary; the intro resets on route/room change and on Retry returns to the live room, not the intro; compound and extension goals (the canals) use the neutral pictogram) then the live `BattleView` under `AppHeader` (world city, ← Leave, Retry). "The gate burns" and "Nothing to try here" sit on the shared paper with one primary. Victory still writes `solveThreshold` immediately (before the burn moment). No threshold rule or seed changes.
Owed by this pack: nothing.

Done when:
- UT-6: fixtures threshold-canals (intro; tap enter for the live room), threshold-canals-burnt (UF recipe: `threshold.solved` is in the live store, so it replays the lock-solve recording and waits for the mounted test id) and threshold-nothing at 375×812; colour and greyscale pairs of the preview and live room with art, zero-art check, intent/target outlines inspected over figures, and no tint or dim filter on any parent of the overlay: banner ≥ 200 px, rule card with pictogram, preview board with overlay, Enter in thumb reach; leaving mid-room forgets it; testids `threshold`, `threshold-leave`, `threshold-retry`, `threshold-goal`, `threshold-solved`, `threshold-map`, `threshold-note` kept; tests/app/threshold.test.ts green

Verify: `pnpm vitest run tests/app/threshold.test.ts --reporter=dot && pnpm check:fast`
Phone check: yes, port 5194
```

## Pack D: Loot, Crossroads, Cleared (UT-7 → UT-8)

```
Pack D of docs/plans/ux-trip-plan.md: tasks UT-7 → UT-8.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UF-8, UF-9, UF-10, UT-1. Read: plan §2 (UT-D2, UT-D6, UT-D7), §3 bullets 3-5; board frames l6-lo-*, l6-cs-*, l6-cl-* (snapshot lines 308-338); pattern: UF `Card`.
Own: src/ui/screens/{Loot,Crossroads,Cleared}.svelte; src/ui/components/trip/{OfferCard,TripStatus,LootChips,CrossroadsChoices}.svelte and new files in src/ui/components/trip/ (TripStrip, StakeHeading, ChoiceCard, CarriedList, CityScene).
Contract (on main): C7 `ActionButton`, `Card`, `AppHeader` (city world, crest left, title, ⋯ last); C2 `<ArtImage id fallback>` ids `finds/shared/<kind>-a|b` (UA-19), `scenes/<districtId>/crossroads` and `scenes/shared/stair` (UA-18). From Pack A: `offerNovelty`, `carriedHome`. Selection on Loot uses its own cue (edge and check); the gold ribbon is only for a genuinely new find. Three 112 px cards is a baseline: longer offers keep scrolling, bonus picks, selected-index reset, paper/term text and district card bodies. `CrossroadsView.home` is rendered separately from `ways` (with its disabled reason); several district ways may appear without a Push action. Keep: `cardPlan` and district card bodies (`ui/districts/cards`, `{item}` prop) hosted unchanged inside the new card shell; `crossroadsView`/`WayView` fields (label, note, sub, warn, disabled); `DISTRICT_UI` slots lootHeader, crossroadsNote, crossroadsLine, tripBadge; `game.take`, `pushOn`, `chooseWay`, `returnHome` calls. "Read the notebook" mounts FT-24's `PocketButton`/`PocketSheet` (context "Back to the road") when on main, else keeps the codex link; the same `PocketButton` goes in the Crossroads and Cleared headers (R3). Home does not add a transition (UH wraps `returnHome`).
Owed by this pack: nothing.

Done when:
- UT-7: fixtures loot-three (new rune with gold ribbon, ink, a district card), loot-bonus, loot-paper-found (UF recipe sets the ephemeral `game.found`) at 375×812, plus a longer-offer case checked for scroll, bonus pick and selected-index reset: three cards visible without scrolling, each ≤ 150 px, chosen card has the gold edge, Take grey until chosen, trip strip flat; testids `offer-*`, `take`, `picks-left`, `bonus-pick`, `paper-found`, `offers`, `trip-status` kept
- UT-8: fixtures crossroads-seam, crossroads-span, crossroads-no-way-home, cleared-seam, cleared-lower-seam: scene slot, stake heading, 92 px choice cards with warn/disabled reasons, carried chips, Push on primary with Go home outlined above (Cleared: Home primary, firsts gold in `CarriedList`); testids `crossroads`, `ways`, `push`, `return`, `way-*`, `no-way-home`, `no-landing`, `cleared` kept; tests/app/crossroads.test.ts green

Verify: `pnpm vitest run tests/app/crossroads.test.ts tests/app/tripviews.test.ts --reporter=dot && pnpm check:fast`
Phone check: yes, port 5194 (after Pack C's check, or 5193 if Pack B is done)
```

## Pack E: Wiped (UT-9)

```
Pack E of docs/plans/ux-trip-plan.md: task UT-9.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UT-2, UF-8, UF-10; "See it" needs FT-8 or the later UT-10 integration task. Read: plan §2 (UT-D3, UT-D4, UT-D5), §3 last bullet; src/ui/screens/Wiped.svelte; board frame l6-wp-* (snapshot lines 339-361).
Own: src/ui/screens/Wiped.svelte; src/ui/components/trip/{WipedLines,SeeItSheet}.svelte.
Contract (on main): `game.wipe: WipeSummary` with `encounter`, `lost`, `learned` and (from Pack A) `rooms`, `cause`, `final`; the screen is app state, not saved (a reload lands on the Study, as today); `game.readTrip()` and `game.dismissWipe()` unchanged. Order: scene (`scenes/shared/wiped`), script heading, cause line (+ "See it"), a line per room, Lost with them, The notebook keeps (gold for new), Home = primary (`dismissWipe`, to the Study: no plate), Read the trip = secondary (`readTrip`, to the trip page: UH-13 plays its low-lamp plate). "See it" opens a `Sheet` with FT-8's `BattleBoard` fed by `viewOf(final)` from src/app/view.ts (read-only, no actions, no focus targets); the button is hidden while FT-8 is not on main and when `final` is absent (older summary); note both in the report. The cause line is whatever `wipeCause` returned (attributed or neutral); never write a cause yourself. The room list is `rooms` as given (rooms actually fought). Copy: keep `wipeLine`, "Lost with them", "The notebook keeps what you learned" as written.
Owed by this pack: nothing.

Done when:
- UT-9: fixtures wiped-seam (two rooms from zero, provable cause), wiped-first-room (checkpoint start, neutral cause), wiped-nothing-lost (older summary: no rooms/cause/final, no See it) at 375×812, with a colour and greyscale pair of See it with art and a zero-art check: cause line comes first, one line per room, Home is the only filled button; See it opens the read-only board when FT's component exists; testids `wiped`, `learned`, `read-trip`, `back-to-study` kept

Verify: `pnpm vitest run tests/app/flow.test.ts tests/app/trip-ux.test.ts --reporter=dot && pnpm check:fast`
Phone check: yes, port 5193 (after Pack B's check)
```

## Pack F: Integration (UT-10, UT-11)

```
Pack F of docs/plans/ux-trip-plan.md: tasks UT-10 → UT-11.
Base commit: <main at spawn, after the working FT pocket (FT-24/FT-25), FT-8 and UH-13 have merged>. Budget: 45 min pack, 30 min per command.

Read: plan §2 UT-D3, UT-D6, §4 Owed; FT's pocket brief (button/sheet props, party/log source per screen, mount sites).
Own: small additive edits in src/ui/screens/{Map,Loot,Crossroads,Cleared,Wiped}.svelte and src/ui/components/trip/*.
Tasks:
- UT-10: mount FT's `PocketButton`/`PocketSheet` in the Map, Loot, Crossroads and Cleared headers with FT's pinned props and the party/log each screen holds, replacing every fallback codex link; enable "See it" if it shipped hidden.
- UT-11: add `markNavigation(...)` (UH-D6) to the Home handlers of Cleared and Crossroads and to Wiped's Read the trip handler; nothing else.
Done when: each screen opens the pocket from its fixture; See it opens the read-only board; UH-13's browser checks pass from these screens; tests/app/crossroads.test.ts and flow.test.ts green.

Verify: `pnpm check:fast`
Phone check: yes, port 5194
```

## Pack Z: Close (orchestrator, UT-Z)

Not spawned. Full gate (`pnpm check`), a real route loop on the phone, separate from fixture screenshots (Study → Map → set out → fight → Loot → Crossroads → Cleared; a wipe with See it → Read the trip; a threshold try and burn), colour/greyscale pairs for Threshold and See it, `code-review`, DESIGN §11 and TECH §7 rows, roadmap update, status Owed list empty.
