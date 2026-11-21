# Drawn calibration (CAL-5)

Tasks 1–2 below were measured on `29063e5` after the CAL-1–4 applications. The drawn Marginalia has its own 16 HP. That revision includes the 72 HP authored Marginalia, revised canal layouts, baths 32/1/1 and Steward 38, Chief Warden 28, quarter deliveries, Registrar 40 and Carillonneur 57.

## Task 3 measurement protocol

The application starts from `48ac3f0`, with the 32 HP authored Chief and 28 HP drawn Chief, the Carillonneur's H2 hook, the 12/6 HP loft and the bot attack guard. Freeze the corpus, lineups, starter pages, seeds and fight policy below for the paired comparison. Judge walkovers across all fresh ordinary offers, with unverified and invalid layouts reported alongside that rate. Compare the three fresh heart bands to EN-13 with equal weight across lineup sizes and masters, and print each lineup separately.

The household results below are historical. The starting revision's HC-9 random-walk assertion already excludes out-of-room units, which keep their last tile when they fall. Rerun the entire 50-seed household sweep on the application without edits to its tests. Run one slow sim at a time under `caffeinate -i`.

### Starting-revision rerun

The full `CAL5=1 CAL5_DETAIL=1` baseline on `48ac3f0` passed 6/6 in 859 seconds. It measured 822 fresh fights, 471 carried fights and 144 actual trips with zero fight errors, operation-budget stops or generator event caps. Fresh hearts entered with HP/charges of 6/5, 14/10 and 20/16 for solo, pair and trio. The results below include fallbacks.

| Band | Fresh pooled wins | W/L/S | Solo/pair/trio wins, each of 32 | Above upper band |
| --- | ---: | --- | --- | ---: |
| Light (60–75%) | 73/96 (76.0%) | 73/5/18 | 17/25/31 | 1.0 pp |
| Medium (45–60%) | 68/96 (70.8%) | 68/8/20 | 15/21/32 | 10.8 pp |
| Heavy (30–45%) | 71/96 (74.0%) | 71/5/20 | 14/25/32 | 29.0 pp |

Fresh ordinary walkovers were 76/534 (14.2%), split 28/102 light, 21/192 medium and 27/240 heavy. Of 534 offered layouts, 351 were fair within four attempts, 107 were fallback offers and 105 were unverified. The oracle flagged 99 offered layouts. The 288 fresh heart offers included 98 fallbacks, 92 unverified. The Lamp-mother's 12 pair fallbacks were all unverified, then won through the app in rounds 17–23. The Carillonneur's 12 pair fallbacks were all unverified and produced 5 losses and 7 stalls. All 12 trios won against each master. Carried trips reached 68 hearts and cleared 24/144 trips, with 42 losses and 78 stalls.

### Paired data candidates on the final authored revision

The comparison uses all 534 fresh ordinary offers, paired by name, depth, lineup and seeds 1–2. Reproduce by setting `bandBonus` to each candidate in `src/data/drawing.ts` and running the same command with `CAL5=1 CAL5_ORDINARY=1 CAL5_DETAIL=1` and `-t 'production corpus tables'`. For the step candidate, use `CAL5_CANDIDATE=step2` with the default band bonuses. The full fight policy and production trial limits match the baseline.

| Candidate | Walkovers L/M/H | Walkovers total | Fair | Fallback | Unverified | Invalid offers | App W/L/S |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `bandBonus` 0/1/2, step 1 | 28/21/27 | 76 (14.2%) | 351 | 107 | 105 | 99 | 510/6/18 |
| `bandBonus` 1/2/3, step 1 | 28/16/28 | 72 (13.5%) | 348 | 123 | 111 | 102 | 489/10/35 |
| `bandBonus` 2/3/4, step 1 | 27/15/30 | 72 (13.5%) | 340 | 127 | 113 | 102 | 481/16/37 |
| `bandBonus` 0/1/2, step 2 | 25/27/51 | 103 (19.3%) | 354 | 77 | 77 | 77 | 509/7/18 |

Solo accounted for 57 of the baseline's 76 walkovers. A lower party slope (`perMember` 1 with `bandBonus` 3/4/5) would give the solo/pair/trio budgets already measured at +2/+1/+0, respectively. Selecting those rows gives 68 walkovers, 113 unverified and 102 invalid in 534 fresh offers. Increasing the opening budget traded a small improvement in walkovers for more unverified offers and failed layout checks.

### Delegated application and register rows

Retain the production data. The two-point step prevented 28 unverified offers but added 27 walkovers, 24 of them heavy. Both measured budget increases left walkovers above 10% and increased invalid offers. The frozen corpus preserves the pen and loot decisions from tasks 1–2. With the starting data retained, the full starting-revision rerun is also the application measurement. Fresh heart rates stay 76.0%, 70.8% and 74.0%, and fresh ordinary walkovers stay 14.2%. Heart scaling, piece reach and peal allocation are separate design findings.

| Pack | Tunable / source | Current | Candidate | Baseline measurement | Candidate measurement | Band / miss | Bot / corpus / command / revision | Player decision | Applied revision / rerun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAL-5 | `GEN_TUNING.bandBonus` | 0/1/2 | 1/2/3 | 76 walkovers, 105 unverified, 99 invalid of 534 | 72/111/102 | 13.5%, +3.5 pp | Final paired fresh ordinary corpus, `48ac3f0` | Retain 0/1/2 under delegation | Full source-default rerun |
| CAL-5 | `GEN_TUNING.bandBonus` | 0/1/2 | 2/3/4 | 76 walkovers, 105 unverified, 99 invalid of 534 | 72/113/102 | 13.5%, +3.5 pp | Same paired corpus | Retain 0/1/2 under delegation | Full source-default rerun |
| CAL-5 | `GEN_TUNING.perMember` and `bandBonus` | 2 and 0/1/2 | 1 and 3/4/5 | 76 walkovers, 105 unverified, 99 invalid of 534 | 68/113/102 from effective budgets measured at +2/+1/+0 | 12.7%, +2.7 pp | Recombined solo/pair/trio rows from paired corpus | Retain 2 and 0/1/2 under delegation | Full source-default rerun |
| CAL-5 | `GEN_TUNING.step` | 1 | 2 | 76 walkovers, 105 unverified, 99 invalid of 534 | 103/77/77 | 19.3%, +9.3 pp | Same paired corpus, `CAL5_CANDIDATE=step2` | Retain 1 under delegation | Full source-default rerun |
| CAL-5 | Drawn heart weight scaling | Frame HP | Master HP offsets +4/+12/+24 | 73/68/71 wins of 96 per band | Prototype pending | +1.0/+10.8/+29.0 pp | Full fresh app-path hearts, `48ac3f0` | Defer to design | Defaults rerun |
| CAL-5 | Piece reach and minimum stamp | Foot-only local checks | Cast reach 4 and validate stamped pieces | 99/534 invalid ordinary offers | Prototype pending | 99 flagged | Final paired corpus, seed-1 kit probes | Defer to design | Defaults rerun |
| CAL-5 | Length-six peal hook allocation | Sorted notes | Distinct notes first | `1,2,3,4,1` hung as `1,1,2,3` | Prototype pending | Note 4 displaced | Full rerun's save/reload setup probe | Defer to design | Defaults rerun |
| CAL-5 | Steward lite trial heat | 1 | 4, matching app heart | Heat four in the app fight, rule default one in lite trial | Prototype pending | Setup parity | `trialRules`, `heartConfig` and full fresh corpus | Defer to design | Defaults rerun |

### Design findings for a separate brief

| Finding | Exact prototype to measure |
| --- | --- |
| Heart weight | `baseBudget` reads the weight band, but `composeHeart` uses the master's frame and `checkGenerated` exempts heart foe cost. Test adding **4/12/24 HP** to the drawn master's effective base HP for light/medium/heavy, respectively. Use the same HP in the lite trial, fallback trial and app encounter. Treat these as exploratory values. The prior Marginalia 16 → 32 probe delayed wins and made 12 offers unverified without reducing wins. Track losses, stalls and verification separately. |
| Piece reach | In the Cartographers paper and bridge pier checks, require every start to remain connected on foot. For an anchored or flying foe also allow an unobstructed cardinal cast of at most **4 tiles** from the reached region, evaluated after unsupported bridge spans are removed. Validate selected pieces present in the minimum fallback stamp. Compare `Medium Lamplighter` and `Heavy Mother` at seed 1 and require **0** invalid offers in the full corpus. |
| Length-six peal | Keep all **5** room entries in trip state. Reserve one hook for each distinct earned note first, honoring named hooks, then use duplicate notes to fill remaining bare hooks. For **4** bare hooks and entries `1,2,3,4,1`, expect `1,2,3,4`. For **0** hooks, hang zero and disclose that limitation when drawing the peal. |
| Steward judge parity | The app activates boil-over at heat **4** and the lite trial uses the rule default of **1**. Test heat **4** for both trial paths, including the authored fallback, against the same fresh corpus. |

