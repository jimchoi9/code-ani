import assert from "node:assert/strict";
import test from "node:test";
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

test("escapeHtml escapes all HTML-significant characters", () => {
  assert.equal(escapeHtml("&<>\"'"), "&amp;&lt;&gt;&quot;&#039;");
});

test("설정 화면은 이름과 세 선택 그룹을 제공한다", () => {
  const html = renderSetup(session.slots);

  assert.match(html, /<form[^>]*data-action="start"/);
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
