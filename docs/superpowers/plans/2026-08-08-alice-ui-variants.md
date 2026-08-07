# 앨리스 UI 비교판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 앨리스 분기형 MVP의 이야기와 세션을 공유하면서 `current`, `visual-novel`, `minimal` 세 UI를 URL로 즉시 비교할 수 있는 내부 판단용 데모를 만든다.

**Architecture:** `app.js`가 기존 상태 전이와 저장을 계속 소유하고, `ui-variant.js`가 URL에 따라 동일 인터페이스의 렌더러를 선택한다. 현재 UI는 호환 facade로 보존하고, 비주얼노벨은 생성형 래스터 자산과 전용 렌더러를, 미니멀 UI는 순수 beat 엔진과 `sessionStorage` UI 상태를 사용한다.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Node.js 내장 test runner, `localStorage`, `sessionStorage`, built-in image generation, Python 정적 HTTP 서버

## Global Constraints

- 기준 브랜치는 `feat/alice-branching-mvp`, 실험 브랜치는 `experiment/alice-ui-variants`다.
- 비교 서버는 `http://127.0.0.1:8082`를 사용한다.
- 지원 UI id는 정확히 `current`, `visual-novel`, `minimal` 세 개다.
- 알 수 없는 `ui` 값은 `current`로 대체한다.
- 기존 스토리 데이터와 장면 연결을 복제하지 않는다.
- 세 UI는 같은 `session.js` 세션과 `endingsSeen`을 공유한다.
- 주소의 `ui` 값과 minimal beat 상태를 아이 관찰 기록에 넣지 않는다.
- `ui.js`의 기존 export와 현재 UI 동작을 유지한다.
- 모든 조작 대상은 최소 44px이고 키보드로 사용할 수 있어야 한다.
- `prefers-reduced-motion`에서는 반복·장식 애니메이션을 정지한다.
- 외부 런타임 의존성이나 빌드 단계를 추가하지 않는다.
- 원격 분석, 새 장면·결말, 음성, 자동 재생, 타이핑 효과, 표정 교체, 다크 모드는 구현하지 않는다.

---

## File Map

- `alice-branching-mvp/src/ui-variant.js`: query 파싱, UI 레지스트리, 비교 링크 생성
- `alice-branching-mvp/src/beat.js`: 문장 분리, beat 생성, minimal UI 상태 정규화와 저장
- `alice-branching-mvp/src/ui-variants/current.js`: 기존 `ui.js` export를 그대로 묶는 기준 렌더러
- `alice-branching-mvp/src/ui-variants/visual-novel.js`: 비주얼노벨 화면, 이름표, 트레일, 자산 매핑
- `alice-branching-mvp/src/ui-variants/minimal-text.js`: beat 화면과 마지막 beat의 선택·낱말·결말 명령
- `alice-branching-mvp/src/ui.js`: 기존 export를 보존하는 현재 UI facade
- `alice-branching-mvp/src/app.js`: 선택된 렌더러 연결, compare 메뉴, beat 진행 이벤트
- `alice-branching-mvp/styles.css`: 공통 토큰과 현재 스타일 보존
- `alice-branching-mvp/styles/current.css`: 현재 UI용 추가 규칙 또는 빈 호환 레이어
- `alice-branching-mvp/styles/visual-novel.css`: 풀블리드 무대, 대화창, 카드 선택, 트레일
- `alice-branching-mvp/styles/minimal-text.css`: 여백 중심 독서 화면, beat, 링크형 선택
- `alice-branching-mvp/assets/visual-novel/manifest.js`: 장면·스프라이트 파일 매핑
- `alice-branching-mvp/assets/visual-novel/backgrounds/*.webp`: 배경 6종
- `alice-branching-mvp/assets/visual-novel/characters/*.png`: 투명 스프라이트 4종
- `alice-branching-mvp/tests/beat.test.mjs`: 문장·beat·저장 상태 테스트
- `alice-branching-mvp/tests/ui-variants.test.mjs`: UI 선택, 렌더링 계약, 자산 매핑 테스트
- `alice-branching-mvp/tests/ui.test.mjs`: 기존 UI 회귀와 앱 전이 테스트 보강
- `alice-branching-mvp/index.html`: 변형 스타일시트 연결
- `alice-branching-mvp/package.json`: 비교 서버 포트 8082 명령
- `alice-branching-mvp/README.md`: 세 UI 실행·비교 방법

