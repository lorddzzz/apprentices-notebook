# Ink quarter: verification sweep (IQ-21)

Checked against `docs/plans/ink-quarter-plan.md` section 6 on main at 5daae88 plus the IQ-21 test.

## 1. Coverage table

| Section 6 bullet | Covered by | Status |
|---|---|---|
| Each writ from each cause and trait | `tests/districts/inkQuarter/writs-matrix.test.ts`, `writs.test.ts` | covered |
| Occupied start tile; no chain | `writs.test.ts` (occupied-start-tile, no-chain, started-on-the-stamp, no-snapshot) | covered |
| Forwarding: damage, mark, empty, once per round | `forward.test.ts` (damage, mark, empty-address, two-hits-in-a-round, forwarded-kill, Bind) | covered |
| Standing order skips marked units | `writs.test.ts` (order-skips-marked-units) | covered |
| Seal dodge, melt, death | `sealer.test.ts` (dodge, fire melts it, Sealer death) | covered |
| Sorter and dead letter lines | `foes.test.ts` (delivery, forward, fizzle, file) | covered |
| Four clock outcomes | `ink-clock.test.ts` (seal-broken, stamp-landed, expiry-collects-both-sides, unmarked-board, fallen server) | covered |
| Term sign, pay, break, wipe, reload, return block | `terms.test.ts`, `terms-trip.test.ts` | covered |
| Threshold from every start point, not by stepping on the stamp | `tests/data/ink-threshold.test.ts` | covered |
| The lower floor | `tests/districts/ink-floor.test.ts`, `contracts.test.ts` | covered |
| Hearing with starting basics | `tests/data/ink-quarter.test.ts` (the hearing) | covered |
| Recruit gating | `tests/sim/ink-trip.test.ts` (the notary), `ink-quarter.test.ts` (Tally while lacking) | covered |
| Debt Collection through quarter content | Idiom itself: `tests/engine/idioms.test.ts`; quarter's hearing is the same pattern (`ink-quarter.test.ts`); Bind trial on the Bench (`ink-bench.test.ts`) | partial: no test names the idiom on a real ink room board with Bind. Low risk, not added |
| Fuzz: never stranded, one open term, none at the heart, way home | `tests/sim/ink-calibration.test.ts` (fuzz, three policies) | covered |
| No handicap above the band | `stakes.test.ts` (difficulty band), `ink-calibration.test.ts` (checkStakeDefs) | covered |
| Event cap respected | New: `tests/districts/ink-verify.test.ts` (no `fizzles: cap` in bot fights, every room, 3 seeds); engine: `tests/engine/cap.test.ts` | covered (added) |
| Projection equals final state with writ moves | New: `ink-verify.test.ts` (every room incl. heart, bot fights with stamps, clock, forwards); `tests/app/projection.test.ts` only globs `scenarios/` and `engine/`, so ink district tests were outside the guard before | covered (added) |
| Calibration table per room and term | `tests/sim/ink-calibration.test.ts` (`INK_CAL=1`), `docs/plans/ink-quarter-calibration.md` | covered |
| Svelte autofixer on each component | Not re-run here (per-task obligation of IQ-15/16/17/18/19) | not verified |

Note on the projection test: it normalises `fire` tile state to clear. Embers drop at battle end without a log event. The same drift appears on the Seam (rooms 3 and 4 differ without the normalisation), so it is not ink-specific. Worth a ROADMAP line if the FD guard should cover it.

## 2. Phone checks (375x812, localhost:5191, own worktree server)

Screenshots are the browser tool's captures under
`/Users/olivera/.claude/projects/-Users-olivera-Repos-apprentices-notebook/2a365271-ff23-4cf6-83f3-576c764601b8/tool-results/`.

| Screen | Result | Capture |
|---|---|---|
| Clock heart, `#/lab?scenario=postmaster-writ&demo=1` | OK: banner "break his seal (F2) or stand on his stamp (B1) - 2 rounds", clock count on stamp, seal, pen strike | `mcp-Claude_Browser-blob-1793363179859-65674e.jpg` |
| Return stamps, room 1, and a stamp's preview (tap a unit: dotted line from stamp to its return tile) | OK | `...1793363195415-rhcxrx.jpg`, `...1793363199980-ei2o91.jpg` |
| Termed card (looting) | OK: "You get / You must / Or" lines | `...1793363238785-7ryuxn.jpg` |
| Open-term banner mid-room 2 | OK: "Term win the next room within 5 rounds, round 1 / 5" | `...1793363252317-s1xpv2.jpg` |
| Refused Crossroads | OK: Return home disabled with the reason; Term paid / open lines | `...1793363268010-ewogna.jpg` |
| Threshold (dead-letter office) | OK | `...1793363290253-u71idx.jpg` |
| Codex Papers tab | OK (tab appears only once a paper is held) | `...1793363331703-it1a7k.jpg` |
| Bench with Bind and Lift | OK | `...1793363340514-5pfnnn.jpg` |

