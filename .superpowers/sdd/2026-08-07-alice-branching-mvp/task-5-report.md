# Task 5 Report: 브라우저 앱 연결과 시각 완성

## Status

Task 5 구현과 자동 검증을 완료했다. 기존 Task 1-4 모듈은 수정하지 않았고, 브라우저 통합 파일과 `tests/ui.test.mjs`만 변경했다.

## TDD Evidence

### RED 1: 브라우저 셸 부재

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 1, 11 tests 중 10 pass / 1 fail.

Expected failure:

```text
Error: ENOENT: no such file or directory, open '.../alice-branching-mvp/index.html'
```

셸 연결 테스트를 먼저 추가한 뒤 `index.html`을 만들기 전에 실패를 확인했다.

### RED 2: 앱 상태 통합 모듈 부재

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 1, test file load fail.

Expected failure:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../alice-branching-mvp/src/app.js'
```

세 결말 경로, 선택 피드백, 칩 응답 복원, 낱말 기록, 재시작 보존, 잘못된 장면 복구, 디버그 복제본 테스트를 추가한 뒤 `app.js`를 만들기 전에 실패를 확인했다.

### GREEN 1: 집중 통합 테스트

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 0, 18 tests / 18 pass / 0 fail.

### GREEN 2: 전체 테스트

Command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit 0, 37 tests / 37 pass / 0 fail.

Additional verification:

```sh
cd alice-branching-mvp && node --check src/app.js
git diff --check
```

Result: both exit 0, no output.

## Files

- `alice-branching-mvp/index.html`: Korean document shell, viewport metadata, skip link, `#app`, noscript message, stylesheet and module entrypoint.
- `alice-branching-mvp/src/app.js`: pure app-state transitions, persisted state restoration, event delegation, chip response screen, vocabulary panel recording, restart flow, recovery, cloned debug getters.
- `alice-branching-mvp/styles.css`: mobile-first layout, 44px+ controls, focus states, reduced motion, responsive desktop split, and distinct CSS artwork for all scene art keys.
- `alice-branching-mvp/README.md`: exact test/server commands, child observation checklist, and non-diagnostic debug guidance.
- `alice-branching-mvp/tests/ui.test.mjs`: shell and state integration coverage without DOM dependencies.

## Self-review

- Confirmed setup starts at `S00` and all routes reach `E1`, `E3`, and `E5` through `chip-response`.
- Confirmed normal choices produce next-scene feedback and persisted paths restore the active scene instead of resetting to `S00`.
- Confirmed a persisted chip choice reconstructs the chip response from canonical story data on reload.
- Confirmed restart opens setup while preserving `runs` and `endingsSeen`; subsequent slot edits use `updateSlots` and preserve history.
- Confirmed vocabulary taps use the session module so top-level and current-run records remain deduplicated.
- Confirmed invalid stored or requested scene IDs render recovery without appending an invalid path.
- Confirmed `window.__aliceStoryDebug` is frozen and `session()` returns a new deep clone on every call.
- Confirmed controls remain native buttons, radio inputs, text input, and form submission; no developer instructions are rendered in the child UI.
- Confirmed CSS includes the required mobile/desktop grid values, multi-color palette, stable art area, 18px story text with 1.75 line height, visible focus rings, 52px actions, and reduced-motion behavior.
- Confirmed no Task 1-4 source module required an integration-contract change.

## Concerns

- Browser QA was intentionally not performed, per controller instruction. The controller still needs to inspect 390x844 and 1280x800 layouts, play all three routes, and visually confirm each CSS scene prop and absence of overlap.
- CSS artwork uses layered gradients and simple shapes only; final visual balance depends on the controller's browser review across the requested viewports.

## Fix Round 1

### Findings addressed

- Long mobile scenes retained the previous page's scroll offset because transition rendering focused the new heading with `preventScroll` but never reset the document scroll position.
- The name input relied on the browser's default text type, so it did not match the explicit `input[type="text"]` CSS selector and rendered below the intended target height.
- The skip link relied on padding and measured just below the 44px target threshold.

### Regression RED

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 1, 20 tests 중 17 pass / 3 fail.

Expected failures:

```text
resetTransitionView actual 'undefined', expected 'function'
assert.ok(minimumHeight(cssRule(".skip-link")) >= 44)
setup HTML did not match an input with type="text" and name="HERO"
```

### Fix

- Added the pure `resetTransitionView(scrollTo, focusTarget)` helper. It calls `scrollTo({ top: 0, left: 0, behavior: "auto" })` first, then focuses the heading with `{ preventScroll: true }` so focus cannot restore the previous offset.
- Connected the helper only to full-screen transitions; vocabulary panel open/close keeps its local focus-return behavior.
- Added explicit `type="text"` to the setup name input, activating its existing 52px minimum-height rule.
- Made the skip link a flex target with an explicit 44px minimum height.

### GREEN

Focused command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 0, 20 tests / 20 pass / 0 fail.

Full command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit 0, 39 tests / 39 pass / 0 fail.

Additional verification:

```sh
cd alice-branching-mvp && node --check src/app.js && node --check src/ui.js
git diff --check
```

Result: all exit 0, no errors.

### Files and self-review

- `alice-branching-mvp/src/app.js`: extracted and wired the deterministic transition scroll/focus helper.
- `alice-branching-mvp/src/ui.js`: added the explicit name-input type.
- `alice-branching-mvp/styles.css`: guaranteed the skip-link target height.
- `alice-branching-mvp/tests/ui.test.mjs`: covered transition call order/options, explicit input type, and both 44px minimum-height contracts without a DOM dependency.
- Confirmed `behavior: "auto"` does not introduce smooth motion and preserves the reduced-motion contract.
- Confirmed scene numbering and browser-level automation remain deferred as requested.

### Fix round concerns

- Browser QA was not run in this fix round. The controller should confirm a transition from the bottom of a long mobile scene visibly returns to the new scene art/title and that keyboard focus lands on the heading without moving away from the top.

## Fix Round 2

### Finding addressed

Fix Round 1 correctly used the standard `behavior: "auto"` value, but the document still declared `html { scroll-behavior: smooth; }`. For programmatic scrolling, `auto` follows the computed CSS scroll behavior, so the transition could still animate instead of resetting immediately. This corrects the earlier report assumption that `auto` alone guaranteed an immediate reset.

### Regression RED

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 1, 21 tests 중 20 pass / 1 fail.

Expected failure:

```text
The html rule was expected not to match /scroll-behavior:\s*smooth/
Input: html { background: var(--paper); scroll-behavior: smooth; }
```

### Fix

- Removed the unused global `scroll-behavior: smooth` declaration from `html`.
- Kept `resetTransitionView` on the standard `{ behavior: "auto" }` option, which now resolves immediately under the default CSS behavior.
- Kept the reduced-motion override unchanged; no smooth transition behavior was added elsewhere.

### GREEN

Focused command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit 0, 21 tests / 21 pass / 0 fail.

Full command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit 0, 40 tests / 40 pass / 0 fail.

Additional verification:

```sh
git diff --check
```

Result: exit 0, no output.

### Files and self-review

- `alice-branching-mvp/styles.css`: removed the global smooth-scroll policy.
- `alice-branching-mvp/tests/ui.test.mjs`: added a regression contract that rejects global smooth scrolling while transition resets use `auto`.
- Confirmed no nonstandard scroll behavior value was introduced.
- Confirmed this round does not change scene state, focus ordering, reduced-motion rules, or unrelated visual behavior.

### Fix round concerns

- Browser QA was not run in this fix round. The controller should still confirm the bottom-of-scene transition visibly snaps to the next screen top in a normal-motion browser profile.
