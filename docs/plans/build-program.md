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
| Recruit offer, preconditions, guarantees | RC (plan in progress) |
| Habit and action mechanics | AH (plan in progress) |
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

## 4. Planning status (2026-10-23, paused at the usage limit)

Drafted, not yet reconciled or approved: FD, HC, AH, RC, RV, DK, FN, CN, SM, CG (and any of IQ, BH, BR, BF present in this folder). Still to do: finish IQ/BH/BR/BF if missing; reconciliation pass (alias `FD-W0` = FD-0 and `DK-W0` = DK-1; DK-0/DK-2 run before HC-1/HC-4; RC follows AH-P10 habit ids; RV's prose deps → FD-3, FD-5, FD-7, DK-3, HC-1, FN-8; FN's "FD (BL-123)" → FD-8/FD-9; collect consumer requests to DK: RC DK-R1, CN R1–R3, CG, SM); one question round with the player on the Redefines; then rewrite ROADMAP §2 with the execution order, dependency graph and statuses.