### Task 3 verification

| Check | Result on the retained defaults |
| --- | --- |
| `pnpm check:fast` | 414 files, 8,723 tests passed, 13 todo. Existing lint warnings in PenPot and the foundry bench test. |
| Full CAL-5 drawn corpus | 6/6 passed, including palette coverage, pen, loot, stored-room reload and peal setup. |
| Historical-corpus generator fuzz | 9/9 passed in 115 seconds, including 500 layouts and 50 deterministic replays. |

The 500-seed fuzz had 30 walkovers (6.0%) and no fallback, unverified offer, invalid layout or event cap. It offered 370/500 within two attempts and verified all 500 within four. Fair within four was 470/500 (94.0%) against the 94.4% watch value. Offered win round and HP-left medians were 3 and 85.7%. Desktop median/p95 was 179/407 ms. The production corpus's 14.2% walkovers and 99 invalid offers remain separate misses.

## Corpus and reproduction

The frozen corpus contains eight drawings per weight band and one of each master in each band. They cover every offered rule and shape at least once and lengths 3–6. The entries pair several masters with different shapes or drawing rules and hold their shipped frame setup. The roster is the Draughtsman, then the Stoker, then the Lamp-pole Runaway. Each member uses their starter lattice, with compiled source coordinates, paths and charge counts in the `CAL5 CONFIG` output. The profile fixtures specify synthetic milestone inputs for pen and device reproduction. Player-exported saves were unavailable. [Drawings](../../tests/fixtures/calibration/drawings.ts) · [Profiles](../../tests/fixtures/calibration/profiles.json)

Run the commands serially. The production judge uses fresh HP and charges, salted boards, 4 tries (3 at the heart), 8 draws per try, 12/16 rounds and 6,000 applied actions per trial. The actual fights start through the same battle setup as the app. They use gauge and cracks, full movement search, Hold scoring off, 40 rounds and 600 applied actions. Fresh fights inspect all depths with initial shape state and default route. Carried trips pick the first loot, leave the quiet doorway with the same lattice and continue for up to 60 steps. The bridge fork uses its offered routes in seed order. Carried reach and clears use the original trips as their denominator. Round limits, operation limits, losses and stalls are recorded separately.

```sh
caffeinate -i pnpm vitest run tests/sim/generator.test.ts --reporter=dot
caffeinate -i env CAL5=1 CAL5_DETAIL=1 pnpm vitest run tests/sim/drawn-calibration.test.ts --reporter=dot
caffeinate -i env CAL5=1 CAL5_PAIR=1 CAL5_ORDINARY=1 CAL5_CANDIDATE=step2 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'production corpus tables' --reporter=dot
caffeinate -i env CAL5=1 CAL5_MASTER=marginalia CAL5_CANDIDATE=marginalia32 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'production corpus tables' --reporter=dot
caffeinate -i env HOUSEHOLD_SWEEP=1 pnpm vitest run tests/sim/household-sweep.test.ts --reporter=dot
```

Defaults are seeds 1–2 per fresh ordinary encounter, 1–4 per fresh heart and 1–2 per carried trip. The emitter prints distributions in p05/median/p95 order, by master, band, party and depth, and exposes per-room JSON with `CAL5_DETAIL=1`. It includes generation outcomes even when app setup or a fight throws. Tasks 1–2 injected their candidates through the corpus test's Vitest module. The historical generator sweep and household assertions use the production configuration. Desktop generation timings use Node 24.19 on macOS 26.7.3 (x86_64), with concurrent machine load. CAL-P owns device measurements.

## Historical 500-seed EN-S1/EN-S2 sweep

9/9 passed in 121 s, including the 50 deterministic replays. Offered attempts 1–4 were 239/131/67/63. First fair by attempt was 239/131/67/33, with 30 seeds never fair. Within two attempts was 370/500 (74.0%). All 500 were verified within four and all passed the layout oracle, with zero fallback, unverified or capped trials. Dull and walkovers were both 30/500 (6.0%), compared with EN-G0's 28/500 (5.6%) watch. Fair within four was 470/500 (94.0%) compared with the 94.4% watch. Offered win round p05/median/p95 was 3/3/4, with 60/85.7/95% HP remaining.

| Budget | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Offered | 8 | 21 | 85 | 123 | 112 | 88 | 52 | 10 | 1 |

The 954 bot trials had median/p95 13/20 operations. Per-room median/p95/max was 22/47/90 operations. There were six guardrail redraws and no rejected attempts. Desktop median/p95 was 187/423 ms.

## Pen, cost and loot candidates

Pen contributions are hearts/pages/capstones. Affordability counts the frozen light/medium/heavy groups, with palette and needs enforced. The opening and mid-campaign milestones predate the handover, so these rows describe potential pen capacity before the drawing table unlocks.

| Snapshot | Origin | Known pages | Pen contributions | Total | Compatible | Affordable L/M/H | Largest affordable corpus cost |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: |
| Opening | Synthetic | 8 | 1/2/0 | 3 | 1 | 1/0/0 | 3 |
| Mid-campaign | Synthetic | 18 | 4/4/0 | 8 | 8 | 3/0/0 | 8 |
| Low handover | Synthetic | 25 | 7/6/0 | 13 | 24 | 8/8/0 | 13 |
| High handover | Synthetic | 31 | 7/7/5 | 19 | 24 | 8/8/8 | 18 |
| Full palette | Synthetic | 31 | 7/7/7 | 21 | 24 | 8/8/8 | 18 |
| Seven returned district saves | Frozen bot recordings, before handover | 8 each | 0/2/0 each | 2 each | 0 each | 0/0/0 each | — |

Run `CAL5_CANDIDATE=pen5 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'pen availability' --reporter=dot` (or `piece2` in the same command) and `CAL5_CANDIDATE=loot4 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'seeded drawn loot' --reporter=dot`. Compare to the same tests with no override.

| Source and exact candidate | Paired comparison | Delegated decision |
| --- | --- | --- |
| `PEN_TUNING.pagesPerPoint` 4 → 5 | Milestone totals 3/8/13/19/21 → 2/7/12/18/20. Low handover affordance 8/8/0 → 8/4/0. High handover still affords all 24. | Retain 4. Current progression gives low handover a full medium selection while reserving the sampled heavy drawings for mastery. |
| `COSTS.piece` 1 → 2 | Low handover 8/8/0 → 8/5/0. High handover 8/8/8 → 8/8/7. Frozen drawing bands agree across both values. | Retain 1. The candidate narrows ordinary composition at low handover and has no demonstrated combat benefit. |
| `DRAWN_LOOT.weights.heavy.page` 3 → 4 | Seeds 1–64 at high handover yielded 512 openings and 512 hearts per band with three cards each. Heavy method cards rose from 398 to 455 at the opening and from 393 to 452 at the heart (of 1,536 each). Heart method cards for light/medium rose from 494/400 to 566/475. Pick counts stayed 1/1/2 before the heart and 2 at the heart. | Retain 3. The heavier page weighting cuts the relative share of consumables at every heart. There is no evidence from player saves to prefer that exchange. |

## Length-six peal setup probe

A setup-only save with five recorded entries `1,2,3,4,1` round-tripped all five through the save parser. The Carillonneur fallback's four bare hooks received `1,1,2,3`, with the repeated one displacing note four. Tune activated at battle start. Combat and trip totals exclude this probe. A design choice is needed on whether a repeated note should occupy a hook ahead of a distinct note when a peal has five approaches.

## Production corpus results

Win, loss, stall and error counts use all encountered rooms as denominator. A budget stop is included in stalls. Dashes mark zero reach. Layouts are the particular named drawings in the frozen corpus at each seed. Each distribution is p05/median/p95.

### Fresh hearts vs EN-13

| Band | Target | Pooled wins | Pooled result | Solo wins | Pair wins | Trio wins | Pooled L/S/E |
| --- | --- | --- | --- | --- | --- | --- | --- |
| light | 60–75% | 73/96 (76.0%) | 1.0 pp above | 17/32 (53.1%) | 25/32 (78.1%) | 31/32 (96.9%) | 5/18/0 |
| medium | 45–60% | 68/96 (70.8%) | 10.8 pp above | 15/32 (46.9%) | 21/32 (65.6%) | 32/32 (100.0%) | 8/20/0 |
| heavy | 30–45% | 71/96 (74.0%) | 29.0 pp above | 14/32 (43.8%) | 25/32 (78.1%) | 32/32 (100.0%) | 5/20/0 |

