# Interaction Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 SVG 캐릭터와 사물을 클릭·터치·키보드로 선택하면 대상별 시각 애니메이션과 짧은 말풍선이 재생되는 독립 놀이터 프로토타입을 추가한다.

**Architecture:** 새 `interaction.html`이 기존 `characters.js`의 나비·몽이·공 defs를 재사용하고 꽃·구름만 페이지 고유 SVG로 정의한다. 모든 입력은 `activateInteraction(id)`로 모으며, 반응 레지스트리가 대상별 문구와 일반/reduced-motion GSAP 타임라인을 제공한다. 기존 Node 정적 테스트와 Playwright 브라우저 도우미로 DOM 계약, 재실행, 대상 전환, 키보드, 수명주기와 모바일 배치를 검증한다.

**Tech Stack:** 정적 HTML, SVG, JavaScript, GSAP 3.12.5, Node.js 내장 테스트 러너, Playwright

## Global Constraints

- 새 npm 의존성을 추가하지 않는다.
- 새 페이지 파일은 `interaction.html` 하나로 유지하며 기존 정적 프로토타입 패턴을 따른다.
- `characters.js`의 `def-nabi`, `def-mongi`, `def-ball`을 복제하지 않고 재사용한다.
- 상호작용 대상은 나비, 몽이, 공, 꽃, 구름의 다섯 개다.
- 오디오, 미션, 점수, 이야기 분기, 진동 피드백은 추가하지 않는다.
- 클릭, 터치, Enter, Space 입력은 모두 `activateInteraction(id)`를 사용한다.
- 동시에 활성화되는 반응 타임라인과 시각 말풍선은 각각 하나뿐이다.
- `prefers-reduced-motion: reduce`에서는 큰 이동, 점프, 회전, 반복 흔들림을 사용하지 않는다.
- 현재 디렉터리는 Git 저장소가 아니므로 계획의 커밋 단계는 실행하지 않는다.

---

### Task 1: 놀이터의 정적 무대와 진입 카드

**Files:**
- Create: `interaction.html`
- Modify: `index.html`
- Create: `tests/interaction-static.test.cjs`

**Interfaces:**
- Consumes: `characters.js`가 삽입하는 `#def-nabi`, `#def-mongi`, `#def-ball`
- Produces: `[data-interaction="nabi|mongi|ball|flower|cloud"]`
- Produces: `#speech-bubble`, `#speech-text`, `#interaction-status`
- Produces: `index.html`의 `a[href="interaction.html"]`

- [ ] **Step 1: 정적 DOM 계약을 확인하는 실패 테스트 작성**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("interaction playground exposes five accessible SVG targets", () => {
  const html = fs.readFileSync(path.join(root, "interaction.html"), "utf8");
  for (const id of ["nabi", "mongi", "ball", "flower", "cloud"]) {
    const target = new RegExp(
      `<g[^>]*data-interaction="${id}"[^>]*role="button"[^>]*tabindex="0"[^>]*aria-label="[^"]+"`,
      "s"
    );
    assert.match(html, target);
  }
  assert.match(html, /<script src="characters\.js"><\/script>/);
  assert.match(html, /id="interaction-status"[^>]*aria-live="polite"/);
});

