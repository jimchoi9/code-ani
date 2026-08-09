import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  choosePath,
  continueChip,
  createAppState,
  createDebugGetters,
  openVocabulary,
  restartStory,
  selectChip,
  startStory,
} from "../src/app.js";
import { visitScene } from "../src/session.js";
import {
  escapeHtml,
  renderEnding,
  renderRecovery,
  renderScene,
  renderSetup,
  renderVocabularyPanel,
} from "../src/ui.js";

const session = {
  slots: { HERO: "지민", TREAT: "젤리", PET: "토끼", COLOR: "분홍" },
  path: [],
  chipChoices: [
    { sceneId: "A3", label: "다른 장면의 칩" },
    { sceneId: "A1", label: "이 길 끝에 뭐가 있어?" },
  ],
  vocabTapped: [],
  endingsSeen: ["E1"],
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function cssRule(selector) {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} rule is missing`);
  return css.slice(start, css.indexOf("}", start));
}

function minimumHeight(rule) {
  return Number(rule.match(/min-height:\s*(\d+)px/)?.[1] ?? 0);
}

test("브라우저 셸은 앱, 스타일, 모듈 진입점을 연결한다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

  assert.match(html, /<html lang="ko">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /href="#app"/);
  assert.match(html, /id="app"/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/src\/app\.js"/);
  assert.match(html, /<noscript>/);
});

test("HTML 셸은 세 UI 변형 스타일을 연결한다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

  for (const href of ["./styles/current.css", "./styles/visual-novel.css", "./styles/minimal-text.css"]) {
    assert.match(html, new RegExp(`href="${href.replaceAll(".", "\\.")}"`));
  }
});

test("비교 서버는 8082를 사용한다", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

  assert.match(pkg.scripts.serve, /8082/);
});

test("화면 전환은 맨 위로 이동한 뒤 스크롤을 유지하며 제목에 초점을 둔다", async () => {
  const { resetTransitionView } = await import("../src/app.js");
  const calls = [];
  const heading = {
    setAttribute(name, value) { calls.push(["attribute", name, value]); },
    focus(options) { calls.push(["focus", options]); },
  };

  assert.equal(typeof resetTransitionView, "function");
  resetTransitionView(options => calls.push(["scroll", options]), heading);

  assert.deepEqual(calls, [
    ["scroll", { top: 0, left: 0, behavior: "auto" }],
    ["attribute", "tabindex", "-1"],
    ["focus", { preventScroll: true }],
  ]);
});

test("전역 문서는 화면 전환의 즉시 스크롤을 부드럽게 바꾸지 않는다", () => {
  assert.doesNotMatch(cssRule("html"), /scroll-behavior:\s*smooth/);
});

test("이름 입력과 스킵 링크는 44px 이상 상호작용 영역을 가진다", () => {
  assert.ok(minimumHeight(cssRule('.setup-screen input[type="text"]')) >= 44);
  assert.ok(minimumHeight(cssRule(".skip-link")) >= 44);
});

function beginStory() {
  return startStory(createAppState(), {
    HERO: "지민",
    TREAT: "젤리",
    PET: "토끼",
    COLOR: "분홍",
  });
}

test("설정에서 시작하면 S00을 방문하고 선택 피드백을 다음 장면에 둔다", () => {
  const started = beginStory();
  const branched = choosePath(started, "S01", "작은 문을 열어 본다");

  assert.equal(started.screen, "scene");
  assert.equal(started.sceneId, "S00");
  assert.deepEqual(started.session.path, ["S00"]);
  assert.equal(branched.screen, "scene");
  assert.equal(branched.sceneId, "S01");
  assert.equal(branched.feedback, "작은 문을 열어 본다");
  assert.deepEqual(branched.session.path, ["S00", "S01"]);
});

test("빈 이름은 폼에서 허용되고 기본 이름으로 정규화된다", () => {
  const html = renderSetup(session.slots);
  const nameInput = html.match(/<input(?=[^>]*\btype="text")(?=[^>]*\bname="HERO")[^>]*>/)?.[0];
  const started = startStory(createAppState(), {
    HERO: "",
    TREAT: "젤리",
    PET: "토끼",
    COLOR: "분홍",
  });

  assert.ok(nameInput);
  assert.doesNotMatch(nameInput, /\brequired\b/);
  assert.equal(started.session.slots.HERO, "앨리스");
});

test("세 갈래 플레이가 칩 응답 화면을 거쳐 각각의 결말에 도달한다", () => {
  const routes = [
    { scenes: [["S01", "작은 문을 열어 본다"], ["A1", "나무 위 웃음소리로 간다"]], chip: ["이 길 끝에 뭐가 있어?", "재미있는 생각이구나.", "E1"], ending: "E1" },
    { scenes: [["S01", "작은 문을 열어 본다"], ["A3", "멀리 들리는 찻잔 소리로 간다"]], chip: ["노래가 나오는 시계", "훌륭한 생각이야!", "E3"], ending: "E3" },
    { scenes: [["S02", "젤리를 먹어 본다"], ["B2", "계속 읽기"]], chip: ["강을 한 번에 건너고 싶어요", "그것도 좋은 일이지.", "E5"], ending: "E5" },
  ];

  for (const route of routes) {
    let state = beginStory();
    for (const [sceneId, label] of route.scenes) state = choosePath(state, sceneId, label);
    state = selectChip(state, {
      label: route.chip[0],
      response: route.chip[1],
      nextSceneId: route.chip[2],
    });

    assert.equal(state.screen, "chip-response");
    assert.equal(state.chipResponse.label, route.chip[0]);
    assert.deepEqual(state.session.chipChoices, [{ sceneId: state.sceneId, label: route.chip[0] }]);

    state = continueChip(state);
    assert.equal(state.screen, "ending");
    assert.equal(state.sceneId, route.ending);
    assert.deepEqual(state.session.endingsSeen, [route.ending]);
  }
});

test("새로고침 상태 복원은 활성 장면과 칩 응답을 유지한다", () => {
  const sceneState = choosePath(beginStory(), "S01", "작은 문을 열어 본다");
  const restoredScene = createAppState(sceneState.session);
  const chipState = selectChip(choosePath(sceneState, "A1", "나무 위 웃음소리로 간다"), {
    label: "너는 왜 웃고 있어?",
    response: "그건 나도 궁금했어.",
    nextSceneId: "E1",
  });
  const restoredChip = createAppState(chipState.session);

  assert.equal(restoredScene.screen, "scene");
  assert.equal(restoredScene.sceneId, "S01");
  assert.equal(restoredScene.feedback, "작은 문을 열어 본다");
  assert.equal(restoredChip.screen, "chip-response");
  assert.equal(restoredChip.sceneId, "A1");
  assert.deepEqual(restoredChip.chipResponse, {
    label: "너는 왜 웃고 있어?",
    response: "그건 나도 궁금했어. 고양이의 귀가 쫑긋 움직였어요.",
    nextSceneId: "E1",
  });
});

test("낱말은 패널을 열고 현재 실행에 중복 없이 기록된다", () => {
  const first = openVocabulary(beginStory(), "황급히");
  const second = openVocabulary(first, "황급히");

  assert.deepEqual(second.vocabulary, { word: "황급히", definition: "아주 급하게, 서둘러서" });
  assert.deepEqual(second.session.vocabTapped, ["황급히"]);
  assert.deepEqual(second.session.runs[0].vocabTapped, ["황급히"]);
});

test("다시 시작과 슬롯 수정은 결말 및 실행 기록을 보존한다", () => {
  let state = choosePath(choosePath(beginStory(), "S01"), "A1");
  state = continueChip(selectChip(state, {
    label: "이 길 끝에 뭐가 있어?",
    response: "재미있는 생각이구나.",
    nextSceneId: "E1",
  }));
  state = restartStory(state);

  assert.equal(state.screen, "setup");
  assert.deepEqual(state.session.endingsSeen, ["E1"]);
  assert.equal(state.session.runs.length, 2);
  assert.equal(state.session.runs[0].replayed, true);

  state = startStory(state, { ...state.session.slots, HERO: "민서", TREAT: "쿠키" });
  assert.equal(state.sceneId, "S00");
  assert.equal(state.session.slots.HERO, "민서");
  assert.equal(state.session.slots.TREAT, "쿠키");
  assert.deepEqual(state.session.endingsSeen, ["E1"]);
  assert.equal(state.session.runs.length, 2);
});

test("다른 결말 보기는 수집 결말을 유지하고 새 실행으로 첫 장면에 돌아간다", async () => {
  const { replayForAnotherEnding } = await import("../src/app.js");
  let state = choosePath(choosePath(beginStory(), "S01"), "A1");
  state = continueChip(selectChip(state, {
    label: "이 길 끝에 뭐가 있어?",
    response: "재미있는 생각이구나.",
    nextSceneId: "E1",
  }));
  const replayed = replayForAnotherEnding(state);

  assert.equal(replayed.screen, "scene");
  assert.equal(replayed.sceneId, "S00");
  assert.deepEqual(replayed.session.path, ["S00"]);
  assert.deepEqual(replayed.session.endingsSeen, ["E1"]);
  assert.equal(replayed.session.runs.length, 2);
  assert.equal(replayed.session.runs[0].replayed, true);
});

test("이야기 조각 보상은 처음 수집한 결말 전환에서만 생성된다", async () => {
  const { createStoryReward } = await import("../src/app.js");
  const before = choosePath(choosePath(beginStory(), "S01"), "A1");
  const firstEnding = continueChip(selectChip(before, {
    label: "이 길 끝에 뭐가 있어?",
    response: "재미있는 생각이구나.",
    nextSceneId: "E1",
  }));
  const alreadyCollected = { ...before, session: { ...before.session, endingsSeen: ["E1"] } };

  assert.deepEqual(createStoryReward(before, firstEnding), { endingId: "E1", count: 1 });
  assert.equal(createStoryReward(alreadyCollected, firstEnding), null);
  assert.equal(createStoryReward(firstEnding, firstEnding), null);
  assert.equal(createStoryReward(before, { ...firstEnding, screen: "scene" }), null);
});

test("존재하지 않는 활성 장면은 복구 화면으로 전환한다", () => {
  const started = beginStory();
  const invalidSession = visitScene(started.session, "NOT_A_SCENE");
  const restored = createAppState(invalidSession);
  const navigated = choosePath(started, "NOT_A_SCENE", "없는 길");

  assert.equal(restored.screen, "recovery");
  assert.equal(restored.sceneId, "NOT_A_SCENE");
  assert.equal(navigated.screen, "recovery");
  assert.deepEqual(navigated.session.path, ["S00"]);
});

test("디버그 getter는 내부 세션과 minimal 상태를 바꿀 수 없는 복제본으로 반환한다", () => {
  let state = beginStory();
  const minimalState = { sceneId: "S00", beatIndex: 1 };
  const debug = createDebugGetters(() => state, () => "minimal", () => minimalState);
  const snapshot = debug.session();
  const minimalSnapshot = debug.minimalState();
  snapshot.path.push("BROKEN");
  snapshot.slots.HERO = "변조";
  minimalSnapshot.beatIndex = 99;

  assert.equal(debug.screen(), "scene");
  assert.equal(debug.sceneId(), "S00");
  assert.equal(debug.uiVariant(), "minimal");
  assert.deepEqual(debug.session().path, ["S00"]);
  assert.equal(debug.session().slots.HERO, "지민");
  assert.deepEqual(debug.minimalState(), { sceneId: "S00", beatIndex: 1 });
});

test("next-beat는 스토리 세션을 바꾸지 않고 UI 상태만 한 칸 진행한다", async () => {
  const { advanceMinimalBeat } = await import("../src/app.js");
  const before = beginStory();
  const after = advanceMinimalBeat(before, { sceneId: "S00", beatIndex: 0 }, 4);

  assert.strictEqual(after.appState, before);
  assert.strictEqual(after.appState.session, before.session);
  assert.deepEqual(after.minimalState, { sceneId: "S00", beatIndex: 1 });
});

test("모험 마치기는 결말 세션을 보존한 완료 화면으로 전환한다", async () => {
  const { finishAdventure } = await import("../src/app.js");
  const ending = continueChip(selectChip(
    choosePath(choosePath(beginStory(), "S01"), "A1"),
    { label: "이 길 끝에 뭐가 있어?", nextSceneId: "E1" },
  ));
  const complete = finishAdventure(ending);

  assert.equal(complete.screen, "complete");
  assert.strictEqual(complete.session, ending.session);
  assert.equal(complete.sceneId, "E1");
  assert.equal(complete.testCompleted, false);
});

test("escapeHtml escapes all HTML-significant characters", () => {
  assert.equal(escapeHtml("&<>\"'"), "&amp;&lt;&gt;&quot;&#039;");
});

test("설정 화면은 이름과 세 선택 그룹을 제공한다", () => {
  const html = renderSetup(session.slots);

  assert.match(html, /class="storybook-shell"/);
  assert.match(html, /class="storybook-masthead"/);
  assert.match(html, /class="storybook-scene-frame"/);
  assert.match(html, /class="storybook-footer"/);
  assert.match(html, /<form[^>]*data-action="start"/);
  assert.match(html, /<input(?=[^>]*\btype="text")(?=[^>]*\bname="HERO")[^>]*>/);
  assert.match(html, /name="HERO"[^>]*maxlength="6"[^>]*autocomplete="off"[^>]*inputmode="text"/);
  assert.match(html, /data-slot="TREAT"/);
  assert.match(html, /data-slot="PET"/);
  assert.match(html, /data-slot="COLOR"/);
});

test("현재형 전체 화면은 실제 상태를 표시하는 공통 이야기책 프레임을 사용한다", () => {
  const sceneHtml = renderScene({
    id: "S00", type: "choice", title: "첫 장면", art: "rabbit-hole", body: "본문", vocab: [], choices: [],
  }, { ...session, path: ["S00", "S01"], vocabTapped: ["황급히"] });
  const endingHtml = renderEnding({
    id: "E1", type: "ending", title: "결말", art: "cheshire-tree", body: "끝", vocab: [], trait: "호기심", sourceSceneId: "A1",
  }, session);
  const recoveryHtml = renderRecovery();

  for (const html of [sceneHtml, endingHtml, recoveryHtml]) {
    assert.match(html, /class="storybook-shell"/);
    assert.match(html, /class="storybook-masthead"/);
    assert.match(html, /class="storybook-footer"/);
  }
  assert.match(sceneHtml, /장면 <strong>2<\/strong>/);
  assert.match(sceneHtml, /낱말 <strong>1<\/strong>/);
  assert.match(endingHtml, /결말 <strong>1\/3<\/strong>/);
  assert.doesNotMatch(sceneHtml, /<button[^>]*storybook/);
});

test("선택 장면은 개인화하고 prose 문단, 선택, 낱말을 안전하게 렌더링한다", () => {
  const scene = {
    id: "X\" onclick=\"bad",
    type: "choice",
    title: "<시험>",
    art: "rabbit-hole\" onclick=\"bad",
    body: "{HERO}{은/는} 출발해요.\n\n<다음>",
    vocab: ["<낱말>"],
    choices: [{ label: "<문 열기>", nextSceneId: "Y\" onclick=\"bad" }],
  };
  const html = renderScene(scene, session, "<좋아>");

  assert.match(html, /지민은 출발해요/);
  assert.match(html, /<p>지민은 출발해요\.<\/p><p>&lt;다음&gt;<\/p>/);
  assert.match(html, /&lt;시험&gt;/);
  assert.match(html, /scene-rabbit-hole&quot; onclick=&quot;bad/);
  assert.match(html, /data-next-scene="Y&quot; onclick=&quot;bad"/);
  assert.match(html, /&lt;문 열기&gt;/);
  assert.match(html, /role="status">네가 고른 길: &lt;좋아&gt;/);
});

test("낱말 버튼은 앱의 vocab 동작 계약을 사용한다", () => {
  const html = renderScene({
    id: "X",
    type: "story",
    title: "낱말",
    art: "book",
    body: "본문",
    vocab: ["<낱말>"],
  }, session);

  assert.match(html, /data-action="vocab"[^>]*data-word="&lt;낱말&gt;"/);
  assert.doesNotMatch(html, /data-action="vocabulary"/);
});

test("nextSceneId만 있는 장면은 계속 읽기 동작을 제공한다", () => {
  const html = renderScene({
    id: "S02",
    type: "story",
    title: "다음",
    art: "path",
    body: "본문",
    vocab: [],
    nextSceneId: "B2",
  }, session);

  assert.match(html, /계속 읽기/);
  assert.match(html, /data-action="continue"[^>]*data-next-scene="B2"/);
});

test("필수 이어 읽기는 선택 피드백 없이 다음 장면으로 이동한다", async () => {
  const { continueStory } = await import("../src/app.js");
  assert.equal(typeof continueStory, "function");
  const giant = choosePath(beginStory(), "S02", "젤리를 먹어 본다");
  const continued = continueStory(giant, "B2");
  const html = renderScene({
    id: "B2",
    type: "chip",
    title: "버섯",
    art: "giant-mushroom",
    body: "본문",
    vocab: [],
    chips: [],
  }, continued.session, continued.feedback);

  assert.equal(continued.sceneId, "B2");
  assert.equal(continued.feedback, null);
  assert.doesNotMatch(html, /네가 고른 길/);
  assert.doesNotMatch(html, /계속 읽기/);
});

test("현재 경로 길이가 초기 및 복원 장면의 순서가 된다", () => {
  const initial = beginStory();
  const restored = createAppState(choosePath(initial, "S01", "작은 문을 열어 본다").session);
  const initialHtml = renderScene({
    id: "S00", type: "story", title: "처음", art: "start", body: "본문", vocab: [],
  }, initial.session);
  const restoredHtml = renderScene({
    id: "S01", type: "story", title: "다음", art: "next", body: "본문", vocab: [],
  }, restored.session, restored.feedback);

  assert.match(initialHtml, />1번째 장면</);
  assert.match(restoredHtml, />2번째 장면</);
});

test("위임된 submit과 continue 클릭은 순수 전이 경계를 호출한다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  assert.equal(typeof bindAppEvents, "function");
  const listeners = {};
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let state = createAppState();
  bindAppEvents(
    app,
    () => state,
    nextState => { state = nextState; },
    () => ({ HERO: "", TREAT: "젤리", PET: "토끼", COLOR: "분홍" }),
  );
  const form = {};
  let prevented = false;
  listeners.submit({
    target: { closest: selector => selector === 'form[data-action="start"]' ? form : null },
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.equal(state.sceneId, "S00");
  assert.equal(state.session.slots.HERO, "앨리스");

  state = choosePath(state, "S02", "젤리를 먹어 본다");
  const control = {
    dataset: { action: "continue", nextScene: "B2" },
    textContent: "계속 읽기",
  };
  listeners.click({ target: { closest: () => control } });

  assert.equal(state.sceneId, "B2");
  assert.equal(state.feedback, null);
});

test("위임된 next-beat 클릭은 스토리 상태를 commit하지 않고 UI 진행 handler를 호출한다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const listeners = {};
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const state = beginStory();
  let commits = 0;
  let beatAdvances = 0;
  bindAppEvents(
    app,
    () => state,
    () => { commits += 1; },
    undefined,
    { onNextBeat: () => { beatAdvances += 1; } },
  );

  const control = { dataset: { action: "next-beat" } };
  listeners.click({ target: { closest: () => control } });

  assert.equal(beatAdvances, 1);
  assert.equal(commits, 0);
});

test("minimal 읽기 화면과 다음 버튼 click은 각각 beat를 한 번만 진행한다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const listeners = {};
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let beatAdvances = 0;
  bindAppEvents(
    app,
    beginStory,
    () => {},
    undefined,
    {
      onNextBeat: () => { beatAdvances += 1; },
      getSelectionText: () => "",
    },
  );

  const reader = {
    dataset: { readerAction: "next-beat" },
    closest(selector) {
      if (selector === "[data-action]") return null;
      if (selector === '[data-reader-action="next-beat"]') return this;
      return null;
    },
  };
  listeners.click({ target: reader });

  const button = {
    dataset: { action: "next-beat" },
    closest(selector) {
      if (selector === "[data-action]") return this;
      if (selector === '[data-reader-action="next-beat"]') return reader;
      return null;
    },
  };
  listeners.click({ target: button });

  assert.equal(beatAdvances, 2);
});

test("minimal 읽기 화면 click은 선택 중인 텍스트가 있으면 beat를 진행하지 않는다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const listeners = {};
  const reader = {
    dataset: { readerAction: "next-beat" },
    closest(selector) {
      if (selector === "[data-action]") return null;
      if (selector === '[data-reader-action="next-beat"]') return this;
      return null;
    },
  };
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let beatAdvances = 0;
  bindAppEvents(
    app,
    beginStory,
    () => {},
    undefined,
    {
      onNextBeat: () => { beatAdvances += 1; },
      getSelectionText: () => "선택한 문장",
    },
  );

  listeners.click({ target: reader });

  assert.equal(beatAdvances, 0);
});

test("낱말 열기는 renderer class와 무관한 닫기 action에 초점을 둔다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const listeners = {};
  let state = beginStory();
  let focused = 0;
  const closeControl = { focus() { focused += 1; } };
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector(selector) {
      return selector === '[data-action="close-vocabulary"]' ? closeControl : null;
    },
    querySelectorAll() { return []; },
  };
  bindAppEvents(app, () => state, nextState => { state = nextState; });
  const control = {
    dataset: { action: "vocab", word: "황급히" },
    closest: () => control,
  };

  listeners.click({ target: control });

  assert.equal(state.vocabulary?.word, "황급히");
  assert.equal(focused, 1);
});

test("렌더 전환 focus는 명시적 target을 heading과 main보다 우선한다", async () => {
  const { focusRenderedContent } = await import("../src/app.js");
  const calls = [];
  const target = {
    setAttribute(name, value) { calls.push(["attribute", name, value]); },
    focus(options) { calls.push(["focus", options]); },
  };
  const app = {
    querySelector(selector) {
      if (selector === "[data-focus-target]") return target;
      throw new Error(`unexpected selector: ${selector}`);
    },
  };

  focusRenderedContent(app, options => calls.push(["scroll", options]), true);

  assert.deepEqual(calls, [
    ["scroll", { top: 0, left: 0, behavior: "auto" }],
    ["attribute", "tabindex", "-1"],
    ["focus", { preventScroll: true }],
  ]);
});

test("위임된 restart 클릭은 setup 전환 전에 minimal 상태를 지운다", async () => {
  const { bindAppEvents } = await import("../src/app.js");
  const listeners = {};
  const app = {
    addEventListener(type, listener) { listeners[type] = listener; },
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const state = beginStory();
  const calls = [];
  bindAppEvents(
    app,
    () => state,
    nextState => { calls.push(nextState.screen); },
    undefined,
    { onRestart: () => { calls.push("clear-minimal"); } },
  );

  const control = { dataset: { action: "restart" } };
  listeners.click({ target: { closest: () => control } });

  assert.deepEqual(calls, ["clear-minimal", "setup"]);
});

test("칩 장면은 레이블과 응답 계약을 이스케이프해 제공한다", () => {
  const scene = {
    id: "A1",
    type: "chip",
    title: "질문",
    art: "tree",
    body: "본문",
    vocab: [],
    prompt: "<무엇이 궁금해?>",
    chips: [{ label: "<질문>", response: "&대답", nextSceneId: "E1" }],
  };
  const html = renderScene(scene, session);

  assert.match(html, /&lt;무엇이 궁금해\?&gt;/);
  assert.match(html, /data-action="choose-chip"/);
  assert.match(html, /data-chip-label="&lt;질문&gt;"/);
  assert.match(html, /data-chip-response="&amp;대답"/);
  assert.match(html, /data-next-scene="E1"/);
});

test("복구와 낱말 패널은 상태를 설명하고 닫기와 재시작 동작을 제공한다", () => {
  const recovery = renderRecovery();
  const vocabulary = renderVocabularyPanel("<낱말>", "&뜻");

  assert.match(recovery, /role="alert"/);
  assert.match(recovery, /data-action="restart"/);
  assert.match(vocabulary, /&lt;낱말&gt;/);
  assert.match(vocabulary, /&amp;뜻/);
  assert.match(vocabulary, /data-action="close-vocabulary"/);
});

test("정의가 없는 낱말 패널은 렌더링하지 않는다", () => {
  assert.equal(renderVocabularyPanel("낱말", null), "");
  assert.equal(renderVocabularyPanel("낱말", undefined), "");
});

test("낱말 패널은 비모달의 이름 있는 영역이다", () => {
  const html = renderVocabularyPanel("낱말", "뜻");

  assert.match(html, /role="region"/);
  assert.match(html, /aria-labelledby="vocabulary-word"/);
  assert.doesNotMatch(html, /role="dialog"/);
  assert.doesNotMatch(html, /aria-modal/);
});

test("결말은 sourceSceneId의 칩만 회상하고 수집 상태와 재시작을 제공한다", () => {
  const ending = {
    id: "E1",
    type: "ending",
    title: "지혜로운 웃음",
    art: "ending-curiosity",
    body: "끝",
    vocab: [],
    trait: "호기심",
    sourceSceneId: "A1",
  };
  const html = renderEnding(ending, session);

  assert.match(html, /이 길 끝에 뭐가 있어\?/);
  assert.doesNotMatch(html, /다른 장면의 칩/);
  assert.match(html, /1\/3/);
  assert.match(html, /너의 이야기 조각: 호기심/);
  assert.match(html, /data-action="restart"/);
});
