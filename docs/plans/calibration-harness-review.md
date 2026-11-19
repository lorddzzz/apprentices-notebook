# CAL-0 harness review

Reference: `ref/sm-6` = `4c77215`, retained branch `worktree-agent-a7d9ce60e430bee68`. Reviewed its parent diff and comparison with current main. Neither reference may be deleted without the player's OK.

## Accepted port and fallout

The reference changes exactly eight files: Seam data, golden test options, five golden JSON fixtures, and the new sim. Accept only the sim's party 1/2/3 starter-page measurements, every encounter/layout, seeded fresh fights and real attrition trips, and SEAM_SIM / SEAM_SEEDS table entry points. Replace its private loop with `src/engine/sim` and current registered room setup. Do not port TARGETS, SLACK, or the assertion that each trip must reach at least three rooms.

Rejected from this port: Marginalia HP 16 → 72 and its tuning comment; SEAM_DEEP `{ maxRounds: 100, startHp: 20 }` replacing BOT on seam-win-6/8/9; re-recordings of seam-win-6/8/9 and seam-wipe-7/23. No data, options or fixtures are changed. Current main has subsequently changed data and golden coverage and has no reference sim; do not restore old source wholesale.

Current-main comparison: Seam map y is 72 rather than the reference's 79; five district hint lines replace the empty hint list; HP is back to 16 and the 72-HP comment is absent. Golden Seam wins use BOT again, while the canals retain DEEP. Main also adds recorded-action replay/re-store, changed-path reporting, jar-ID normalization and ledger normalization/assertions. These later changes stay intact; none is backported or overwritten by the harness.

The historical ~58% fresh-pair heart result at 72 HP must be remeasured against current rooms, start points, rules and shared policy. It is not an approved number. Spark still bursts per tile, not per cloud; lengthening fights exposes this danger. The old `seam-rooms-play.test.ts` heart-play test failed at 72 HP. Golden wins required HP inflation to 20 and thousands of added fixture lines: those wins were not evidence of normal trip survivability.

## HC-4 policy inventory and compatibility

The shared bot enumerates usable spells and member basic actions, greedily values immediate HP changes, then approaches foes. Hold has no dedicated delayed-benefit evaluation; it may be legal yet never chosen for future protection. No planning for telegraphs, terms, recruitment, doorway editing or later-room charge conservation. Gauge enables district scoring (including foundry pulses); cracks avoids cracked destinations if possible. Neither solves all drawn start-point stalls. Lite prunes movement and action budgets can end trials early; report stalls and exhaustion separately from losses.

The bridges' legal empty-span Shove is an existing save-replay compatibility rule. Preserve it as the default; this review is not permission to remove it. CAL-4 watch item: Registrar-note behavior and whether the greedy policy reads its consequences; keep that distinction visible before interpreting academy losses as balance evidence.

## Shared surface

Adapters belong to CAL-1 seam/canals, CAL-2 ink, CAL-3 baths/bridges, CAL-4 foundry/cartographers and CAL-5 drawn. Tables report fresh layout denominators and reached/attempted trip depth denominators, including zero-reach rows. Trip-worn means actual preceding fights with HP, charges and module state carried by application flow, never a fabricated HP discount. Foundry fresh hearts inject 0–4 rung notes through module setup; worn trips report naturally earned bells.

Smoke is deterministic bounded evidence of no throw/cap overrun, not acceptance by win percentage. Full measurement and approval live in [calibration-results.md](calibration-results.md).
