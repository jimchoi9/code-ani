import assert from "node:assert/strict";
import test from "node:test";
import { createMinimalStateStore } from "../src/beat.js";
import {
  choosePath,
  continueChip,
  createAppState,
  selectChip,
  startStory,
} from "../src/app.js";

const slots = { HERO: "지민", TREAT: "케이크", PET: "강아지", COLOR: "파랑" };

function clone(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function beginStory() {
  return startStory(createAppState(), slots);
}

function reachA1Ending() {
  let state = choosePath(beginStory(), "S01", "작은 문을 열어 본다", "shrink");
  state = choosePath(state, "A1", "나무 위 웃음소리로 간다", "A1");
  state = selectChip(state, { label: "이 길 끝에 뭐가 있어?", nextSceneId: "C1" });
  const chipResponse = state;
  state = continueChip(state);
  state = choosePath(state, "C2", "붓질 소리를 따라 담장 쪽으로 간다", "secret");
  const ending = choosePath(state, "E1", "하얀 장미였다고 사실대로 말한다", "truth");
  return { chipResponse, ending };
}

function createStoryStore(initial) {
  let value = clone(initial);
  const saves = [];
  return {
    saves,
    load() { return clone(value); },
    save(session) {
      value = clone(session);
      saves.push(clone(session));
    },
    clear() { value = null; },
  };
}

function createTestStore(initial = null) {
  let value = clone(initial);
  const events = [];
  return {
    events,
    load() { return clone(value); },
    start(participantId) {
      value = { participantId, startedAt: "2026-08-09T10:00:00.000Z", events: [] };
      return clone(value);
    },
    record(type, details = {}) {
      const event = { type, ...details };
      events.push(event);
      if (value) value.events.push(event);
      return event;
    },
    saveOnboarding(onboarding) {
      if (value) value.onboarding = clone(onboarding);
      return clone(onboarding);
    },
    clear() { value = null; },
    exportSnapshot(session) { return { participant: clone(value), storySession: clone(session) }; },
  };
}

function createStorage(initial = null) {
  let value = initial;
  const writes = [];
  let removes = 0;
  return {
    writes,
    get removes() { return removes; },
    get value() { return value; },
    getItem() { return value; },
    setItem(key, next) {
      value = next;
      writes.push([key, next]);
    },
    removeItem() {
      value = null;
      removes += 1;
    },
  };
}

function createRenderer(id = "test") {
  const calls = [];
  const render = name => (...args) => {
    calls.push({ name, args });
    return `<main data-render="${name}"></main>`;
  };
  return {
    id,
    calls,
    renderSetup: render("renderSetup"),
    renderOnboarding: render("renderOnboarding"),
    renderScene: render("renderScene"),
    renderChipResponse: render("renderChipResponse"),
    renderEnding: render("renderEnding"),
    renderComplete: render("renderComplete"),
    renderRecovery: render("renderRecovery"),
    renderVocabularyPanel: render("renderVocabularyPanel"),
  };
}

function createAppElement() {
  const listeners = {};
  const inserted = [];
  const focusCalls = [];
  const focusTarget = {
    setAttribute(name, value) { focusCalls.push(["attribute", name, value]); },
    focus(options) { focusCalls.push(["focus", options]); },
  };
  const closeControl = { focus() { focusCalls.push(["close"]); } };
  return {
    dataset: {},
    innerHTML: "",
    inserted,
    focusCalls,
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    insertAdjacentHTML(position, html) { inserted.push([position, html]); },
    querySelector(selector) {
      if (selector === "[data-focus-target]") return focusTarget;
      if (selector === '[data-action="close-vocabulary"]') return closeControl;
      return null;
    },
    querySelectorAll() { return []; },
    click(target) { listeners.click({ target }); },
  };
}

function createEnvironment(search) {
  const app = createAppElement();
  const documentRef = {
    querySelector(selector) { return selector === "#app" ? app : null; },
  };
  const scrolls = [];
  const windowRef = {
    location: { search },
    scrollTo(options) { scrolls.push(options); },
    getSelection() { return { toString: () => "" }; },
  };
  return { app, documentRef, scrolls, windowRef };
}

function actionControl(action, dataset = {}, textContent = "") {
  const control = {
    dataset: { action, ...dataset },
    textContent,
    closest(selector) { return selector === "[data-action]" ? control : null; },
  };
  return control;
}

function readerSurface() {
  const reader = {
    closest(selector) {
      if (selector === "[data-action]") return null;
      if (selector === '[data-reader-action="next-beat"]') return reader;
      return null;
    },
  };
  return reader;
}

test("mounted app은 선택 renderer로 모든 화면과 낱말 panel을 dispatch한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const started = beginStory();
  const { chipResponse, ending } = reachA1Ending();
  const cases = [
    { session: null, expected: "renderSetup" },
    { session: started.session, expected: "renderScene" },
    { session: chipResponse.session, expected: "renderChipResponse" },
    { session: ending.session, expected: "renderEnding" },
    { session: {}, expected: "renderRecovery" },
  ];

  for (const { session, expected } of cases) {
    const renderer = createRenderer("visual-novel");
    const environment = createEnvironment("?ui=visual-novel");
    mountBrowserApp({
      ...environment,
      sessionStore: createStoryStore(session),
      minimalStore: createMinimalStateStore(createStorage()),
      getRenderer: id => {
        assert.equal(id, "visual-novel");
        return renderer;
      },
    });
    assert.equal(renderer.calls[0]?.name, expected);
  }

  const renderer = createRenderer("visual-novel");
  const environment = createEnvironment("?ui=visual-novel");
  const sessionStore = createStoryStore(started.session);
  mountBrowserApp({
    ...environment,
    sessionStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getRenderer: () => renderer,
  });
  environment.app.click(actionControl("vocab", { word: "황급히" }));

  assert.deepEqual(renderer.calls.slice(-2).map(call => call.name), [
    "renderScene",
    "renderVocabularyPanel",
  ]);
  assert.deepEqual(sessionStore.saves[0].vocabTapped, ["황급히"]);
  assert.deepEqual(environment.app.focusCalls.at(-1), ["close"]);
});

