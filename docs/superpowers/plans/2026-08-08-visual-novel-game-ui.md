# Visual Novel Game UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the visual-novel variant as the approved dark fantasy portrait game UI.

**Architecture:** Add shared HUD, title plaque, frame, and footer helpers inside the visual-novel renderer, then layer a visual-novel-only CSS system over existing art and story behavior.

**Tech Stack:** Vanilla JavaScript templates, CSS, Node test runner, browser inspection.

## Constraints

- Visual-novel renderer and stylesheet only, plus focused tests and docs.
- No fake interactive features.
- No asset, current UI, minimal UI, or story-data changes.

### Task 1: Shared Game Frame

- [x] Add focused shell/HUD/footer assertions.
- [x] Wrap setup, scene, response, ending, and recovery output in shared game-frame markup.
- [x] Preserve all existing `data-action` contracts.

### Task 2: Reference-Led Styling

- [x] Add indigo patterned frame, compact HUD, gold title plaque, framed art, dialogue deck, cyan/magenta actions, and status dock.
- [x] Add mobile and desktop responsive rules and reduced-motion support.
- [x] Keep every control at least 44px high.

### Task 3: Focused Verification

- [x] Run visual-novel focused tests, syntax check, and `git diff --check`.
- [x] Inspect setup and story scenes at 390x844 and 1280x800.
- [x] Confirm no unrelated variant or asset diff and commit.
