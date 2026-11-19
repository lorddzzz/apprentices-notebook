# CAL-N literal review

Extraction only: all values and event behavior remain unchanged. The core rows in calibration-plan §1.1 map as follows.

| Original literal | Value | Data field | Consumer |
|---|---:|---|---|
| KEEP_DAMAGE | 2 | FOOTNOTE_TUNING.markKeepDamage | bursts.ts detonate |
| WIDE_DAMAGE | 1 | FOOTNOTE_TUNING.markWideDamage | bursts.ts detonate |
| FOCUS_DAMAGE | 3 | FOOTNOTE_TUNING.plateFocusDamage | bursts.ts conduct |
| SPARE_DAMAGE | 1 | FOOTNOTE_TUNING.plateSpareDamage | bursts.ts conduct |
| CHARGE_DAMAGE | 1 | FOOTNOTE_TUNING.plateChargeDamage | bursts.ts chargeTrip |
| FLARE_DAMAGE | 1 | FOOTNOTE_TUNING.markFlareDamage | bursts.ts flare |
| HUM_DAMAGE | 1 | FOOTNOTE_TUNING.plateHumDamage | bursts.ts conduct |
| spark-slick-long rounds | 3 | FOOTNOTE_TUNING.slickLongRounds | bursts.ts ignite |
| spark-slick-hot damage | 3 | FOOTNOTE_TUNING.slickHotDamage | bursts.ts ignite |
| guard-shielded-thick shield | 3 | FOOTNOTE_TUNING.guardThickShield | runes/actions.ts guard |
| touch-member-runup cap | 3 | FOOTNOTE_TUNING.touchRunupCap | runes/actions.ts shove |
| Sentence push | 2 | ACTIONS.sentenceTiles | runes/actions.ts sentence (already extracted) |
| Hold duration | 1 | ACTIONS.holdRounds | runes/actions.ts hold (already extracted) |
| Levy shield per mark | 1 | ACTIONS.levyShieldPerMark | runes/actions.ts levy (already extracted) |
| graphite-cap-pin held minimum | 2 | FOOTNOTE_TUNING.graphitePinRounds | solvents.ts undoBoard |

Foundry pulse scoring belongs to CAL-B; drawn-room placeholder loot and doorway weight belong to CAL-D.