test("query UI 전환 mount는 같은 story session을 renderer와 분리해 유지한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const baseline = beginStory().session;
  const sessionStore = createStoryStore(baseline);
  const resolvedIds = [];

  const currentEnvironment = createEnvironment("?ui=current&compare=1");
  mountBrowserApp({
    ...currentEnvironment,
    sessionStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getRenderer: id => {
      resolvedIds.push(id);
      return createRenderer(id);
    },
  });
  const currentSession = currentEnvironment.windowRef.__aliceStoryDebug.session();

  const minimalEnvironment = createEnvironment("?ui=minimal&compare=1");
  mountBrowserApp({
    ...minimalEnvironment,
    sessionStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getRenderer: id => {
      resolvedIds.push(id);
      return createRenderer(id);
    },
  });
  const minimalSession = minimalEnvironment.windowRef.__aliceStoryDebug.session();

  assert.deepEqual(resolvedIds, ["current", "minimal"]);
  assert.deepEqual(currentSession, baseline);
  assert.deepEqual(minimalSession, baseline);
  assert.deepEqual(minimalSession.runs, baseline.runs);
  assert.deepEqual(minimalSession.path, ["S00"]);
  assert.equal(sessionStore.saves.length, 0);
  assert.equal(currentEnvironment.app.dataset.compare, "true");
  assert.equal(minimalEnvironment.app.dataset.compare, "true");
  assert.equal(currentEnvironment.app.dataset.ui, "current");
  assert.equal(minimalEnvironment.app.dataset.ui, "minimal");
});

test("test=1 mount는 비주얼노벨을 강제하고 비교 메뉴 없이 테스트 context를 전달한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const renderer = createRenderer("visual-novel");
  renderer.renderTestTools = context => `<aside data-test-tools="${context.participantId}"></aside>`;
  const environment = createEnvironment("?ui=current&compare=1&test=1");
  const testStore = createTestStore();

  mountBrowserApp({
    ...environment,
    sessionStore: createStoryStore(beginStory().session),
    testStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getVariant: () => "current",
    getRenderer: id => {
      assert.equal(id, "visual-novel");
      return renderer;
    },
  });

  assert.equal(environment.app.dataset.ui, "visual-novel");
  assert.equal(environment.app.dataset.testMode, "true");
  assert.equal(environment.app.inserted.length, 0);
  assert.equal(renderer.calls[0].name, "renderSetup");
  assert.equal(renderer.calls[0].args[1].testMode, true);
  assert.match(environment.app.innerHTML, /data-test-tools=""/);
});

test("진행 중인 채팅 온보딩은 저장된 질문과 답변으로 복원한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const renderer = createRenderer("visual-novel");
  renderer.renderTestTools = () => "";
  const environment = createEnvironment("?test=1");
  const testStore = createTestStore({
    participantId: "C05",
    events: [],
    onboarding: { step: "color", answers: { HERO: "지민", PET: "토끼" } },
  });

  mountBrowserApp({
    ...environment,
    sessionStore: createStoryStore(null),
    testStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getRenderer: () => renderer,
  });

  assert.equal(environment.windowRef.__aliceStoryDebug.screen(), "onboarding");
  assert.equal(renderer.calls[0].name, "renderOnboarding");
  assert.deepEqual(renderer.calls[0].args[0].onboarding, {
    step: "color",
    answers: { HERO: "지민", PET: "토끼" },
  });
});

