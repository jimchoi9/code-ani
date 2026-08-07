# Task 4 Report: 접근 가능한 화면 렌더러

## Status

Completed. Added semantic HTML string renderers in `alice-branching-mvp/src/ui.js` and focused TDD coverage in `alice-branching-mvp/tests/ui.test.mjs`.

## RED Evidence

Command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit code `1`.

The existing 19 tests passed, and the new UI test module failed exactly because the production module did not yet exist:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../alice-branching-mvp/src/ui.js'
...
✖ tests/ui.test.mjs
ℹ pass 19
ℹ fail 1
```

## GREEN Evidence

Command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit code `0`.

```text
✔ escapeHtml escapes all HTML-significant characters
✔ 설정 화면은 이름과 세 선택 그룹을 제공한다
✔ 선택 장면은 개인화하고 prose 문단, 선택, 낱말을 안전하게 렌더링한다
✔ 칩 장면은 레이블과 응답 계약을 이스케이프해 제공한다
✔ 복구와 낱말 패널은 상태를 설명하고 닫기와 재시작 동작을 제공한다
✔ 결말은 sourceSceneId의 칩만 회상하고 수집 상태와 재시작을 제공한다
ℹ tests 25
ℹ pass 25
ℹ fail 0
```

Also ran:

```sh
git -C /Users/choijimin/Desktop/workspace/json_ani/.worktrees/alice-branching-mvp diff --check
```

Result: exit code `0`, no whitespace errors.

## Files

- `alice-branching-mvp/src/ui.js`
- `alice-branching-mvp/tests/ui.test.mjs`

## Self-review

- Templates are personalized before escaping; every scene, session, chip, vocabulary, feedback, and ending value interpolated into HTML is escaped.
- Story body text is split into semantic `<p>` elements at blank-line paragraph breaks.
- All interactive controls carry `data-action`; choices include `data-next-scene`, and chips include `data-next-scene`, `data-chip-label`, and `data-chip-response`.
- Setup includes the requested accessible name field attributes and grouped radio controls.
- Ending recall selects only the chip whose `sceneId` equals `ending.sourceSceneId`; it does not render `parentNote` or other diagnosis-style copy.
- Recovery uses an alert region, vocabulary detail uses a labeled dialog, and decorative art is hidden from assistive technology.

## Concerns

None within Task 4 scope. Wiring the declared `data-action` values to browser events is intentionally deferred to the app task; CSS, index, and app files were not modified.

## Fix Round 1

### Review fixes

- Vocabulary word buttons now use the app contract `data-action="vocab"`.
- Scenes with `nextSceneId` but no choices now render a `계속 읽기` choice action carrying `data-next-scene`.
- `renderVocabularyPanel` returns an empty string for missing or empty definitions, so unknown definitions never show `null` or `undefined`.
- Vocabulary details now use a labelled, non-modal `role="region"`; the unsupported modal lifecycle claim was removed.

### RED Evidence

Command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit code `1`, with the four new focused tests failing for the intended old behavior:

```text
✖ 낱말 버튼은 앱의 vocab 동작 계약을 사용한다
✖ nextSceneId만 있는 장면은 계속 읽기 동작을 제공한다
✖ 정의가 없는 낱말 패널은 렌더링하지 않는다
✖ 낱말 패널은 비모달의 이름 있는 영역이다
ℹ tests 10
ℹ pass 6
ℹ fail 4
```

### GREEN Evidence

Focused command:

```sh
cd alice-branching-mvp && node --test tests/ui.test.mjs
```

Result: exit code `0`, `tests 10`, `pass 10`, `fail 0`.

Full command:

```sh
cd alice-branching-mvp && npm test
```

Result: exit code `0`, `tests 29`, `pass 29`, `fail 0`.

### Fix Round Self-review

- The continuation destination is escaped in the same attribute context as ordinary choices.
- A definition must be a non-empty string before the panel is rendered; missing values return no HTML.
- The non-modal region retains a visible label and close action without claiming focus trapping or background inerting.
