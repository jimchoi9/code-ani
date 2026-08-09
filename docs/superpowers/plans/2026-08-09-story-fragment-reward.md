# Story Fragment Reward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Add a grand CSS and Web Animations treasure-card reveal when a new ending fragment is collected.

**Architecture:** Detect first collection at the app transition boundary, pass one ephemeral reward context into the visual-novel ending renderer, and run a renderer-owned animation hook after DOM insertion.

**Tech Stack:** Vanilla JavaScript, CSS animations, Web Animations API.

### Task 1: Reward State
- [x] Test first-time ending detection and no replay for collected/restored endings.
- [x] Pass one-shot reward context through visual-novel rendering.

### Task 2: Reward UI And Motion
- [x] Render ending-specific card, count, particles, and dismiss control.
- [x] Implement Web Animations with reduced-motion and finish-on-tap behavior.
- [x] Add grand treasure overlay styling without new assets.

### Task 3: Verification
- [x] Run app and visual-novel focused tests and syntax checks.
- [x] Verify first ending, dismissal, replay path, and no second animation in mobile browser.
- [ ] Commit the result.