test("index links the interaction playground as a supporting experiment", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /href="interaction\.html"/);
  assert.match(html, /인터랙션 놀이터/);
});
```

- [ ] **Step 2: 테스트를 실행해 새 페이지 부재로 실패 확인**

Run: `node --test tests/interaction-static.test.cjs`

Expected: FAIL with `ENOENT: no such file or directory, open 'interaction.html'`.

- [ ] **Step 3: 반응형 SVG 무대와 접근 가능한 다섯 대상 구현**

`interaction.html`은 기존 페이지의 Gaegu 폰트와 크림색 배경을 사용하고 다음 핵심 구조를 포함한다.

```html
<main>
  <header>
    <p class="eyebrow">SVG + GSAP 터치 실험</p>
    <h1>친구들을 눌러 보세요!</h1>
    <p>나비와 몽이, 주변 물건을 누르면 반응해요.</p>
  </header>

  <section class="stage-shell" aria-label="캐릭터와 사물 인터랙션 놀이터">
    <svg id="playground" viewBox="0 0 1200 720" role="group">
      <g id="cloud-art" data-interaction="cloud" role="button" tabindex="0"
         aria-label="둥실거리는 구름">
        <rect class="hit-area" x="755" y="48" width="270" height="145"/>
        <g class="reaction-art"><!-- page-local cloud paths --></g>
      </g>
      <g id="nabi-art" data-interaction="nabi" role="button" tabindex="0"
         aria-label="고양이 나비">
        <rect class="hit-area" x="140" y="300" width="270" height="330"/>
        <g class="reaction-art" transform="translate(270 590) scale(.82)">
          <use href="#def-nabi"/>
        </g>
      </g>
      <g id="mongi-art" data-interaction="mongi" role="button" tabindex="0"
         aria-label="강아지 몽이">
        <rect class="hit-area" x="430" y="300" width="280" height="330"/>
        <g class="reaction-art" transform="translate(565 590) scale(.82)">
          <use href="#def-mongi"/>
        </g>
      </g>
      <g id="ball-art" data-interaction="ball" role="button" tabindex="0"
         aria-label="통통 튀는 공">
        <rect class="hit-area" x="715" y="455" width="180" height="175"/>
        <g class="reaction-art" transform="translate(805 565) scale(.85)">
          <use href="#def-ball"/>
        </g>
      </g>
      <g id="flower-art" data-interaction="flower" role="button" tabindex="0"
         aria-label="간질간질 꽃">
        <rect class="hit-area" x="930" y="390" width="175" height="240"/>
        <g class="reaction-art"><!-- page-local flower paths --></g>
      </g>
      <g id="speech-bubble" aria-hidden="true" opacity="0">
        <path class="bubble-shape"/>
        <text id="speech-text" text-anchor="middle"></text>
      </g>
    </svg>
  </section>
  <p id="interaction-status" class="sr-only" aria-live="polite"
     aria-atomic="true"></p>
  <a class="back-link" href="index.html">← 실험 목록으로</a>
</main>
<script src="characters.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
```

CSS에서 `.hit-area { fill: transparent; pointer-events: all; }`를 적용하고, `[data-interaction]:hover .focus-ring` 및 `[data-interaction]:focus-visible .focus-ring`에 외곽선을 표시한다. `svg { width: 100%; height: auto; max-height: min(72vh, 720px); }`로 모바일에서도 viewBox 전체를 유지한다.

- [ ] **Step 4: index 보조 기술 실험 그룹에 카드 추가**

```html
<a class="card" href="interaction.html">
  <h2>인터랙션 놀이터</h2>
  <span class="badge c">클릭 · 터치 · 키보드</span>
  <p>나비와 몽이, 공과 꽃, 구름을 직접 눌러 대상별 SVG 반응과 짧은 말풍선을 테스트합니다.</p>
</a>
```

- [ ] **Step 5: 정적 테스트를 실행해 통과 확인**

Run: `node --test tests/interaction-static.test.cjs`

Expected: 2 tests pass, 0 fail.

---

### Task 2: 반응 레지스트리와 반복 재생

**Files:**
- Modify: `interaction.html`
- Create: `tests/interaction-browser.test.cjs`
- Modify: `tests/browser-helpers.cjs`

**Interfaces:**
- Consumes: Task 1의 `[data-interaction]`, `.reaction-art`, `#speech-bubble`, `#speech-text`, `#interaction-status`
- Produces: `activateInteraction(id: string): boolean`
- Produces: `window.__interactionDebug` with `activate(id)`, `activeId()`, `activationCount(id)`, `isReducedMotion()`, `isTimelineActive()`
- Produces: 반응 정의 `{ message, bubble: { x, y }, build(timeline, art, reduced) }`

