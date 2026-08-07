# Current Storybook UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the complete current variant as a portrait parchment story-game based on the approved reference.

**Architecture:** Add small shared shell helpers in `ui.js` so setup, scene, response, ending, and recovery screens expose consistent masthead, content, and real-state footer markup. Replace current-only CSS overrides with a responsive book-frame composition while leaving story behavior, mock art selectors, visual-novel, and minimal untouched.

**Tech Stack:** Vanilla JavaScript templates, CSS, Node test runner, in-app browser inspection.

## Global Constraints

- Modify only the current renderer markup and current-scoped styles.
- Do not modify visual-novel, minimal, story data, or mock illustration selectors/assets.
- Do not add fake menu or inventory controls.
- Preserve existing actions, accessibility labels, and story transitions.
- Run focused current-renderer tests only; skip unrelated full-suite tests.

---

### Task 1: Shared Storybook Shell

**Files:**
- Modify: `alice-branching-mvp/src/ui.js`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`

**Interfaces:**
- Produces: `renderStorybookMasthead(label, progress)` and `renderStorybookFooter(session)` internal HTML helpers.
- Preserves: all exported renderer function signatures and every existing `data-action` contract.

- [x] Add focused assertions that setup, scene, chip response, ending, and recovery output the shared shell, masthead, framed art/content, and informational footer.
- [x] Add helper templates and wrap each current renderer screen without changing action attributes or story content.
- [x] Run `node --test tests/ui.test.mjs` and confirm it passes.

### Task 2: Portrait Book Styling

**Files:**
- Modify: `alice-branching-mvp/styles.css`

**Interfaces:**
- Consumes: `.storybook-shell`, `.storybook-masthead`, `.storybook-content`, `.storybook-footer`, and existing `.scene-art` markup.
- Produces: a responsive parchment book frame for current UI only.

- [x] Replace the current-only polish block with parchment frame, masthead medallions, framed art, centered prose, two-column choice tiles, setup option tiles, and real-state footer styling.
- [x] Add mobile rules that remove heavy outer framing and preserve 320px horizontal fit.
- [x] Keep focus rings, 44px targets, reduced-motion handling, and existing illustration selectors unchanged.

### Task 3: Focused Verification

**Files:**
- Verify only; no production file required.

- [x] Run `node --test tests/ui.test.mjs`, `node --check src/ui.js`, and `git diff --check`.
- [x] Confirm `git diff` contains no visual-novel, minimal, story-data, or asset file.
- [x] Inspect current setup and story shell at 390x844 and 1280x800; focused renderer assertions cover chip response, ending, and recovery shell output.
- [x] Commit the implementation.
