# Build program log

Append-only, one line per merged task. Each task's detail is in its commit body: `git log --grep '<ID>'`.
Everything merged before 2026-11-11 (FD, DK, HC, AH, RC, RV, FN, CN, SM, IQ, BH, BR, BF-0 to BF-2; its reports, usage readings, proposals and decisions) is in [build-program-log-archive.md](build-program-log-archive.md): never read it whole, grep it for an ID. The ledger counts those tasks from their commit messages.

## Tasks

| ID | Commit | Model / effort | Returns | Usage Δ | Note |
|---|---|---|---|---|---|
| GATE-1 | 7cc4e66 | Sonnet medium | split typecheck, check:changed, sims moved; 0 returns |
| BR-20, BR-7 | d63d64e, +fix | Sonnet medium | one commit for both; bench.ts RIVALS filter fixed by orchestrator; 0 returns |
| KIT-R2 | 3423901 | Sonnet medium | registry slots; logic.ts holds component-free slots; autofixer only run on RoomBonus, Seam/Foundry no Lab scenario; 0 returns |
| EN-0 | merge of 98a825e | Sonnet medium | src/engine/sim, runTrip injected flow; calibration timeouts raised; 0 returns |
| IQ-F1, IQ-F2 | 62579fb, 0bd06c3 | Sonnet high | audit §11 + draft; fires tests it.fails until IQ-F3 stamps; 0 returns |
| SAVE-1 | 2dbbce8 | Haiku high | 10 fixtures, recorded at 89f498b; canal-rooms timeout closed obsolete; 0 returns |
| BF-3, BF-4, BF-5 | 72e8b7f, 3eb1d0d, 1fb3f26 | Sonnet high | P18-P20 built; proposals in status; 0 returns |
| EN-W0 | 001e345 | Sonnet high | ending contracts + acceptance todos; optional profile fields; 0 returns |
| KIT-R1 | dec8acf | Sonnet medium | unsupported/afterBattleClose/bindsBeforeOpen hooks; lint rule exempts sim/bot.ts until KIT-R3b; 0 returns |
| BF-6, BF-7, BF-8 | 1742421 (6+7), c65f7b1 | Sonnet medium | foes, great bells; touched damage.ts one line; 0 returns |
| IQ-F3, IQ-F4, IQ-F5 | 300e481, 7d8aa8d, 87d09e8 | Haiku high | ink footnotes built; 7 proposals in status; 0 returns |
| KIT-R3a | 8263248 | Sonnet medium | ink heart frame exemplar (heart.ts pattern); ink bot is {}; 0 returns |
| BF-9, BF-24 | 4e0e89c, 089473c | Sonnet high | Carillonneur rival; touched data/types, enemies, footnotes index and 3 tests; 0 returns |

## Usage

| Time (CET) | 5h % | Weekly % | Action |
|---|---|---|---|
| KIT-R4 | de088cb | Sonnet medium | members read from household; phone-checked 2 screens; autofixer on stub only; 0 returns |
| BF-10, BF-11 | df10e08, 68524b5 | Sonnet medium | foundry rooms 1-4 with scripted solves; 0 returns |
| KIT-R3b–e | 280f9f3, 042a3b9, 2dc1f64, 063bce9 | Sonnet medium | heart frames for 4 districts + frame.ts helper; 0 returns |
| EN-5 | 218e771 | Sonnet medium | palette, pen, cost, checkDrawing; 0 returns |
| KIT-R3f, KIT-R3g | 538d03c, d266a3e | Sonnet medium | lent shapes, botValue, sim/bot.ts free of districts, lint exemption gone; sims same status; 0 returns |
| EN-S1 | 6c1ca8d | Sonnet high | generator spike; rooms are walkovers (warning); dev page; 0 returns |
| BF-12, BF-13 | 170837a, 45c216f | Sonnet medium | foundry heart, loot, tuner, text; 0 returns |
| BF-14, BF-15, BF-16 | 4127679, 6320e44, eec836e | Sonnet medium | foundry solved art, far bell, lower-Seam floor; goal is `happens foundry:ring`, decoy muffled; 0 returns |
| EN-S2 | 0d13e6e | Sonnet high | two-sided judge and budget walk at default GEN_TUNING; walkovers 83 % to 5.6 %, dull 28/500 (P28's 98 % fair not met); EN-S1 guardrails test setup uses walked budget; 0 returns |
| BR-19a, BR-19b | d39aa96, bbf7b32 | Sonnet medium | bridges footnotes; brink-cap-fall and chalk-network-ring NOT built (need a dusk carrier and an api reader); wider edits than briefed; pending design review |
| CG-W0 | fa1876d | Sonnet high | cartographers contracts: types, stub threshold, six loot tables, 59 `it.todo` acceptance titles, HAND_SALT 8100; `kit.ts` module line NOT added (two tests mock a fixture under id 'cartographers'); 0 returns |
