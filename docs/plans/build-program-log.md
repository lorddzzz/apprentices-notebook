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