- [ ] **Step 1: 클릭, 대상 전환, 반복 실행을 확인하는 실패 브라우저 테스트 작성**

```js
const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

test("clicking a target shows its message and replaces the previous response", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  await page.locator('[data-interaction="nabi"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "나랑 놀자!");
  assert.equal(await page.locator("#interaction-status").textContent(), "나비: 나랑 놀자!");

  await page.locator('[data-interaction="ball"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "통통!");
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.activeId()),
    "ball"
  );
  assert.deepEqual(errors.map(error => error.message), []);
});

test("reselecting a target restarts one reaction instead of accumulating timelines", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.evaluate(() => {
    window.__interactionDebug.activate("mongi");
    window.__interactionDebug.activate("mongi");
  });
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.activationCount("mongi")),
    2
  );
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.isTimelineActive()),
    true
  );
});
```

- [ ] **Step 2: 브라우저 테스트를 실행해 활성화 API 부재로 실패 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/interaction-browser.test.cjs`

Expected: FAIL because `window.__interactionDebug` and target reactions do not exist.

- [ ] **Step 3: 브라우저 fixture의 GSAP timeline 최소 계약 확장**

`tests/browser-helpers.cjs`의 fake tween/timeline에 구현에서 쓰는 메서드를 명시적으로 추가한다.

```js
function tween() {
  let paused = false;
  let killed = false;
  return {
    pause() { paused = true; return this; },
    play() { paused = false; killed = false; return this; },
    restart() { paused = false; killed = false; return this; },
    resume() { paused = false; return this; },
    paused() { return paused; },
    kill() { paused = true; killed = true; return this; },
    isActive() { return !paused && !killed; },
    progress() { return 0; },
    timeScale() { return this; },
  };
}

function timeline(options = {}) {
  const value = tween();
  value.to = () => value;
  value.fromTo = () => value;
  value.set = () => value;
  value.call = callback => { value.__completion = callback; return value; };
  value.eventCallback = (name, callback) => {
    if (name === "onComplete") value.__completion = callback;
    return value;
  };
  return value;
}
```

기존 helper 메서드와 ScrollTrigger fixture는 제거하지 않는다.

- [ ] **Step 4: 단일 활성 타임라인을 사용하는 반응 레지스트리 구현**

```js
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const bubble = document.getElementById("speech-bubble");
const speechText = document.getElementById("speech-text");
const status = document.getElementById("interaction-status");
let activeTimeline = null;
let activeId = null;
const activationCounts = new Map();

const reactions = {
  nabi: {
    name: "나비",
    message: "나랑 놀자!",
    bubble: { x: 270, y: 270 },
    build(tl, art, reduced) {
      if (reduced) return tl.to(art, { scale: 1.04, duration: .15, yoyo: true, repeat: 1 });
      return tl.to(art, { y: -42, duration: .22, ease: "power2.out" })
        .to(art, { y: 0, duration: .28, ease: "bounce.out" });
    }
  },
  mongi: {
    name: "몽이",
    message: "멍멍! 반가워!",
    bubble: { x: 565, y: 270 },
    build(tl, art, reduced) {
      const tail = art.querySelector('[data-p="tail"]');
      if (reduced) return tl.to(art, { opacity: .72, duration: .15, yoyo: true, repeat: 1 });
      return tl.to(tail || art, {
        rotation: 18, transformOrigin: "50% 90%", duration: .1,
        yoyo: true, repeat: 5
      });
    }
  },
  ball: {
    name: "공",
    message: "통통!",
    bubble: { x: 805, y: 410 },
    build(tl, art, reduced) {
      if (reduced) return tl.to(art, { scale: 1.08, duration: .15, yoyo: true, repeat: 1 });
      return tl.to(art, { y: -70, duration: .25, ease: "power2.out" })
        .to(art, { y: 0, duration: .3, ease: "bounce.out" });
    }
  },
  flower: {
    name: "꽃",
    message: "간질간질~",
    bubble: { x: 1000, y: 350 },
    build(tl, art, reduced) {
      if (reduced) return tl.to(art, { opacity: .7, duration: .15, yoyo: true, repeat: 1 });
      return tl.to(art, { rotation: -8, transformOrigin: "50% 100%", duration: .12 })
        .to(art, { rotation: 8, duration: .12, yoyo: true, repeat: 3 })
        .to(art, { rotation: 0, duration: .12 });
    }
  },
  cloud: {
    name: "구름",
    message: "둥실둥실",
    bubble: { x: 890, y: 210 },
    build(tl, art, reduced) {
      if (reduced) return tl.to(art, { scale: 1.03, duration: .15, yoyo: true, repeat: 1 });
      return tl.to(art, { x: 34, duration: .55, ease: "sine.inOut" })
        .to(art, { x: 0, duration: .55, ease: "sine.inOut" });
    }
  }
};

