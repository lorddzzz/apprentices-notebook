# Roadmap and backlog

> Updated 2026-10-23 after the roster and footnotes rounds and a design consistency pass (Cartographers' return rule, runaway habit, starter-page preconditions; DESIGN §11); on 2026-10-22 after the household, ink-makers, bathhouses, bridges, bell foundry, canals-revisit, Seam-revisit and Cartographers design rounds (BL-43, BL-113–117, BL-124–126); on 2026-10-21 after the growing-pages build (BL-103/BL-88). This is a menu, not a commitment. The player picks the next work; proposed features are not approved designs.
> Current references: [DESIGN.md](../DESIGN.md), [rune rules](design/rune-design-final.md), [party](design/party.md), [districts](design/city-and-districts.md), [rivals](design/rivals.md). Evidence and plan deviations: [rune audit](plans/rune-redesign-audit.md).

## How to use this doc

- IDs are stable: move entries, never renumber. New IDs start after BL-126.
- Sections: [1 Now](#1-now-correctness-and-plan-leftovers), [2 Tracks](#2-roadmap-planned-tracks), [3 Backlog](#3-backlog-ideas-ready-to-pick), [4 Tech](#4-tech-and-tooling), [5 Parked](#5-parked-cut-or-deferred), [6 Questions](#6-open-design-questions), [7 Done](#7-done-log).
- An item gets a focused design round when needed, then an implementation plan. Update design/technical decisions with the build and move completed work to the Done log.
- No standalone playtest tasks: the player supplies feedback when they choose; record resulting changes against the relevant item. `needs-feedback` means a decision depends on that feedback.
- Types: feature, content, design, balance, polish, bug, tech, test, docs. Sizes: XS (one edit), S (focused task), M (several related tasks), L (own plan), XL (several plans). Estimates are scope, not promises about model usage.
- Status: ready, needs-design, needs-feedback, investigate, idea, blocked, parked. An investigation must reproduce the issue before changing rules. Table Area fields remain searchable.

## 1. Now: correctness and plan leftovers

**Suggested order, not a ranking chosen by the player:** investigate event/state correctness first (BL-106/107), then delayed and arrival rules (BL-105/108). Bench parity and persistent discovery are small player-visible follow-ups.

| ID | Work | Type / size | Area | Status / dependencies | Concrete scope |
|---|---|---|---|---|---|
| BL-101 | Fine-print coverage audit and missing content | content / M | runes, codex | ready | 100 registered lines versus P4's stated 132. Inventory actual missing behavior by rune; add useful sentences with firing scenarios. Do not promise 6–8 lines per rune or fabricate rows to hit a quota. Extend toward 220 as districts add terrain. |
| BL-102 | Bench scene parity with encountered content | feature / M | bench | ready | Support met canal foes, water/current, vents and compounds; update subject counting and painting. Preserve discovery gates and the three-subject limit. Add a reusable authored trial lattice for nested inventions if the generated trial cannot demonstrate them. |
| BL-104 | Keep solvent discoveries after spending them | bug / S | codex, save | ready | Record found solvents separately from inventory; retain pages at zero stock. Method/solvent pages should expose their witnessed fine print. Define existing-v7 inference from stock/inventions/witnessing. |
| BL-105 | Preserve intended delayed invention context | bug / M | runes | investigate | Regress Coil/Margin on Repeat/Wick/Filings and nested Wick wake flags. Decide whether repeated flavored actions retain widening; preserve one-shot scheduling and lifetime attribution. |
| BL-106 | Dusk jar replacement timing | bug / S | combat | investigate | Snapshot jar identities, not just coordinates, so a replacement jar waits until next dusk. Reproduce using a jar tail replacing a later queued dusk jar. |
| BL-107 | Stop state mutation when a cast fizzles at the cap | bug / M | combat | investigate | Audit helper loops and detached continuations after the 500-event cap; require termination and projected/final state agreement. |
| BL-108 | Current arrival hooks and playback agreement | bug / M | combat | investigate | Define/reproduce arrival into stains, marks, fire and step jars for carried units/cargo. Include history/origin of delayed effects and exemptions for water/flying/anchored foes. |
| BL-119 | Canal lock map illustration | polish / XS | world | ready | Replace the cosmetic burnt wooden gate with an opened rat-guarded lock; current puzzle teaches a drop, not burning a gate. Can ship alone or with BL-124. |

## 2. Roadmap: planned tracks

The redesign supplies depth already. The next substantial choice is **freer builds/party**, **another district**, or **rivals**. They can be developed separately. New district builds reuse existing school runes, methods and solvents, currently Lab-only.

### Track P · Apprentices and freer lattices

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-43 | The household and three-member expeditions | feature / XL | party, world | **design complete 2026-10-23**; build plan not written | [Party design](design/party.md) §0b–§2: nine apprentices (pair + runaway, notary, towel-bearer, warden, tuner, Copyist, erased student), four basic actions (Shove, Pull, Hop, Swap; Pull/Hop/Swap new), lattice-or-body habits (seven new habits), recruit loot offers, two milestone door arrivals, household shelf, per-room boards with 4+ start points, incompatible saves cleared (no migration); every apprentice is hidden until their preconditions are met (habit or school rune, every starter-page rune, plus story beat), with guaranteed precondition pages so it cannot soft-lock; the runaway's habit is on Fuse; a taken recruit is trip loot; threshold rooms use the shelf's trip slots (party.md §0d). Needs a plan, then build with the first districts: runaway at the canals (BL-124) before the rest. |

### Track W · Districts and progression

Every district round specifies hearing/gate, route/return rhythm, terrain and edge behavior, teaching rooms, enemies/heart, rune/method/solvent drops and fine-print/idiom scenarios. The four middle districts branch after the canals; no fixed order is chosen. The Cartographers are last. See [city design](design/city-and-districts.md) and rune design §11.

| ID | District / school | Type / size | Area | Status / dependencies | Deliverable |
|---|---|---|---|---|---|
| BL-113 | Ink-makers' quarter / Contracts | feature / L | world, run | **design decided 2026-10-22**; postmaster needs BL-30; build plan not written | [Dead-letter office](design/district-ink-makers.md): writs, offers with terms, the postal staff, the postmaster, the return-to-sender gate. Notaries; Sentence, Levy, Tally; Bind/Lift; Wax/Sand; Debt Collection. Author encounters, not another recipe system. |
| BL-114 | Bathhouses / Areas | feature / L | world, run | **design decided 2026-10-22**; the Bath-Steward needs BL-30; build plan not written | [Grand thermae](design/district-bathhouses.md): boil-over gauge, rising heat and cold plunge, the steam's people, the dome gate. Vat, Seep, Steep; Bath salt/Fog jar; Steam Room. |
| BL-115 | Bridges / Structure | feature / L | world, run | **design decided 2026-10-22**; the Chief Warden needs BL-30; build plan not written | [Arches in the fog](design/district-bridges.md): piers and cuts, falls remove an apprentice for the room, choose-your-span trip, the first key (from the canals), the keystone heart. Hold/Brink/Lay, Bind pushed event, Mortar/Chalk, Long Drop. |
| BL-116 | Bell foundry / Resonance | feature / L | world, run | **design decided 2026-10-22**; the Carillonneur needs BL-30; build plan not written | [Carillon towers](design/district-bell-foundry.md): sympathetic bells by tone (not Conduct), a peal across the trip with great-bell puzzles, the ringers' staff, the far-bell gate. Toll/Coil/Unison, Rivet/Filings, Peal. |
| BL-117 | Cartographers' hall / Board | feature / XL | world, run, story | **design decided 2026-10-22, trip shape revised 2026-10-23**; the Registrar needs BL-30; the five-page hearing needs BL-118 and real rival hearts in BL-113–116; build plan not written | [The academy](design/district-cartographers.md): pencil and ink, the guild's hands, free return after rooms 1–3 (Board pages, Bind dies, Quicksilver/Graphite drop there), the doorway as the point of no return, the final run to the Registrar, the hall remembering the doorway, the redraft gate (any build), the Seam as a bad join. Redraft idiom. Stand-in hearts award no page, so the hall needs all four masters as real rivals. |

### Track R · Rival inscribers and recovered pages

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-30 | Rival inscribers | feature / XL | combat, world | **core design decided 2026-10-22**; prototype/default validation and build plan pending | [Rival design](design/rivals.md): recognisable routines, locked aims, pre-shown avoidable fallback; first Lamplighter has the long wick (spend a later turn opening his jar remotely). Proposed kit: jar of Oil/Spark plus Oil/Shove. Validate aim geometry, fallback, deterministic routine and phone readability in the Lab before a roster. |
| BL-118 | Recovered rival lattice pages | feature / M–L | mastery, story | **format/access decided 2026-10-22**; proposed economy/proof rules need validation; BL-30 | Intact annotated spell as a free Bench trial copy; field use/adaptation requires owned parts; personal trick excluded. Proposed defaults: permanent knowledge on encounter victory, no free Glyph proof, no duplicate page reward. Validate trial isolation, witnesses and lifetime credit. The five pages (four masters and the Lamplighter) are the Cartographers' hearing. Each page also carries one unique footnote variant ([footnotes](design/footnotes.md), 2026-10-23). See [rivals](design/rivals.md) §3. |

### Track M · Mastery expansion

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-54 | Footnote levels, capstones and method/solvent margins | feature + content / L, then M per batch | mastery | **design decided 2026-10-23**; build plan not written; content passes need BL-101 | [Footnotes](design/footnotes.md): levels I–II are line slots (4 variants per line), III a rune capstone (2 per rune), methods and solvents have their own margins, cost scales with level, thresholds 8/25/60 (methods/solvents 5/15/36), empty margins for locked slots, home-only re-picking, rival unique notes. Build the system (per-subject points, slots, capstones, margin UI, cost), then write the Seam's 13 runes and five methods, then each district's batch. |

### Track C · Canals revisit

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-124 | Canals revisit for the household | feature / L | world, run, party | **design decided 2026-10-22** ([§5b](design/city-and-districts.md)); needs BL-43 build (recruit offers, start points); rival needs BL-30 | Recruit offer at the second landing (runaway hidden until Fuse and Touch are learned; Fuse guaranteed in rooms 1–3); Lamplighter rival elite in room 4 carrying the wardens' pass (the key); optional barge cargo in rooms 2 and 4; lamp-ledger lore; re-lay rooms with 4+ start points and per-room sizes; BL-91 cadence. Also covers BL-119's lock illustration. |

### Track S · The Seam revisit

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-125 | The Seam grows | feature / L | world, run, story | **design decided 2026-10-22** ([district-seam.md](design/district-seam.md)); lower Seam needs the opened districts to exist | Replace the plain heart with the Marginalia (five hands); re-lay base rooms with 4+ start points and per-room sizes; make the five hearing events reachable and reconcile the placeholder triggers in `src/data/districts.ts` with each district doc; lower Seam floors per opened district with one terrain-piece intrusion each; the sealed owner's door; margin notes that answer. |

### Track E · The ending

| ID | Work | Type / size | Area | Status / dependencies | Scope |
|---|---|---|---|---|---|
| BL-126 | The Seam becomes yours (ending and sandbox) | feature / L | story, world | needs-design; after BL-117 and BL-125 | After the Registrar, the owner's door opens and hands you the pen; the Seam becomes the player's to ink your own district into. Decide what drawing a district means, what it costs, whether it feeds the notebook, and the Seam's drift once the join is mended or kept. See [district-cartographers.md](design/district-cartographers.md) §0 and §3. |

### Track A · Atmosphere

| ID | Work | Type / size | Area | Status | Scope |
|---|---|---|---|---|---|
| BL-40 | Real names | design / S | story | ready | Title, apprentices, city and Seam remain placeholders. |
| BL-41 | Owner's mystery and lore delivery | content / M | story, codex | needs-design | The owner drew the Seam and was expelled by the Cartographers: the premise is chosen. Develop how players uncover it through notebook notes, discoveries, guild archives and recovered rival pages; folios no longer deliver lore. |
| BL-42 | Audio | feature / M | audio | needs-design | Tone, free assets or synthesis, mute/reduced distractions and iOS gesture/PWA behavior. |

## 3. Backlog: ideas ready to pick

| ID | Work | Type / size | Area | Status | Scope |
|---|---|---|---|---|---|
| BL-100 | Rune art and editor polish | polish / M | runes, study | ready | Redraw margin, strike, coil, brink, bind, chalk, filings, quicksilver. Audit invention names/art in every shelf/caption and optional shelf metadata/duplicated flow geometry. Implementation leftovers now have their own IDs above and in §4. |
| BL-50 | Diagonal aura reach | feature / M | lattice, mastery | **decided as an aura capstone 2026-10-23**; needs BL-54 and readable overlays | One of each aura's two capstones (Afterglow, Steep, Coil: also acts through diagonally touching cells); design the overlay in the same build. [Footnotes](design/footnotes.md) §1. |
| BL-51 | Additional runes beyond the 31 | content / M each | runes | idea | New Source/Shape/Trigger behavior only if it adds something current methods and wiring cannot express. Pull/hop as personal basic actions belong to BL-43 first. No aspect assignment needed. |
| BL-52 | More idioms (nine now) | content / S each | runes, codex | ready | Add recognizable event patterns in idioms.ts and a replayable Lab example; these are named achievements of a cast, not compile recipes or free Glyphs. |
| BL-56 | Attrition and build balance | balance / M | combat, run | needs-feedback | Separate isolated room strength from full-trip charge exhaustion. Baseline: starter bots clear fresh Seam rooms but full trips exhaust charges around depth 3. Review Strike versus Spark/crush, ink costs, leans and rewards. Decide whether pushing FROM oil should start a slide; currently only entering oil extends it. |
| BL-60 | More Seam layouts | content / S | run | ready | Three per depth now; vary network, jar and push opportunities rather than enemy HP alone. |
| BL-61 | Additional enemy behaviors | content / M | world, combat | needs-design | Slugs/constructs or enemies that erase marks, move jars or break networks are proposals. Tie each to its district and one clear telegraph. Eel/Snuffer/moth/mother already exist. |
| BL-62 | More loot offer kinds | content / S | run | idea | Current offers: rune/method pages, ink, solvents, vellum and doorway (key support exists). Avoid redundant currencies; recovered pages depend on BL-118. |
| BL-63 | Doorway variants / second rare offer | content / S | run | idea | Optional breaks in trip pacing with a clear cost in foregone loot. |
| BL-91 | Lamp-mother summoning cadence | balance / XS | combat | ready (decided 2026-10-22: nearest free lit lamp, every round) | The last summoned moth occupies the preferred lamp, often making calls every other round. [Canals §5b](design/city-and-districts.md) chose the designed every-round call at the nearest free lamp; confirm by playing. |
| BL-92 | Canal room tuning | balance / S | run | needs-feedback | Recalibrate with current runes/charges before using the old 39% heart result; room and full-trip metrics differ. |
| BL-93 | Current preview and arrows | polish / S | combat | needs-feedback | Current toggle exists; consider hold-to-peek and water arrows readable under oil/jars. |
| BL-94 | Threshold copy as district data | tech / XS | world | ready | Move banner copy into ThresholdDef before the next threshold room. |
| BL-95 | Map label/path spacing | polish / XS | world | ready | Recheck paths against the renamed Seam caption and expanding heard districts. |
| BL-71 | Reload the same Lab demo in-page | bug / XS | lab | investigate | Check the unchanged-id effect with ?demo=1; add a replay/reset path if still reproducible. |
| BL-73 | iPad / desktop layout verification | test / S | study, combat | idea | Cover larger screens and portrait/landscape; phone remains primary. |
| BL-74 | Player annotations in the notebook | feature / M | codex | idea | Automatic witnessed fine print is settled. Optional personal notes/bookmarks are a new feature, not an unresolved automatic-versus-written rule. |
| BL-75 | Accessibility | polish / M | study, combat | idea | Material patterns, color-blind readability, tap targets and motion reduction. |

New possibilities arising from the shipped systems (all **proposals**):

| ID | Work | Type / size | Area | Status | Scope |
|---|---|---|---|---|---|
| BL-120 | Save a fight situation as a Lab experiment | feature / M | lab, combat | idea | Recreate a surprising chain with terrain, inventions and footnotes intact; provide a shareable scenario using existing import/export, without awarding progression. |
| BL-121 | Trace the lifetime of a cast | feature / M | combat, mastery | idea | Tap an origin in the trip/fight ledger to see its jar, mark, repeat and later damage. Turn existing lifetime credit into an explanation players can inspect. |
| BL-122 | Invention notebook organization | polish / M | bench, codex | idea | Favorites, school/method filters and duplicate-build comparison as the invention shelf grows. |

## 4. Tech and tooling

| ID | Work | Type / size | Area | Status | Scope |
|---|---|---|---|---|---|
| BL-109 | Authoritative event contracts | tech / M | combat | ready | crush at/dir, jarSealed contents, held duration; reduce projection guesses. Consider dedicated waiting-drift and release-origin events. Preserve masked-preview non-disclosure. |
| BL-110 | Shared scenario-log verification | tech / M | tooling | ready | Stop re-registering most engine suites for both line integrity and projection drift. Keep equivalent coverage and the mocked-suite isolation. |
| BL-111 | Production bundle cost | tech / S | tooling | ready | Measure what drives the >500 kB advisory; evaluate lazy-loading Lab/Gallery/content while retaining offline play. |
| BL-112 | Save/battle fallback resilience | tech / S | save | ready | Guard ensureBattle's fallback; define recovery for multiple corrupt saves. Pair with backup/export work when useful. |
| BL-80 | Built-app browser smoke tests | test / M | tooling | idea | Load, trip, cast, Bench and save reload; deterministic fixtures. |
| BL-81 | Verify red CI blocks deployment | test / XS | tooling | ready | Use a disposable branch/workflow check; never deliberately break main. |
| BL-82 | File/share-sheet notebook backup | feature / S | save | idea | File export/import and an occasional backup nudge beyond text copy/paste. |
| BL-83 | TypeScript 7 | tech / XS | tooling | blocked | Recheck supported Svelte tooling before changing the current ^6 range. |
| BL-84 | Development event inspector | tech / S | tooling | idea | Filter by cast origin, line and delayed object; useful for BL-105–109. |
| BL-85 | Long-fight proof/replay cost | test / S | tooling | idea | Measure lifetime traces and proof after large jar/mark networks; optimize only observed costs. |
| BL-86 | Dependency refresh | tech / S | tooling | idea | Check installed versions first; verify offline build, typecheck and tests after upgrades. |
| BL-87 | Build workflow documentation | docs / XS | tooling | idea | Refresh preview/worktree instructions when that workflow is used again. |
| BL-123 | Stable footnote and Bind-event contracts | tech / S | mastery, save | ready | Use variant IDs rather than display-text comparisons in runtime context; store learned Bind events explicitly instead of deriving them from open districts before more gates/rewards ship. |

## 5. Parked, cut or deferred

| ID / item | Reason / reopening condition |
|---|---|
| BL-02 · Out-of-charges stalemate | Historically parked until a player reports being stranded. BL-56 covers measured attrition; reopen escape/refill rules if needed. |
| BL-20 · Ninth aspect / retagging | Superseded: aspects are removed. No dependency on future content. |
| BL-24 · Recipes for solvents | Superseded: methods plus one solvent rule replace authored recipes. |
| BL-53 · Alternate-solvent Thunderhead recipe | Superseded: Thunderhead is Spark on Bank; solvent variants come from applying solvents to inventions. |
| BL-55 · Fire as element/state; terrain decay | Resolved by redesign: fire is a tile state; durations/decay exist. Numerical tuning is BL-56. |
| BL-70 · Lab palette for Heat/Stain/Etch/Scald | Superseded old chemistry; current Lab palette expanded in S1. Bench omissions are BL-102. |
| BL-72 · Heat/Stain codex page check | Superseded old page set; current compound/burst UI has prior phone verification. |
| BL-96, BL-97 · Folio labels/long notes | Retired with the old folios. BL-118 must design its own readable goals/notes. |
| Walls as separate terrain / slippery brass | No current need for walls beyond plates/edges; slippery brass was cut. Revisit only for a district requiring it. |
| Permanent death | Not planned; recruitment doesn't imply losing notebook progress. |
| Fusion/evolution, slow rune projects | Rejected research directions, recoverable from history if needed. |
| Alternate cast input / charge refills / wipe penalties | Revisit from concrete feedback about miscasts, attrition or trip length. |
| Extra elegance metric Reach | Cut for scope; only reconsider if Economy/Reliability leave a clear gap. |
| Reserve settings | Notebook-pages world, wandering study and ink sea remain potential late-game ideas. |

## 6. Open design questions

1. Next substantial track: freer lattice/household, a middle district, or rival prototype? No old “mastery must come first” dependency remains.
2. Which middle district should be built first, and what teaches its school using only Seam basics? BL-113–116.
3. Household and all nine apprentices are designed (BL-43, party.md §0c–§2). Still open: the build plan and numbers (*tune by playing*).
4. Preserve auras/solvent scope across delayed and nested inventions in which exact cases? BL-105.
5. Should departure from oil also start sliding? Keep current rule pending a decision. BL-56.
6. Rival core design and trial-copy rewards are decided; validate proposed aim/fallback, long-wick routine and page economy in the Lab, then author other rivals with their districts. BL-30/118.
7. Footnote system and invention progression are decided (BL-54, footnotes.md). Open: the exact variants, capstones and threshold tuning, authored in content passes.
8. What audio fits the notebook and rainy city? BL-42.

---

## 7. Done log

Newest first. Done items live here and nowhere else. Link the plan or doc, not the commits.

| Date | What | Where |
|---|---|---|
| 2026-10-21 | **Growing lattice pages** (closes BL-103/BL-88): automatic growth in all directions, former holes writable, readable pan/Fit in Study/doorway/Lab and Glyph revision, v7→v8 notebook migration and sparse imports. Ink and the independent 3–8 Glyph flow-cell rule remain the budgets | [design](design/growing-pages.md), [plan](plans/growing-pages-plan.md), [verification](plans/growing-pages-verification.md) |
| 2026-10-20 | **Current design/roadmap refresh** (closes BL-06): current summaries reconciled with the rune engine; old aspect/recipe/folio tasks retired; actual coverage gaps and future party/district/rival work split into actionable items | [audit](plans/rune-redesign-audit.md) |
| 2026-10-19 | **Rune redesign continuation** (planned M1/S1/T1/K1/R2; closes BL-57): lifetime Glyph credit/proof, ten Lab lessons and unrestricted invention authoring, 140 deterministic invention/solvent fuzz cases, real first-evening integration, old-system audit and teaching terrain. All eight authored footnotes plus two approved Bolt variants work; remaining optional work stays in BL-100 | [plan](plans/rune-redesign-plan.md), [status](plans/rune-redesign-status.md) |
| 2026-10-19 | The Seam's map label (was BL-99): "No guild: the owner's drawing" | `src/data/districts.ts` |
| 2026-10-19 | **Rune redesign "Mix, Move, Invent"** (was BL-98; absorbs BL-12 footnotes, closes BL-13 Crystallise; folios retired): 31 runes in 7 roles, the five kinds with 10 compounds and 15 bursts, push/slide/crush/drop, jars, bound marks, the Bench with 5 methods and 14 solvents, fine print with blank previews, the footnote desk, the codex's compound table; save v7 | [plan](plans/rune-redesign-plan.md), [status](plans/rune-redesign-status.md), [rune-design-final.md](design/rune-design-final.md) §0 |
| 2026-10-17 | Folios (was BL-14): the five owner's drafts as 2–4 page folios with fixed trays, a growing test suite with "broke", turning pages, decoys, the bronze reward, the owner's mark and lore; save v6 | [folios-plan.md](plans/folios-plan.md), [status](plans/folios-status.md), [research-and-mastery.md](design/research-and-mastery.md) §0 "Folios built" |
| 2026-10-17 | Flow lines on the draft page and in the revision editor (playtest feedback): `insideFlow` walks a Glyph's inside in local cells for the same overlay as the board | `src/engine/revision.ts`, `FlowOverlay` `origin` |
| 2026-10-17 | Undo after walking onto a stain (was BL-05): `UndoRecord.stain` lifts the ink on undo, the stain stays; scenario in `tests/scenarios/brass-and-stain.test.ts` | DESIGN §11 |
| 2026-10-17 | The city map, hearing and gates (was BL-22) and the oil-lit canals (was BL-21): sketch map behind the door, hearing by owner and rumour, the canal lock threshold room, the current, landings, the eel, Snuffer, lamp-moths and the lamp-mother; save v5 | [city-and-canals-plan.md](plans/city-and-canals-plan.md), [status](plans/city-and-canals-status.md), [city-and-districts.md](design/city-and-districts.md) §0 "Built" |
| 2026-10-16 | Glyph mastery review follow-ups: the revert confirm warns about ink, ownership and the Economy discount it loses or gains (was BL-90); targeted scenarios for the extra exit with a Bend argument and beside a rune or Glyph on its extra side (was BL-89) | `revertWarning` in `src/engine/revision.ts`, `tests/scenarios/params-and-exits.test.ts` |
| 2026-10-16 | **Glyph mastery, stages C, D, G** (was BL-10, BL-11, BL-14): profiler and elegance tiers, ranked list, revisions with versions, Glyph parameters, the extra exit, five owner's drafts at the desk, last-trip dead cells for plain spells; a Fair Copy identity fix found by the new fuzz | [plan](plans/glyph-mastery-plan.md), [status](plans/glyph-mastery-status.md), [feature doc §0](design/research-and-mastery.md) |
| 2026-10-16 | **Seam deepening playtest** (was BL-01): positive first impression on all points; Etch kept as is (was BL-03); Bench empty pips fine (was BL-04, closed); Thrift a real choice; stalemate parked as BL-02 | [DESIGN §11](../DESIGN.md) (last row) |
| 2026-10-14 | Study layout reworked around the lattice board | [DESIGN §11](../DESIGN.md) (row before the last) |
| 2026-10-14 | **Seam deepening**: Pierce, On Ignite, Thrift; Scald, Etch, Kiln; heated brass; stained oil; 3 layouts per depth; the quiet doorway; owner's hints; trip page; Fair Copy tidy; place names | [plan](plans/seam-deepening-plan.md), [status](plans/seam-deepening-status.md) |
| 2026-10-13 | **Research slice**: Bench (distil), Fair Copy (compile), Glyphs, proof, idioms, 6 recipes, save v2 | [plan](plans/research-and-mastery-plan.md), [feature doc](design/research-and-mastery.md) |
| 2026-10-13 | v0.1 legibility: numbered recipe, Fork order, unit traits, charges loosened | DESIGN §10 |
| 2026-10-13 | **v0 built**: engine, Study, Codex, the Seam, Lab | [v0 log](v0-build-log.md) |
| 2026-10-12 | Design rounds, tech decisions, skeleton deployed | DESIGN §11, TECH §7 |
