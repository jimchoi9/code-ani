# Test Completion Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the child's story ending from the facilitator's test completion and make test data export an explicit, reliable final step.

**Architecture:** Add a `complete` app screen reached only from a test-mode ending. The visual-novel renderer owns the child-facing completion presentation, while app event handlers own JSON export, completion recording, and starting a new participant.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node test runner.

## Global Constraints

- The flow is active only under `?test=1`.
- Keep the visual-novel UI fixed in test mode.
- Do not add image assets or dependencies.
- Preserve collected endings and session data until the facilitator starts a new participant.

---

### Task 1: Completion State And Event Contract

**Files:**
- Modify: `alice-branching-mvp/src/app.js`
- Test: `alice-branching-mvp/tests/ui.test.mjs`
- Test: `alice-branching-mvp/tests/app-integration.test.mjs`

**Interfaces:**
- Produces: `finishAdventure(state)` returning the same session with `screen: "complete"`.
- Produces: actions `finish-adventure`, `complete-test`, and `new-participant`.

- [x] Add a failing state test proving an ending transitions to `complete` without changing the session.
- [x] Add failing event tests proving `finish-adventure` renders completion, `complete-test` records then downloads, and `new-participant` clears all stores.
- [x] Implement the state transition, completion renderer dispatch, and event callbacks.
- [x] Run `node --test tests/ui.test.mjs tests/app-integration.test.mjs`.

### Task 2: Child Completion And Facilitator Controls

**Files:**
- Modify: `alice-branching-mvp/src/ui-variants/visual-novel.js`
- Modify: `alice-branching-mvp/styles/visual-novel.css`
- Test: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Produces: `renderComplete(session, context)` with collected fragment summary.
- Ending actions: `다른 결말도 찾아볼래!`, `오늘 모험 마치기`.
- Facilitator actions: `기록 저장하고 테스트 완료`, `새 참가자 시작`, `이야기로 돌아가기`.

- [x] Add failing renderer tests for revised ending copy and the complete screen controls.
- [x] Implement the complete screen using the existing game frame and collected-ending data.
- [x] Add responsive styles that visually separate child completion from facilitator controls.
- [x] Run `node --test tests/ui-variants.test.mjs tests/app-integration.test.mjs`.

### Task 3: Verification And Commit

**Files:**
- Modify: `docs/superpowers/plans/2026-08-09-test-completion-flow.md`

- [x] Run focused app, UI variant, test mode, and syntax checks.
- [x] Verify one ending through completion, JSON download affordance, and new-participant reset in a mobile browser.
- [x] Mark this plan complete and commit the implementation.
