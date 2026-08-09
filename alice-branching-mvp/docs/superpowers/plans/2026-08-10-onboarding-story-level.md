# Onboarding Story Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 온보딩에서 고른 나이대에 따라 동일한 분기 구조의 `easy` 또는 `hard` 원고로 이야기를 시작하고 선택을 세션에 유지한다.

**Architecture:** 세션 모듈이 지원 레벨을 정규화하고 저장한다. 스토리 데이터 모듈은 레벨별 불변 런타임을 제공하며, 앱은 현재 세션의 레벨로 장면과 낱말을 조회한다. 비주얼노벨 온보딩은 연령 선택 단계를 추가하되 기존 최종 확인과 시작 흐름을 유지한다.

**Tech Stack:** 브라우저 ES modules, Node.js `node:test`, JSON 기반 생성 스토리 번들

## Global Constraints

- 질문 순서는 이름, 나이대, 간식, 친구, 최종 확인이다.
- 이름 문구는 `늦었다, 늦었어! 그런데 넌 누구니? 이름을 알려 줘.`이다.
- 나이대 문구는 `너는 몇 살이야?`이며 `9살 이하`는 `easy`, `10살 이상`은 `hard`이다.
- 간식 문구는 `모험 가방에 어떤 간식을 넣을까?`이다.
- 친구 문구는 `마지막 질문이야. 함께 모험할 친구는 누구야?`이다.
- 기존 데이터에 레벨이 없거나 값이 잘못됐으면 `hard`를 사용한다.
- 이야기 진행 중에는 난이도를 변경하지 않는다.

---

### Task 1: 세션 레벨 계약

**Files:**
- Modify: `src/session.js`
- Test: `tests/session.test.mjs`

**Interfaces:**
- Produces: `normalizeStoryLevel(value): "easy" | "hard"`
- Produces: `createSession(slots, now, level)`이 최상위 `level`을 가진 세션 반환
- Produces: `normalizeSessionLevel(session)`이 복원 데이터에 정규화된 `level`을 적용

- [x] **Step 1: Write the failing tests**

`tests/session.test.mjs`에 `createSession({}, start, "easy")`가 `level: "easy"`를 저장하고, 누락·오류 값은 `hard`가 되며, `restartRun` 뒤에도 유지되는 테스트를 추가한다. 기대값은 문자열 리터럴 `easy`, `hard`로 단언한다.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/session.test.mjs`

Expected: 새 세션에 `level`이 없어 단언이 실패한다.

- [x] **Step 3: Write minimal implementation**

```js
export function normalizeStoryLevel(value) {
  return value === "easy" ? "easy" : "hard";
}

export function normalizeSessionLevel(session) {
  return { ...session, level: normalizeStoryLevel(session?.level) };
}

export function createSession(slots = {}, now = isoNow(), level = "hard") {
  return {
    level: normalizeStoryLevel(level),
    // 기존 필드 유지
  };
}
```

세션 저장소의 `load()` 반환에도 `normalizeSessionLevel`을 적용하되 `null`은 그대로 둔다.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/session.test.mjs`

Expected: 모든 session 테스트 통과.

### Task 2: 레벨별 스토리 런타임과 앱 조회

**Files:**
- Modify: `src/story-data.js`
- Modify: `src/vocabulary.js`
- Modify: `src/app.js`
- Test: `tests/story-content.test.mjs`
- Test: `tests/ui.test.mjs`

**Interfaces:**
- Consumes: `normalizeStoryLevel(value)`
- Produces: `getStoryRuntime(level)`
- Produces: `getVocabularyForLevel(level, word)`
- Produces: `startStory(state, slots, level)`

- [x] **Step 1: Write failing runtime tests**

`tests/story-content.test.mjs`에서 `getStoryRuntime("easy")`와 `getStoryRuntime("hard")`의 `S00` 본문이 서로 다르고, 잘못된 값은 hard 런타임을 반환하는지 검증한다. `tests/ui.test.mjs`에서는 `startStory(createAppState(), slots, "easy")`가 `session.level === "easy"`이고 easy `S00`을 조회 가능한 상태가 되는지 검증한다.

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test tests/story-content.test.mjs tests/ui.test.mjs`

Expected: `getStoryRuntime` export 또는 세션 레벨 단언이 실패한다.

- [x] **Step 3: Implement level runtime lookup**

```js
const runtimes = Object.freeze(Object.fromEntries(
  Object.entries(storyLevels).map(([level, content]) => [level, createStoryRuntime(storyGraph, content)]),
));

