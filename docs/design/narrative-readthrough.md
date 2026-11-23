# Narrative read-through (BL-41 remainder), 2026-11-23

> Three read-only passes (Seam and codex; canals, ink quarter, baths; bridges, foundry, hall and the handover) checked the existing thread against [names-and-voice.md](names-and-voice.md): name leaks, owner pronouns, stale placeholders, voice breaks, contradictions with the handover, dangling references. It was a read by subagents, not a playtest, and `seam.md` was read in part (mostly rune rule tables).
> **Result:** no name leaks and no gendered pronouns for the owner anywhere in shipped text; no exclamation marks or archaisms; every handover thread lands except the baths' ledger, which is fixed below.

## Fixed in this pass

| Finding | Fix |
|---|---|
| Bath ledger 5 told the player "a name you know … your own", contradicting the handover (the owner is a separate person, the name is revealed once, at the end) and said "Stayed" about the baths | Rewritten as an unnamed line: *Entered in a hand you will come to know: years of hours, taken to watch the seam from the warm side. Stayed.* (the ledger's refrain, kept) |
| Bath ledger 2 named "Maret of the lamp-yard", one letter from Marit, with a yard no canal ledger mentions | **Anke of the barge-yard** |
| Bridges' ledger said "the span guild abandoned the join", against handover p2 (the Cartographers gave the plan up) | The Keystone Watch's hand now says *the drawing withdrew the plan* |
| Rival trick texts used "he/his" for every rival, now at odds with Hedda Brenn, Lidewij Tauw and the faceless Registrar | Reworded without pronouns; "His alone" is now *Theirs alone* |
| Lowercase placeholders: "the thermae" (handover p2, bathhouses hearing and chimney note), "the academy" (hall hearing line), "keystone watch" (Willem's blurb) | *the Thermae*, *the hall*, *Keystone Watch* |
| `ending-text.md` §2 had no signature row, so a builder following it could omit it | Row added |

## Open (judgment calls, not changed)

| # | Finding | Options |
|---|---|---|
| R1 | **The Cartographers' dead letters** (`inkQuarter/papers.ts`, letters 1–5) say "we ask again, with some patience", "the guild has no wish to be unkind", "we regret": a guild that wishes and regrets. The key in [narrative-audit.md](narrative-audit.md) §2.5 makes them passive ("It was determined…"), and the formal heading *Re: Non-Conforming Join, Sheet 0* has no home in `src/`. | Recast the five letters in the passive and add the heading (new writing, a short task), or keep the warmer polite-but-firm reading and drop the passive rule from §2.5. |
| R2 | **Rival pronouns.** Docs ([footnotes-content](footnotes-content/) canals, ink quarter, baths) still say "his page", "he serves a notice". Names set no gender. | Sweep to "their"/"the", or decide each rival's pronoun once. |
| R3 | **Credit lines** on rival pages say the role ("Copied from the Lamplighter's route sheet"), not the person. | Name the person (*Gerrit Velt's route sheet*), or keep the roles on purpose. |
| R4 | The Copyist's blurb says "copying pamphlets about your notebook"; nothing else in the repo mentions pamphlets. | Reword ("copying out pages about your notebook") or add the pamphlets to the hall's lore. |
| R5 | `cartographers/lore.ts` badJoin states the owner's act plainly ("The owner went in to keep it"); the guild voice is passive. | Optional recast; keep "no lamps, no bell". |
| R6 | Design docs (`city-and-districts.md`, `district-cartographers.md`) still say "academy" and the old district names as plain labels. | Fine as labels; add one gloss line per doc if wanted. |
| R7 | Bath ledger 4 ("the steam … reads them back to the vent") is eerier than the Thermae Guild's soothing manner. | Soften ("is in no hurry to give them back") or keep the chill. |