The EN-13 band has no specified party size. The pooled estimate assigns equal weight to the three lineups and eight masters per band. The per-lineup rows show how that choice affects the comparison. A heart target comparison uses fresh fights started by the app, including offered fallbacks.

### Fresh and carried fights by depth

| Entry | Party | Band | Depth | Reached/attempted | W/L/S/E | Budget stops | Rounds | HP in → left | Charges in → left | Actions | Choices |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/4/9 | 6/6/6 → 2/6/6 | 5/5/5 → 0/1/4 | 6/10/26 | — |
| fresh | 1 | light | 2 | 16/16 | 16/0/0/0 | 0 | 2/6/11 | 6/6/6 → 5/6/6 | 5/5/5 → 0/0/3 | 5/16/32 | — |
| fresh | 1 | light | 3 | 2/2 | 2/0/0/0 | 0 | 3/3/3 | 6/6/6 → 4/5/5 | 5/5/5 → 2/2/2 | 7/9/9 | — |
| fresh | 1 | light | heart | 32/32 | 17/2/13/0 | 0 | 5/40/41 | 6/6/6 → 3/6/6 | 5/5/5 → 0/0/4 | 14/85/120 | — |
| fresh | 1 | medium | 1 | 16/16 | 15/0/1/0 | 0 | 1/4/41 | 6/6/6 → 1/6/6 | 5/5/5 → 0/1/4 | 1/10/85 | — |
| fresh | 1 | medium | 2 | 16/16 | 16/0/0/0 | 0 | 2/5/7 | 6/6/6 → 1/5/6 | 5/5/5 → 0/0/4 | 3/13/20 | — |
| fresh | 1 | medium | 3 | 16/16 | 16/0/0/0 | 0 | 2/5/6 | 6/6/6 → 2/6/6 | 5/5/5 → 0/0/4 | 4/13/17 | — |
| fresh | 1 | medium | 4 | 12/12 | 11/1/0/0 | 0 | 2/5/8 | 6/6/6 → 0/5/6 | 5/5/5 → 0/0/3 | 4/13/22 | — |
| fresh | 1 | medium | 5 | 4/4 | 4/0/0/0 | 0 | 5/6/6 | 6/6/6 → 4/4/6 | 5/5/5 → 0/1/1 | 13/14/17 | — |
| fresh | 1 | medium | heart | 32/32 | 15/4/13/0 | 0 | 5/40/41 | 6/6/6 → 3/6/6 | 5/5/5 → 0/0/4 | 15/85/120 | — |
| fresh | 1 | heavy | 1 | 16/16 | 14/1/1/0 | 0 | 2/5/41 | 6/6/6 → 0/6/6 | 5/5/5 → 0/1/3 | 4/13/85 | — |
| fresh | 1 | heavy | 2 | 16/16 | 15/0/1/0 | 0 | 2/5/41 | 6/6/6 → 1/6/6 | 5/5/5 → 0/0/4 | 4/13/88 | — |
| fresh | 1 | heavy | 3 | 16/16 | 11/2/3/0 | 0 | 3/6/41 | 6/6/6 → 0/6/6 | 5/5/5 → 0/0/2 | 7/18/89 | — |
| fresh | 1 | heavy | 4 | 16/16 | 11/0/5/0 | 0 | 3/8/41 | 6/6/6 → 1/6/6 | 5/5/5 → 0/0/2 | 7/21/89 | — |
| fresh | 1 | heavy | 5 | 16/16 | 8/2/6/0 | 0 | 3/9/41 | 6/6/6 → 0/6/6 | 5/5/5 → 0/0/2 | 7/27/87 | — |
| fresh | 1 | heavy | heart | 32/32 | 14/4/14/0 | 0 | 3/40/41 | 6/6/6 → 1/6/6 | 5/5/5 → 0/0/4 | 9/85/120 | — |
| fresh | 2 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/3/4 | 14/14/14 → 12/14/14 | 10/10/10 → 2/5/7 | 7/13/18 | — |
| fresh | 2 | light | 2 | 16/16 | 16/0/0/0 | 0 | 2/3/5 | 14/14/14 → 10/14/14 | 10/10/10 → 1/5/7 | 9/13/24 | — |
| fresh | 2 | light | 3 | 2/2 | 2/0/0/0 | 0 | 2/3/3 | 14/14/14 → 12/14/14 | 10/10/10 → 5/6/6 | 9/12/12 | — |
| fresh | 2 | light | heart | 32/32 | 25/3/4/0 | 0 | 3/10/41 | 14/14/14 → 0/12/14 | 10/10/10 → 0/1/6 | 13/39/130 | — |
| fresh | 2 | medium | 1 | 16/16 | 16/0/0/0 | 0 | 1/3/5 | 14/14/14 → 9/14/14 | 10/10/10 → 3/5/9 | 4/14/19 | — |
| fresh | 2 | medium | 2 | 16/16 | 16/0/0/0 | 0 | 1/4/6 | 14/14/14 → 10/14/14 | 10/10/10 → 0/4/8 | 4/17/27 | — |
| fresh | 2 | medium | 3 | 16/16 | 16/0/0/0 | 0 | 1/4/6 | 14/14/14 → 10/14/14 | 10/10/10 → 0/4/9 | 4/18/29 | — |
| fresh | 2 | medium | 4 | 12/12 | 12/0/0/0 | 0 | 2/4/6 | 14/14/14 → 7/13/14 | 10/10/10 → 0/3/7 | 6/18/28 | — |
| fresh | 2 | medium | 5 | 4/4 | 4/0/0/0 | 0 | 3/5/5 | 14/14/14 → 4/10/14 | 10/10/10 → 3/4/4 | 13/20/22 | — |
| fresh | 2 | medium | heart | 32/32 | 21/4/7/0 | 0 | 2/14/41 | 14/14/14 → 4/8/13 | 10/10/10 → 0/1/7 | 10/52/140 | — |
| fresh | 2 | heavy | 1 | 16/16 | 16/0/0/0 | 0 | 1/4/5 | 14/14/14 → 9/14/14 | 10/10/10 → 0/5/8 | 4/16/23 | — |
| fresh | 2 | heavy | 2 | 16/16 | 15/0/1/0 | 0 | 1/4/41 | 14/14/14 → 10/14/14 | 10/10/10 → 0/3/8 | 4/19/93 | — |
| fresh | 2 | heavy | 3 | 16/16 | 16/0/0/0 | 0 | 2/5/8 | 14/14/14 → 10/13/14 | 10/10/10 → 0/2/7 | 7/21/34 | — |
| fresh | 2 | heavy | 4 | 16/16 | 16/0/0/0 | 0 | 2/5/13 | 14/14/14 → 8/13/14 | 10/10/10 → 0/3/7 | 6/20/40 | — |
| fresh | 2 | heavy | 5 | 16/16 | 16/0/0/0 | 0 | 2/5/15 | 14/14/14 → 7/14/14 | 10/10/10 → 0/2/7 | 6/20/55 | — |
| fresh | 2 | heavy | heart | 32/32 | 25/1/6/0 | 0 | 3/10/41 | 14/14/14 → 4/10/14 | 10/10/10 → 0/0/5 | 13/40/140 | — |
| fresh | 3 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/3/4 | 20/20/20 → 17/19/20 | 16/16/16 → 7/11/13 | 9/14/23 | — |
| fresh | 3 | light | 2 | 16/16 | 16/0/0/0 | 0 | 1/3/4 | 20/20/20 → 16/19/20 | 16/16/16 → 5/11/14 | 3/16/25 | — |
| fresh | 3 | light | 3 | 2/2 | 2/0/0/0 | 0 | 2/3/3 | 20/20/20 → 18/19/19 | 16/16/16 → 10/11/11 | 13/13/13 | — |
| fresh | 3 | light | heart | 32/32 | 31/0/1/0 | 0 | 2/6/29 | 20/20/20 → 5/16/20 | 16/16/16 → 0/5/11 | 13/35/116 | — |
| fresh | 3 | medium | 1 | 16/16 | 16/0/0/0 | 0 | 1/3/5 | 20/20/20 → 14/19/20 | 16/16/16 → 6/10/15 | 4/18/28 | — |
| fresh | 3 | medium | 2 | 16/16 | 16/0/0/0 | 0 | 1/3/5 | 20/20/20 → 10/19/20 | 16/16/16 → 6/10/15 | 4/17/25 | — |
| fresh | 3 | medium | 3 | 16/16 | 16/0/0/0 | 0 | 2/4/5 | 20/20/20 → 13/19/20 | 16/16/16 → 5/9/14 | 8/22/28 | — |
| fresh | 3 | medium | 4 | 12/12 | 12/0/0/0 | 0 | 1/4/5 | 20/20/20 → 10/18/20 | 16/16/16 → 3/7/13 | 6/23/32 | — |
| fresh | 3 | medium | 5 | 4/4 | 4/0/0/0 | 0 | 3/4/5 | 20/20/20 → 13/18/20 | 16/16/16 → 5/9/11 | 13/20/28 | — |
| fresh | 3 | medium | heart | 32/32 | 32/0/0/0 | 0 | 2/7/16 | 20/20/20 → 5/16/20 | 16/16/16 → 0/4/11 | 12/35/85 | — |
| fresh | 3 | heavy | 1 | 16/16 | 16/0/0/0 | 0 | 1/4/5 | 20/20/20 → 16/19/20 | 16/16/16 → 4/9/13 | 6/21/27 | — |
| fresh | 3 | heavy | 2 | 16/16 | 16/0/0/0 | 0 | 2/4/7 | 20/20/20 → 13/19/20 | 16/16/16 → 3/7/13 | 8/22/35 | — |
| fresh | 3 | heavy | 3 | 16/16 | 16/0/0/0 | 0 | 2/4/7 | 20/20/20 → 13/18/20 | 16/16/16 → 2/7/13 | 11/27/40 | — |
| fresh | 3 | heavy | 4 | 16/16 | 16/0/0/0 | 0 | 2/5/9 | 20/20/20 → 14/18/20 | 16/16/16 → 1/7/12 | 8/26/51 | — |
| fresh | 3 | heavy | 5 | 16/16 | 16/0/0/0 | 0 | 2/4/8 | 20/20/20 → 11/19/20 | 16/16/16 → 0/7/12 | 10/27/45 | — |
| fresh | 3 | heavy | heart | 32/32 | 32/0/0/0 | 0 | 2/6/16 | 20/20/20 → 5/16/20 | 16/16/16 → 0/6/12 | 12/36/85 | — |
| carried | 1 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/4/9 | 6/6/6 → 2/6/6 | 5/5/5 → 0/1/4 | 6/10/26 | — |
| carried | 1 | light | 2 | 16/16 | 12/4/0/0 | 0 | 2/5/17 | 2/6/6 → 0/4/6 | 0/1/4 → 0/0/2 | 5/13/45 | push=14, sound=1, crumbling=1 |
| carried | 1 | light | 3 | 2/2 | 2/0/0/0 | 0 | 3/5/5 | 3/4/4 → 1/2/2 | 0/1/1 → 0/0/0 | 6/11/11 | push=2 |
| carried | 1 | light | heart | 12/16 | 0/2/10/0 | 0 | 3/41/41 | 1/5/6 → 0/5/6 | 0/0/2 → 0/0/1 | 6/83/120 | push=8, sound=1, crumbling=1, doorway=2 |
| carried | 1 | medium | 1 | 16/16 | 15/0/1/0 | 0 | 1/4/41 | 6/6/6 → 1/6/6 | 5/5/5 → 0/1/4 | 1/10/85 | — |
| carried | 1 | medium | 2 | 15/16 | 8/4/3/0 | 0 | 2/5/41 | 1/6/6 → 0/4/6 | 1/1/4 → 0/0/3 | 3/14/85 | push=13, sound=1, crumbling=1 |
| carried | 1 | medium | 3 | 8/16 | 4/2/2/0 | 0 | 2/6/41 | 2/6/6 → 0/6/6 | 0/2/3 → 0/0/2 | 4/13/86 | push=7, crumbling=1 |
| carried | 1 | medium | 4 | 2/12 | 2/0/0/0 | 0 | 3/3/3 | 6/6/6 → 6/6/6 | 0/1/1 → 0/0/0 | 7/7/7 | push=2 |
| carried | 1 | medium | 5 | 0/4 · not reached | 0/0/0/0 | 0 | —/—/— | —/—/— → —/—/— | —/—/— → —/—/— | —/—/— | — |
| carried | 1 | medium | heart | 4/16 | 0/0/4/0 | 0 | 41/41/41 | 5/6/6 → 4/5/6 | 0/1/2 → 0/0/0 | 83/119/119 | push=4 |
| carried | 1 | heavy | 1 | 16/16 | 14/1/1/0 | 0 | 2/5/41 | 6/6/6 → 0/6/6 | 5/5/5 → 0/1/3 | 4/13/85 | — |
| carried | 1 | heavy | 2 | 14/16 | 7/4/3/0 | 0 | 2/7/41 | 3/6/6 → 0/6/6 | 0/1/3 → 0/0/2 | 4/17/84 | push=12, sound=1, crumbling=1 |
| carried | 1 | heavy | 3 | 7/16 | 5/1/1/0 | 0 | 3/3/41 | 6/6/6 → 6/6/6 | 0/2/2 → 0/0/0 | 8/8/48 | push=6, crumbling=1 |
| carried | 1 | heavy | 4 | 5/16 | 4/0/1/0 | 0 | 3/6/41 | 6/6/6 → 5/5/6 | 0/0/0 → 0/0/0 | 9/14/85 | push=4, doorway=1 |
| carried | 1 | heavy | 5 | 4/16 | 4/0/0/0 | 0 | 4/5/5 | 5/5/5 → 4/5/5 | 0/0/0 → 0/0/0 | 9/12/12 | push=4 |
| carried | 1 | heavy | heart | 4/16 | 1/0/3/0 | 0 | 5/41/41 | 4/5/5 → 2/4/5 | 0/0/0 → 0/0/0 | 13/118/118 | push=4 |
| carried | 2 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/3/4 | 14/14/14 → 12/14/14 | 10/10/10 → 2/5/7 | 7/13/18 | — |
| carried | 2 | light | 2 | 16/16 | 14/1/1/0 | 0 | 2/3/41 | 12/14/14 → 0/13/14 | 2/5/7 → 0/0/3 | 9/13/127 | push=14, sound=1, crumbling=1 |
| carried | 2 | light | 3 | 2/2 | 2/0/0/0 | 0 | 3/5/5 | 10/13/13 → 6/12/12 | 2/3/3 → 0/1/1 | 11/18/18 | push=2 |
| carried | 2 | light | heart | 14/16 | 6/2/6/0 | 0 | 4/30/41 | 6/13/14 → 0/6/13 | 0/0/2 → 0/0/0 | 13/121/140 | push=10, sound=1, crumbling=1, doorway=2 |
| carried | 2 | medium | 1 | 16/16 | 16/0/0/0 | 0 | 1/3/5 | 14/14/14 → 9/14/14 | 10/10/10 → 3/5/9 | 4/14/19 | — |
| carried | 2 | medium | 2 | 16/16 | 12/0/4/0 | 0 | 1/5/41 | 9/14/14 → 0/10/14 | 3/5/9 → 0/0/7 | 4/21/128 | push=14, sound=1, crumbling=1 |
| carried | 2 | medium | 3 | 12/16 | 5/2/5/0 | 0 | 1/10/41 | 2/13/14 → 0/7/14 | 0/1/7 → 0/0/6 | 4/40/132 | push=11, crumbling=1 |
| carried | 2 | medium | 4 | 3/12 | 2/1/0/0 | 0 | 2/2/3 | 2/14/14 → 0/14/14 | 0/4/6 → 0/1/3 | 6/6/9 | push=3 |
| carried | 2 | medium | 5 | 0/4 · not reached | 0/0/0/0 | 0 | —/—/— | —/—/— → —/—/— | —/—/— → —/—/— | —/—/— | — |
| carried | 2 | medium | heart | 4/16 | 3/0/1/0 | 0 | 4/26/41 | 14/14/14 → 5/11/11 | 1/3/5 → 0/0/0 | 15/124/128 | push=4 |
| carried | 2 | heavy | 1 | 16/16 | 16/0/0/0 | 0 | 1/4/5 | 14/14/14 → 9/14/14 | 10/10/10 → 0/5/8 | 4/16/23 | — |
| carried | 2 | heavy | 2 | 16/16 | 11/1/4/0 | 0 | 1/10/41 | 9/14/14 → 0/12/14 | 0/5/8 → 0/0/6 | 4/34/131 | push=14, sound=1, crumbling=1 |
| carried | 2 | heavy | 3 | 11/16 | 7/2/2/0 | 0 | 2/5/41 | 2/12/14 → 0/10/14 | 0/0/6 → 0/0/3 | 7/18/125 | push=10, crumbling=1 |
| carried | 2 | heavy | 4 | 7/16 | 5/1/1/0 | 0 | 2/3/41 | 3/14/14 → 0/12/13 | 0/2/3 → 0/0/1 | 7/10/95 | push=6, doorway=1 |
| carried | 2 | heavy | 5 | 5/16 | 5/0/0/0 | 0 | 3/3/5 | 7/12/13 → 2/9/11 | 0/0/1 → 0/0/0 | 9/10/17 | push=5 |
| carried | 2 | heavy | heart | 5/16 | 2/1/2/0 | 0 | 6/39/41 | 3/9/11 → 0/3/6 | 0/0/0 → 0/0/0 | 18/122/154 | push=5 |
| carried | 3 | light | 1 | 16/16 | 16/0/0/0 | 0 | 2/3/4 | 20/20/20 → 17/19/20 | 16/16/16 → 7/11/13 | 9/14/23 | — |
| carried | 3 | light | 2 | 16/16 | 16/0/0/0 | 0 | 1/3/9 | 17/19/20 → 14/18/20 | 7/11/13 → 0/6/11 | 3/15/46 | push=14, sound=1, crumbling=1 |
| carried | 3 | light | 3 | 2/2 | 2/0/0/0 | 0 | 2/4/4 | 17/19/19 → 15/17/17 | 9/11/11 → 5/6/6 | 13/19/19 | push=2 |
| carried | 3 | light | heart | 16/16 | 5/3/8/0 | 0 | 2/41/41 | 14/18/20 → 0/6/18 | 0/5/7 → 0/0/6 | 12/104/153 | push=12, sound=1, crumbling=1, doorway=2 |
| carried | 3 | medium | 1 | 16/16 | 16/0/0/0 | 0 | 1/3/5 | 20/20/20 → 14/19/20 | 16/16/16 → 6/10/15 | 4/18/28 | — |
| carried | 3 | medium | 2 | 16/16 | 15/0/1/0 | 0 | 1/3/41 | 14/19/20 → 4/17/20 | 6/10/15 → 0/3/14 | 4/17/168 | push=14, sound=1, crumbling=1 |
| carried | 3 | medium | 3 | 15/16 | 7/2/6/0 | 0 | 2/22/41 | 5/17/20 → 0/8/20 | 0/3/14 → 0/1/12 | 8/92/165 | push=14, crumbling=1 |
| carried | 3 | medium | 4 | 5/12 | 3/2/0/0 | 0 | 1/4/8 | 4/8/20 → 0/4/20 | 0/1/12 → 0/0/9 | 6/14/31 | push=5 |
| carried | 3 | medium | 5 | 1/4 | 0/1/0/0 | 0 | 6/6/6 | 6/6/6 → 0/0/0 | 0/0/0 → 0/0/0 | 20/20/20 | push=1 |
| carried | 3 | medium | heart | 4/16 | 4/0/0/0 | 0 | 2/18/23 | 18/20/20 → 3/16/20 | 6/8/9 → 0/2/6 | 12/109/128 | push=4 |
| carried | 3 | heavy | 1 | 16/16 | 16/0/0/0 | 0 | 1/4/5 | 20/20/20 → 16/19/20 | 16/16/16 → 4/9/13 | 6/21/27 | — |
| carried | 3 | heavy | 2 | 16/16 | 12/2/2/0 | 0 | 2/5/41 | 16/19/20 → 0/16/20 | 4/9/13 → 0/3/10 | 8/26/169 | push=14, sound=1, crumbling=1 |
| carried | 3 | heavy | 3 | 12/16 | 8/1/3/0 | 0 | 2/10/41 | 8/16/20 → 0/12/18 | 0/7/10 → 0/2/7 | 11/40/163 | push=12 |
| carried | 3 | heavy | 4 | 8/16 | 7/1/0/0 | 0 | 2/4/10 | 8/18/18 → 0/16/17 | 0/7/7 → 0/5/5 | 10/20/50 | push=7, doorway=1 |
| carried | 3 | heavy | 5 | 7/16 | 5/0/2/0 | 0 | 2/3/41 | 6/16/17 → 1/14/16 | 0/5/5 → 0/3/3 | 11/14/172 | push=7 |
| carried | 3 | heavy | heart | 5/16 | 3/2/0/0 | 0 | 4/6/38 | 3/14/16 → 0/4/15 | 0/3/3 → 0/0/3 | 17/28/154 | push=5 |