export function getStoryRuntime(level) {
  return runtimes[normalizeStoryLevel(level)];
}
```

`app.js`에는 `runtimeFor(session)`을 두고 `getScene`, `resolveScene`, `story.startSceneId`, 낱말 조회를 모두 현재 세션 레벨 런타임으로 바꾼다. 세션이 아직 없을 때는 hard 기본값을 사용한다.

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test tests/story-content.test.mjs tests/ui.test.mjs`

Expected: 대상 테스트 모두 통과.

### Task 3: 연령 선택 온보딩과 통합 저장

**Files:**
- Modify: `src/app.js`
- Modify: `src/ui-variants/visual-novel.js`
- Modify: `src/test-mode.js`
- Test: `tests/ui.test.mjs`
- Test: `tests/ui-variants.test.mjs`
- Test: `tests/app-integration.test.mjs`
- Test: `tests/test-mode.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `startStory(state, slots, level)`
- Produces: `answerOnboarding(onboarding, value)`의 `age` 단계와 `level` 결과
- Produces: `renderOnboarding(context)`의 연령 선택 버튼과 확인 요약

- [x] **Step 1: Write failing onboarding tests**

질문 순서가 `name → age → snack → friend → confirm`인지, `9살 이하`가 `easy`, `10살 이상`이 `hard`인지, 친구 질문이 `마지막 질문이야. 함께 모험할 친구는 누구야?`인지 검증한다. 확인 화면은 이름·나이대·간식·친구와 `이대로 출발!`을 포함해야 한다.

- [x] **Step 2: Write failing integration tests**

온보딩을 완료해 시작한 앱 세션에 선택 레벨이 저장되는지, 저장된 진행 중 온보딩을 복원하면 `age` 단계와 선택값이 유지되는지, easy 세션의 첫 장면이 쉬운 원고 문장을 렌더링하는지 검증한다.

- [x] **Step 3: Run tests to verify they fail**

Run: `node --test tests/ui.test.mjs tests/ui-variants.test.mjs tests/app-integration.test.mjs tests/test-mode.test.mjs`

Expected: 아직 `age` 단계가 없고 시작 세션이 hard이므로 새 단언이 실패한다.

- [x] **Step 4: Implement onboarding state and UI**

`ONBOARDING_STEPS`를 `name → age → snack → friend → confirm`으로 바꾸고 age 값은 `{ ageGroup: "9살 이하", level: "easy" }` 또는 `{ ageGroup: "10살 이상", level: "hard" }`로 저장한다. 연령 단계는 두 버튼이 `data-action="onboarding-suggestion"`을 사용하게 하여 기존 이벤트 위임을 재사용한다. 최종 확인에서 네 답변을 표시하고 시작 시 `onboarding.level`을 `startStory`에 넘긴다.

- [x] **Step 5: Update documentation**

README의 기본 hard 고정 설명을 온보딩 연령 선택 설명으로 교체하고 레벨이 분기 구조가 아니라 문장·어휘만 바꾼다는 점을 유지한다.

- [x] **Step 6: Run focused tests**

Run: `node --test tests/ui.test.mjs tests/ui-variants.test.mjs tests/app-integration.test.mjs tests/test-mode.test.mjs`

Expected: 대상 테스트 모두 통과.

### Task 4: 전체 회귀 검증과 커밋

**Files:**
- Verify all modified files

**Interfaces:**
- Consumes: Tasks 1-3의 전체 동작
- Produces: 검증된 연령 기반 난이도 선택 기능

- [x] **Step 1: Build and validate story content**

Run: `npm run story:check`

Expected: exit 0.

- [x] **Step 2: Run full test suite**

Run: `npm test`

Expected: 0 failures.

- [x] **Step 3: Check generated and textual diffs**

Run: `git diff --check && git status --short`

Expected: 공백 오류가 없고 계획된 파일만 변경됨.

- [x] **Step 4: Commit implementation**

```bash
git add alice-branching-mvp/src alice-branching-mvp/tests alice-branching-mvp/README.md alice-branching-mvp/docs/superpowers/plans/2026-08-10-onboarding-story-level.md
git commit -m "feat: select story level during onboarding"
```
