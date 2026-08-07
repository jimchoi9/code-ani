# 앨리스풍 분기형 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 만 7~9세 아이가 개인화된 앨리스풍 이야기를 선택해 세 결말 중 하나에 도달하고, 자기 선택이 이야기를 바꿨다고 느끼는 정적 웹 데모를 만든다.

**Architecture:** `alice-branching-mvp`는 빌드 과정과 외부 런타임 의존성이 없는 ES 모듈 앱이다. 순수 함수로 개인화·스토리 그래프·세션 갱신을 처리하고, `app.js`가 DOM 렌더러와 브라우저 저장소를 연결한다. 기존 `moving-story-starter`는 수정하지 않으며 별도 앱으로 실행한다.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Node.js 내장 test runner, `localStorage`, Python 정적 HTTP 서버

## Global Constraints

- 새 앱은 `alice-branching-mvp/` 아래에만 만든다.
- 자유 입력은 이름 한글 2~6자만 허용하며, 이야기 대화에는 자유 입력이나 실시간 AI를 사용하지 않는다.
- 1회 플레이는 프롤로그를 포함해 5~7개 화면, 약 5분 이내로 끝나야 한다.
- 도달 가능한 결말은 `E1`, `E3`, `E5` 세 개뿐이다.
- 원격 이벤트 전송, 로그인, 기기 간 동기화, 부모용 성향 진단을 구현하지 않는다.
- 아이의 선택과 결과 연결을 보여주기 위해 선택 직후 선택 문구를 다시 표시한다.
- 탭 대상은 최소 44px이고 390px 폭에서 가로 스크롤이 없어야 한다.
- `localStorage`가 실패해도 현재 탭에서는 플레이를 계속할 수 있어야 한다.
- 기존 `moving-story-starter/`와 `output/` 파일은 수정하지 않는다.

---

## File Map

- `alice-branching-mvp/index.html`: 앱 셸, 메타데이터, 접근 가능한 마운트 지점
- `alice-branching-mvp/styles.css`: 모바일 우선 이야기책 레이아웃, 장면별 아트, 선택·낱말·결말 상태
- `alice-branching-mvp/package.json`: Node 테스트와 로컬 서버 명령
- `alice-branching-mvp/README.md`: 실행법, 관찰 항목, 로컬 기록 확인법
- `alice-branching-mvp/src/personalization.js`: 이름 검증, 기본 슬롯, 조사 선택, 템플릿 치환
- `alice-branching-mvp/src/story-data.js`: 7개 장면과 3개 결말, 칩, 낱말 정의
- `alice-branching-mvp/src/session.js`: 플레이 상태 갱신, 누적 실행 기록, 저장소 폴백
- `alice-branching-mvp/src/vocabulary.js`: 낱말 정의 조회와 세션 기록 연결
- `alice-branching-mvp/src/ui.js`: 설정·장면·결말 HTML 생성과 안전한 문자열 이스케이프
- `alice-branching-mvp/src/app.js`: 화면 상태 전이, 이벤트 위임, 저장, 선택 피드백
- `alice-branching-mvp/tests/personalization.test.mjs`: 슬롯·조사 회귀 테스트
- `alice-branching-mvp/tests/story-data.test.mjs`: 그래프 무결성·결말 도달성 테스트
- `alice-branching-mvp/tests/session.test.mjs`: 플레이 기록·재시작·저장소 폴백 테스트
- `alice-branching-mvp/tests/ui.test.mjs`: 렌더링·이스케이프·선택 회상 테스트

## Source Material

- 설계 계약: `docs/superpowers/specs/2026-08-07-alice-branching-mvp-design.md`
- 전체 L1 원고: `/Users/choijimin/.codex/attachments/b409b31e-cac4-4bb3-a550-a5fe8ffa1e25/pasted-text.txt`
- 구현에 사용할 원고 구간: `S00`, `S01`, `A1`, `A3`, `S02`, `B2`, `E1`, `E3`, `E5`

### Task 1: 프로젝트 셸과 개인화 엔진

**Files:**
- Create: `alice-branching-mvp/package.json`
- Create: `alice-branching-mvp/src/personalization.js`
- Create: `alice-branching-mvp/tests/personalization.test.mjs`

