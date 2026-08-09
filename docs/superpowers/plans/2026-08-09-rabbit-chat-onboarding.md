# Rabbit Chat Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the test-mode profile form with a participant-code entry followed by a clock-rabbit chat that collects the child's name, friend, color, and snack.

**Architecture:** Keep story state unchanged until onboarding completes. Persist onboarding step and answers in the test-mode record, render the conversation from that record, and call the existing `startStory()` only after the child confirms the collected answers.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, localStorage, Node test runner.

## Global Constraints

- Apply only under `?test=1`; non-test UI variants retain their existing setup forms.
- Offer recommendation chips plus free text for friend, color, and snack; name uses free text.
- Restore completed answers and the current question after reload.
- Use a typing indicator and delayed rabbit reply, with reduced-motion support.
- Do not add image assets or dependencies.

---

### Task 1: Persisted Onboarding Model

**Files:**
- Modify: `alice-branching-mvp/src/test-mode.js`
- Test: `alice-branching-mvp/tests/test-mode.test.mjs`

- [x] Add failing tests for onboarding creation, answer persistence, step advance, and reload.
- [x] Add `saveOnboarding(onboarding)` to the test store and initialize onboarding in `start()`.
- [x] Run `node --test tests/test-mode.test.mjs`.

### Task 2: App State And Event Flow

**Files:**
- Modify: `alice-branching-mvp/src/app.js`
- Test: `alice-branching-mvp/tests/app-integration.test.mjs`
- Test: `alice-branching-mvp/tests/ui.test.mjs`

- [x] Add failing integration tests for participant entry, sequential answers, confirmation, and story start.
- [x] Add delegated `start-onboarding`, `onboarding-answer`, suggestion, and confirmation actions.
- [x] Record `onboarding_started`, `onboarding_answered`, and `onboarding_completed` events.
- [x] Restore an active onboarding from the test store at mount.
- [x] Run focused app tests.

### Task 3: Clock Rabbit Chat UI

**Files:**
- Modify: `alice-branching-mvp/src/ui-variants/visual-novel.js`
- Modify: `alice-branching-mvp/styles/visual-novel.css`
- Test: `alice-branching-mvp/tests/ui-variants.test.mjs`

- [x] Add failing renderer tests for code entry, chat history, recommendation chips, free input, typing state, and confirmation.
- [x] Implement `renderOnboarding(context)` and reduce test-mode `renderSetup()` to participant-code entry.
- [x] Add responsive chat bubbles, composer, typing dots, latest-message motion, and reduced-motion rules.
- [x] Run focused renderer tests.

### Task 4: Verification And Commit

- [x] Run app, UI variant, test mode, syntax, and diff checks.
- [x] Verify the complete onboarding and reload behavior in a 390px mobile browser.
- [x] Mark the plan complete and commit.