### Task 1: UI 선택 계층과 현재 UI 기준선

**Files:**
- Create: `alice-branching-mvp/src/ui-variant.js`
- Create: `alice-branching-mvp/src/ui-variants/current.js`
- Create: `alice-branching-mvp/tests/ui-variants.test.mjs`
- Modify: `alice-branching-mvp/src/ui.js`

**Interfaces:**
- Consumes: existing exports `renderSetup`, `renderScene`, `renderChipResponse`, `renderEnding`, `renderRecovery`, `renderVocabularyPanel` from `src/ui.js`.
- Produces: `SUPPORTED_UI_IDS`, `parseUiVariant(search)`, `createCompareLinks(search)`, `getUiRenderer(id)`.
- A renderer record is `{ id, renderSetup, renderScene, renderChipResponse, renderEnding, renderRecovery, renderVocabularyPanel }`.

- [ ] **Step 1: UI query와 current renderer의 실패 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPORTED_UI_IDS,
  createCompareLinks,
  getUiRenderer,
  parseUiVariant,
} from "../src/ui-variant.js";

test("지원 UI와 잘못된 query 폴백을 결정한다", () => {
  assert.deepEqual(SUPPORTED_UI_IDS, ["current", "visual-novel", "minimal"]);
  assert.equal(parseUiVariant("?ui=visual-novel"), "visual-novel");
  assert.equal(parseUiVariant("?ui=minimal&compare=1"), "minimal");
  assert.equal(parseUiVariant("?ui=unknown"), "current");
  assert.equal(parseUiVariant(""), "current");
});

test("비교 링크는 compare=1과 다른 query를 보존한다", () => {
  assert.deepEqual(createCompareLinks("?ui=current&compare=1"), [
    { id: "current", href: "?ui=current&compare=1" },
    { id: "visual-novel", href: "?ui=visual-novel&compare=1" },
    { id: "minimal", href: "?ui=minimal&compare=1" },
  ]);
});

