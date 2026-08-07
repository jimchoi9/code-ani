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
    renderScene: render("renderScene"),
    renderChipResponse: render("renderChipResponse"),
    renderEnding: render("renderEnding"),
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
  const atChip = choosePath(choosePath(started, "S01"), "A1");
  const chipResponse = selectChip(atChip, {
    label: "이 길 끝에 뭐가 있어?",
    nextSceneId: "E1",
  });
  const ending = continueChip(chipResponse);
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
