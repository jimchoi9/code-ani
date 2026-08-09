# Onboarding Numeric Age Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 온보딩 나이대 버튼을 자연수 직접 입력으로 바꾸고 입력한 나이로 `easy` 또는 `hard` 원고를 선택한다.

**Architecture:** `answerOnboarding`이 나이의 정수 유효성 및 9/10 경계를 판정하고 오류를 온보딩 상태로 반환한다. 비주얼노벨 렌더러는 숫자 입력과 앱 오류 안내를 표시한다. 테스트 저장소는 새 `age` 숫자를 보존하면서 기존 `ageGroup`을 계속 읽는다.

**Tech Stack:** 브라우저 ES modules, HTML number input, Node.js `node:test`

## Global Constraints

- 질문 문구는 `너는 몇 살이야?`이다.
- `1~9`는 `easy`, `10` 이상은 `hard`이다.
- 빈 값, 0, 음수, 소수, 문자는 `나이는 1 이상의 숫자로 입력해 줘.` 오류를 표시한다.
- 오류 시 나이 단계에 머물고 유효한 답변 이벤트를 기록하지 않는다.
- 새 온보딩 데이터는 정수 `age`를 저장한다.
- 기존 `ageGroup` 데이터는 복원 및 최종 확인에서 계속 지원한다.

---

### Task 1: 나이 판정과 오류 상태

**Files:**
- Modify: `src/app.js`
- Test: `tests/ui.test.mjs`

**Interfaces:**
- Produces: `answerOnboarding(onboarding, value)`이 유효하면 `{ age, level, step: "snack" }`, 무효하면 `{ step: "age", validationError }` 반환

- [x] **Step 1: Write failing boundary and validation tests**

`tests/ui.test.mjs`에서 `1`, `9`, `10`, `42`의 레벨을 리터럴로 단언한다. `""`, `0`, `-1`, `9.5`, `"아홉"`은 `step === "age"`와 정확한 오류 문구를 단언한다.

- [x] **Step 2: Run tests and verify RED**

Run: `node --test tests/ui.test.mjs`

Expected: 기존 `9살 이하`/`10살 이상` 매핑 때문에 숫자 입력 단언이 실패한다.

- [x] **Step 3: Implement minimal numeric parsing**

```js
const AGE_ERROR = "나이는 1 이상의 숫자로 입력해 줘.";
const normalized = String(value ?? "").trim();
const age = Number(normalized);
if (!normalized || !Number.isInteger(age) || age < 1) {
  return { ...current, validationError: AGE_ERROR };
}
return { ...current, step: "snack", age, level: age <= 9 ? "easy" : "hard", validationError: undefined };
```

- [x] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/ui.test.mjs`

Expected: 모든 UI 상태 테스트 통과.

### Task 2: 숫자 입력 UI와 오류 안내

**Files:**
- Modify: `src/ui-variants/visual-novel.js`
- Test: `tests/ui-variants.test.mjs`

**Interfaces:**
- Consumes: `onboarding.age`, `onboarding.validationError`
- Produces: 나이 단계의 `type="number" min="1" step="1" inputmode="numeric"` 입력 폼

- [x] **Step 1: Write failing renderer tests**

나이 화면이 선택 버튼을 포함하지 않고 숫자 입력 제약을 포함하는지 검증한다. 오류 상태는 `role="alert"`와 정확한 문구를 포함해야 한다. 확인 화면은 새 데이터에서 `9살`, 레거시 데이터에서 `9살 이하`를 표시해야 한다.

- [x] **Step 2: Run tests and verify RED**

Run: `node --test tests/ui-variants.test.mjs`

Expected: 현재 연령 버튼 마크업 때문에 실패한다.

- [x] **Step 3: Implement numeric age composer**

나이 질문도 기존 `onboarding-answer` 폼을 사용하되 숫자 속성, `novalidate`, 오류 영역을 추가한다. 대화 기록과 확인 문구는 `age`가 있으면 `${age}살`, 아니면 기존 `ageGroup`을 사용한다.

- [x] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/ui-variants.test.mjs`

Expected: 모든 renderer 테스트 통과.

### Task 3: 저장·이벤트·실제 원고 통합

**Files:**
- Modify: `src/app.js`
- Modify: `src/test-mode.js`
- Modify: `tests/test-mode.test.mjs`
- Modify: `tests/app-integration.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: 숫자 `age`, 판정된 `level`, 선택적 레거시 `ageGroup`
- Produces: 진행 중 저장 데이터 및 완료 이벤트의 `age`, 실제 세션의 `level`

- [x] **Step 1: Write failing persistence and integration tests**

새 온보딩 저장 데이터가 `age: 9`와 `level: "easy"`를 복원하는지 검증한다. 잘못된 입력은 `onboarding_answered`를 기록하지 않고 오류 상태를 저장한다. 유효한 9 입력 뒤 완료하면 easy 첫 장면, 10 입력 뒤 완료하면 hard 첫 장면을 렌더링하는지 검증한다.

- [x] **Step 2: Run tests and verify RED**

Run: `node --test tests/test-mode.test.mjs tests/app-integration.test.mjs`

Expected: 저장소가 `age`를 버리거나 기존 버튼 값만 처리해 실패한다.

- [x] **Step 3: Implement persistence and event behavior**

`saveOnboarding`은 `age`가 정수일 때 보존하고 `ageGroup`도 레거시 입력에서만 보존한다. `onOnboardingAnswer`는 `validationError`가 있으면 상태를 저장·렌더링하되 타이핑 애니메이션과 답변 이벤트를 만들지 않는다. 유효한 나이는 숫자 값과 판정 레벨을 이벤트에 기록한다.

- [x] **Step 4: Update README**

나이대 선택 설명을 직접 나이 입력과 `9 이하/10 이상` 판정 설명으로 교체한다.

- [x] **Step 5: Run focused tests**

Run: `node --test tests/ui.test.mjs tests/ui-variants.test.mjs tests/test-mode.test.mjs tests/app-integration.test.mjs`

Expected: 대상 테스트 모두 통과.

### Task 4: 전체 검증과 커밋

**Files:**
- Verify all modified files

**Interfaces:**
- Produces: 검증된 숫자 나이 기반 난이도 선택

- [x] **Step 1: Run full suite**

Run: `npm test`

Expected: 0 failures and story content check passes.

- [x] **Step 2: Check diff**

Run: `git diff --check && git status --short`

Expected: 공백 오류가 없고 계획된 파일만 변경됨.

- [x] **Step 3: Commit**

```bash
git add alice-branching-mvp/src alice-branching-mvp/tests alice-branching-mvp/README.md alice-branching-mvp/docs/superpowers/plans/2026-08-10-onboarding-numeric-age.md
git commit -m "feat: accept numeric age during onboarding"
```