Stamps other than the return stamp (order, forward, address, wax) were not individually photographed: only the room 1 and heart boards were reached; rooms 3 and 4 are reachable the same way via `setOut` plus `encounter`.

### Defects

1. **Raw id on the carried chip.** After signing a term the "Carried, not yet safe" chip reads `inkQuarter:termed` (with a pen icon) instead of a name. `TermCard.svelte` line 31 passes `{ kind: 'inkQuarter:termed' }` to `FallbackCard`, which is the "also the signed loot chip" path from IQ-17. Capture `...1793363268010-ewogna.jpg`. Needs a label such as the term's reward page name. Not fixed (src/ is out of scope).
2. **Two identical Tally cards in room 1.** The guaranteed Tally and a table Tally both appear (Tally, Tally, +2 ink, term). Looks like a wasted slot; the plan says Tally is "guaranteed in rooms 1 and 2 while lacking", so the table roll should skip it. Capture `...1793363238785-7ryuxn.jpg`. Design question, not a layout bug.
3. **Dark mode not checkable here.** `prefers-color-scheme` emulation does nothing: the app themes through `data-theme` set from its own setting, and the attribute is reset by the app. One attempt with the attribute forced showed the units re-themed while the board stays parchment (`...1793363227553-lket99.jpg`); ink pieces stayed legible. Full dark pass left to the player's setting; no ink-specific contrast defect seen.

No overlaps, clipping or horizontal overflow seen on the checked screens. The room title banner ("The blotter rack") overlays the board centre at fight start, as for other districts.

## 3. Status notes for the orchestrator

DESIGN section 11 (decisions made while building):
- Terms bind through the next room; a broken term still ends with the way home open but the held page goes. A signed term grants an extra pick; the heart offers none; one open term at a time.
- Return policy `any` for the quarter; break-on-purpose stays refused (plan Q1 default).
- Forwarding is one per stamp per round, unguarded on the addressee (no re-forward); anchored units exempt; empty address lands normally and keeps the stamp.
- Return stamp: start tile = the stamp stays, no chain; nearest free tile by Manhattan then reading order.
- Clock writ: seal 3 HP, deadline serve + 3, cooldown counts from the round the writ ends; collection hits both sides (plan Q4 default kept).
- Rooms hardened after IQ-20 (foes 6 / 4 + Sorter / 5 / two Sorters + Sealer); bot win rate 100% on founding pair.
- Tally guaranteed in rooms 1-2 while lacking; Lift at the heart; Bind, Wax, Sand only via terms.

TECH section 7:
- `DistrictUi.banners` and `highlightArt` registries (D5); `harmGuards` kit hook (D1); `placeSeal` shared by stakes, clock and Sealer.
- Term events are diffed outside battles; hp/charge penalties land as the next room starts.
- One `StaffToken` keyed by def id for all ink staff; one token per writ def (`{return}`, `{order}`, `{forward:a}`, `{address:a}`, `{wax:N}`, `{stamp}`).
- `tests/sim/ink-bot.ts` signing policies; `INK_CAL=1` for big tables.
- The projection guard does not cover district test suites; `ink-verify.test.ts` is the district-level guard (fire embers normalised).

ROADMAP rows to add or update:
- Chip label for a signed term page (defect 1).
- Duplicate Tally offer in room 1 (defect 2): decide whether the table should exclude a guaranteed page.
- Postmaster or Sealer needs a real damage source, or `CLOCK_TUNING` raised (IQ-7 proposal, still open).
- Lab export should omit empty `intents` (it idles scripted foes round 1).
- `push` harm kind has no call point yet (IQ-1 proposal).
- Debt Collection on a real ink room board (partial coverage).
- Dark-mode pass of the ink pieces once the theme setting can be forced by the verify tooling.
- Plan open questions 1-4 are still defaults (no break on purpose; order marks apprentices; notary note on Sentence; collection hits foes).
