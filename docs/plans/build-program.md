# Build program: from the designs to builds

> Written 2026-10-23, after the design consistency pass (DESIGN §11, last row). This file is the **shared brief for every planning agent** and the map of which plan owns which system. The order of execution, statuses and dependencies are maintained in [ROADMAP.md](../ROADMAP.md) §2; this file is the boundary map behind it.

## 1. The plans

Each plan is one file `docs/plans/<name>-plan.md`, executed later with the [implement skill](../../.claude/skills/implement/SKILL.md). Task IDs use the plan's prefix so plans can depend on each other's tasks (`DK-1`, `HC-2`, …).

| Prefix | Plan file | Roadmap | Design source | Owns |
|---|---|---|---|---|
| FD | `foundations-plan.md` | BL-128 (groups BL-105–109, BL-112, BL-123) | rune-design-final, audit | Engine correctness and contracts every later plan leans on: **one arrival pipeline** (a unit or object arriving on a tile by push, slide, drift, pull, hop, swap, return or carry, with its hooks into stains, marks, fire and jars), authoritative event contracts, the 500-event cap, dusk-jar identity, delayed invention context, stable footnote variant IDs and learned Bind events |
| HC | `household-core-plan.md` | BL-129 (part of BL-43) | party.md §0b–§1, §0d | The apprentice roster model (open set instead of the fixed pair), the breaking save reset, the household shelf and 1–3 trip slots, variable party size in run and battle, **per-room board sizes and 4+ start points drawn from the trip seed**, the layout notation for start points, mechanically re-laying today's Seam and canal rooms into that format, threshold rooms played by the slots, apprentice tokens in the trip ledger/page and the Lab |
| AH | `actions-habits-plan.md` | BL-130 (part of BL-43) | party.md §1–§2 | The basic actions Pull, Hop and Swap (Shove exists), the seven new habits, their previews, witnessed fine print and scenario tests |
| RC | `recruitment-plan.md` | BL-131 (part of BL-43) | party.md §0b, §1–§2, §0d | The seven new apprentices' data entries (bodies, leans, starter pages), the "someone joins you" recruit offer, hidden-until-ready preconditions and their guaranteed pages, door arrivals and notebook milestones, the codex/notebook presence of the household |
| RV | `rivals-plan.md` | BL-30, BL-118 | rivals.md, rune-design-final §10 | The rival foe engine (foes that cast lattices: locked native aim, starved-chain fallback, deterministic routines, telegraph UI), the canal Lamplighter as a **Lab prototype with a player playtest gate**, the authoring API each district uses for its rival, recovered annotated pages and Bench trial copies |
| DK | `district-kit-plan.md` | BL-127 (new) | city-and-districts.md and all district docs | The shared framework that lets each district build run in parallel without fighting over `run.ts`: a district module contract, **trip-shape hooks** (return policy per room, Crossroads choices, points of no return, checkpoints), a round-end board-rule hook, a terrain/board-piece registry, extension points for new offer kinds, new hearing-condition kinds, threshold data (BL-94), Bench scene parity as a registry (BL-102), the shared **out-of-the-room** state (bridges' fall, Cartographers' erase), the lower-Seam floor/intrusion hook, scripted stand-in hearts, the map for seven districts (BL-95) |
| FN | `footnotes-plan.md` | BL-54 (with BL-101, BL-104, BL-50) | footnotes.md | The footnote level system, method/solvent margins, the fine-print audit it needs, persistent solvent discovery, aura diagonal overlays, the Seam content pass and the per-district content batch template, the rival-note slot |
| CN | `canals-revisit-plan.md` | BL-124 (with BL-91, BL-119) | city-and-districts §5b | The canals at the new standard: recruit landing, the Lamplighter in room 4 with the key, barge cargo, re-laid rooms, lamp-mother cadence, lamp-ledger lore, lock illustration, **the Timing footnote batch** (Jar, Fuse, Afterglow, Pitch, Wick and the Lamplighter's note on Jar) |
| SM | `seam-grows-plan.md` | BL-125 | district-seam.md | The Marginalia heart, re-laid base rooms, the five hearing events reachable, the lower Seam framework and its sealed door, the answering margins |
| IQ | `ink-quarter-plan.md` | BL-113 | district-ink-makers.md | Writs, offers with terms, the postal staff, the postmaster, the return-to-sender gate, letters to the owner, its lower-Seam floor and footnote batch |
| BH | `bathhouses-plan.md` | BL-114 | district-bathhouses.md | Boil-over gauge, rising heat and cold plunge, the steam's people, the Bath-Steward, the dome gate, its floor and batch |
| BR | `bridges-plan.md` | BL-115 | district-bridges.md | Piers and falls, span choice, the wardens' staff, the Chief Warden on the keystone, the key gate, its floor and batch |
| BF | `foundry-plan.md` | BL-116 | district-bell-foundry.md | Sympathetic bells by tone, the peal across the trip, the ringers' staff, the Carillonneur, the far-bell gate, its floor and batch |
| CG | `cartographers-plan.md` | BL-117 | district-cartographers.md | Pencil and ink, the guild's hands, drawn-in reinforcements, free-then-no-return with the doorway checkpoint, the Registrar, the five-page hearing, the redraft gate, the opening of the owner's door |

Not planned yet: **BL-126** (the ending sandbox) needs a design round first; atmosphere items (BL-40–42) stay in the roadmap.

### Ownership rules between plans

- A system belongs to exactly one plan (the table above). Other plans **consume** it through the contract that plan defines and list what they assume. If a district needs something generic that the kit lacks, the district plan names it as a request to DK instead of building its own copy.
- District plans own their terrain, board rule, foes, rooms, trip twist, heart (authored with RV's API, or a stand-in through DK), hearing and gate (through DK's kinds), loot tables and recruit placement (through RC's offer), lore texts, their lower-Seam floor (through SM/DK's hook) and their footnote batch (through FN's template).
- Content data lives in `src/data/`, rules in `src/engine/` (pure, deterministic), screens in `src/ui/`. Each district owns its own files per DK's P1 (`src/data/districts/<id>.ts`, `src/engine/districts/<id>.ts`, `src/ui/districts/<id>/`), with one index line each.

### Platform contracts the district plans build on (drafted 2026-10-23)

| Need | Plan and tasks |
|---|---|
| Arrival hooks for every move (pieces' `onArrive`, return to sender, carry, cargo) | FD-3 (pipeline), FD-7 (event contracts), FD-9 (granting Bind events such as *pushed*, *dies*) |
| Rooms: `P` start points, `checkRoom`, sizes 5–7 × 6–9, party 1–3 | HC-2, HC-3, HC-4 |
| District module, files, round-end rule slots, pieces, trip shape (return policy, choices, checkpoint, trip state, room bonus goals), out of the room, offer kinds, hearing kinds, stand-in hearts, intrusion spec, generic Crossroads/Loot/board/Lab/Bench/threshold/map | DK-1, DK-3, DK-4, DK-5a/b, DK-6, DK-7, DK-8, DK-9, DK-10, DK-11–16; template district DK-18 |
| Rivals: engine (RV-1–6), authoring API (RV-11–14, after the Lab playtest gate RV-G1), recovered pages and `pagesHeld` (RV-15–20) | RV |
| Recruit offer, preconditions, guarantees | RC-W0, RC-2, RC-3, RC-4 (placement per district through `DistrictDef.recruit`) |
| Habit and action mechanics, the harm guard | AH-W0, AH-1 to AH-4 |
| Footnote batch: plan §6 template (audit, author, player review gate, build in `src/data/footnotes/<district>.ts` with `fourCombos` tests) | FN §6 |

## 2. What a plan looks like

Plans state **goals**, not keystrokes. Aim for roughly 120–220 lines. Use these sections:

1. **Header:** title, design link, roadmap ID, `State: Drafted (not approved)`, one-line scope.
2. **Scope and settled rules:** what this build delivers and what it leaves out, citing the design rather than copying it.
3. **Proposals:** every decision the plan makes that the design does not, with the reason. Mark anything that changes an earlier design decision as **Redefines: …** so the orchestrator can take it to the player. You are free to propose redefining earlier choices when it makes the game or the build better or simpler.
4. **Current implementation and risks:** short, from the real code (name modules and functions you checked).
5. **Contracts:** *Provides* (interfaces other plans use, at the level of names and semantics) and *Consumes* (from which plan and task, and what you assume it gives you).
6. **Tasks:** a table with ID, goal, owned area (modules/directories), role (Strong / Medium / Fast per the implement skill), size (S/M/L; split anything bigger), depends on (own and other plans' task IDs), acceptance (goal-level). Group them in waves; Wave 0 holds this plan's contracts. Include a playtest gate where the design asks for validation by playing.
7. **Verification:** which scenario tests, fuzz/bot checks and phone checks (375×812) prove it.
8. **Open questions for the player:** only real design questions this plan cannot settle with a Proposal.
9. **Execution notes:** critical path, what can run in parallel, rough total size.

## 3. Rules for planning agents

- Read `AGENTS.md`, this file, your design doc(s), the DESIGN.md §6 summaries they link and the code you need to judge feasibility. Don't read the historical rune proposals.
- **Write only your own plan file.** Do not edit DESIGN.md, TECH.md, the roadmap, docs/design/* or code, and do not commit; the orchestrator reviews, reconciles and commits.
- Design wins over the plan; where you think the design is wrong or unbuildable, say so as a Proposal or a question.
- Keep engine purity, the event log, seeded randomness and data-in-`src/data/` (AGENTS.md).
- Report back in under ~300 words: the plan's shape (waves, task count, size), Redefines proposals, cross-plan assumptions, and open questions.

## 4. Reconciliation (2026-10-23)

All 14 plans are drafted and reconciled. Their `State:` lines still say *Drafted*; the roadmap §2 holds the live status.

**Aliases.** `FD-W0` means FD-0 (with FD-3 for the arrival pipeline itself, FD-7 for event contracts); `DK-W0` means DK-1 (contracts) plus DK-2 (the `run.ts` split). Other prefixes use their own `<prefix>-W0` task.

**Orchestrator calls.**
- **DK-0 and DK-2 run first**, before HC-1/HC-4, RC and FD touch the trip flow (HC plan §8 updated).
- **One lore registry** (`Profile.papers`) is DK's (DK §9); IQ-14, CN-9, BH, BR and CG consume it. It is also BL-41's delivery channel.
- **One harm guard registry** is AH-W0's (AH plan, orchestrator additions); BH, IQ and RV-11 register guards.
- RC uses AH's habit ids (AH P10). CN owns the canals' Timing footnote batch, including the Lamplighter's note on Jar (RV-20 points at it). Every consumer request to DK is in DK §9 with the task that owns it.
- **Foe and piece tokens** come from DK-1's token registry; the district plans' letters are placeholders until then.

**The player's picks** (DESIGN §11, last row): one household ink allowance (HC P6); margins on 2–3 chosen lines per rune (FN P1); the Lab lists only the household on a normal save (RC P14 over HC P16); no player gate for footnote variants (every `*-FG`/`FN-G1`/`CN-G1`/`BR-G1`/`CG-G3` is an orchestrator review); the bridges are four rooms and the heart with span stones that wear (BR); rival casts reveal lines but earn no points (RV Q1); lower-Seam intrusions keep their piece rules with the canals' survivable drop (SM P9, DK Q1, BR's floor).

**Defaults taken without a question** (the plans' proposals; veto any):

| Plan | Default |
|---|---|
| FD | Pushed or pulled into fire burns at round end, as now; Repeat/Margin echoes keep the auras their first cast touched; a unit carried by the current is a real arrival (opens step-jars, spreads marks, triggers Bind *enters*; stains stay exempt); Draw opens a step-jar it moves under a unit |
| HC | One apprentice going out sees a single quiet "going alone" line; the ink reserve keeps its size; slot 3 appears only with three in the household |
| AH | Hop and long Touch cannot pass over anything that blocks units (plates, Walls, Kettles, gates, grates); Flashover (fire) burns the towel-bearer; the warden's second Hold may catch an ally (first unit beside the target: ahead, left, right, behind); the erased student remembers the last Erase for the whole fight |
| RC | "A proven invention" is one proven over 5 trip casts; a door note may come on the evening of a wipe; a recruit revealed only by an unbanked page is hidden again if the page is lost; at most one door note per homecoming |
| RV | Copy to the Study stays (the copy still needs owned parts and ink) |
| DK | Once the Cartographers' doorway is reached, Set out defaults to starting there, with room 1 one tap away |
| SM | The lower Seam is its own trip; the owner's hearing hints live on the Seam's margin sheet on the map; margins answer per page |
| CN | Waiting is enough to moor the barge; the Lamplighter replaces the Snuffer in room 4; the wardens' pass is always offered after room 4 when its conditions hold; the barge is a bystander crate unit |
| IQ | A term cannot be broken on purpose; standing orders may mark apprentices; the clock collects foes' marks too; the postmaster's note sits on Sentence at level II; Lift's page is in the heart's loot |
| BH | The gauge never falls on its own; the dissolved bather ignores single hits inside a cloud and takes area bursts |
| BR | The keystone has 6 HP; the Chief Warden is hittable but only falls once it breaks; the Long Drop also counts a foe dropped with a cut span |
| BF | A tone rings at most once per round (the hum rule, a counter-toll); allied great bells hurt foes only; the far-bell gate gets a loose rat so a party without Shove can still strike the bell; great-bell puzzles need only Seam runes and Brass |
| CG | Erase on pencil under a foe erases it; a circle is held by the nearest guild hand; Draw does not move bare pencil; rooms 1–3 each guarantee one unowned Board treasure in the order Erase, Draw, Swap, *dies*, Quicksilver, Graphite |
