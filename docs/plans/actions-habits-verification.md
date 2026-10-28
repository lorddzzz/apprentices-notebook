# Actions and habits: verification (AH-8)

> Plan: [actions-habits-plan.md](actions-habits-plan.md) §6. Run on branch `worktree-agent-a46fc63ce3efc6cfd` after AH-1 to AH-7 were merged. `pnpm check` green (180 test files, 6063 tests before the last doc commit; no src changes).

## 1. Plan §6 checks

| Check | Result | Where |
|---|---|---|
| Action scenarios (every named case: pull, hop, swap, gate) | Pass, all names present | `tests/scenarios/basic-actions.test.ts` |
| Habit scenarios (fuse-on-step, mark-twice, steamproof, hold-two, near-unison, long-touch, restore-erase) | Pass, each with a control case | `tests/scenarios/habits-*.test.ts` |
| `rival-trick` (a foe with `trick` carries the rule) | Added: steamproof foe skipped by Storm and burned by fire, fuseOnStep foe opens its own dusk jar (another foe and a foe with no trick do not) | `tests/scenarios/habits-rival.test.ts` |
| `steamproof-boil-over-hook` (BH's call: `dealDamage` with `harm: 'steam'`) | Added: unharmed, tagged, not a hit, shield untouched; untagged hit is never warded | same file |
| Arrival matrix with pull, hop, swap | Pass (rows existed from AH-1) | `tests/engine/arrival-matrix.test.ts` |
| Arrival matrix with the `fuseOnStep` hook | Added: walk, push, push through, pull, hop, basic swap open her jar (habit tag, `fuseOnStep:jar` on arrivals she did not make); hop over stays shut; no habit or another owner waits. The old `it.todo` is gone | same file |
| Projection agreement with the new events | Pass. The drift guard's event list lacked `pull`, `hop`, `swapWith`, `unharmed`; added, and every one is now replayed by the suites | `tests/app/projection.test.ts` |
| Fuzz with every action and habit | Added 240 seeded walks (`AH_FUZZ_SEEDS` scales; 600 also green): 4 boards (plates, canal, drop, kettle, fog, foes), kits cycle through 4 actions x 10 habits with a page matched to the habit. Each step: projects to engine state, under the event cap, input state not mutated, same log on replay, no shared or blocked tile, only known lines and habits, `erased` clones. All seven new habits tag events | `tests/sim/actions-habits-fuzz.test.ts` (AH-7's smoke walks stay in `fuzz.test.ts`) |
| Line integrity both ways | Pass (existing L1 test covers the AH rows) | `tests/data/lines.test.ts` |
| Lab demos replay | Pass | `tests/scenarios/lab.test.ts` |

## 2. Phone checks (375x812, dev server on port 5192 from this worktree)

Screens in `/private/tmp/claude-501/-Users-olivera--claude-spares-spare-1E7r9h/21b013a0-9cac-4c1e-9438-0da298f3379b/scratchpad/ah8/`:

- `01a-pull-mode.jpg`: Pull mode, the rat two tiles away ringed; `01-pull-preview.jpg`: Pull previewed into the canal (dotted path, red ring on the rat, "Confirm Pull rat right").
- `02-hop-preview.jpg`: Hop arc over the rat to C1 with the landing ghost.
- `03-swap-preview.jpg`: both Swap ghosts. The two ghosts overlap the units' own letters (ghost N over the rat, ghost r over the notary); legible but cluttered.
- `04-steamproof-preview-masked.jpg`: the Lab "Steam never hurts" demo, Touch at B1. Summary reads "dummy B1 -1" with no habit chip and no unharmed badge (see bug 1).

No horizontal overflow (`scrollWidth` 375) on any screen. Not captured (out of time): light/dark, a masked first Pull into a plate, Tally by one mark, long Touch tint, the runaway's jar hint, the fine-print card; the Svelte autofixer was not run (no component changed). Real iOS touch is untested.

## 3. Bugs and rough edges found (not fixed)

1. **The steamproof headline is masked in a fresh notebook.** The engine preview on the same cast (tests, witnessed set unmasked) gives "dummy B1 -3 - Steam never hurts" with the chip and badge. In the browser the burst, `unharmed` and Storm damage all carry the line `spark:cloud`, which is unwitnessed, so `maskPreview` drops them, including the `unharmed` event that carries the habit. P11 says the habit's headline is never masked. Probable fix (src, `lines.ts::maskPreview`): never mask an event that has a `habit` and no line of its own, or give `unharmed` no inherited line (tag it at emit). Not verified after a fix.
2. Swap ghosts overlap (see above): offset or shrink the ghost letters.
3. `tests/app/projection.test.ts` `EVENT_TYPES` is a hand list and still lacks the RV events `rivalPlans`, `castFails`, `fallbackStrike`, `orderFails`, `pageRecovered` (one more). Making it `Record<GameEvent['type'], true>` would fail typecheck until RV adds them.

## 4. Status notes for the orchestrator

**DESIGN.md §6.1 (party, actions and habits):** "Built (AH): Pull, Hop and Swap join Shove as basic actions; an apprentice takes only her own. Pull hooks a living unit exactly two tiles away (nothing between) one tile toward her, never crushing. Hop leaps two tiles over anything that does not block units (P3: plates, Walls, kettles, gates and grates do) and lands as a step. Swap trades with an adjacent unit. Seven habits are data rules any apprentice, the Lab or a rival can carry; each is previewed, with witnessed fine print."

**DESIGN §11 log:**
- P3: the reach rule is `blocksUnits`, so a brass plate is as tall as a Wall for Hop and long Touch.
- P14: steamproof wards only declared steam (Storm, Thunderhead, Brand storm, Kettle); Flashover is fire and burns her; a Brand storm still marks her; a warded hit is not a hit.
- P15: the warden's second Hold scans ahead, left, right, behind (no heading: up, right, down, left) and may catch an ally.
- P18: the erased student restores what the last Erase that removed anything took, for the whole fight; a restored jar counts as its owner's newest; a mark returns only to its bearer.

**TECH §7:**
- *Habit rule table:* `HABITS[id].rule` holds only the bent field (`jarLimit`, `forkAhead`, `fuseOnStep`, `tallyMarkWeight`, `wards`, `holdExtra`, `unisonReach`, `touchReach`, `eraseRestores`); the engine reads `habitOf(unit)` (member lean, foe `trick`) and `habitRule(unit)`; flows and jars carry the id.
- *`harm`:* `dealDamage(..., { harm })` with `HarmKind` ('steam'); `guardHarm` runs the registry (`HARM_GUARDS`, habit wards first); a cancelled hit logs `unharmed` and is not a hit. BH's boil-over calls it with `harm: 'steam'`.
- *`habit` event field:* the headline event is tagged `habit` (never masked by design, see bug 1); edge cases are ordinary lines with the habit as subject. `BattleState.erased` is the Erase record.
- *Sim:* `tests/sim/actions-habits-fuzz.test.ts` (`AH_FUZZ_SEEDS`).

**ROADMAP:** AH built and verified, playtest gate open (each action and habit by thumb on 7x9: Pull's 2-tile hook, Hop's reach, warden scan order, erased student's restore). New follow-ups: steamproof headline masked in a fresh notebook (bug 1); Swap ghost overlap; `projection.test.ts` event list exhaustive type; missing phone captures (light/dark, masked Pull into a plate, Tally, long Touch, jar hint, fine-print card).