function activateInteraction(id) {
  const definition = reactions[id];
  const target = document.querySelector(`[data-interaction="${id}"]`);
  const art = target?.querySelector(".reaction-art");
  if (!definition || !art) {
    console.warn(`[interaction] Missing target: ${id}`);
    return false;
  }

  activeTimeline?.kill();
  gsap.set(document.querySelectorAll(".reaction-art"), { clearProps: "x,y,rotation,scale,opacity" });
  activeId = id;
  activationCounts.set(id, (activationCounts.get(id) || 0) + 1);
  speechText.textContent = definition.message;
  status.textContent = `${definition.name}: ${definition.message}`;
  gsap.set(bubble, { x: definition.bubble.x, y: definition.bubble.y, opacity: 1 });
  activeTimeline = definition.build(gsap.timeline(), art, motionQuery.matches);
  activeTimeline.eventCallback("onComplete", () => gsap.to(bubble, { opacity: 0, duration: .2 }));
  return true;
}
```

- [ ] **Step 5: pointer/click과 키보드 입력을 공통 활성화 함수에 연결**

```js
const stage = document.getElementById("playground");

stage.addEventListener("click", event => {
  const target = event.target.closest("[data-interaction]");
  if (target) activateInteraction(target.dataset.interaction);
});

stage.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest("[data-interaction]");
  if (!target) return;
  event.preventDefault();
  activateInteraction(target.dataset.interaction);
});

window.__interactionDebug = {
  activate: activateInteraction,
  activeId: () => activeId,
  activationCount: id => activationCounts.get(id) || 0,
  isReducedMotion: () => motionQuery.matches,
  isTimelineActive: () => Boolean(activeTimeline?.isActive?.())
};
```

- [ ] **Step 6: 브라우저 테스트를 실행해 클릭, 전환, 반복 실행 통과 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/interaction-browser.test.cjs`

Expected: 2 tests pass, 0 fail.

---

### Task 3: 키보드, reduced-motion, 문서 수명주기 및 모바일 검증

**Files:**
- Modify: `interaction.html`
- Modify: `tests/interaction-browser.test.cjs`
- Modify: `tests/prototype-pages.test.cjs`

**Interfaces:**
- Consumes: Task 2의 `activateInteraction`, `motionQuery`, `activeTimeline`, `window.__interactionDebug`
- Produces: `visibilitychange` 정지 정책
- Produces: `motionQuery` change 시 현재 반응 정리 정책

- [ ] **Step 1: 키보드와 reduced-motion을 확인하는 실패 테스트 추가**

```js
test("Enter and Space activate the focused SVG target", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-interaction="flower"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#speech-text").textContent(), "간질간질~");

  await page.locator('[data-interaction="cloud"]').focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#speech-text").textContent(), "둥실둥실");
});

test("reduced motion keeps messages while using the reduced branch", async t => {
  const opened = await openLocalPage("interaction.html", { reducedMotion: "reduce" });
  t.after(() => opened.close());
  const { page } = opened;
  await page.locator('[data-interaction="nabi"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "나랑 놀자!");
  assert.equal(await page.evaluate(() => window.__interactionDebug.isReducedMotion()), true);
});
```

