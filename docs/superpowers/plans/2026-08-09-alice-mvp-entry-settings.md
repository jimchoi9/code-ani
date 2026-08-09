# Alice MVP Entry Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/`를 항상 사용성 테스트로 실행하고 `/settings.html`에서 선택한 UI로 이야기 장면을 렌더링한다.

**Architecture:** `ui-preference.js`가 UI 선택의 유일한 저장 경계를 제공한다. `app.js`는 공통 테스트 셸(참가자 입력·온보딩·완료·테스트 도구)과 선택된 이야기 렌더러를 조합하며, 설정 페이지는 같은 저장 경계를 사용해 선택 후 `/`로 이동한다.

**Tech Stack:** 정적 HTML, CSS, ES modules, browser localStorage, Node.js `node:test`

## Global Constraints

- 공개 URL은 `/`와 `/settings.html` 두 개만 문서화한다.
- 기본 UI는 `visual-novel`이다.
- 지원 UI ID는 `current`, `visual-novel`, `minimal`이다.
- `/`는 쿼리 파라미터 없이 항상 테스트 흐름으로 시작한다.
- 기존 이야기 세션과 테스트 JSON 스키마를 변경하지 않는다.
- 서버 라우터, 번들러, 외부 패키지를 추가하지 않는다.
- 기존 `?ui=`, `compare=1`, `test=1` 주소는 열리되 저장된 설정을 우선한다.

---

### Task 1: UI 선택 저장 경계

**Files:**
- Create: `alice-branching-mvp/src/ui-preference.js`
- Create: `alice-branching-mvp/tests/ui-preference.test.mjs`

**Interfaces:**
- Consumes: `SUPPORTED_UI_IDS` from `src/ui-variant.js`
- Produces: `DEFAULT_UI_ID`, `UI_PREFERENCE_STORAGE_KEY`, `normalizeUiPreference(value)`, `createUiPreferenceStore(storage)` with `load()` and `save(value)`

- [ ] **Step 1: Write failing normalization and persistence tests**

```js
test("UI 선택은 지원 ID만 저장하고 기본값으로 복구한다", () => {
  const storage = storageDouble();
  const store = createUiPreferenceStore(storage);
  assert.equal(store.load(), "visual-novel");
  assert.equal(store.save("minimal"), "minimal");
  assert.equal(store.load(), "minimal");
  assert.equal(store.save("unknown"), "visual-novel");
});

test("저장소 접근 실패 시 메모리 기본값을 유지한다", () => {
  const store = createUiPreferenceStore({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  });
  assert.equal(store.load(), "visual-novel");
  assert.equal(store.save("current"), "current");
  assert.equal(store.load(), "current");
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `node --test tests/ui-preference.test.mjs`

Expected: FAIL because `src/ui-preference.js` does not exist.

- [ ] **Step 3: Implement the preference store**

```js
import { SUPPORTED_UI_IDS } from "./ui-variant.js";

export const DEFAULT_UI_ID = "visual-novel";
export const UI_PREFERENCE_STORAGE_KEY = "alice-branching-mvp/ui-preference-v1";

export function normalizeUiPreference(value) {
  return SUPPORTED_UI_IDS.includes(value) ? value : DEFAULT_UI_ID;
}

export function createUiPreferenceStore(storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  let memory = DEFAULT_UI_ID;
  let storageFailed = false;
  return {
    load() {
      if (storageFailed) return memory;
      try {
        memory = normalizeUiPreference(storage?.getItem(UI_PREFERENCE_STORAGE_KEY));
      } catch {
        storageFailed = true;
      }
      return memory;
    },
    save(value) {
      memory = normalizeUiPreference(value);
      try {
        storage?.setItem(UI_PREFERENCE_STORAGE_KEY, memory);
        storageFailed = false;
      } catch {
        storageFailed = true;
      }
      return memory;
    },
  };
}
```

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/ui-preference.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 5: Commit the storage boundary**

```bash
git add alice-branching-mvp/src/ui-preference.js alice-branching-mvp/tests/ui-preference.test.mjs
git commit -m "feat: persist alice ui preference"
```

---

### Task 2: Settings page

**Files:**
- Create: `alice-branching-mvp/settings.html`
- Create: `alice-branching-mvp/src/settings.js`
- Create: `alice-branching-mvp/styles/settings.css`
- Create: `alice-branching-mvp/tests/settings-page.test.mjs`

**Interfaces:**
- Consumes: `createUiPreferenceStore()` from Task 1
- Produces: accessible settings form with `name="ui"`, `data-action="save-ui"`, and redirect target `./`

- [ ] **Step 1: Write failing static shell and controller tests**

```js
test("설정 페이지는 세 UI와 하나의 시작 동작을 제공한다", () => {
  const html = fs.readFileSync(path.join(root, "settings.html"), "utf8");
  assert.match(html, /name="ui" value="current"/);
  assert.match(html, /name="ui" value="visual-novel"/);
  assert.match(html, /name="ui" value="minimal"/);
  assert.match(html, /data-action="save-ui"/);
  assert.match(html, /src="\.\/src\/settings\.js"/);
});