**Interfaces:**
- Produces: `DEFAULT_SLOTS`, `normalizeSlots(input)`, `selectParticle(word, pair)`, `renderTemplate(template, slots)`
- `normalizeSlots(input)` returns `{ HERO, TREAT, PET, COLOR }` with values from the allowed lists.
- `selectParticle(word, "이/가" | "은/는" | "을/를" | "와/과")` returns one particle.

- [ ] **Step 1: 테스트 러너와 실패하는 개인화 테스트를 만든다**

```json
{
  "name": "alice-branching-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "python3 -m http.server 8081 --bind 127.0.0.1"
  }
}
```

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SLOTS,
  normalizeSlots,
  renderTemplate,
  selectParticle,
} from "../src/personalization.js";

test("한글 2~6자 이름과 허용된 슬롯을 유지한다", () => {
  assert.deepEqual(normalizeSlots({
    HERO: "지민",
    TREAT: "젤리",
    PET: "토끼",
    COLOR: "분홍",
  }), { HERO: "지민", TREAT: "젤리", PET: "토끼", COLOR: "분홍" });
});

test("유효하지 않은 값은 기본값으로 바꾼다", () => {
  assert.deepEqual(normalizeSlots({
    HERO: "Alice",
    TREAT: "초콜릿",
    PET: "용",
    COLOR: "보라",
  }), DEFAULT_SLOTS);
});

test("받침 유무에 맞는 조사를 고른다", () => {
  assert.equal(selectParticle("붕어빵", "을/를"), "을");
  assert.equal(selectParticle("젤리", "을/를"), "를");
  assert.equal(selectParticle("강아지", "와/과"), "와");
  assert.equal(selectParticle("토끼", "이/가"), "가");
});

