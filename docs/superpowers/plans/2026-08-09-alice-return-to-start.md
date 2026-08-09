# Alice Return to Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared header button that immediately clears the active participant test and returns to the participant-code entry screen while preserving the selected UI.

**Architecture:** Extend the existing common test navigation and delegated action handler instead of changing three UI renderers. The browser-app composition root owns the destructive reset because it already owns the story, minimal-beat, test, onboarding, and UI-preference stores.

**Tech Stack:** Static HTML, CSS, native ES modules, Node.js built-in test runner

## Global Constraints

- The visible button label is `← 처음으로`.
- The action appears in the shared `테스트 설정` navigation on every main app screen.
- Clicking immediately clears participant, story, onboarding, and minimal-beat progress without a confirmation dialog.
- The selected UI preference is preserved.
- Interactive targets remain at least 44px high.
- No dependencies, router, or build step are added.

---

### Task 1: Shared Header Control and Delegated Action Contract

**Files:**
- Modify: `alice-branching-mvp/src/app.js:312-426`
- Modify: `alice-branching-mvp/styles.css:106-130`
- Test: `alice-branching-mvp/tests/app-integration.test.mjs`
- Test: `alice-branching-mvp/tests/ui.test.mjs`

**Interfaces:**
- Consumes: existing `renderTestNavigation()` and `bindAppEvents(app, getState, commit, readForm, options)`.
- Produces: a `button[data-action="return-to-start"]` and an `onReturnToStart(state): AppState` option for delegated clicks.

- [ ] **Step 1: Write failing navigation and event tests**

Add these focused tests to `tests/app-integration.test.mjs`:

```js
test("공통 테스트 헤더는 처음으로 버튼과 UI 설정 링크를 제공한다", async () => {
  const { renderTestNavigation } = await import("../src/app.js");
  const html = renderTestNavigation();

  assert.match(html, /data-action="return-to-start"/);
  assert.match(html, />← 처음으로<\/button>/);
  assert.match(html, /href="\.\/settings\.html"/);
});

test("위임된 처음으로 클릭은 전용 초기화 상태를 commit한다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const app = createAppElement();
  const commits = [];
  let resetCalls = 0;

  bindAppEvents(
    app,
    beginStory,
    state => commits.push(state),
    undefined,
    {
      onReturnToStart() {
        resetCalls += 1;
        return createAppState();
      },
    },
  );

  app.click(actionControl("return-to-start"));

  assert.equal(resetCalls, 1);
  assert.equal(commits.at(-1).screen, "setup");
});
```

Add this target-size test to `tests/ui.test.mjs`:

```js
test("처음으로 버튼은 44px 이상 상호작용 영역을 가진다", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /\.test-home-button,\s*\.test-settings-link\s*\{[^}]*min-height:\s*44px/s);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test --test-name-pattern='공통 테스트 헤더|위임된 처음으로|처음으로 버튼은' tests/app-integration.test.mjs tests/ui.test.mjs
```

Expected: FAIL because `renderTestNavigation()` has no `return-to-start` control, `bindAppEvents()` does not dispatch that action, and `.test-home-button` is absent.

- [ ] **Step 3: Implement the common control and action dispatch**

Update `renderTestNavigation()` in `src/app.js`:

```js
export function renderTestNavigation() {
  return `<nav class="test-navigation" aria-label="테스트 설정">
    <button class="test-home-button" type="button" data-action="return-to-start">← 처음으로</button>
    <a class="test-settings-link" href="./settings.html">UI 설정</a>
  </nav>`;
}
```

Add the option default beside the existing delegated callbacks:

```js
onReturnToStart = state => state,
```

Dispatch it before other-ending/restart-specific branches:

```js
} else if (action === "return-to-start") {
  commit(onReturnToStart(state));
```

Update `styles.css` so the common navigation lays out both controls and both use the same pill treatment:

```css
.test-navigation {
  position: fixed;
  z-index: 40;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.test-home-button,
.test-settings-link {
  display: inline-flex;
  min-height: 44px;
  padding: 10px 14px;
  align-items: center;
  color: #fff;
  background: #242235;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgb(36 34 53 / 24%);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

.test-home-button {
  cursor: pointer;
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same command from Step 2.

Expected: 3 matching tests PASS and no failures.

- [ ] **Step 5: Commit the shared control**

```bash
git add alice-branching-mvp/src/app.js alice-branching-mvp/styles.css alice-branching-mvp/tests/app-integration.test.mjs alice-branching-mvp/tests/ui.test.mjs
git commit -m "feat: add alice return to start control"
```

---

### Task 2: Clear the Active Test and Preserve UI Preference

**Files:**
- Modify: `alice-branching-mvp/src/app.js:600-700`
- Test: `alice-branching-mvp/tests/app-integration.test.mjs`

**Interfaces:**
- Consumes: Task 1's `onReturnToStart(state): AppState` callback.
- Produces: a mounted-app reset that clears `sessionStore`, `minimalStore`, and `testStore`, resets in-memory onboarding state, and returns `createAppState()` without mutating `preferenceStore`.

- [ ] **Step 1: Write the failing mounted-app reset test**

Add this integration test to `tests/app-integration.test.mjs`:

First add the production-store import near the other imports:

```js
import { createUiPreferenceStore } from "../src/ui-preference.js";
```

```js
test("처음으로는 테스트 진행을 모두 지우고 선택 UI를 유지한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const storyStore = createStoryStore(beginStory().session);
  const beatStorage = createStorage(JSON.stringify({ sceneId: "S00", beatIndex: 1 }));
  const testStore = createTestStore({
    participantId: "C09",
    events: [],
    onboarding: { step: "complete", answers: slots },
  });
  const preferenceStorage = createStorage();
  const preferenceStore = createUiPreferenceStore(preferenceStorage);
  preferenceStore.save("minimal");
  const renderers = {
    minimal: createRenderer("minimal"),
    "visual-novel": createRenderer("visual-novel"),
  };
  renderers["visual-novel"].renderTestTools = () => "";
  const environment = createEnvironment("");

  mountBrowserApp({
    ...environment,
    sessionStore: storyStore,
    minimalStore: createMinimalStateStore(beatStorage),
    testStore,
    preferenceStore,
    getRenderer: id => renderers[id],
  });

  environment.app.click(actionControl("return-to-start"));

  assert.equal(environment.windowRef.__aliceStoryDebug.screen(), "setup");
  assert.equal(environment.windowRef.__aliceStoryDebug.session(), null);
  assert.equal(storyStore.load(), null);
  assert.equal(testStore.load(), null);
  assert.ok(beatStorage.removes >= 1);
  assert.equal(preferenceStore.load(), "minimal");
  assert.equal(environment.app.dataset.ui, "minimal");
  assert.equal(renderers["visual-novel"].calls.at(-1).name, "renderSetup");
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```bash
node --test --test-name-pattern='처음으로는 테스트 진행을 모두 지우고 선택 UI를 유지한다' tests/app-integration.test.mjs
```

Expected: FAIL because the mounted app has not supplied `onReturnToStart`, so the active stores remain populated.

- [ ] **Step 3: Implement the mounted reset callback**

Add this callback to the options passed by `mountBrowserApp()` to `bindAppEvents()`:

```js
onReturnToStart() {
  store.clear();
  minimalStore.clear();
  testStore.clear();
  onboarding = null;
  onboardingTyping = false;
  return createAppState();
},
```

Do not call or clear `preferenceStore`.

- [ ] **Step 4: Run focused and full automated verification**

Run:

```bash
node --test --test-name-pattern='공통 테스트 헤더|위임된 처음으로|처음으로 버튼은|처음으로는 테스트 진행' tests/app-integration.test.mjs tests/ui.test.mjs
npm test
git diff --check
```

Expected: all focused tests PASS, the complete suite has zero failures, and `git diff --check` exits 0.

- [ ] **Step 5: Verify the actual browser flow**

At `http://127.0.0.1:8082/`, verify this exact sequence through visible controls:

1. Open `UI 설정`, choose any UI, and start the test.
2. Enter a participant code and answer at least the name prompt.
3. Confirm `← 처음으로` is visible in the common header.
4. Click `← 처음으로`.
5. Confirm the participant-code entry screen is shown, previous participant data is absent, and the chosen UI remains selected on `settings.html`.
6. Confirm the browser console has no errors or warnings.

- [ ] **Step 6: Commit the reset behavior**

```bash
git add alice-branching-mvp/src/app.js alice-branching-mvp/tests/app-integration.test.mjs
git commit -m "feat: reset alice test from header"
```