### Fresh and carried hearts by master

| Entry | Party | Master | Reached/attempted | W/L/S/E | Budget stops | Rounds | HP in → left | Charges in → left | Fallback/reached | Unverified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | marginalia | 12/12 | 12/0/0/0 | 0 | 10/12/12 | 6/6/6 → 1/5/6 | 5/5/5 → 0/0/0 | 0/12 (0.0%) | 0 |
| fresh | 1 | mother | 12/12 | 0/0/12/0 | 0 | 41/41/41 | 6/6/6 → 3/3/5 | 5/5/5 → 0/0/0 | 12/12 (100.0%) | 12 |
| fresh | 1 | postmaster | 12/12 | 8/0/4/0 | 0 | 20/20/41 | 6/6/6 → 6/6/6 | 5/5/5 → 0/0/0 | 12/12 (100.0%) | 12 |
| fresh | 1 | bathSteward | 12/12 | 12/0/0/0 | 0 | 36/40/40 | 6/6/6 → 4/4/6 | 5/5/5 → 0/0/0 | 12/12 (100.0%) | 12 |
| fresh | 1 | chiefWarden | 12/12 | 0/0/12/0 | 0 | 41/41/41 | 6/6/6 → 6/6/6 | 5/5/5 → 0/0/0 | 12/12 (100.0%) | 12 |
| fresh | 1 | carillonneur | 12/12 | 0/0/12/0 | 0 | 41/41/41 | 6/6/6 → 5/6/6 | 5/5/5 → 0/4/4 | 12/12 (100.0%) | 12 |
| fresh | 1 | registrar | 12/12 | 3/9/0/0 | 0 | 3/12/30 | 6/6/6 → 5/6/6 | 5/5/5 → 0/0/3 | 7/12 (58.3%) | 5 |
| fresh | 1 | lamplighter | 12/12 | 11/1/0/0 | 0 | 3/7/7 | 6/6/6 → 0/5/6 | 5/5/5 → 0/1/3 | 1/12 (8.3%) | 0 |
| fresh | 2 | marginalia | 12/12 | 12/0/0/0 | 0 | 3/4/5 | 14/14/14 → 12/13/14 | 10/10/10 → 4/4/6 | 0/12 (0.0%) | 0 |
| fresh | 2 | mother | 12/12 | 12/0/0/0 | 0 | 17/22/23 | 14/14/14 → 4/5/5 | 10/10/10 → 0/0/0 | 12/12 (100.0%) | 12 |
| fresh | 2 | postmaster | 12/12 | 11/0/1/0 | 0 | 6/7/41 | 14/14/14 → 4/6/12 | 10/10/10 → 0/1/4 | 0/12 (0.0%) | 0 |
| fresh | 2 | bathSteward | 12/12 | 4/0/8/0 | 0 | 10/41/41 | 14/14/14 → 5/8/14 | 10/10/10 → 0/0/0 | 5/12 (41.7%) | 2 |
| fresh | 2 | chiefWarden | 12/12 | 11/0/1/0 | 0 | 5/6/41 | 14/14/14 → 4/12/13 | 10/10/10 → 0/1/1 | 0/12 (0.0%) | 0 |
| fresh | 2 | carillonneur | 12/12 | 0/5/7/0 | 0 | 12/41/41 | 14/14/14 → 0/4/5 | 10/10/10 → 0/0/4 | 12/12 (100.0%) | 12 |
| fresh | 2 | registrar | 12/12 | 9/3/0/0 | 0 | 7/12/33 | 14/14/14 → 9/12/14 | 10/10/10 → 0/1/7 | 0/12 (0.0%) | 0 |
| fresh | 2 | lamplighter | 12/12 | 12/0/0/0 | 0 | 2/3/4 | 14/14/14 → 8/13/14 | 10/10/10 → 4/5/7 | 0/12 (0.0%) | 0 |
| fresh | 3 | marginalia | 12/12 | 12/0/0/0 | 0 | 3/4/5 | 20/20/20 → 17/19/20 | 16/16/16 → 10/10/11 | 0/12 (0.0%) | 0 |
| fresh | 3 | mother | 12/12 | 12/0/0/0 | 0 | 10/13/16 | 20/20/20 → 4/7/13 | 16/16/16 → 0/0/1 | 0/12 (0.0%) | 0 |
| fresh | 3 | postmaster | 12/12 | 12/0/0/0 | 0 | 4/6/8 | 20/20/20 → 8/15/18 | 16/16/16 → 3/6/8 | 0/12 (0.0%) | 0 |
| fresh | 3 | bathSteward | 12/12 | 12/0/0/0 | 0 | 5/7/10 | 20/20/20 → 6/13/19 | 16/16/16 → 2/3/5 | 0/12 (0.0%) | 0 |
| fresh | 3 | chiefWarden | 12/12 | 12/0/0/0 | 0 | 5/5/5 | 20/20/20 → 15/17/19 | 16/16/16 → 6/6/7 | 0/12 (0.0%) | 0 |
| fresh | 3 | carillonneur | 12/12 | 12/0/0/0 | 0 | 11/14/29 | 20/20/20 → 1/5/12 | 16/16/16 → 0/0/3 | 0/12 (0.0%) | 0 |
| fresh | 3 | registrar | 12/12 | 11/0/1/0 | 0 | 6/9/41 | 20/20/20 → 12/17/20 | 16/16/16 → 2/3/6 | 0/12 (0.0%) | 0 |
| fresh | 3 | lamplighter | 12/12 | 12/0/0/0 | 0 | 2/2/3 | 20/20/20 → 16/20/20 | 16/16/16 → 10/11/14 | 0/12 (0.0%) | 0 |
| carried | 1 | marginalia | 0/6 · not reached | 0/0/0/0 | 0 | —/—/— | —/—/— → —/—/— | —/—/— → —/—/— | 0/0 (—) | 0 |
| carried | 1 | mother | 5/6 | 0/0/5/0 | 0 | 41/41/41 | 4/5/6 → 2/5/6 | 0/0/2 → 0/0/0 | 5/5 (100.0%) | 5 |
| carried | 1 | postmaster | 2/6 | 0/2/0/0 | 0 | 3/4/4 | 1/4/4 → 0/0/0 | 0/0/0 → 0/0/0 | 2/2 (100.0%) | 2 |
| carried | 1 | bathSteward | 1/6 | 0/0/1/0 | 0 | 41/41/41 | 4/4/4 → 4/4/4 | 0/0/0 → 0/0/0 | 1/1 (100.0%) | 1 |
| carried | 1 | chiefWarden | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 6/6/6 → 6/6/6 | 0/0/0 → 0/0/0 | 2/2 (100.0%) | 2 |
| carried | 1 | carillonneur | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 4/5/5 → 4/5/5 | 0/2/2 → 0/1/1 | 2/2 (100.0%) | 2 |
| carried | 1 | registrar | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 6/6/6 → 6/6/6 | 0/0/0 → 0/0/0 | 2/2 (100.0%) | 2 |
| carried | 1 | lamplighter | 6/6 | 1/0/5/0 | 0 | 5/41/41 | 1/5/6 → 1/4/6 | 0/0/0 → 0/0/0 | 1/6 (16.7%) | 0 |
| carried | 2 | marginalia | 2/6 | 1/1/0/0 | 0 | 8/10/10 | 3/9/9 → 0/6/6 | 0/1/1 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 2 | mother | 6/6 | 5/0/1/0 | 0 | 25/30/41 | 9/14/14 → 3/5/6 | 0/2/5 → 0/0/0 | 6/6 (100.0%) | 6 |
| carried | 2 | postmaster | 2/6 | 0/2/0/0 | 0 | 8/23/23 | 10/13/13 → 0/0/0 | 0/0/0 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 2 | bathSteward | 1/6 | 0/0/1/0 | 0 | 41/41/41 | 14/14/14 → 5/5/5 | 0/0/0 → 0/0/0 | 1/1 (100.0%) | 0 |
| carried | 2 | chiefWarden | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 8/12/12 → 7/12/12 | 0/1/1 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 2 | carillonneur | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 13/13/13 → 2/6/6 | 0/0/0 → 0/0/0 | 2/2 (100.0%) | 2 |
| carried | 2 | registrar | 2/6 | 1/0/1/0 | 0 | 12/41/41 | 12/13/13 → 12/13/13 | 0/0/0 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 2 | lamplighter | 6/6 | 4/0/2/0 | 0 | 4/6/41 | 6/12/14 → 3/6/11 | 0/1/3 → 0/0/0 | 0/6 (0.0%) | 0 |
| carried | 3 | marginalia | 2/6 | 2/0/0/0 | 0 | 4/4/4 | 16/18/18 → 14/17/17 | 7/7/7 → 3/3/3 | 0/2 (0.0%) | 0 |
| carried | 3 | mother | 6/6 | 3/3/0/0 | 0 | 18/23/38 | 14/18/20 → 0/3/8 | 3/7/8 → 0/0/0 | 0/6 (0.0%) | 0 |
| carried | 3 | postmaster | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 18/18/18 → 2/4/4 | 1/3/3 → 0/2/2 | 0/2 (0.0%) | 0 |
| carried | 3 | bathSteward | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 14/18/18 → 4/6/6 | 1/3/3 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 3 | chiefWarden | 2/6 | 0/0/2/0 | 0 | 41/41/41 | 16/18/18 → 3/6/6 | 4/6/6 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 3 | carillonneur | 3/6 | 0/2/1/0 | 0 | 6/20/41 | 3/16/20 → 0/0/4 | 0/5/6 → 0/0/0 | 0/3 (0.0%) | 0 |
| carried | 3 | registrar | 2/6 | 1/0/1/0 | 0 | 8/41/41 | 16/19/19 → 16/18/18 | 0/1/1 → 0/0/0 | 0/2 (0.0%) | 0 |
| carried | 3 | lamplighter | 6/6 | 6/0/0/0 | 0 | 2/4/4 | 14/17/20 → 12/15/20 | 3/6/9 → 1/3/6 | 0/6 (0.0%) | 0 |

