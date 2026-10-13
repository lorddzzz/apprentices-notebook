---
name: design-round
description: Run a game design round with the player (indirect questions in small batches, then record decisions in DESIGN.md). Use when a mechanic, rune, enemy or feature needs a design decision.
---

# Design round

The player is indecisive on fine mechanics but has strong taste. Draw out preferences indirectly and decide with them, not for them.

1. **Frame it.** One line: what decision is open and why it matters now.
2. **Ask 2–4 questions per round** through the question UI (AskUserQuestion). Prefer indirect, inspirational questions ("which of these feels like the game?", references, scenarios) over "pick a number". Put a recommended default first, with the reason.
3. **Summarize what you learned** in a sentence or two after each round, and say what you'll assume.
4. **Default when unsure.** Propose a starting value, label it *tune by playing*, and move on. Fine numbers are settled in playtests.
5. **Record it.** Update DESIGN.md (the relevant section plus the §11 decision log) in the same commit as any related code. Mark open questions as open, decided things as **Decided**. For a feature bigger than one section, the details go in its own doc in `docs/design/` (follow [docs/design/README.md](../../../docs/design/README.md): a status line, a §0 decisions table, links both ways). DESIGN.md keeps a short summary and a link. When a round compares options, delete the unchosen ones once decided and name the commit that holds them.
6. **Update memory** only for durable collaboration preferences, not for design facts already in DESIGN.md.