test("슬롯과 조사 토큰을 함께 치환한다", () => {
  const slots = normalizeSlots({ HERO: "지민", TREAT: "붕어빵" });
  assert.equal(
    renderTemplate("{HERO}{은/는} {TREAT}{을/를} 골랐어요.", slots),
    "지민은 붕어빵을 골랐어요.",
  );
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL because `src/personalization.js` does not exist.

- [ ] **Step 3: 최소 개인화 구현을 작성한다**

```js
export const DEFAULT_SLOTS = Object.freeze({
  HERO: "앨리스",
  TREAT: "케이크",
  PET: "강아지",
  COLOR: "파랑",
});

const ALLOWED = {
  TREAT: ["케이크", "쿠키", "젤리", "붕어빵"],
  PET: ["강아지", "고양이", "토끼", "거북이"],
  COLOR: ["파랑", "노랑", "초록", "분홍"],
};

const PARTICLES = {
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "을/를": ["을", "를"],
  "와/과": ["과", "와"],
};

function hasFinalConsonant(word) {
  const code = word.codePointAt(word.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

export function selectParticle(word, pair) {
  const particles = PARTICLES[pair];
  return particles[hasFinalConsonant(word) ? 0 : 1];
}

export function normalizeSlots(input = {}) {
  const hero = typeof input.HERO === "string" && /^[가-힣]{2,6}$/.test(input.HERO.trim())
    ? input.HERO.trim()
    : DEFAULT_SLOTS.HERO;
  return Object.fromEntries(Object.entries(DEFAULT_SLOTS).map(([key, fallback]) => [
    key,
    key === "HERO" ? hero : ALLOWED[key].includes(input[key]) ? input[key] : fallback,
  ]));
}

export function renderTemplate(template, input) {
  const slots = normalizeSlots(input);
  return template.replace(/\{(HERO|TREAT|PET|COLOR)\}(?:\{(이\/가|은\/는|을\/를|와\/과)\})?/g,
    (_, key, pair) => slots[key] + (pair ? selectParticle(slots[key], pair) : ""));
}
```

- [ ] **Step 4: 테스트를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: 4 tests PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/package.json alice-branching-mvp/src/personalization.js alice-branching-mvp/tests/personalization.test.mjs
git commit -m "feat: add alice story personalization"
```

### Task 2: 스토리 그래프와 낱말 데이터

**Files:**
- Create: `alice-branching-mvp/src/story-data.js`
- Create: `alice-branching-mvp/src/vocabulary.js`
- Create: `alice-branching-mvp/tests/story-data.test.mjs`

**Interfaces:**
- Produces: `story`, `getScene(sceneId)`, `getVocabulary(word)`, `recordVocabulary(session, word)`
- `story.sceneOrder` is `["S00", "S01", "A1", "A3", "S02", "B2", "E1", "E3", "E5"]`.
- Each choice is `{ label, nextSceneId, trait? }`; each chip is `{ label, response, nextSceneId }`.
- Consumes: session shape with `vocabTapped: string[]`; `recordVocabulary` returns a new object without mutating input.

- [ ] **Step 1: 그래프 무결성과 도달성을 검사하는 실패 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getScene, story } from "../src/story-data.js";
import { getVocabulary, recordVocabulary } from "../src/vocabulary.js";

function destinations(scene) {
  return [
    ...[...(scene.choices ?? []), ...(scene.chips ?? [])].map(item => item.nextSceneId),
    ...(scene.nextSceneId ? [scene.nextSceneId] : []),
  ];
}

test("모든 장면 연결은 존재하는 장면을 가리킨다", () => {
  for (const scene of Object.values(story.scenes)) {
    for (const id of destinations(scene)) assert.ok(getScene(id), `${scene.id} -> ${id}`);
  }
});

test("S00에서 세 MVP 결말에 도달할 수 있다", () => {
  const reached = new Set();
  const queue = ["S00"];
  while (queue.length) {
    const id = queue.shift();
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...destinations(getScene(id)));
  }
  assert.deepEqual([...reached].filter(id => id.startsWith("E")).sort(), ["E1", "E3", "E5"]);
});

test("모든 장면은 제목, 아트 키, 본문과 1~2개 낱말을 가진다", () => {
  for (const scene of Object.values(story.scenes)) {
    assert.ok(scene.title && scene.art && scene.body);
    assert.ok(scene.vocab.length >= 1 && scene.vocab.length <= 2, scene.id);
  }
});

test("낱말을 중복 없이 기록하고 모르는 낱말은 무시한다", () => {
  const session = { vocabTapped: ["황급히"] };
  assert.equal(getVocabulary("황급히"), "아주 급하게, 서둘러서");
  assert.deepEqual(recordVocabulary(session, "황급히").vocabTapped, ["황급히"]);
  assert.strictEqual(recordVocabulary(session, "없는말"), session);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL because story and vocabulary modules do not exist.

- [ ] **Step 3: 정확한 MVP 그래프와 원고 데이터를 작성한다**

`story-data.js`에 아래 연결을 정확히 사용하고, 설계 원문에서 해당 장면의 전체 본문·칩 응답·결말 인용문을 옮긴다. 원고의 `{CHILD_INPUT}`은 결말 레코드의 `choiceRecall` 위치로 분리한다.

```js
export const story = {
  id: "alice-branching-mvp",
  title: "앨리스와 세 갈래 이상한 나라",
  startSceneId: "S00",
  sceneOrder: ["S00", "S01", "A1", "A3", "S02", "B2", "E1", "E3", "E5"],
  scenes: {
    S00: { id: "S00", type: "choice", art: "rabbit-hole", choices: [
      { label: "작은 문을 열어 본다", nextSceneId: "S01" },
      { label: "{TREAT}{을/를} 먹어 본다", nextSceneId: "S02" },
    ]},
    S01: { id: "S01", type: "choice", art: "tiny-garden", choices: [
      { label: "나무 위 웃음소리로 간다", nextSceneId: "A1" },
      { label: "멀리 들리는 찻잔 소리로 간다", nextSceneId: "A3" },
    ]},
    A1: { id: "A1", type: "chip", art: "cheshire-tree", chips: [
      { label: "이 길 끝에 뭐가 있어?", response: "재미있는 생각이구나. 고양이가 의미심장하게 웃었어요.", nextSceneId: "E1" },
      { label: "너는 왜 웃고 있어?", response: "그건 나도 궁금했어. 고양이의 귀가 쫑긋 움직였어요.", nextSceneId: "E1" },
      { label: "여기서 나갈 수 있어?", response: "글쎄, 어떨까? 고양이는 대답 대신 눈을 가늘게 떴어요.", nextSceneId: "E1" },
    ]},
    A3: { id: "A3", type: "chip", art: "tea-party", chips: [
      { label: "노래가 나오는 시계", response: "훌륭한 생각이야! 모자장수가 엄중하게 고개를 끄덕였어요.", nextSceneId: "E3" },
      { label: "내 기분을 알려 주는 시계", response: "그런 시계라면 나도 갖고 싶군. 산토끼가 귀를 쫑긋 세웠어요.", nextSceneId: "E3" },
      { label: "그냥 시간 알려 주는 시계요", response: "적어 둬야겠어! 모자장수가 모자에서 종이를 꺼냈어요.", nextSceneId: "E3" },
    ]},
    S02: { id: "S02", type: "story", art: "giant-land", nextSceneId: "B2" },
    B2: { id: "B2", type: "chip", art: "giant-mushroom", chips: [
      { label: "강을 한 번에 건너고 싶어요", response: "그것도 좋은 일이지. 애벌레가 덤덤하게 고개를 끄덕였어요.", nextSceneId: "E5" },
      { label: "높은 곳을 보고 싶어요", response: "커진 덕분에 할 수 있는 일이구나. 애벌레가 연기를 내뿜었어요.", nextSceneId: "E5" },
      { label: "친구를 어깨에 태우고 싶어요", response: "그렇다면 지금 모습이 딱 맞겠네. 애벌레가 조용히 말했어요.", nextSceneId: "E5" },
    ]},
    E1: { id: "E1", type: "ending", art: "ending-curiosity", trait: "호기심", vocab: ["두둥실"] },
    E3: { id: "E3", type: "ending", art: "ending-joy", trait: "유쾌함", vocab: ["덩달아"] },
    E5: { id: "E5", type: "ending", art: "ending-confidence", trait: "자기확신", vocab: ["성큼성큼"] },
  },
};

export function getScene(sceneId) {
  return story.scenes[sceneId] ?? null;
}
```

`vocabulary.js`에는 구현 장면에서 쓰는 다음 15개 정의를 둔다: `황급히`, `먹음직스러운`, `낯선`, `흐드러지게`, `서서히`, `의미심장하게`, `엄중하게`, `어리둥절했어요`, `장식되어`, `훤히`, `덤덤하게`, `굳이`, `두둥실`, `덩달아`, `성큼성큼`. 각 뜻은 L1 원고의 `**낱말**` 줄과 결말 문맥에 맞춘 한 문장 뜻풀이를 사용한다.

- [ ] **Step 4: 데이터 테스트를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all personalization and story-data tests PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/src/story-data.js alice-branching-mvp/src/vocabulary.js alice-branching-mvp/tests/story-data.test.mjs
git commit -m "feat: add alice branching story graph"
```

### Task 3: 플레이 세션과 로컬 관찰 기록

**Files:**
- Create: `alice-branching-mvp/src/session.js`
- Create: `alice-branching-mvp/tests/session.test.mjs`

**Interfaces:**
- Produces: `createSession(slots, now?)`, `updateSlots(session, slots)`, `visitScene(session, sceneId)`, `chooseChip(session, sceneId, label)`, `tapVocabulary(session, word)`, `completeRun(session, endingId, now?)`, `restartRun(session, now?)`, `createSessionStore(storage?)`
- All updater functions return a new session object.
- `createSessionStore` returns `{ load(), save(session), clear() }` and falls back to closure memory when storage throws.

- [ ] **Step 1: 실패하는 세션 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseChip,
  completeRun,
  createSession,
  createSessionStore,
  restartRun,
  tapVocabulary,
  visitScene,
} from "../src/session.js";

const start = "2026-08-07T10:00:00.000Z";

test("경로, 칩, 낱말, 결말과 완료 시각을 기록한다", () => {
  let session = createSession({ HERO: "지민" }, start);
  session = visitScene(session, "S00");
  session = visitScene(session, "S01");
  session = visitScene(session, "A1");
  session = chooseChip(session, "A1", "이 길 끝에 뭐가 있어?");
  session = tapVocabulary(session, "황급히");
  session = completeRun(session, "E1", "2026-08-07T10:04:20.000Z");
  assert.deepEqual(session.path, ["S00", "S01", "A1", "E1"]);
  assert.deepEqual(session.endingsSeen, ["E1"]);
  assert.equal(session.runs[0].completedAt, "2026-08-07T10:04:20.000Z");
  assert.deepEqual(session.runs[0].chipChoices, [{ sceneId: "A1", label: "이 길 끝에 뭐가 있어?" }]);
});

test("다시 하기는 수집 기록을 유지하고 새 실행을 연다", () => {
  const completed = completeRun(createSession({}, start), "E1", start);
  const replay = restartRun(completed, "2026-08-07T10:05:00.000Z");
  assert.deepEqual(replay.endingsSeen, ["E1"]);
  assert.equal(replay.runs[0].replayed, true);
  assert.equal(replay.runs.length, 2);
  assert.deepEqual(replay.path, []);
});

test("저장소 오류 시 메모리 폴백으로 저장한다", () => {
  const brokenStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const store = createSessionStore(brokenStorage);
  const session = createSession({}, start);
  store.save(session);
  assert.deepEqual(store.load(), session);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL because `src/session.js` does not exist.

- [ ] **Step 3: 불변 업데이트와 저장소 폴백을 구현한다**

```js
import { normalizeSlots } from "./personalization.js";

const STORAGE_KEY = "alice-branching-mvp/session-v1";
const isoNow = () => new Date().toISOString();

function run(id, startedAt) {
  return { id, startedAt, completedAt: null, path: [], chipChoices: [], vocabTapped: [], replayed: false };
}

export function createSession(slots = {}, now = isoNow()) {
  return {
    slots: normalizeSlots(slots), path: [], chipChoices: [], vocabTapped: [], endingsSeen: [],
    runs: [run(`run-${now}`, now)],
  };
}

export function visitScene(session, sceneId) {
  return updateCurrentRun({ ...session, path: [...session.path, sceneId] }, current => ({
    ...current, path: [...current.path, sceneId],
  }));
}

export function chooseChip(session, sceneId, label) {
  const choice = { sceneId, label };
  return updateCurrentRun({ ...session, chipChoices: [...session.chipChoices, choice] }, current => ({
    ...current, chipChoices: [...current.chipChoices, choice],
  }));
}

export function tapVocabulary(session, word) {
  if (session.vocabTapped.includes(word)) return session;
  return updateCurrentRun({ ...session, vocabTapped: [...session.vocabTapped, word] }, current => ({
    ...current, vocabTapped: [...current.vocabTapped, word],
  }));
}
```

같은 파일에 `updateSlots`, `updateCurrentRun`, `completeRun`, `restartRun`, `createSessionStore`를 테스트 계약대로 구현한다. `updateSlots(session, slots)`는 `runs`와 `endingsSeen`을 유지하고 정규화된 슬롯만 교체한다. `completeRun()`은 결말 id를 현재 경로와 현재 run 경로에 한 번만 추가하고 완료 시각을 기록한다. `load()`는 JSON 파싱 실패 시 `null`을 반환하고, `save()`는 직렬화 가능한 세션만 저장한다. `restartRun()`은 직전 run의 `replayed`만 `true`로 바꾸고 새 run을 추가한다.

- [ ] **Step 4: 세션 테스트를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/src/session.js alice-branching-mvp/tests/session.test.mjs
git commit -m "feat: record local story play sessions"
```

### Task 4: 접근 가능한 화면 렌더러

**Files:**
- Create: `alice-branching-mvp/src/ui.js`
- Create: `alice-branching-mvp/tests/ui.test.mjs`

**Interfaces:**
- Consumes: normalized slots, story scene records, session record, vocabulary definitions.
- Produces: `escapeHtml(value)`, `renderSetup(slots)`, `renderScene(scene, session, feedback?)`, `renderRecovery()`, `renderVocabularyPanel(word, definition)`, `renderEnding(scene, session)`.
- Every actionable element has `data-action`; choices additionally have `data-next-scene`, chips have `data-chip-label` and `data-chip-response`.

- [ ] **Step 1: 실패하는 문자열 렌더링 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { renderEnding, renderScene, renderSetup } from "../src/ui.js";

const session = {
  slots: { HERO: "지민", TREAT: "젤리", PET: "토끼", COLOR: "분홍" },
  path: [],
  chipChoices: [{ sceneId: "A1", label: "이 길 끝에 뭐가 있어?" }],
  vocabTapped: [],
  endingsSeen: ["E1"],
};

test("설정 화면은 이름과 세 선택 그룹을 제공한다", () => {
  const html = renderSetup(session.slots);
  assert.match(html, /name="HERO"/);
  assert.match(html, /data-slot="TREAT"/);
  assert.match(html, /data-slot="PET"/);
  assert.match(html, /data-slot="COLOR"/);
});

test("장면은 개인화하고 HTML을 이스케이프한다", () => {
  const scene = { id: "X", type: "choice", title: "시험", art: "rabbit-hole", body: "{HERO}{은/는} 출발해요.", vocab: [], choices: [
    { label: "<문 열기>", nextSceneId: "Y" },
  ] };
  const html = renderScene(scene, session);
  assert.match(html, /지민은 출발해요/);
  assert.doesNotMatch(html, /<문 열기>/);
  assert.match(html, /&lt;문 열기&gt;/);
});

test("결말은 고른 칩과 1\/3 수집 상태를 회상한다", () => {
  const ending = { id: "E1", type: "ending", title: "지혜로운 웃음", art: "ending-curiosity", body: "끝", vocab: [], trait: "호기심", sourceSceneId: "A1" };
  const html = renderEnding(ending, session);
  assert.match(html, /이 길 끝에 뭐가 있어?/);
  assert.match(html, /1\/3/);
  assert.match(html, /data-action="restart"/);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL because `src/ui.js` does not exist.

- [ ] **Step 3: 시맨틱 HTML 렌더러를 구현한다**

```js
import { renderTemplate } from "./personalization.js";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function renderChoice(choice, slots) {
  const label = renderTemplate(choice.label, slots);
  return `<button class="choice" type="button" data-action="choose" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(label)}</button>`;
}

export function renderScene(scene, session, feedback = null) {
  const body = escapeHtml(renderTemplate(scene.body, session.slots)).replace(/\n\n/g, "</p><p>");
  const actions = scene.choices?.map(choice => renderChoice(choice, session.slots)).join("") ?? "";
  return `<main class="story-screen scene-${escapeHtml(scene.art)}">
    <div class="scene-art" aria-hidden="true"></div>
    <article><p class="scene-kicker">${session.path.length + 1}번째 장면</p><h1>${escapeHtml(scene.title)}</h1>
    ${feedback ? `<p class="choice-feedback" role="status">네가 고른 길: ${escapeHtml(feedback)}</p>` : ""}
    <div class="story-copy"><p>${body}</p></div><div class="actions">${actions}</div></article>
  </main>`;
}
```

같은 이스케이프 규칙으로 칩 버튼, 낱말 버튼, 복구 화면, 결말 화면을 구현한다. 이름 입력에는 `maxlength="6"`, `autocomplete="off"`, `inputmode="text"`를 지정한다. 성향은 `너의 이야기 조각: 호기심`처럼 놀이 결과로만 표시하고 진단 문구는 넣지 않는다.

- [ ] **Step 4: UI 테스트를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/src/ui.js alice-branching-mvp/tests/ui.test.mjs
git commit -m "feat: render accessible branching story screens"
```

### Task 5: 브라우저 앱 연결과 시각 완성

**Files:**
- Create: `alice-branching-mvp/index.html`
- Create: `alice-branching-mvp/styles.css`
- Create: `alice-branching-mvp/src/app.js`
- Create: `alice-branching-mvp/README.md`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`

**Interfaces:**
- Consumes all Task 1–4 exports.
- Produces browser behavior through `#app`, delegated `click` and `submit` handlers, and `window.__aliceStoryDebug` with read-only `screen()`, `sceneId()`, `session()` getters.
- Screen states are `setup`, `scene`, `chip-response`, `ending`, `recovery`.

- [ ] **Step 1: 앱 셸 구조 테스트를 추가한다**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("브라우저 셸은 앱, 스타일, 모듈 진입점을 연결한다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="app"/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/src\/app\.js"/);
});
```

- [ ] **Step 2: 셸 테스트 실패를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 3: HTML 셸과 앱 상태 전이를 구현한다**

`index.html`은 viewport 메타, `lang="ko"`, skip link, `#app`, `noscript` 안내만 둔다. `app.js`는 다음 전이를 구현한다.

```js
const app = document.querySelector("#app");
const store = createSessionStore(window.localStorage);
let session = store.load();
let screen = session ? "scene" : "setup";
let sceneId = story.startSceneId;
let feedback = null;

function persist(next) {
  session = next;
  store.save(session);
}

function goTo(nextSceneId, selectedLabel = null) {
  const next = getScene(nextSceneId);
  if (!next) {
    screen = "recovery";
    render();
    return;
  }
  feedback = selectedLabel;
  sceneId = nextSceneId;
  screen = next.type === "ending" ? "ending" : "scene";
  persist(next.type === "ending"
    ? completeRun(session, next.id)
    : visitScene(session, nextSceneId));
  render();
}
```

첫 설정 submit은 슬롯을 읽어 `createSession` 후 `S00`으로 이동한다. 다시 하기 뒤 설정 submit은 `updateSlots`를 사용해 기존 `runs`와 `endingsSeen`을 유지한 채 `S00`으로 이동한다. `choose`는 선택 문구를 `feedback`으로 넘긴다. `S02`처럼 `nextSceneId`만 있는 장면은 `계속 읽기` 버튼으로 `B2`에 이동한다. `choose-chip`은 먼저 같은 화면에서 응답을 보여주고, `continue-chip`을 눌러 결말로 이동한다. `vocab`은 뜻풀이 패널을 열고 기록한다. `restart`는 `restartRun`을 먼저 저장한 뒤 설정 화면으로 돌아간다. `window.__aliceStoryDebug`는 상태 복사본만 반환한다.

- [ ] **Step 4: 장면별 아트와 모바일 레이아웃을 구현한다**

`styles.css`에서 장면별 `scene-art`를 CSS 레이어와 단순 도형으로 구성한다. `rabbit-hole`, `tiny-garden`, `cheshire-tree`, `tea-party`, `giant-land`, `giant-mushroom`, 세 결말은 배경색뿐 아니라 문·나무·찻잔·버섯·고양이 웃음 같은 식별 가능한 소품이 달라야 한다. 팔레트는 연한 하늘색, 잎 초록, 체리 빨강, 노랑, 보라를 함께 쓰고 한 색 계열로 지배되지 않게 한다.

필수 레이아웃 값:

```css
.story-screen { min-height: 100svh; display: grid; grid-template-rows: minmax(220px, 42svh) 1fr; }
.scene-art { position: relative; overflow: hidden; min-height: 220px; }
.actions { display: grid; gap: 10px; }
.choice, .chip, .primary-action { min-height: 52px; width: 100%; }
.vocab-word { min-height: 44px; padding: 2px 6px; }
@media (min-width: 760px) {
  .story-screen { grid-template-columns: minmax(320px, 1fr) minmax(360px, 560px); grid-template-rows: 100svh; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; }
}
```

장면 전환 애니메이션은 opacity와 translateY만 250ms 이내로 사용한다. 버튼 focus ring, 본문 줄간격 1.7 이상, 본문 최대 폭 34rem, 글자 크기 18px 이상을 적용한다.

- [ ] **Step 5: 실행 및 관찰 문서를 작성한다**

README에 아래 내용을 명시한다.

```markdown
## 실행

`npm test`로 자동 테스트를 실행하고 `npm run serve` 후 `http://127.0.0.1:8081`을 연다.

## 아이와 볼 때 관찰할 것

- 첫 선택 뒤 화면이 달라졌다고 말하거나 반응하는가
- 고른 칩이 결말에 다시 나온 것을 알아차리는가
- 끝까지 스스로 진행하는가
- 다른 결말을 보려고 다시 하기를 누르는가
- 낱말 뜻을 자발적으로 열어 보는가

로컬 기록은 개발자 도구에서 `window.__aliceStoryDebug.session()`으로 확인한다. 이 값은 사용성 참고 자료이며 성향 진단으로 해석하지 않는다.
```

- [ ] **Step 6: 전체 자동 검증을 실행한다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 7: 로컬 서버에서 데스크톱·모바일 플레이를 확인한다**

Run: `cd alice-branching-mvp && npm run serve`

브라우저에서 `http://127.0.0.1:8081`을 열고 다음을 확인한다.

- 390x844: 가로 스크롤 없음, 모든 버튼 44px 이상, 본문과 선택 버튼이 겹치지 않음
- 1280x800: 아트와 본문이 첫 화면 안에서 균형 있게 보임
- `S00 -> S01 -> A1 -> E1`, `S00 -> S01 -> A3 -> E3`, `S00 -> S02 -> B2 -> E5` 완주
- 각 분기 직후 선택 피드백 표시
- 칩 응답 뒤 결말에서 동일 문구 회상
- 낱말 패널 열기·닫기와 중복 없는 기록
- 새로고침 후 세션 복구, 다시 하기 후 `endingsSeen` 유지
- 저장소 접근 실패를 강제로 만들었을 때 현재 플레이 유지

- [ ] **Step 8: 최종 커밋한다**

```bash
git add alice-branching-mvp/index.html alice-branching-mvp/styles.css alice-branching-mvp/src/app.js alice-branching-mvp/README.md alice-branching-mvp/tests/ui.test.mjs
git commit -m "feat: ship alice branching play demo"
```