### Carried trip endings

| Party size | End counts |
| --- | --- |
| 1 | lost=18, stalled=29, cleared=1 |
| 2 | cleared=11, stalled=26, lost=11 |
| 3 | cleared=12, lost=14, stalled=22 |

### Production generation judge

Fallbacks are counted separately from normal offered attempts. A verified fallback appears under attempt 5 for an ordinary room or 4 for a heart. Generation verification uses the lite trial, and is separate from the fight results above. Only genuine generation calls count toward timing.

| Entry | Room | Band | Offered | Attempts spent | Normal offered attempt | Verified attempt | First fair attempt | Verified ≤2 | Fallback | Unverified | Dull | Walkover | Capped | Held issues | Offered issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | ordinary | All | 534 | 1=210, 2=79, 3=44, 4=201 | 1=212, 2=84, 3=60, 4=71 | 1=212, 2=84, 3=60, 4=71, 5=2 | 1=210, 2=79, 3=44, 4=18 | 289 | 107 | 105 | 76 | 76 | 0 | kit=653, budget=9 | kit=129 |
| fresh | ordinary | light | 102 | 1=29, 2=16, 3=21, 4=36 | 1=29, 2=17, 3=23, 4=33 | 1=29, 2=17, 3=23, 4=33 | 1=29, 2=16, 3=21, 4=8 | 45 | 0 | 0 | 28 | 28 | 0 | — | — |
| fresh | ordinary | medium | 192 | 1=82, 2=32, 3=13, 4=65 | 1=82, 2=34, 3=19, 4=18 | 1=82, 2=34, 3=19, 4=18 | 1=82, 2=32, 3=13, 4=5 | 114 | 39 | 39 | 21 | 21 | 0 | kit=202, budget=7 | kit=39 |
| fresh | ordinary | heavy | 240 | 1=99, 2=31, 3=10, 4=100 | 1=101, 2=33, 3=18, 4=20 | 1=101, 2=33, 3=18, 4=20, 5=2 | 1=99, 2=31, 3=10, 4=5 | 130 | 68 | 66 | 27 | 27 | 0 | kit=451, budget=2 | kit=90 |
| fresh | heart | All | 288 | 1=153, 2=32, 3=103 | 1=153, 2=32, 3=6 | 1=153, 2=32, 3=6, 4=6 | 1=153, 2=32, 3=6 | 185 | 97 | 91 | 0 | 0 | 0 | distance=6 | — |
| fresh | heart | light | 96 | 1=51, 2=10, 3=35 | 1=51, 2=10, 3=2 | 1=51, 2=10, 3=2, 4=2 | 1=51, 2=10, 3=2 | 61 | 33 | 31 | 0 | 0 | 0 | — | — |
| fresh | heart | medium | 96 | 1=52, 2=10, 3=34 | 1=52, 2=10, 3=2 | 1=52, 2=10, 3=2, 4=3 | 1=52, 2=10, 3=2 | 62 | 32 | 29 | 0 | 0 | 0 | distance=3 | — |
| fresh | heart | heavy | 96 | 1=50, 2=12, 3=34 | 1=50, 2=12, 3=2 | 1=50, 2=12, 3=2, 4=1 | 1=50, 2=12, 3=2 | 62 | 32 | 31 | 0 | 0 | 0 | distance=3 | — |
| carried | ordinary | All | 403 | 1=143, 2=60, 3=31, 4=169 | 1=145, 2=62, 3=40, 4=57 | 1=145, 2=62, 3=40, 4=57 | 1=143, 2=60, 3=31, 4=13 | 203 | 99 | 99 | 57 | 57 | 0 | kit=653, budget=9 | kit=129 |
| carried | ordinary | light | 102 | 1=29, 2=18, 3=20, 4=35 | 1=29, 2=19, 3=22, 4=32 | 1=29, 2=19, 3=22, 4=32 | 1=29, 2=18, 3=20, 4=7 | 47 | 0 | 0 | 28 | 28 | 0 | — | — |
| carried | ordinary | medium | 141 | 1=52, 2=24, 3=9, 4=56 | 1=52, 2=24, 3=12, 4=14 | 1=52, 2=24, 3=12, 4=14 | 1=52, 2=24, 3=9, 4=3 | 76 | 39 | 39 | 14 | 14 | 0 | kit=202, budget=7 | kit=39 |
| carried | ordinary | heavy | 160 | 1=62, 2=18, 3=2, 4=78 | 1=64, 2=19, 3=6, 4=11 | 1=64, 2=19, 3=6, 4=11 | 1=62, 2=18, 3=2, 4=3 | 80 | 60 | 60 | 15 | 15 | 0 | kit=451, budget=2 | kit=90 |
| carried | heart | All | 68 | 1=36, 2=6, 3=26 | 1=36, 2=6, 3=2 | 1=36, 2=6, 3=2, 4=2 | 1=36, 2=6, 3=2 | 42 | 24 | 22 | 0 | 0 | 0 | — | — |
| carried | heart | light | 42 | 1=21, 2=4, 3=17 | 1=21, 2=4, 3=1 | 1=21, 2=4, 3=1, 4=2 | 1=21, 2=4, 3=1 | 25 | 16 | 14 | 0 | 0 | 0 | — | — |
| carried | heart | medium | 12 | 1=7, 2=1, 3=4 | 1=7, 2=1 | 1=7, 2=1 | 1=7, 2=1 | 8 | 4 | 4 | 0 | 0 | 0 | — | — |
| carried | heart | heavy | 14 | 1=8, 2=1, 3=5 | 1=8, 2=1, 3=1 | 1=8, 2=1, 3=1 | 1=8, 2=1, 3=1 | 9 | 4 | 4 | 0 | 0 | 0 | — | — |

