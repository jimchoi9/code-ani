# Split Story Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the six trait-fragment rewards to immediately after the character encounter and award one of three rose stamps when the child reaches an ending, producing an 18-cell collection.

**Architecture:** Keep `encounterId` and `endingVariation` as the existing story-state keys. Add one selector-driven `FRAGMENT` story scene between every chip response and C1, then store permanent `traitFragmentsSeen` keys (`E1`-`E6`) and composite `roseStampsSeen` keys (`E1:TRUTH` through `E6:TURN`) in the session. The UI renders CSS-based trait rewards without new images and reuses `spot_truth`, `spot_shield`, and `spot_turn` for rose rewards.

**Tech Stack:** JSON Schema, generated JavaScript story bundle, vanilla JavaScript, CSS, Node test runner.

## Global Constraints

- Preserve all four authored choices and the existing `endingByEncounter` mapping.
- Do not add new image assets.
- Award a trait fragment only on the first visit to its encounter-derived fragment.
- Award a rose stamp only on the first visit to a unique ending and garden-answer combination.
- Replaying the same encounter with another garden answer may award a new rose stamp but not the trait fragment again.
- Keep parent notes at the ending.

---

### Task 1: JSON Fragment Scene

- [x] Add `FRAGMENT` to the graph and point all encounter chips to it.
- [x] Add selector-driven fragment content and presentation metadata.
- [x] Generate and validate the story bundle.

### Task 2: Collection State And Reward Events

- [x] Add backward-compatible fragment and rose collection arrays to sessions.
- [x] Record trait fragments on FRAGMENT entry and rose stamps on ending entry.
- [x] Split reward detection into trait and rose reward payloads with first-time semantics.

### Task 3: Reward And Collection UI

- [x] Render the existing CSS reward card for trait fragments at FRAGMENT.
- [x] Render a rose-stamp reward using the existing variation spot art at endings.
- [x] Show 6 trait slots and an 18-cell rose garden on the completion screen.
- [x] Replace ending acquisition copy with a short fragment-recall line.

### Task 4: Verification

- [x] Cover all six encounter routes and all three garden answers.
- [x] Verify repeat and alternate-answer reward behavior.
- [x] Run story checks, the full test suite, and browser checks.
- [x] Commit the completed implementation.