test("설정 저장은 선택값을 기록하고 메인으로 이동한다", async () => {
  const saved = [];
  const locationRef = { href: "settings.html" };
  bindSettingsPage(formDouble("minimal"), {
    preferenceStore: { load: () => "current", save: value => saved.push(value) || value },
    locationRef,
  });
  form.submit();
  assert.deepEqual(saved, ["minimal"]);
  assert.equal(locationRef.href, "./");
});
```

- [ ] **Step 2: Run the focused test and verify missing files fail**

Run: `node --test tests/settings-page.test.mjs`

Expected: FAIL because the settings artifacts do not exist.

- [ ] **Step 3: Build the settings HTML and styles**

Create a form with a heading, three radio-card labels, descriptions from the approved spec, and one submit button. Load `./styles/settings.css` and `./src/settings.js`; keep all controls at least 44px high and show a visible focus outline.

- [ ] **Step 4: Implement the settings controller**

```js
export function bindSettingsPage(form, {
  preferenceStore = createUiPreferenceStore(),
  locationRef = globalThis.location,
} = {}) {
  const selected = preferenceStore.load();
  const control = form?.querySelector(`[name="ui"][value="${selected}"]`);
  if (control) control.checked = true;
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const value = form.querySelector('[name="ui"]:checked')?.value;
    preferenceStore.save(value);
    locationRef.href = "./";
  });
}
```

- [ ] **Step 5: Run settings tests**

Run: `node --test tests/settings-page.test.mjs`

Expected: all settings page tests pass.

- [ ] **Step 6: Commit the settings page**

```bash
git add alice-branching-mvp/settings.html alice-branching-mvp/src/settings.js alice-branching-mvp/styles/settings.css alice-branching-mvp/tests/settings-page.test.mjs
git commit -m "feat: add alice ui settings page"
```

---

### Task 3: Always-on test entry with selected story UI

**Files:**
- Modify: `alice-branching-mvp/src/app.js`
- Modify: `alice-branching-mvp/src/test-mode.js`
- Modify: `alice-branching-mvp/styles.css`
- Modify: `alice-branching-mvp/tests/app-integration.test.mjs`
- Modify: `alice-branching-mvp/tests/test-mode.test.mjs`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Consumes: `createUiPreferenceStore()` and selected UI ID from Task 1
- Produces: `mountBrowserApp({ preferenceStore })`, always-on test flow, common `renderTestNavigation()` and common test-shell rendering

- [ ] **Step 1: Replace query-forced renderer tests with selected-renderer tests**

Add an integration matrix for `current`, `visual-novel`, and `minimal`:

```js
for (const selectedUi of ["current", "visual-novel", "minimal"]) {
  test(`메인은 ${selectedUi} 선택으로 테스트 흐름을 실행한다`, () => {
    const environment = createEnvironment("");
    mountBrowserApp({
      ...environment,
      preferenceStore: { load: () => selectedUi },
      getRenderer: id => createRenderer(id),
      sessionStore: createStoryStore(beginStory().session),
      testStore: createTestStore(),
      minimalStore: createMinimalStateStore(createStorage()),
    });
    assert.equal(environment.app.dataset.ui, selectedUi);
    assert.equal(environment.app.dataset.testMode, "true");
    assert.match(environment.app.innerHTML, /settings\.html/);
  });
}
```

Also assert that `?ui=current&compare=1&test=1` does not insert the comparison menu and that the stored preference still wins.

- [ ] **Step 2: Run the selected-renderer integration tests and verify failure**

Run: `node --test --test-name-pattern='메인은 .* 선택|저장된 UI' tests/app-integration.test.mjs`

Expected: FAIL because test mode still forces `visual-novel` and `/` is not test mode.

- [ ] **Step 3: Make the main entry always use test mode and stored UI**

In `mountBrowserApp`:

```js
const testMode = true;
const preferenceStore = suppliedPreferenceStore ?? createUiPreferenceStore();
const uiVariant = preferenceStore.load();
const ui = getRenderer(uiVariant);
const testShell = getRenderer("visual-novel");
```

Remove comparison-menu insertion. Keep `app.dataset.ui` and `app.dataset.testMode`.

- [ ] **Step 4: Split story rendering from common test-shell rendering**

Use `testShell.renderSetup`, `testShell.renderOnboarding`, `testShell.renderComplete`, and `testShell.renderTestTools` for shared test screens. Use the selected `ui` for `renderScene`, `renderChipResponse`, `renderEnding`, `renderRecovery`, and `renderVocabularyPanel`. Preserve minimal beat context when `uiVariant === "minimal"`. When the selected renderer is `visual-novel`, pass its story methods `{ ...testContext(), testMode: false }`; the shared ending controls below are the only test-specific ending actions.

Append common navigation on every render:

```js
export function renderTestNavigation() {
  return '<a class="test-settings-link" href="./settings.html">UI 설정</a>';
}
```

Set `app.dataset.screen = state.screen` on each render. On ending screens append shared buttons for `other-ending` and `finish-adventure`; hide each renderer's normal restart with `#app[data-test-mode="true"][data-screen="ending"] [data-action="restart"]`.