test("테스트 JSON 다운로드는 참가자 파일명과 직렬화된 payload를 사용한다", async () => {
  const { downloadTestJson } = await import("../src/app.js");
  const calls = [];
  class BlobDouble {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
      calls.push(["blob", parts, options]);
    }
  }
  const link = {
    href: "",
    download: "",
    click() { calls.push(["click", this.href, this.download]); },
  };
  const windowRef = {
    Blob: BlobDouble,
    URL: {
      createObjectURL(blob) { calls.push(["create", blob]); return "blob:test"; },
      revokeObjectURL(url) { calls.push(["revoke", url]); },
    },
  };
  const documentRef = { createElement: tag => {
    assert.equal(tag, "a");
    return link;
  } };

  downloadTestJson(documentRef, windowRef, { participant: { participantId: "C01" } }, "moriai-C01.json");

  assert.deepEqual(calls[0], [
    "blob",
    ['{\n  "participant": {\n    "participantId": "C01"\n  }\n}'],
    { type: "application/json" },
  ]);
  assert.deepEqual(calls.at(-2), ["click", "blob:test", "moriai-C01.json"]);
  assert.deepEqual(calls.at(-1), ["revoke", "blob:test"]);
});

test("테스트 종료는 아이 완료 화면 뒤 기록을 저장하고 새 참가자로 초기화한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const { ending } = reachA1Ending();
  const renderer = createRenderer("visual-novel");
  renderer.renderTestTools = () => "";
  const environment = createEnvironment("?test=1");
  const storyStore = createStoryStore(ending.session);
  const testStore = createTestStore({ participantId: "C02", events: [] });
  const downloads = [];

  mountBrowserApp({
    ...environment,
    sessionStore: storyStore,
    testStore,
    minimalStore: createMinimalStateStore(createStorage()),
    getRenderer: () => renderer,
    downloadJson(documentRef, windowRef, payload, filename) {
      downloads.push({ payload, filename });
    },
  });

  environment.app.click(actionControl("finish-adventure"));
  assert.equal(environment.windowRef.__aliceStoryDebug.screen(), "complete");
  assert.equal(renderer.calls.at(-1).name, "renderComplete");

  environment.app.click(actionControl("complete-test"));
  assert.equal(testStore.events.at(-1).type, "test_completed");
  assert.equal(downloads[0].filename, "moriai-C02.json");
  assert.equal(renderer.calls.at(-1).args.at(-1).testCompleted, true);

  environment.app.click(actionControl("new-participant"));
  assert.equal(environment.windowRef.__aliceStoryDebug.screen(), "setup");
  assert.equal(testStore.load(), null);
});

test("mounted minimal은 beat를 저장·복원하고 story session 변경 없이 reset한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const baseline = beginStory().session;
  const sessionStore = createStoryStore(baseline);
  const storage = createStorage(JSON.stringify({ sceneId: "S00", beatIndex: 0 }));
  const firstEnvironment = createEnvironment("?ui=minimal");

  mountBrowserApp({
    ...firstEnvironment,
    sessionStore,
    minimalStore: createMinimalStateStore(storage),
    getRenderer: () => createRenderer("minimal"),
  });
  firstEnvironment.app.click(readerSurface());

  assert.deepEqual(JSON.parse(storage.value), { sceneId: "S00", beatIndex: 1 });
  assert.equal(sessionStore.saves.length, 0);
  assert.deepEqual(firstEnvironment.windowRef.__aliceStoryDebug.session(), baseline);
  assert.deepEqual(firstEnvironment.windowRef.__aliceStoryDebug.minimalState(), {
    sceneId: "S00",
    beatIndex: 1,
  });
  assert.deepEqual(firstEnvironment.app.focusCalls.slice(-2), [
    ["attribute", "tabindex", "-1"],
    ["focus", { preventScroll: true }],
  ]);

  const reloadEnvironment = createEnvironment("?ui=minimal");
  mountBrowserApp({
    ...reloadEnvironment,
    sessionStore,
    minimalStore: createMinimalStateStore(storage),
    getRenderer: () => createRenderer("minimal"),
  });
  assert.deepEqual(reloadEnvironment.windowRef.__aliceStoryDebug.minimalState(), {
    sceneId: "S00",
    beatIndex: 1,
  });

  reloadEnvironment.app.click(actionControl("restart"));
  assert.equal(storage.value, null);
  assert.equal(storage.removes, 1);
  assert.equal(reloadEnvironment.windowRef.__aliceStoryDebug.screen(), "setup");
  assert.equal(reloadEnvironment.windowRef.__aliceStoryDebug.minimalState(), null);
  assert.deepEqual(sessionStore.saves.at(-1).endingsSeen, baseline.endingsSeen);
  assert.equal(sessionStore.saves.at(-1).runs.length, baseline.runs.length + 1);
});

test("mounted minimal은 저장된 다른 장면 beat를 현재 장면 0으로 정규화한다", async () => {
  const { mountBrowserApp } = await import("../src/app.js");
  const atNextScene = choosePath(beginStory(), "S01").session;
  const storage = createStorage(JSON.stringify({ sceneId: "S00", beatIndex: 1 }));
  const environment = createEnvironment("?ui=minimal");

  mountBrowserApp({
    ...environment,
    sessionStore: createStoryStore(atNextScene),
    minimalStore: createMinimalStateStore(storage),
    getRenderer: () => createRenderer("minimal"),
  });

  assert.deepEqual(environment.windowRef.__aliceStoryDebug.minimalState(), {
    sceneId: "S01",
    beatIndex: 0,
  });
  assert.deepEqual(JSON.parse(storage.value), { sceneId: "S01", beatIndex: 0 });
});