- [ ] **Step 2: 문서 숨김에서 활성 타임라인이 정지되는 실패 테스트 추가**

```js
test("visibility change kills the active reaction instead of resuming it", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.evaluate(() => {
    window.__interactionDebug.activate("ball");
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.isTimelineActive()),
    false
  );
});
```

- [ ] **Step 3: visibility와 motion preference 변경 시 활성 반응 정리 구현**

```js
function stopActiveReaction() {
  activeTimeline?.kill();
  activeTimeline = null;
  gsap.set(document.querySelectorAll(".reaction-art"), {
    clearProps: "x,y,rotation,scale,opacity"
  });
  gsap.set(bubble, { opacity: 0 });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActiveReaction();
});

motionQuery.addEventListener("change", stopActiveReaction);
```

`window.__interactionDebug.isTimelineActive()`는 `activeTimeline === null`일 때 `false`를 반환하게 유지한다.

- [ ] **Step 4: 모바일 viewport에서 대상이 무대 안에 유지되는 테스트 추가**

```js
test("all five targets stay inside the stage at a mobile viewport", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 390, height: 844 });
  const stageBox = await page.locator("#playground").boundingBox();
  assert.ok(stageBox);
  for (const id of ["nabi", "mongi", "ball", "flower", "cloud"]) {
    const box = await page.locator(`[data-interaction="${id}"]`).boundingBox();
    assert.ok(box);
    assert.ok(box.x >= stageBox.x && box.y >= stageBox.y);
    assert.ok(box.x + box.width <= stageBox.x + stageBox.width + 1);
    assert.ok(box.y + box.height <= stageBox.y + stageBox.height + 1);
  }
});
```

- [ ] **Step 5: 공용 페이지 오류 회귀 테스트에 놀이터 추가**

`tests/prototype-pages.test.cjs`의 초기화 오류 목록을 다음처럼 확장한다.

```js
for (const file of [
  "webtoon.html",
  "player.html",
  "swap-test.html",
  "kid-style.html",
  "interaction.html"
]) {
  // 기존 JavaScript error assertion 유지
}
```

- [ ] **Step 6: 놀이터 테스트 전체 실행**

Run: `node --test tests/interaction-static.test.cjs`

Expected: 2 tests pass, 0 fail.

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/interaction-browser.test.cjs`

Expected: 6 tests pass, 0 fail.

- [ ] **Step 7: 전체 회귀 테스트 실행**

Run: `node --test tests/prototype-runtime.test.cjs`

Expected: 3 tests pass, 0 fail.

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/prototype-pages.test.cjs tests/webtoon-browser.test.cjs`

Expected: all existing prototype page and webtoon browser tests pass, 0 fail.

- [ ] **Step 8: 브라우저 수동 검증**

로컬 정적 서버를 실행한다.

Run: `python3 -m http.server 8000 --bind 127.0.0.1`

Chrome에서 `http://127.0.0.1:8000/interaction.html`을 열어 다음을 확인한다.

- 다섯 대상의 그림과 hit area가 어긋나지 않는다.
- 각 대상 반응이 처음부터 다시 재생된다.
- 빠르게 대상을 바꿔도 이전 말풍선이나 transform이 남지 않는다.
- Tab 포커스 외곽선이 배경과 충분히 구분된다.
- 390px 너비에서 SVG가 잘리지 않고 모든 대상을 누를 수 있다.
- DevTools reduced-motion 에뮬레이션에서 큰 이동 없이 강조와 말풍선이 유지된다.
- 콘솔에 GSAP target, 누락된 defs 또는 JavaScript 오류가 없다.