- [ ] **Step 5: Record the selected UI in test events**

Extend `createTestModeStore(storage, now, uiId = "visual-novel")` and change the event field from a hard-coded string to `ui: normalizeUiPreference(uiId)`. Instantiate the default store with the selected UI in `mountBrowserApp`.

- [ ] **Step 6: Run app, test-mode, and renderer tests**

Run: `node --test tests/app-integration.test.mjs tests/test-mode.test.mjs tests/ui-variants.test.mjs`

Expected: all tests pass for all three UI selections.

- [ ] **Step 7: Commit the selected-UI test flow**

```bash
git add alice-branching-mvp/src/app.js alice-branching-mvp/src/test-mode.js alice-branching-mvp/styles.css alice-branching-mvp/tests/app-integration.test.mjs alice-branching-mvp/tests/test-mode.test.mjs alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: run tests with selected alice ui"
```

---

### Task 4: Public URL documentation and full verification

**Files:**
- Modify: `alice-branching-mvp/README.md`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`

**Interfaces:**
- Consumes: `/` and `/settings.html` behavior from Tasks 2–3
- Produces: one documented MVP entry and one documented settings entry

- [ ] **Step 1: Write a failing README URL contract test**

```js
test("README는 메인과 설정 주소만 공개한다", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /http:\/\/127\.0\.0\.1:8082\//);
  assert.match(readme, /http:\/\/127\.0\.0\.1:8082\/settings\.html/);
  assert.doesNotMatch(readme, /\?ui=|compare=1|test=1/);
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test --test-name-pattern='README는 메인과 설정' tests/ui.test.mjs`

Expected: FAIL because README still lists query-based URLs.

- [ ] **Step 3: Rewrite the execution section**

Document only:

- `http://127.0.0.1:8082/` — selected UI test start
- `http://127.0.0.1:8082/settings.html` — UI selection

Remove the UI comparison URL list and explain that the default is visual novel.

- [ ] **Step 4: Run full automated verification**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `git diff --check`

Expected: no output and exit code 0.

Run: `rg -n '\?ui=|compare=1|test=1' README.md settings.html`

Expected: no output.

- [ ] **Step 5: Verify in a browser**

With `npm run serve` running:

1. Open `/settings.html`, select each UI, and start the test.
2. Confirm `/` displays participant entry and `data-ui` matches the saved selection.
3. Complete name → snack → friend onboarding.
4. Confirm a story scene uses the selected renderer.
5. Confirm “UI 설정” returns to `/settings.html`.
6. Confirm the browser console has no warnings or errors.

- [ ] **Step 6: Commit documentation and verification contract**

```bash
git add alice-branching-mvp/README.md alice-branching-mvp/tests/ui.test.mjs
git commit -m "docs: simplify alice mvp urls"
```
