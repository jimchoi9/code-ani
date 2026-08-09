# Child Test Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Add a visual-novel-only child test mode with participant reset, local telemetry, JSON export, and replay from endings.

**Architecture:** Add a small pure `test-mode.js` store, integrate it at the app event boundary, and pass test context into the visual-novel renderer. Keep story and telemetry persistence separate.

**Tech Stack:** Vanilla JavaScript, localStorage, Blob download, Node test runner.

### Task 1: Test Store
- [x] Test query detection, code normalization, reset, event timing, storage fallback, and export snapshot.
- [x] Implement `src/test-mode.js`.

### Task 2: App Integration
- [x] Force visual-novel and hide comparison menu only for `?test=1`.
- [x] Start/reset participant sessions and record story actions.
- [x] Add replay transition that preserves endings and starts a fresh run at S00.
- [x] Add injectable JSON download boundary.

### Task 3: Test UI
- [x] Add participant code to test-mode setup.
- [x] Add facilitator download/reset panel.
- [x] Add replay/complete actions to test-mode endings.
- [x] Style all controls for mobile visual-novel UI.

### Task 4: Focused Verification
- [x] Run test-mode, app integration, and visual-novel focused tests.
- [x] Verify participant start, event capture, ending replay, reset, and the JSON download boundary.
- [x] Confirm normal comparison URLs remain unchanged and commit.