| Entry | Room | Band | Budget histogram | Bot win round | Bot HP % left | Ops (max) | Desktop ms | Verified desktop ms | Timed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | ordinary | All | 1=3, 2=4, 3=30, 4=46, 5=58, 6=71, 7=88, 8=85, 9=68, 10=45, 11=34, 12=2 | 3/4/9 | 33.3/85.7/100 | 0/23/109 (153) | 27/162/436 | 37/194/460 | 534 |
| fresh | ordinary | light | 2=3, 3=6, 4=8, 5=17, 6=28, 7=17, 8=11, 9=10, 10=2 | 3/3/6 | 66.7/92.9/100 | 8/29/54 (118) | 34/171/395 | 34/171/395 | 102 |
| fresh | ordinary | medium | 1=3, 3=19, 4=18, 5=26, 6=16, 7=32, 8=36, 9=20, 10=20, 11=2 | 3/4/7 | 33.3/83.3/100 | 0/20/82 (136) | 23/153/403 | 37/190/425 | 192 |
| fresh | ordinary | heavy | 2=1, 3=5, 4=20, 5=15, 6=27, 7=39, 8=38, 9=38, 10=23, 11=32, 12=2 | 3/5/10 | 33.3/85.7/100 | 0/24/133 (153) | 31/170/490 | 41/224/502 | 240 |
| fresh | heart | All | 4=28, 5=4, 6=60, 7=36, 8=60, 9=36, 10=32, 11=32 | 3/6/15 | 30/85/100 | 15/62/260 (319) | 114/575/1.66e+03 | 93/428/1.68e+03 | 288 |
| fresh | heart | light | 4=28, 5=4, 6=28, 7=4, 8=28, 9=4 | 2/6/14 | 20/83.3/100 | 14/62/284 (319) | 113/540/1.92e+03 | 93/414/2.29e+03 | 96 |
| fresh | heart | medium | 6=32, 8=32, 10=32 | 3/6/15 | 30/83.3/100 | 15/61/260 (317) | 152/551/1.68e+03 | 110/445/1.63e+03 | 96 |
| fresh | heart | heavy | 7=32, 9=32, 11=32 | 3/7/15 | 35/85/100 | 15/64/260 (318) | 111/618/1.64e+03 | 105/460/1.26e+03 | 96 |
| carried | ordinary | All | 1=3, 2=4, 3=25, 4=35, 5=47, 6=59, 7=68, 8=60, 9=58, 10=27, 11=17 | 3/4/8 | 42.9/90/100 | 0/21/83 (143) | 28/153/410 | 41/204/436 | 259 |
| carried | ordinary | light | 2=3, 3=6, 4=8, 5=17, 6=29, 7=17, 8=11, 9=9, 10=2 | 3/3/6 | 66.7/92.9/100 | 8/28/55 (118) | 28/185/410 | 28/185/410 | 54 |
| carried | ordinary | medium | 1=3, 3=15, 4=12, 5=19, 6=12, 7=26, 8=23, 9=19, 10=11, 11=1 | 3/4/6 | 33.3/85.7/100 | 0/17/73 (91) | 26/162/456 | 44/216/499 | 93 |
| carried | ordinary | heavy | 2=1, 3=4, 4=15, 5=11, 6=18, 7=25, 8=26, 9=30, 10=14, 11=16 | 3/4/9 | 40/85.7/100 | 0/18/110 (143) | 33/105/363 | 71/207/411 | 112 |
| carried | heart | All | 4=10, 5=2, 6=16, 7=6, 8=18, 9=7, 10=4, 11=5 | 2/6/13 | 20/83.3/100 | 13/62/314 (318) | 151/516/2.13e+03 | 149/368/2.13e+03 | 68 |
| carried | heart | light | 4=10, 5=2, 6=12, 7=2, 8=14, 9=2 | 2/6/13 | 20/80/100 | 13/63/284 (310) | 174/713/2.37e+03 | 130/430/2.4e+03 | 42 |
| carried | heart | medium | 6=4, 8=4, 10=4 | 3/6/10 | 40/92.9/100 | 13/62/317 (317) | 149/396/1.3e+03 | 149/262/418 | 12 |
| carried | heart | heavy | 7=4, 9=5, 11=5 | 2/6/14 | 10/90/100 | 13/66/318 (318) | 151/418/2.13e+03 | 151/255/2.13e+03 | 14 |

