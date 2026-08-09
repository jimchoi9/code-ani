# Apply POV Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace story illustration placeholders with the 21 approved v2.1 POV scene, ending, and variation spot JPEGs.

**Architecture:** Register every authored art key in the local visual-novel manifest. Keep the common illustration helper as the single rendering boundary so all UI variants resolve the same key to the same file, and attach C2 variation spot keys during ending resolution for an inset visual in the visual-novel dialogue.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, local JPEG assets, Node test runner.

## Global Constraints

- Use the exact v2.1 art-key filenames already stored under `assets/visual-novel/scenes`, `endings`, and `spots`.
- Render all story art as POV imagery without `{HERO}` or `{PET}` sprites.
- Preserve the existing 17-node story and six-ending transition behavior.
- Treat illustrations as decorative because the adjacent authored text already describes them; use empty alt text.
- Do not add dependencies or transform the approved source files.

---

### Task 1: Asset Registry And Common Renderer

**Files:**
- Modify: `alice-branching-mvp/assets/visual-novel/manifest.js`
- Modify: `alice-branching-mvp/src/ui.js`
- Test: `alice-branching-mvp/tests/ui-variants.test.mjs`

- [x] Add failing tests that all 18 authored scene/ending art keys resolve to existing JPEGs.
- [x] Register the 18 illustration URLs and three spot URLs.
- [x] Replace known-key placeholders with decorative `<img>` output while retaining a fallback for unknown keys.
- [x] Run focused UI tests.

### Task 2: C2 Variation Spots And POV Styling

**Files:**
- Modify: `alice-branching-mvp/src/story-data.js`
- Modify: `alice-branching-mvp/src/ui-variants/visual-novel.js`
- Modify: `alice-branching-mvp/styles/visual-novel.css`
- Test: `alice-branching-mvp/tests/story-data.test.mjs`
- Test: `alice-branching-mvp/tests/ui-variants.test.mjs`

- [x] Add failing tests for `TRUTH`, `SHIELD`, and `TURN` spot-art mapping.
- [x] Add `spotArt` to resolved ending variations and render it as a compact inset image.
- [x] Style full-bleed 16:9 POV art with stable cropping and responsive spot framing.
- [x] Verify no scene character sprite is emitted.

### Task 3: Verification And Commit

- [x] Run story, app, renderer, syntax, file-existence, and diff checks.
- [x] Browser-check a scene, C2 route, ending image, and variation spot on mobile and desktop.
- [x] Mark the plan complete and commit the assets and code.
