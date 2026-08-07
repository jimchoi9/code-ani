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

test("디버그 getter는 내부 세션을 바꿀 수 없는 복제본을 반환한다", () => {
  let state = beginStory();
  const debug = createDebugGetters(() => state);
  const snapshot = debug.session();
  snapshot.path.push("BROKEN");
  snapshot.slots.HERO = "변조";

  assert.equal(debug.screen(), "scene");
  assert.equal(debug.sceneId(), "S00");
  assert.deepEqual(debug.session().path, ["S00"]);
  assert.equal(debug.session().slots.HERO, "지민");
});

test("escapeHtml escapes all HTML-significant characters", () => {
  assert.equal(escapeHtml("&<>\"'"), "&amp;&lt;&gt;&quot;&#039;");
});

test("설정 화면은 이름과 세 선택 그룹을 제공한다", () => {
  const html = renderSetup(session.slots);

  assert.match(html, /<form[^>]*data-action="start"/);
  assert.match(html, /<input(?=[^>]*\btype="text")(?=[^>]*\bname="HERO")[^>]*>/);
  assert.match(html, /name="HERO"[^>]*maxlength="6"[^>]*autocomplete="off"[^>]*inputmode="text"/);
  assert.match(html, /data-slot="TREAT"/);
  assert.match(html, /data-slot="PET"/);
  assert.match(html, /data-slot="COLOR"/);
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
  assert.match(html, /data-action="choose"[^>]*data-next-scene="B2"/);
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