### Steward, bells and peal

- Fresh Steward heats were 4=36. Positive final pressure 34/36. Boils per fight 3=14, 4=6, 2=4, 1=12. First-boil rounds 4=13, 5=23.
- Fresh bell-rule ordinary rooms had small bell counts 3=28, 4=48, 5=13, 6=4, 7=5, 8=4. Below the stamp minimum in 0/102 offered boards.
- Fresh Heavy Marginalia had fifth-room stored notes [1]=6. Battle notes [1]=6. Hearts reached 12, rung counts 0=12. Allied bells 0=12.
- Fresh Heavy Carillonneur had fifth-room stored notes [1]=6. Battle notes [1]=6. Hearts reached 12, rung counts 0=12. Allied bells 0=12.
- Carried Steward heats were 4=4. Positive final pressure 4/4. Boils per fight 4=4. First-boil rounds 4=1, 6=1, 5=2.
- Carried bell-rule ordinary rooms had small bell counts 3=17, 4=37, 5=10, 6=3, 7=2, 8=1. Below the stamp minimum in 0/70 offered boards.
- Carried Heavy Marginalia had fifth-room stored notes [1]=2. Battle notes [1]=2. Hearts reached 1, rung counts 2=1. Allied bells 0=1.
- Carried Heavy Carillonneur had fifth-room stored notes [1]=1. Battle notes [1]=1. Hearts reached 1, rung counts 3=1. Allied bells 3=1.

The actual carried run confirms retention of a fifth-room note. Heavy Carillonneur trio seed 2 reached the heart with entries `(room 2, note 2), (room 4, note 4), (room 5, note 1)` and hung three allied bells `1,2,4`. The party entered with 3 HP and zero charges and lost. Heavy Marginalia pair seed 2 carried notes 2 and 4 but reached a frame with zero hooks and hung zero bells. Review whether a peal paired with a heart lacking hooks should show that limitation or support those earned bells.

