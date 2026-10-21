# Growing lattice pages

> **Status: Built** (2026-10-21; design round 2026-10-20). Roadmap: BL-103, including BL-88's revision growth. Implementation plan: [growing-pages-plan.md](../plans/growing-pages-plan.md). [Verification](../plans/growing-pages-verification.md).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.2 and §11. Builds on [party.md](party.md) §0's removal of fixed member shapes. Current rune rules: [rune-design-final.md](rune-design-final.md).

## 0. Decisions (2026-10-20)

| Question | Decision | Why |
|---|---|---|
| How does the page grow? | **Decided:** blank paper unfolds automatically around the wiring, in every direction; no growth button or member-specific holes | Extending a spell should feel like continuing to write |
| What limits the build? | **Decided previously, reaffirmed:** ink per apprentice; page area is not another budget | Long chains and wide branches compete through their rune costs |
| What happens when it outgrows the phone? | **Decided:** keep runes readable and tappable, drag to pan, use Fit for an overview | More wiring should not make every editing target smaller |
| Does revision use the same paper? | **Decided:** yes, Glyph insides grow too; remove the separate 7×7 canvas limit | Compiling makes a spell portable without adding a small-grid constraint |
| Does an edit move my work? | **Proposal — tune by playing:** preserve the working area's screen position during growth and erasure; do not automatically refit | Avoid chasing the rune just edited |
| How do I leave Fit? | **Proposal — tune by playing:** tap a region to return to editing scale there; retain an explicit way back to editing scale too | An overview should help navigate a large page |

### Built defaults (2026-10-21)

Study, quiet doorway, Lab and revision share growing paper. Existing saves migrate without moving placements or changing Source charges, proof, Glyph versions or records. Revision keeps the pinned entry and its independent 3–8 flow-cell rule. Fixed authored scenarios retain their holes and bounds.

The following remain **Proposal defaults to tune by playing**, not new player decisions: one blank cell around wiring, an empty 5×5 starting patch, 60px editing pitch with at least 44px targets, a 10px drag threshold and 450ms hold. Ordinary edits and erasure preserve the working view; explicit Fit ignores empty regions previously visited. Tiny overview targets navigate before editing. Compact read-only Glyph insides scroll within their sheet instead of shrinking all runes; larger or sparse imported insides use the same bounded paper for read-only navigation.

Build Proposals P1 and P6–P9 were accepted: stable signed coordinates, camera state in memory only, a v7→v8 save migration, sparse growing-page text, and explicit import resource budgets. These protect existing work and reject excessive imports without cropping. Their numeric and serialization contracts are recorded in TECH.md and the build status; they add no playable width, height or area budget.

## 1. Writing and growth

Every apprentice gets an ordinary grid of writable paper. Existing placements remain where they are, and former holes become usable. Start with enough visible blank space to begin a separate spell as well as extend an existing one.

Maintain a blank margin around occupied cells. Placing in that margin reveals more paper, including above and left of the current wiring. A one-cell margin is the starting proposal, **tune by playing**. Panning must make the writable margin reachable; growth must not depend on first tapping an offscreen cell.

Empty paper costs no ink. Disconnected spells and unused runes remain allowed under the current rules. Growth never fills gaps, joins paths automatically, or rearranges runes. Empty cells still stop a path; showing more paper does not change what a spell does.

Erasing does not snap the viewport back or move surviving runes. Fit frames the current wiring with its blank margin, rather than every empty region ever visited. The exact initial framing and treatment of a fully empty page are layout defaults to tune on the phone.

## 2. Phone controls

Keep tap-to-place, tap-to-turn and the existing erase/lift actions. Dragging pans the paper and must not place, rotate or lift a rune, including when the drag starts over one. The shelf, ink readout and page controls remain accessible while the paper moves.

Fit shows the whole current wiring. When that would make targets too small, treat it as a navigation overview: selecting a region returns to editing scale before changing a rune. Do not make pinch gestures necessary to edit or navigate. Exact editing scale, drag threshold and control placement are **tune by playing** at 375×812.

Use the same interaction in the Study, quiet doorway, Lab lattice editor and Glyph revision editor. Existing collection and ink rules still apply in each context; the Lab remains unrestricted.

## 3. Glyphs, proof and existing notebooks

Glyph revision gains the same automatic margin and pan/Fit behavior. Its entry, internal wiring, validity rules, version records, open cells and exits retain their existing meaning; removing the canvas size limit does not waive those rules. Inner runes retain their existing ink accounting when the Glyph is installed.

Opening an existing notebook must preserve its placements, compiled spells, Source charge counts, proof and Glyph records. Revealing paper, panning and fitting are not spell edits. Growth must not reset proof or change which Source owns remaining charges, including at a quiet doorway.

Lab/scenario imports and save loading must accept the new valid page geometry while continuing to reject malformed coordinates, duplicate placements and invalid references. Old valid notebooks and scenario layouts remain usable. Resource safeguards for malformed or extreme imports belong in the implementation plan; they must not silently crop valid wiring or reintroduce a small playable grid as a second budget.

## 4. Delivery and verification

BL-103 can ship for the existing two apprentices before recruitment. Include revision growth (BL-88) in the same implementation scope. Recruitment, trio selection and room enlargement remain BL-43.

The implementation plan must cover growth on all four sides, existing-save compatibility, Lab export/import, proof/Fair Copy, Glyph revision/version compatibility and doorway charges. Regression tests should show that revealing blank space leaves compiled behavior unchanged.

At 375×812, verify extending a chain beyond every original edge, starting a second spell, panning from a filled cell without editing, navigating with Fit, erasing without a viewport jump and revising beyond 7×7. Capture screenshots. The design round itself changes documentation only; these are build acceptance checks, not checks already performed.
