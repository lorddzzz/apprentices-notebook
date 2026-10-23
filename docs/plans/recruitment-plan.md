# Recruitment: the seven new apprentices, recruit offers, hidden-until-ready and door arrivals (RC)

> Design: [party.md](../design/party.md) §0b, §0c, §1 ("Hidden until ready", "The household shelf"), §2, with **§0d winning over §0b/§0c**; [city-and-districts.md](../design/city-and-districts.md) §5b (the runaway at the canals' second landing); the "Apprentice(s)" rows of [ink-makers](../design/district-ink-makers.md), [bathhouses](../design/district-bathhouses.md), [bridges](../design/district-bridges.md), [bell foundry](../design/district-bell-foundry.md), [Seam](../design/district-seam.md), [Cartographers](../design/district-cartographers.md). Roadmap: **BL-131** (part of BL-43). Brief: [build-program.md](build-program.md). Prefix **RC**.
> **State: Drafted (not approved).**
> Scope: give the seven new apprentices their data, let a district offer "someone joins you" at a landmark room, keep everyone invisible until every precondition holds, guarantee the precondition pages so nobody can be soft-locked, and bring the two door arrivals home with a note under the attic door.

## 1. Scope and settled rules

**Delivers**
- **Seven registry entries** (runaway R, notary N, towel-bearer B, warden W, tuner T, Copyist C, exile E) in `src/data/recruits.ts` (HC's stub): HP/move, basic action, trained/gifted, habit id, starter page, token, look, blurb, exactly as party.md §2 (runaway's habit as revised in §0d).
- **The recruit offer** ("someone joins you", §0b): a fixed person at one landmark room per district, shown when ready, offered again on later trips until taken; taking it costs the pick; the recruit is **trip loot**: joins the bench at home, lost on a wipe, re-offered later (§0d).
- **Hidden until ready** (§1): a pure precondition check (story beat + habit/school rune + **every starter-page rune**, §0d) evaluated whenever loot or the home screen is generated; trip loot counts as owned, so a page from room 2 can bring a recruit in room 4 (§1).
- **Guaranteed precondition pages** without soft-locks: district-school runes in the district's own rooms no later than the room before the landmark; Seam runes (Touch, Splash, Steam, Brass) in the base Seam's deeper rooms (§0d). Proven by static, fuzz and bot checks.
- **Door arrivals** A (the Copyist: runaway joined + first idiom named + Touch) and B (the exile: Swap, Draw, Erase + a proven invention), each as a note under the attic door and one tap to welcome her (§2 "How they join").
- **Notebook presence:** a Household section in the Codex listing only those who joined; nothing anywhere (shelf, codex, offers, counts, Lab lists in campaign) names an unrevealed person (§1).
- **The canals' placement** (runaway at the second landing, Fuse guaranteed in rooms 1–3, §5b) against today's canal rooms; the other four district placements are **data that waits** for each district build.

**Leaves out** (owner): the registry schema, `joinHousehold`, shelf, tokens, slots (HC); Pull/Hop/Swap and the seven habits' rules, previews, scenario tests and fine print (AH); the offer-kind registry, offer cards host, district module files (DK); re-laid canal rooms and the landing's art (CN); the other districts' rooms and their recruit/page placement data (IQ, BH, BR, BF, CG); a tenth arrival and the copy-page helper (parked, §0c).

## 2. Proposals

| # | Proposal | Reason |
|---|---|---|
| P1 | **Preconditions are data plus derivation.** Each recruit declares `found` (`{ district }` or `{ door: 'A' \| 'B' }`), a `beat` (`landmark`, `joined: id`, `idiomNamed`, `provenInvention`; a list, all must hold) and `runes: { all: RuneId[], any?: RuneId[] }` (habit lean or school rune). **Starter-page runes are not typed by hand**: they are parsed from `starterPage`, minus `START_KNOWN`, and added to `all` | §0d makes every page rune a precondition; deriving it means a page edit can never leave a recruit with a dead page |
| P2 | **Readiness is computed, never stored**, for district recruits: `owned = profile.known ∪ trip loot pages` at roll time. On a wipe the page goes with the trip, so a person met this trip may be hidden again next trip until the page is re-learned (the guarantee re-offers it). No "revealed" latch | A latch could let her join without her rune, which breaks "a habit is never dormant" (§1); runes in the household are never lost, so §1's one-way rule holds for everything banked |
| P3 | **Door arrivals latch.** At home, after banking (return or wipe) and on load, `doorArrivals(p)` writes at most **one** ready arrival into `profile.recruits.notes`; a note stays until tapped and cannot be refused. **Not on the same homecoming a district recruit joined**, so each newcomer gets her own moment | "Proven" uses a rolling proof window and could lapse; a note is a promise the house keeps. One per return avoids the runaway and the Copyist crowding one evening |
| P4 | **"First idiom witnessed"** = any `idiom:*` in `profile.named` (trip fights, kept on a wipe as today). **"A proven invention"** = a household invention whose cell appears in at least `TUNING.provenCasts` (5) of one apprentice's proof masks (`profile.proof`, `masksFrom`), i.e. a single-cell proof as Glyph proof already counts | Reuses the built proof record; same number the player already knows from Fair Copy |
| P5 | **One precondition guarantee per offer roll, after the table's own.** `guaranteesFor(p, trip, room)` returns at most one missing page in a fixed priority (the recruit placed earliest in the city, then rune order); the table's `guaranteed` (Conduct at the Seam heart) stays first. Pages never displace the recruit card | Keeps rooms from becoming three forced pages; deterministic from the seed |
| P6 | **Seam guarantees only for heard districts.** A Seam page is guaranteed in the Seam's deep and heart rooms while a recruit **whose district is heard** (or a door arrival whose other beats hold) is not in the household or the trip's loot and lacks it | Without this every first trip's deep room would push Touch, Splash, Steam and Brass and retune the tutorial; the canals are heard right after the first oil fire, so Touch still arrives in time |
| P7 | **The recruit card is an extra offer**, appended after the normal three ("someone joins you"), costing the room's pick like any card. At most one recruit per trip per apprentice; it never rolls by weight | "Taking it costs that pick" without shrinking the page choice; it must show every time she is ready, so it cannot be a weighted entry |
| P8 | **Placement lives with the district.** `DistrictDef.recruit?: { apprentice, room }` and `DistrictDef.recruitPages?: { for, runes \| any, rooms }[]` (requested from DK-1). RC fills the canals; IQ/BH/BR/BF fill theirs; CG fills the exile's Board pages (rooms 1–3). An apprentice with no placement in a playable district is simply never shown | build-program §1 gives districts their recruit placement; unbuilt districts need no stub content |
| P9 | **Live only when the kit works.** A placement is active only when the apprentice's action and habit are registered (AH); integrity tests fail if a playable district places a recruit whose habit has no implementation | A recruit must be "useful at once" (§0b) |
| P10 | **Habit ids** proposed to AH: `fuseStep` (R), `doubleMark` (N), `steamProof` (B), `holdTwo` (W), `unisonBeside` (T), `longTouch` (C), `restoreErase` (E). AH-W0 owns the union; RC follows AH's names if they differ | RC data compiles before AH's rules exist |
| P11 | **Towel-bearer's school rune** is `any: [vat, seep, steep]`; her guarantee offers the first one the bathhouses' pre-landmark table holds (BH may override) | §2 says "at least one Areas rune" |
| P12 | **The note names the milestone:** "I read about the Bonfire you lit…" (the first named idiom) or the proven invention's own name; fixed text otherwise. Welcoming opens her full card, then she sits on the bench | "Someone has read your work" (§0b), and the player sees which work |
| P13 | **Codex Household tab** lists joined apprentices only (card, habit line, where met, witnessed habit fine print from AH), and is **left out of the "x / y known" count** | A total of nine would hint at the missing (§1: no `???`) |
| P14 | **Request to HC (P16):** in a campaign the Lab's lineup picker lists the household; every registry apprentice only with the dev "open all"/scenario mode | §1 lets the Lab field anyone, but a full list on a normal save would show silhouettes of the unmet |

No **Redefines** of design decisions. P2 and P6 are the closest (they read §1 "visibility is one-way" and §0d "while some recruit still waits" narrowly); both are listed for the player in §7 and §8.

## 3. Current implementation and risks

- `src/data/loot.ts`: one `guaranteed` page per table (`heart` → Conduct); `START_KNOWN` is the seven basics; Touch only in `shallow`/`heart`, Splash/Steam/Brass in `deep`; canal tables have no guarantee. `src/data/districts.ts`: canals `landings: [0, 2, 4]`, rooms 1–2 `canalShallow`, 3–4 `canalDeep`, room 3 has 1 pick.
- `src/engine/run.ts`: `rollOffers(seed, encounter, table, members, key, owned)` puts `guaranteed` first while missing; `ownedBy(p, t)` merges trip loot; `finishEncounter` rolls; `pickLoot` special-cases the doorway; `returnHome` banks by kind; `LootItem`/`parseLoot` are closed switches. DK-2 moves this to `src/engine/trip/`, DK-7 opens the kinds.
- `src/engine/proof.ts` `masksFrom`/`provenCount`; `Profile.proof` per member; inventions (`src/engine/inventions.ts`, `writeInvention`) have no proof of their own, hence P4.
- `src/engine/idioms.ts` names idioms into `named` via `learnFromFight` (trip fights only, win or wipe).
- `src/app/flow.ts` `goHome` (and the wipe path) is where home is regenerated; `src/app/study.ts` has no household notion yet (HC-7 adds the shelf).
- `codexView`/`isKnown` in `run.ts` and `src/data/codex.ts` build a fixed `CODEX` with known/unknown rows; `Codex.svelte` shows a known count.
- **Risks:** (1) three plans (HC, DK, RC) touch the trip flow and loot parsing; RC lands after DK-7 and HC-1 and only registers into them. (2) Guarantees add a second "first" card in rooms that already guarantee, changing Seam loot odds; P5/P6 bound it and the calibration sim watches it. (3) The runaway cannot ship until AH's Pull and her habit exist (P9). (4) A hidden person must leak nowhere: offer card ids in saves, test ids in the DOM, codex totals, Lab lists (§7 checks all four).

## 4. Contracts

**Provides**
- *Data (RC-W0/RC-1):* `RecruitDef = ApprenticeDef & { found, beat: Beat[], runes: { all, any? } }`; `RECRUITS` (seven entries); `Beat = { kind: 'landmark' } | { kind: 'joined'; who } | { kind: 'idiomNamed' } | { kind: 'provenInvention' }`; placement types `RecruitPlacement { apprentice, room }` and `RecruitPages { for, runes | any, rooms }` for `DistrictDef`.
- *Engine (`src/engine/recruits.ts`, RC-2/3/6):* `preconditionsOf(id)` (with derived page runes); `isReady(p, id, ctx: { trip?, atLandmark? })`; `waitingFor(p, trip)`; `guaranteesFor(p, trip, room) → LootSpec | null`; `provenInvention(p)`; `doorArrivals(p) → ApprenticeId | null`; `welcome(p, id)` (removes the note, calls `joinHousehold`); `isRevealed(p, id)` = in household or holding a note (the only test UI uses).
- *Offer kind (RC-4, via DK-7):* `{ kind: 'recruit', apprentice }` with roll (landmark + ready + not in household/loot), pick (costs the pick), bank (`joinHousehold`), wipe (lost), limit one per apprentice per trip, parse/validate.
- *Profile:* `recruits: { notes: ApprenticeId[] }`, parsed with an empty default (folded into HC's save v9 if they ship together).
- *UI:* `RecruitOfferCard.svelte`, `DoorNote.svelte`, a Codex Household tab; all render HC's `ApprenticeToken` and card fields.

**Consumes**
- **HC-W0/HC-1:** `ApprenticeDef`, `ApprenticeId` from registry keys (so RC entries are just data), the `RECRUITS` stub, `joinHousehold` (bench, starter page, current ink), `inHousehold`; HC-6 tokens and nine hues/shapes (RC assigns R N B W T C E); HC-7 shelf and Study (RC mounts the note with one line). Assumes `joinHousehold` compiles any starter page with the recruit's lean.
- **DK-2/DK-7/DK-12:** the trip flow in `src/engine/trip/`, the offer-kind registry with `extra` offers, offer-card registry. **Request DK-R1:** an offer *contributor* hook run on every roll returning `{ must?: LootSpec, extra?: LootItem[] }` (RC uses it for guarantees and the card), and `DistrictDef.recruit`/`recruitPages` fields in DK-1. DK-18's fixture district hosts RC's abstract checks.
- **AH:** `BasicActionId` handlers for Pull, Hop, Swap and the seven habits registered by id (P10); habit fine-print lines for the codex.
- **District plans (CN first, then IQ, BH, BR, BF, CG):** their placement data; CN may move the runaway's room when it re-lays the canals.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0** |
| RC-W0 | Contracts: `RecruitDef`, `Beat`, placement types, the recruit `LootItem` shape, `profile.recruits`, signatures of §4 with stubs; habit ids handed to AH (P10); request DK-R1 written up for the orchestrator | `src/data/recruits.ts` (types), `src/engine/recruits.ts` (stubs) | Strong | S | HC-W0, DK-1 | `pnpm check` green, no behaviour change; AH, DK and district plans can write against it |
| **Wave 1** |
| RC-1 | The seven entries exactly as party.md §2 (§0d for R): bodies, actions, leans, habit ids, starter pages, tokens, looks, blurbs, `found`, beats, rune needs | `src/data/recruits.ts`, `tests/data/recruits.test.ts` | Medium | M | RC-W0 | Every page parses and compiles under its lean within the starting ink; derived page runes ⊆ preconditions ∪ START_KNOWN; only E's page holds a Board rune; tokens unique across the registry; a table test reproduces §2 field by field |
| RC-2 | Precondition engine (P1, P2, P4): owned set with trip loot, beats, `provenInvention`, `isReady`, `waitingFor` | `src/engine/recruits.ts`, `tests/engine/recruits.test.ts` | Strong | M | RC-1 | For each apprentice, all-met → ready and each single missing precondition → hidden; a page in room-2 loot makes a room-4 landmark ready; a wipe-lost page hides again; idiom named on a wipe counts |
| RC-3 | Guaranteed pages (P5, P6, P11) through DK-R1: district pages in placed rooms, Seam pages in deep/heart for heard districts, one per roll after the table's guarantee | `src/engine/recruits.ts` (guarantees), contributor registration in RC's own module | Strong | M | RC-2, DK-7, DK-R1 | Same seed → same offers; Conduct still first at the heart; nothing guaranteed once owned, joined or in loot; a fresh notebook's first trips roll exactly as before (calibration baseline) |
| RC-4 | Recruit offer kind (P7) registered in DK-7: roll at the landmark when ready, pick, bank via `joinHousehold`, lost on wipe, re-offered next trip, one per apprentice, save parse/validation | `src/engine/recruits.ts` (offer kind), `tests/run/recruit-offer.test.ts` | Strong | M | RC-2, DK-7, HC-1 | Take → home → on the bench with her page; take → wipe → gone and offered again next trip; decline → offered next trip; a save with a pending recruit round-trips; an unknown apprentice id in a save is refused |
| **Wave 2** |
| RC-5 | The canals' placement: runaway at the second landing (room 3), Fuse guaranteed in rooms 1–3; integrity rules for every placement (page rooms before the landmark, habit implemented, unplaced recruits belong to `drawing` districts) | canals district data (`recruit`/`recruitPages` lines only), `tests/data/integrity.test.ts` (recruit section) | Medium | S | RC-3, RC-4, HC-3, AH (Pull, `fuseStep`) | A trip with Fuse and Touch owned shows her at room 3's loot; without either she is absent and Fuse/Touch are offered where placed |
| RC-6 | Door arrivals (P3, P4, P12): `doorArrivals` after banking or a wipe and on load, one note per homecoming, not on a recruit's homecoming, latched; `welcome`; note texts | `src/engine/recruits.ts` (arrivals), `src/app/flow.ts` (`goHome`/wipe/load calls only), `tests/run/door-arrivals.test.ts` | Strong | M | RC-2, HC-1 | Copyist never before the runaway joins; notes appear in order on separate homecomings; a lapsed proof keeps a written note; welcome is idempotent |
| RC-7 | Screens: recruit offer card, the note under the door in the Study and its welcome sheet, the trip page "joined the household" line | `src/ui/components/recruits/` (new), one mount line in `Study.svelte`, the card in DK-12's registry, trip-page highlight entry | Medium | M | RC-4, RC-6, HC-6, HC-7, DK-12 | At 375×812: the loot screen with three pages plus her card, the Study with a note, the welcome sheet, the bench after welcome; autofixer clean |
| RC-8 | Codex Household tab (P13): joined only, card, where met, habit line, witnessed habit lines; left out of the count | `src/ui/screens/Codex.svelte` (tab), `src/app/` codex helper, `tests/app/codex.test.ts` | Medium | S | RC-1, HC-6, AH (habit lines) | A fresh save shows the pair only and the same "x / y known" as before; a joined runaway appears; nothing for anyone unjoined |
| **Wave 3** |
| RC-9 | No-soft-lock and no-leak proof (§7), handoff notes for DESIGN §6.1, TECH §7 (`profile.recruits`, DK-R1) and ROADMAP for the orchestrator, plus a one-paragraph "placing your recruit" note for district plans | `tests/sim/recruits.test.ts`, `tests/sim/bot.ts` (recruit policy), `docs/plans/recruitment-verification.md` | Strong | M | RC-3–RC-8, DK-18 | All §7 checks green; screenshots captured |
| **Gate** | **Playtest:** meeting the runaway at the second landing (declining once, taking her), a wipe with her in the loot, the Copyist's note | player | — | — | RC-9 | Feel recorded; P2, P3, P6, P7 confirmed or changed |

## 6. Verification

- **Static (integrity test):** for every apprentice, each precondition rune (and one member of each `any`) has a guarantee source: its own district's `recruitPages` in rooms strictly before the landmark, or (Seam runes) the Seam's deep/heart rooms; the landmark room exists and comes after those rooms; every door arrival's pages are placed by some district or the Seam.
- **Property fuzz** (`tests/sim/recruits.test.ts`, ≥500 cases): random reachable profiles (known ⊇ START_KNOWN, random household, heard districts, notes) × trip seeds × rooms. Invariants: (a) a waiting recruit missing a guaranteed rune gets it offered in every placed room (or the one-per-roll slot holds another waiting page, and repeating the room eventually offers hers); (b) the recruit card appears exactly when ready at the landmark; (c) nothing unrevealed appears in offers, shelf view models, codex rows or the campaign Lab list; (d) readiness is monotone over banked runes.
- **Campaign bot** (existing `tests/sim/bot.ts` on the real Seam and canals): an eager policy that takes precondition pages and recruits reaches the runaway and then the Copyist's note within a bounded number of trips on 50 seeds; a random-pick policy with random wipes never reaches a state violating (a). The four unbuilt recruits and the exile run the same sims on DK-18's fixture district with fixture placements.
- **Engine tests:** RC-2/RC-4/RC-6 tests above; no scenario tests here (habits are AH's).
- **Phone (375×812, `verify` skill):** loot with the recruit card, Study with a note, welcome sheet, bench after joining, Codex Household tab, light and dark; Svelte autofixer on every new or changed component.

## 7. Open questions for the player

1. **The exile's "proven invention":** five trip casts of an invention, as a Glyph is proven (P4)? Or a Glyph at its top tier (party.md's alternative)? *Default:* five casts.
2. **A note after a wipe:** may the Copyist knock on the evening the party came home wiped (P3)? *Default:* yes; she read the notebook, not the trip.
3. **Met, then hidden again (P2):** if the page that revealed the runaway was lost on a wipe, she is hidden until it is re-learned. Fine, or should meeting her once keep her offered? *Default:* hide; a latch would let her join with a page she cannot cast.

## 8. Execution notes

- **Critical path:** HC-W0 + DK-1 → RC-W0 → RC-1 → RC-2 → RC-4 (needs DK-7, HC-1) → RC-5 (needs AH's runaway kit, HC-3) → RC-7 → RC-9 → playtest.
- **Parallel:** RC-3 beside RC-4; RC-6 beside RC-4/RC-5; RC-8 any time after RC-1 and HC-6. RC-W0 and RC-1 can start as soon as HC-W0 exists, before DK.
- **Cross-plan order:** DK-7 (with DK-R1) before RC-3/RC-4; AH's Pull and `fuseStep` before RC-5; CN can ship with RC-5 and later move the room; IQ, BH, BR, BF and CG add their placement lines and the integrity test checks them.
- **For the orchestrator:** P2 and P6 read §1/§0d narrowly; take them to the player with the gate. P14 is a request against HC's P16.
- **Size:** 10 tasks plus a gate: 3 S, 7 M (W0 included), no L; roughly an M–L build, mostly engine and tests.