The Steward gauge was active in every reached heart on the app path, including a plain shape. The first boil appeared in rounds 4–5 in fresh fights. Production's trial uses the rule's default heat while the app heart starts at heat four. Compare the two setup configurations before tuning the Steward for drawn hearts. The aggregate bell counts include extra bell pieces and the peal lock's own bells. The observed ordinary offers all reached the rule's minimum count. This sample does not establish that all cramped layouts support the originally requested count.

Fresh ordinary walkovers were 76/534 (14.2%), above 10% by 4.2 points, with 351/534 (65.7%) fair within four and 429/534 (80.3%) verified including two fallbacks. Ordinary unverified fallbacks were 105/534. The layout oracle flagged 99/534 offered boards for 129 kit issues, concentrated in four current drawings that add Cartographers paper or bridge pieces. There were 99 flagged offers across 403 reached ordinary rooms in the carried run. Investigate how the selected-piece checks handle aquatic and cast-reachable foes, and how the fallback oracle checks selections that the minimum stamp omits. The generator and its kit legality checks need a separate brief.

Fresh hearts had 97/288 fallbacks (33.7%), 91/288 unverified (31.6%). For the Lamp-mother, production verified 0/24 solo or pair hearts and 12/12 trio hearts, with all unverified offers from the fallback. All 12 pairs then beat those fallback boards in 17–23 rounds in the app-path bot fight, beyond the lite judge's 16. For the Carillonneur, production verified 0/24 solo or pair hearts and 12/12 trio hearts. The pair lost five and stalled seven on the app path, while the trio won 12/12. A scripted fallback solve proves a legal solution and has no bearing on lite verification.

Weight affects the ordinary foe budget and loot. The hearts use a fixed master frame and ignore that budget for their foes. The light/medium/heavy corpus has the same master mix in every band, and the heavy pair matched the light pair at 25/32. A design brief should define which heart lever makes a heavy drawing harder and whether the current band targets apply to a given lineup or a pooled mix. Repricing a drawing would leave the difficulty of its existing heart setup untouched.

## Generator and heart candidates

The ordinary comparison is paired by drawing name, seed, depth and founding pair. The heart comparison is paired across all three lineups and the three Marginalia drawings.

| Ordinary comparison | Offered | Normal fair | Fallback | Unverified | Dull / walkover | Verified within two |
| --- | --- | --- | --- | --- | --- | --- |
| Step 1 | 178 | 130 | 34 | 34 | 14 / 14 | 104 |
| Step 2 | 178 | 136 | 27 | 27 | 15 / 15 | 112 |

| Marginalia HP | Hearts per lineup | Solo W | Pair W | Trio W | Fallback | Unverified |
| --- | --- | --- | --- | --- | --- | --- |
| 16 | 12 | 12 | 12 | 12 | 0 | 0 |
| 32 | 12 | 12 | 12 | 12 | 12 | 12 |


Retain `GEN_TUNING.step = 1`. Step two gained six fair offers and seven verifications on the paired subset. It also added one walkover and increased budget-issue occurrences from 1 to 10. The candidate left 27 unverified ordinary offers, and the structural deficit persists even without budget failures. The candidate comparison covers the founding pair and provides no estimate of a walkover improvement across all three lineups.

Retain `DRAWN_MARGINALIA_HP = 16`. Doubling the drawn frame's HP kept all 36 app-path wins. Solo median rounds increased from 12 to 24, pair and trio median rounds increased from four to five, and all 12 solo offers moved to unverified fallbacks. A common HP change on one master cannot deliver the heavy-band overshoot of 29 points in the pooled sample.

### Cross-kit reproduction

`CAL5_DRAWING='Medium Lamplighter' CAL5_DETAIL=1 CAL5_ORDINARY=1` on the corpus test reports `Piece cartographers:blank is not valid on this layout` at every ordinary depth for the pair on seed 1. Replacing the selection with `Heavy Mother` reports the same error for `bridges:pier` at all five ordinary depths. The Cartographers `holdsOpen` and bridge `strandedBy` checks require the foe to be reachable on foot and treat water as unstandable. The generator places eels on water by kit requirement, which the general room reachability checks can accept. On the minimum fallback the piece stamp is omitted, but the validators still consult the drawing's selected pieces. Align the two reachability contracts or explicitly limit these combinations at authoring time before revisiting budget tuning.

## Approval rows

| Pack | Tunable / source | Current | Candidate | Baseline measurement | Candidate measurement | Band / miss | Bot / corpus / command / revision | Player decision | Applied revision / rerun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAL-5 | Heart difficulty by weight | Fixed master frames | Separately specified weight lever | Pair L/M/H 78.1/65.6/78.1% | Structural candidate pending | +3.1/+5.6/+33.1 pp vs upper bounds | Production corpus, `29063e5` | Defer to design | Retained frame inputs |
| CAL-5 | `DRAWN_MARGINALIA_HP` | 16 | 32 | App 36/36 wins, 0 unverified | App 36/36, 12 unverified | Heavy still above band | Paired heart-only corpus | Retain 16 | Defaults measured |
| CAL-5 | `GEN_TUNING.step` | 1 | 2 | Pair fair 130/178, 34 unverified, 14 walkovers | 136/178, 27 unverified, 15 walkovers | Full baseline walkovers 14.2% | Paired ordinary corpus | Retain 1 | Defaults measured |
| CAL-5 | Ordinary piece reachability | Foot-only local checks | Align kit and generator reach rules | 99/534 invalid offered boards | Structural candidate pending | Guardrail miss | Production corpus and seed-1 probes | Defer to kit brief | Retained validators |
| CAL-5 | `PEN_TUNING.pagesPerPoint` | 4 | 5 | Low handover 8 medium | 4 medium | Preserves heavy mastery bar | Synthetic profiles | Retain 4 | Named current weights |
| CAL-5 | `COSTS.piece` | 1 | 2 | Low handover 8 medium | 5 medium | Same frozen bands | Synthetic profiles | Retain 1 | Defaults measured |
| CAL-5 | `DRAWN_LOOT.weights.heavy.page` | 3 | 4 | Heavy heart 393 method cards | 452 of 1,536 | Lower consumable share | Seeded loot, high handover | Retain 3 | Defaults measured |
| CAL-5 | Length-six peal | Five rooms, four hooks | Decide duplicate-note and hookless behaviour | Setup hangs 1/1/2/3 from 1/2/3/4/1 | Structural candidate pending | Fourth distinct note displaced | Save/reload setup probe, carried seed 2 | Defer to kit brief | Retained shape and frame |

## Verification and household gate

| Check | Result |
| --- | --- |
| `pnpm typecheck:ts` | Passed |
| `pnpm check:fast` | 413 files, 8,709 passed, 13 todo. Existing PenPot lint warning. |
| Historical generator fuzz | 9/9 passed |
| Shared drawn table smoke, filtered to inkedPage | 1/1 passed |
| Drawn smoke, palette and loot | 19/19 passed, including stored-room reload and the length-six peal probe |
| Production corpus | 822 fresh fights and 471 carried fights across 144 trips. All report checks passed. The balance and guardrail misses are in the tables. |
| Paired candidates | 178 ordinary offers for step two and 36 Marginalia hearts at 32 HP, plus the pen/cost/loot comparisons |
| Unchanged household smoke | 24/25 passed. The random-walk occupancy assertion is red. |
| Unchanged random-walk test isolated in default and full mode with `--testTimeout=120000` | Same deterministic assertion failure in both modes |
| Full 50-seed household sweep | The full-mode random-walk gate reproduced the failure in isolation. The unfiltered run passed the placement checks and the first 5,350-fight batch (Draughtsman solo, 107 layouts × 50 seeds). Remaining batches were running at handoff. |

Household repro is Bridge 3.4, **The lantern ledge**, seed 5218, Stoker/Tuner/Owner, zero-based walk 21 and action 14 (`endTurn`). The Owner had 5 HP and `out: "fell"` before and after the Mason legally moved from (2,4) to (1,4). The retained position of the fallen member is also (1,4). The assertion counts every positive-HP unit, while the actual board-occupancy query requires both positive HP and presence in the room. The assertion therefore compares three distinct tiles with four records. Keep the occupied-tile uniqueness invariant and review whether the household check should use the engine's `isAlive` predicate in a separate pack. The household fixture and assertions are unedited.

The first full batch reported 60% wins, 23% losses and 17% stalls. The Draughtsman lost all 150 authored Seam hearts. In the canals he lost 100 and stalled 50, with zero wins. These are the household bot's authored-room results, a separate cohort from the drawn combat tables.