test("current renderer는 기존 UI export를 그대로 제공한다", () => {
  const renderer = getUiRenderer("current");
  assert.equal(renderer.id, "current");
  for (const key of ["renderSetup", "renderScene", "renderChipResponse", "renderEnding", "renderRecovery", "renderVocabularyPanel"]) {
    assert.equal(typeof renderer[key], "function", key);
  }
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && node --test tests/ui-variants.test.mjs`

Expected: FAIL because `src/ui-variant.js` does not exist.

- [ ] **Step 3: current renderer와 query 파서를 구현한다**

```js
// src/ui-variants/current.js
import * as currentUi from "../ui.js";

export const currentRenderer = Object.freeze({
  id: "current",
  renderSetup: currentUi.renderSetup,
  renderScene: currentUi.renderScene,
  renderChipResponse: currentUi.renderChipResponse,
  renderEnding: currentUi.renderEnding,
  renderRecovery: currentUi.renderRecovery,
  renderVocabularyPanel: currentUi.renderVocabularyPanel,
});
```

```js
// src/ui-variant.js
import { currentRenderer } from "./ui-variants/current.js";

export const SUPPORTED_UI_IDS = Object.freeze(["current", "visual-novel", "minimal"]);

export function parseUiVariant(search = "") {
  const id = new URLSearchParams(search).get("ui");
  return SUPPORTED_UI_IDS.includes(id) ? id : "current";
}

export function createCompareLinks(search = "") {
  const params = new URLSearchParams(search);
  params.set("compare", "1");
  return SUPPORTED_UI_IDS.map(id => {
    const next = new URLSearchParams(params);
    next.set("ui", id);
    return { id, href: `?${next.toString()}` };
  });
}

export function getUiRenderer(id) {
  return id === "current" ? currentRenderer : currentRenderer;
}
```

Task 4와 Task 5가 renderer 레지스트리를 확장하기 전까지 `visual-novel`과 `minimal`은 안전하게 current renderer를 반환한다.

- [ ] **Step 4: current UI 전체 회귀를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: 기존 49개 테스트와 새 3개 테스트가 모두 PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/src/ui-variant.js alice-branching-mvp/src/ui-variants/current.js alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: add ui variant selection"
```

### Task 2: Minimal beat 엔진과 UI 전용 상태

**Files:**
- Create: `alice-branching-mvp/src/beat.js`
- Create: `alice-branching-mvp/tests/beat.test.mjs`

**Interfaces:**
- Produces: `splitSentences(text)`, `createBeats(text, options?)`, `normalizeMinimalState(value, sceneId, beatCount)`, `createMinimalStateStore(storage?)`.
- `createBeats(text, { maxSentences: 2, maxCharacters: 120 })` returns non-empty strings.
- `createMinimalStateStore` returns `{ load(sceneId, beatCount), save(state), clear() }` and defaults to guarded `globalThis.sessionStorage`.

- [ ] **Step 1: 문장 분리와 beat 상태 실패 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  createBeats,
  createMinimalStateStore,
  normalizeMinimalState,
  splitSentences,
} from "../src/beat.js";

test("한국어 종결 부호와 인용문을 보존해 문장을 나눈다", () => {
  assert.deepEqual(splitSentences('토끼가 외쳤어요. "늦었어!" 아래로 떨어졌어요.'), [
    "토끼가 외쳤어요.",
    '"늦었어!"',
    "아래로 떨어졌어요.",
  ]);
});

test("한 beat에 최대 두 문장을 묶고 120자 초과 문장은 단독으로 둔다", () => {
  assert.deepEqual(createBeats("첫 문장이에요. 두 번째예요. 세 번째예요."), [
    "첫 문장이에요. 두 번째예요.",
    "세 번째예요.",
  ]);
  const long = `${"아주 ".repeat(35)}긴 문장이에요.`;
  assert.deepEqual(createBeats(`${long} 다음 문장이에요.`), [long, "다음 문장이에요."]);
});

test("빈 본문은 빈 배열이고 분리 불가능한 본문은 한 beat다", () => {
  assert.deepEqual(createBeats("   "), []);
  assert.deepEqual(createBeats("아래로 아래로"), ["아래로 아래로"]);
});

test("장면이 바뀌거나 범위를 벗어난 beat 상태는 처음으로 돌아간다", () => {
  assert.deepEqual(normalizeMinimalState({ sceneId: "S00", beatIndex: 2 }, "S00", 4), { sceneId: "S00", beatIndex: 2 });
  assert.deepEqual(normalizeMinimalState({ sceneId: "S00", beatIndex: 2 }, "S01", 3), { sceneId: "S01", beatIndex: 0 });
  assert.deepEqual(normalizeMinimalState({ sceneId: "S01", beatIndex: 99 }, "S01", 3), { sceneId: "S01", beatIndex: 0 });
});

test("sessionStorage 오류 시 현재 탭 메모리로 복구한다", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const store = createMinimalStateStore(broken);
  store.save({ sceneId: "S00", beatIndex: 1 });
  assert.deepEqual(store.load("S00", 3), { sceneId: "S00", beatIndex: 1 });
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && node --test tests/beat.test.mjs`

Expected: FAIL because `src/beat.js` does not exist.

- [ ] **Step 3: 순수 beat 함수와 저장소를 구현한다**

문장 분리는 정규식 match 결과를 사용하되 인용부호를 다음 문장으로 흘리지 않는다. 저장 key는 정확히 `alice-branching-mvp/minimal-ui-v1`을 사용한다.

```js
const STORAGE_KEY = "alice-branching-mvp/minimal-ui-v1";

export function createBeats(text, { maxSentences = 2, maxCharacters = 120 } = {}) {
  const sentences = splitSentences(text);
  const beats = [];
  let current = [];
  for (const sentence of sentences) {
    const candidate = [...current, sentence].join(" ");
    if (current.length && (current.length >= maxSentences || candidate.length > maxCharacters)) {
      beats.push(current.join(" "));
      current = [sentence];
    } else {
      current.push(sentence);
    }
  }
  if (current.length) beats.push(current.join(" "));
  return beats;
}
```

`createMinimalStateStore`는 `session.js`의 저장소 폴백 패턴을 따르며 JSON parse 실패 시 현재 장면의 index 0을 반환한다.

- [ ] **Step 4: beat 테스트와 전체 회귀를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS with no warnings.

- [ ] **Step 5: 커밋한다**

```bash
git add alice-branching-mvp/src/beat.js alice-branching-mvp/tests/beat.test.mjs
git commit -m "feat: add minimal reading beat engine"
```

### Task 3: 비주얼노벨 래스터 자산

**Files:**
- Create: `alice-branching-mvp/assets/visual-novel/manifest.js`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/rabbit-hole.webp`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/tiny-garden.webp`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/cheshire-tree.webp`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/tea-party.webp`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/giant-land.webp`
- Create: `alice-branching-mvp/assets/visual-novel/backgrounds/giant-mushroom.webp`
- Create: `alice-branching-mvp/assets/visual-novel/characters/white-rabbit.png`
- Create: `alice-branching-mvp/assets/visual-novel/characters/cheshire-cat.png`
- Create: `alice-branching-mvp/assets/visual-novel/characters/mad-hatter.png`
- Create: `alice-branching-mvp/assets/visual-novel/characters/caterpillar.png`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Produces: `visualNovelAssets` with `backgrounds`, `characters`, `sceneBackgrounds`, `sceneCharacters`, `endingTones`.
- All URLs are relative browser URLs beginning `./assets/visual-novel/`.

- [ ] **Step 1: 자산 manifest 실패 테스트를 추가한다**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualNovelAssets } from "../assets/visual-novel/manifest.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("비주얼노벨 manifest의 모든 파일과 장면 매핑이 존재한다", () => {
  const urls = [
    ...Object.values(visualNovelAssets.backgrounds),
    ...Object.values(visualNovelAssets.characters),
  ];
  assert.equal(urls.length, 10);
  for (const url of urls) {
    assert.ok(fs.existsSync(path.join(root, url.replace(/^\.\//, ""))), url);
  }
  for (const id of ["S00", "S01", "A1", "A3", "S02", "B2", "E1", "E3", "E5"]) {
    assert.ok(visualNovelAssets.sceneBackgrounds[id], id);
  }
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && node --test tests/ui-variants.test.mjs`

Expected: FAIL because `assets/visual-novel/manifest.js` and image files do not exist.

- [ ] **Step 3: 배경 6종을 built-in image generation으로 생성한다**

각 배경은 별도 호출로 생성한다. 공통 prompt 계약:

```text
Use case: illustration-story
Asset type: visual novel full-bleed background, 16:10 landscape
Primary request: [scene-specific environment]
Style/medium: soft watercolor children's storybook illustration, painterly paper texture, clear silhouettes
Composition/framing: wide scene, important details in upper and side areas, lower center kept open for a character sprite and dialogue overlay
Lighting/mood: bright whimsical fantasy, safe and inviting for ages 7-9
Color palette: sky blue, leaf green, cherry red, warm yellow, and restrained violet accents
Constraints: environment only, no characters, no text, no logo, no watermark, no frightening imagery
```

장면별 environment:

- rabbit-hole: sunny garden with a mysterious round rabbit hole, pocket-watch motifs, falling-map hints
- tiny-garden: giant flowers, sparkling dew, tiny ornate door
- cheshire-tree: curved old tree, floating friendly crescent smile, purple-green accents
- tea-party: long outdoor table, mismatched teacups, playful clocks and hats
- giant-land: high viewpoint over winding river, white castle, colorful garden
- giant-mushroom: enormous mushroom grove with soft mist rings and broad mushroom cap

생성 결과를 workspace에 복사하고 WebP로 저장한다. 모든 파일은 브라우저에서 열 수 있고 가로세로 비율이 1.5~1.7 사이여야 한다.

- [ ] **Step 4: 캐릭터 4종을 chroma-key 방식으로 생성하고 투명 PNG로 변환한다**

각 캐릭터는 별도 built-in image generation 호출을 사용한다.

```text
Use case: illustration-story
Asset type: visual novel character sprite
Primary request: full-body [white rabbit | friendly Cheshire cat | whimsical mad hatter | calm blue caterpillar]
Style/medium: same soft watercolor children's storybook style as the backgrounds, clear silhouette
Composition/framing: single centered character, full body, front three-quarter view, generous padding
Lighting/mood: bright, expressive, friendly for ages 7-9
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background
Constraints: uniform background with no shadow, gradient, texture, floor, reflection, text, logo, or watermark; do not use #ff00ff in the subject
```

각 소스에 설치된 `remove_chroma_key.py`를 적용한다.

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input <generated-source> \
  --out alice-branching-mvp/assets/visual-novel/characters/<name>.png \
  --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

각 결과는 alpha channel, 투명 모서리, 20% 이상의 불투명 픽셀 비율을 확인한다.

- [ ] **Step 5: 정확한 manifest를 작성한다**

```js
export const visualNovelAssets = Object.freeze({
  backgrounds: {
    rabbitHole: "./assets/visual-novel/backgrounds/rabbit-hole.webp",
    tinyGarden: "./assets/visual-novel/backgrounds/tiny-garden.webp",
    cheshireTree: "./assets/visual-novel/backgrounds/cheshire-tree.webp",
    teaParty: "./assets/visual-novel/backgrounds/tea-party.webp",
    giantLand: "./assets/visual-novel/backgrounds/giant-land.webp",
    giantMushroom: "./assets/visual-novel/backgrounds/giant-mushroom.webp",
  },
  characters: {
    rabbit: "./assets/visual-novel/characters/white-rabbit.png",
    cat: "./assets/visual-novel/characters/cheshire-cat.png",
    hatter: "./assets/visual-novel/characters/mad-hatter.png",
    caterpillar: "./assets/visual-novel/characters/caterpillar.png",
  },
  sceneBackgrounds: {
    S00: "rabbitHole", S01: "tinyGarden", A1: "cheshireTree", A3: "teaParty",
    S02: "giantLand", B2: "giantMushroom", E1: "cheshireTree", E3: "teaParty", E5: "giantLand",
  },
  sceneCharacters: { S00: "rabbit", A1: "cat", A3: "hatter", B2: "caterpillar" },
  endingTones: { E1: "curiosity", E3: "joy", E5: "confidence" },
});
```

- [ ] **Step 6: 자산 테스트와 파일 검사를 통과시킨다**

Run: `cd alice-branching-mvp && node --test tests/ui-variants.test.mjs`

Expected: PASS; 10 files exist and all 9 scenes map to backgrounds.

- [ ] **Step 7: 커밋한다**

```bash
git add alice-branching-mvp/assets/visual-novel alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: add visual novel artwork"
```

### Task 4: 비주얼노벨 렌더러와 스타일

**Files:**
- Create: `alice-branching-mvp/src/ui-variants/visual-novel.js`
- Create: `alice-branching-mvp/styles/visual-novel.css`
- Modify: `alice-branching-mvp/src/ui-variant.js`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Consumes: `visualNovelAssets`, current renderer action contracts, normalized session and scene records.
- Produces: `visualNovelRenderer`, `getVisualNovelProgress(session, scene)`, `getVisualNovelSpeaker(scene)`.
- Progress returns integer `0..5`; speaker returns `{ id, label }`.

- [ ] **Step 1: 렌더링 계약 실패 테스트를 작성한다**

```js
test("비주얼노벨은 배경, 이름표, 캐릭터, 선택 카드와 5단계 트레일을 렌더링한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const html = renderer.renderScene(story.scenes.A1, session, "나무 위 웃음소리로 간다");
  assert.match(html, /data-ui="visual-novel"/);
  assert.match(html, /cheshire-tree\.webp/);
  assert.match(html, /cheshire-cat\.png/);
  assert.match(html, /체셔 고양이/);
  assert.match(html, /class="vn-choice/);
  assert.equal((html.match(/class="vn-trail-card/g) ?? []).length, 5);
  assert.match(html, /aria-label="진행 3\/5"/);
  assert.match(html, /data-action="choose-chip"/);
});

test("비주얼노벨 결말은 배경을 재사용하고 결말 톤과 5\/5를 표시한다", () => {
  const html = getUiRenderer("visual-novel").renderEnding(story.scenes.E1, endingSession);
  assert.match(html, /data-ending-tone="curiosity"/);
  assert.match(html, /aria-label="진행 5\/5"/);
  assert.match(html, /data-action="restart"/);
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && node --test tests/ui-variants.test.mjs`

Expected: FAIL because visual-novel renderer is not registered.

- [ ] **Step 3: 렌더러를 구현하고 레지스트리에 등록한다**

렌더러는 모든 문자열에 기존 `escapeHtml`과 `renderTemplate`을 사용한다. 이미지에는 빈 alt를 사용하고 무대 텍스트가 장면 의미를 모두 전달한다. 선택 action은 current UI와 동일하게 유지한다.

진행 규칙:

```js
const progressByScene = { S00: 1, S01: 2, S02: 2, A1: 3, A3: 3, B2: 3, E1: 5, E3: 5, E5: 5 };
```

칩 응답 화면은 4, setup은 0을 사용한다.

- [ ] **Step 4: 모바일·데스크톱 CSS를 작성한다**

핵심 규칙:

```css
[data-ui="visual-novel"] { min-height: 100svh; background: #17202a; color: #fff; }
.vn-stage { min-height: 100svh; display: grid; grid-template-rows: minmax(0, 58svh) minmax(0, 42svh); overflow: hidden; }
.vn-background { position: relative; background-size: cover; background-position: center; }
.vn-sprite { position: absolute; inset: auto 50% 0 auto; max-height: 88%; transform: translateX(50%); object-fit: contain; }
.vn-dialogue { position: relative; z-index: 2; padding: 18px clamp(16px, 4vw, 36px); background: rgba(20, 24, 31, .94); overflow-y: auto; }
.vn-choice { min-height: 48px; border-radius: 6px; }
.vn-trail { display: grid; grid-template-columns: repeat(5, 22px); gap: 8px; }
@media (min-width: 900px) {
  [data-ui="visual-novel"] { display: grid; place-items: center; padding: 20px; }
  .vn-stage { width: min(1280px, 100%); min-height: min(800px, calc(100svh - 40px)); aspect-ratio: 16 / 10; border: 1px solid rgba(255,255,255,.3); }
}
@media (hover: hover) { .vn-choice:hover { transform: translateY(-2px); } }
```

네임태그 색상은 spec의 캐릭터별 값으로 분리하고 ending tone은 overlay pseudo-element로만 처리한다.

- [ ] **Step 5: 렌더러 테스트와 전체 회귀를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add alice-branching-mvp/src/ui-variant.js alice-branching-mvp/src/ui-variants/visual-novel.js alice-branching-mvp/styles/visual-novel.css alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: add visual novel ui"
```

### Task 5: 미니멀 텍스트 렌더러와 스타일

**Files:**
- Create: `alice-branching-mvp/src/ui-variants/minimal-text.js`
- Create: `alice-branching-mvp/styles/minimal-text.css`
- Modify: `alice-branching-mvp/src/ui-variant.js`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Consumes: `createBeats`, current UI actions, scene/session data.
- Produces: `minimalTextRenderer`, `createMinimalView(scene, session, minimalState, mode?)`.
- `createMinimalView` returns `{ beats, beatIndex, text, isLastBeat, chapterLabel }`.
- Renderer methods accept an optional final options argument `{ minimalState }` without changing current renderer calls.

- [ ] **Step 1: 마지막 beat 노출 계약 실패 테스트를 작성한다**

```js
test("미니멀 UI는 중간 beat에서 다음 표시만 보여준다", () => {
  const renderer = getUiRenderer("minimal");
  const html = renderer.renderScene(story.scenes.S00, session, null, { minimalState: { sceneId: "S00", beatIndex: 0 } });
  assert.match(html, /data-ui="minimal"/);
  assert.match(html, /data-action="next-beat"/);
  assert.doesNotMatch(html, /data-action="choose"/);
  assert.doesNotMatch(html, /낱말 살펴보기/);
});

test("미니멀 UI는 마지막 beat에서만 낱말과 선택지를 보여준다", () => {
  const renderer = getUiRenderer("minimal");
  const view = renderer.createView(story.scenes.S00, session, { sceneId: "S00", beatIndex: 999 });
  const html = renderer.renderScene(story.scenes.S00, session, null, { minimalState: { sceneId: "S00", beatIndex: view.beats.length - 1 } });
  assert.doesNotMatch(html, /data-action="next-beat"/);
  assert.match(html, /data-action="vocab"/);
  assert.match(html, /data-action="choose"/);
});

test("미니멀 결말은 N\/3 텍스트와 마지막 beat 이후 다시 시작을 제공한다", () => {
  const html = getUiRenderer("minimal").renderEnding(story.scenes.E1, endingSession, { minimalState: { sceneId: "E1", beatIndex: 999 } });
  assert.match(html, /지금까지 만난 결말 1\/3/);
  assert.match(html, /data-action="restart"/);
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && node --test tests/ui-variants.test.mjs`

Expected: FAIL because minimal renderer is not registered.

- [ ] **Step 3: 미니멀 렌더러를 구현한다**

렌더러는 본문에 `renderTemplate`을 먼저 적용하고 `createBeats`를 호출한다. 전달된 index는 `0..beats.length - 1`로 clamp한다. 중간 beat에는 선택, 칩, 낱말, continue, restart를 렌더링하지 않는다.

화면 전체 진행 버튼은 다음과 같이 실제 `<button>`으로 만든다.

```html
<button class="minimal-next" type="button" data-action="next-beat" aria-label="다음 문장">⌄</button>
```

본문 선택이나 다른 버튼 클릭이 상위 screen 클릭으로 전파되지 않도록 앱 이벤트는 `data-action`이 없는 배경 클릭만 beat 진행으로 인정한다.

- [ ] **Step 4: 미니멀 CSS를 작성한다**

```css
[data-ui="minimal"] { min-height: 100svh; background: var(--minimal-bg, #fbf8f1); color: #2d2c29; }
.minimal-reader { width: min(68vw, 44rem); min-height: 100svh; margin: 0 auto; display: grid; align-content: center; gap: 24px; padding-block: 20svh; }
.minimal-chapter { font: 400 13px/1.4 Georgia, "Noto Serif KR", serif; color: #8a8780; }
.minimal-beat { font: 400 clamp(18px, 2.1vw, 20px)/1.95 Georgia, "Noto Serif KR", serif; letter-spacing: 0; text-align: center; }
.minimal-choice { min-height: 48px; border: 0; border-bottom: 1px solid currentColor; background: transparent; text-align: left; }
.minimal-next { width: 48px; height: 48px; justify-self: center; border: 0; background: transparent; }
@media (max-width: 600px) { .minimal-reader { width: 88%; padding-block: 18svh; } }
@media (prefers-reduced-motion: no-preference) { .minimal-next { animation: minimal-cue 1.8s ease-in-out infinite; } }
@media (prefers-reduced-motion: reduce) { .minimal-next { animation: none; } }
```

장면 색조는 `data-scene-id`별 CSS 변수만 미세하게 바꾸며 삽화나 아이콘을 넣지 않는다.

- [ ] **Step 5: 미니멀 테스트와 전체 회귀를 통과시킨다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add alice-branching-mvp/src/ui-variant.js alice-branching-mvp/src/ui-variants/minimal-text.js alice-branching-mvp/styles/minimal-text.css alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: add minimal text ui"
```

### Task 6: 앱 통합, 비교 메뉴, 실행 문서와 브라우저 검증

**Files:**
- Modify: `alice-branching-mvp/src/app.js`
- Modify: `alice-branching-mvp/index.html`
- Modify: `alice-branching-mvp/styles.css`
- Create: `alice-branching-mvp/styles/current.css`
- Modify: `alice-branching-mvp/package.json`
- Modify: `alice-branching-mvp/README.md`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Consumes: `parseUiVariant`, `getUiRenderer`, `createCompareLinks`, `createMinimalStateStore`.
- Produces: app runtime that dispatches existing actions plus `next-beat`; `window.__aliceStoryDebug.uiVariant()` and `minimalState()` return clones.

- [ ] **Step 1: 통합 계약 실패 테스트를 작성한다**

```js
test("HTML 셸은 세 변형 스타일을 연결한다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const href of ["./styles/current.css", "./styles/visual-novel.css", "./styles/minimal-text.css"]) {
    assert.match(html, new RegExp(`href="${href.replaceAll(".", "\\.")}"`));
  }
});

test("비교 서버는 8082를 사용한다", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts.serve, /8082/);
});

test("next-beat는 스토리 세션을 바꾸지 않고 UI 상태만 진행한다", () => {
  const before = createAppState({ session, sceneId: "S00", screen: "scene" });
  const after = advanceMinimalBeat(before, { sceneId: "S00", beatIndex: 0 }, 4);
  assert.strictEqual(after.appState.session, before.session);
  assert.deepEqual(after.minimalState, { sceneId: "S00", beatIndex: 1 });
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `cd alice-branching-mvp && npm test`

Expected: FAIL on missing styles and `advanceMinimalBeat`.

- [ ] **Step 3: 선택 renderer와 minimal 상태를 app에 연결한다**

앱 초기화:

```js
const uiVariant = parseUiVariant(window.location.search);
const ui = getUiRenderer(uiVariant);
const minimalStore = createMinimalStateStore();
```

모든 render 함수 호출은 `ui.render*`를 사용한다. minimal일 때만 현재 화면 id와 beat 수를 계산해 `{ minimalState }`를 마지막 options로 넘긴다.

`next-beat` 처리:

```js
if (action === "next-beat" && uiVariant === "minimal") {
  const next = advanceMinimalBeat(state, minimalState, currentBeatCount());
  minimalState = next.minimalState;
  minimalStore.save(minimalState);
  render();
  return;
}
```

스토리 장면이 바뀌면 `normalizeMinimalState`가 index 0을 반환하고 저장한다. restart 시 minimal store를 clear한다. UI query는 session에 쓰지 않는다.

- [ ] **Step 4: compare=1 메뉴와 스타일시트를 연결한다**

`?compare=1`일 때만 앱 바깥에 `<nav class="compare-menu" aria-label="UI 비교">`를 렌더링한다. 각 링크는 `createCompareLinks()` 결과를 사용하고 현재 UI에 `aria-current="page"`를 표시한다.

메뉴는 내부 도구이지만 모바일 본문을 가리지 않게 상단 고정 44px 높이로 두고, 메뉴가 있을 때 UI root에 `data-compare="true"`를 설정해 위쪽 여백을 확보한다.

- [ ] **Step 5: 실행 문서를 갱신한다**

README에 다음 주소와 판단 체크리스트를 명시한다.

```markdown
## UI 비교판

- 현재형: `http://127.0.0.1:8082/?ui=current&compare=1`
- 비주얼노벨: `http://127.0.0.1:8082/?ui=visual-novel&compare=1`
- 미니멀 텍스트: `http://127.0.0.1:8082/?ui=minimal&compare=1`

같은 세션과 현재 장면을 공유하므로 비교 메뉴로 UI만 바꿀 수 있습니다.

### 판단 기준

- 첫 화면에서 이야기와 선택 중 어디에 먼저 시선이 가는가
- 선택지가 자연스럽게 발견되는가
- 선택 결과가 가장 분명하게 느껴지는가
- 긴 글이 답답하거나 문장이 지나치게 잘게 끊기지 않는가
- 모바일 한 손 진행이 편한가
```

- [ ] **Step 6: 자동 검증을 실행한다**

Run: `cd alice-branching-mvp && npm test`

Expected: all tests PASS, no warnings.

Run: `cd alice-branching-mvp && node --check src/app.js && git diff --check`

Expected: both exit 0 with no output.

- [ ] **Step 7: 비교 서버를 시작한다**

Run: `cd alice-branching-mvp && npm run serve`

Expected: server available at `http://127.0.0.1:8082/`.

- [ ] **Step 8: 브라우저에서 세 UI를 검증한다**

390×844와 1280×800 각각에서 다음을 확인한다.

- `current`: 기준 브랜치 UI와 구조·동작이 같고 가로 overflow가 0
- `visual-novel`: 배경 6종과 스프라이트 4종이 non-zero natural size로 로드
- `visual-novel`: 대화창·선택·트레일이 겹치지 않고 모든 버튼 높이 44px 이상
- `minimal`: 첫 beat에 선택지가 없고 `next-beat`마다 index가 정확히 1 증가
- `minimal`: 마지막 beat에서만 낱말과 선택지가 표시
- 세 UI에서 S00, A1, A3, B2, E1을 같은 세션으로 전환 가능
- 칩 응답 화면에서 UI를 바꾸고 새로고침해도 응답이 유지
- 결말 수집 수와 `runs`가 UI 전환 전후 동일
- compare 메뉴가 `compare=1`에서만 표시
- reduced motion에서 minimal cue 애니메이션이 없음
- console error가 없음

- [ ] **Step 9: 최종 커밋한다**

```bash
git add alice-branching-mvp/src/app.js alice-branching-mvp/index.html alice-branching-mvp/styles.css alice-branching-mvp/styles/current.css alice-branching-mvp/package.json alice-branching-mvp/README.md alice-branching-mvp/tests
git commit -m "feat: integrate alice ui comparison mode"
```
