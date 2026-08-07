# SVG Prototype Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SVG 프로토타입들이 동일한 이야기 자산과 일관된 모션 수명주기를 사용하게 하고, 기술 비교 목적과 아트 납품 계약을 명확히 한다.

**Architecture:** `characters.js`를 이야기 SVG defs의 단일 원본으로 유지하고, 새 `prototype-runtime.js`가 boil 타이머와 무한 트윈의 실행 정책을 제공한다. 각 HTML은 이 공용 런타임을 사용하되, `webtoon.html`만 씬별 loop controller를 만들어 ScrollTrigger 진입/이탈과 연결한다.

**Tech Stack:** 정적 HTML, SVG, JavaScript, GSAP 3.12.5, ScrollTrigger, Node.js 내장 테스트 러너

## Global Constraints

- 새 npm 의존성을 추가하지 않는다.
- boil seed 변경 간격은 200ms다.
- `prefers-reduced-motion: reduce`에서는 boil과 장식용 `repeat: -1` 모션을 실행하지 않는다.
- 스크롤 타임라인과 자막은 reduced-motion 환경에서도 유지한다.
- `kid-style.html`의 독립 스타일과 `svg-gsap.html`의 초기 구현은 공용 defs로 교체하지 않는다.
- Lottie 씬 확장, CDN 자체 호스팅/SRI, 실기기 FPS 자동 측정은 범위에서 제외한다.
- 현재 디렉터리는 Git 저장소가 아니므로 계획의 커밋 단계는 실행하지 않는다.

---

### Task 1: 공용 런타임의 타이머 및 loop controller

**Files:**
- Create: `prototype-runtime.js`
- Create: `tests/prototype-runtime.test.cjs`

**Interfaces:**
- Produces: `PrototypeRuntime.createBoilController({ nodes, intervalMs, documentRef, motionQuery, setIntervalFn, clearIntervalFn })`
- Produces: `PrototypeRuntime.createLoopController({ reducedMotion })`
- Produces: boil controller methods `start()`, `stop()`, `sync()`, `destroy()`, `isRunning()`
- Produces: loop controller methods `add(...tweens)`, `enter()`, `leave()`, `syncMotion(reduce)`, `items()`

- [ ] **Step 1: 타이머가 200ms로 시작하고 숨김/reduced-motion에서 정지하는 실패 테스트 작성**

```js
test("boil runs at 200ms only while visible and motion is allowed", () => {
  const env = makeEnvironment();
  const controller = runtime.createBoilController(env.options);
  controller.start();
  assert.equal(env.intervalDelay, 200);
  env.documentRef.hidden = true;
  env.documentRef.dispatch("visibilitychange");
  assert.equal(controller.isRunning(), false);
  env.documentRef.hidden = false;
  env.motionQuery.matches = true;
  env.motionQuery.dispatch();
  assert.equal(controller.isRunning(), false);
});
```

- [ ] **Step 2: 테스트를 실행해 API 부재로 실패하는지 확인**

Run: `node --test tests/prototype-runtime.test.cjs`

Expected: FAIL because `prototype-runtime.js` or `createBoilController` does not exist.

- [ ] **Step 3: loop controller가 진입/이탈/reduced-motion에 따라 트윈을 제어하는 실패 테스트 작성**

```js
test("loop controller resumes only inside the scene when motion is allowed", () => {
  const tween = fakeTween();
  const loops = runtime.createLoopController({ reducedMotion: false });
  loops.add(tween);
  assert.equal(tween.paused, true);
  loops.enter();
  assert.equal(tween.paused, false);
  loops.leave();
  assert.equal(tween.paused, true);
  loops.enter();
  loops.syncMotion(true);
  assert.equal(tween.paused, true);
});
```

- [ ] **Step 4: 최소 공용 런타임 구현**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PrototypeRuntime = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function createBoilController(options) {
    // visibilitychange와 MediaQueryList change를 구독하고 200ms interval을 관리한다.
  }
  function createLoopController({ reducedMotion = false } = {}) {
    // add 즉시 pause하고, active && !reducedMotion일 때만 resume한다.
  }
  return { createBoilController, createLoopController };
});
```

- [ ] **Step 5: 테스트를 실행해 통과 확인**

Run: `node --test tests/prototype-runtime.test.cjs`

Expected: 2 tests pass, 0 fail.

---

### Task 2: webtoon defs 단일화

**Files:**
- Modify: `webtoon.html:99-740`
- Test: `tests/webtoon-browser.test.cjs`

**Interfaces:**
- Consumes: `characters.js`가 삽입하는 `def-nabi`, `def-mongi`, `def-owl`, `def-ball`, `def-half-l`, `def-half-r`, `def-star`, `def-room`, `def-yard`, `def-dusk`
- Produces: 인라인 공용 defs 없이 같은 장면을 조립하는 `webtoon.html`

- [ ] **Step 1: 실제 브라우저에서 공용 defs와 씬 복제를 확인하는 실패 테스트 작성**

```js
test("webtoon loads shared defs and clones the current room background", async () => {
  const page = await openLocalPage("webtoon.html");
  await page.waitForSelector("#def-room");
  assert.equal(await page.locator("#def-nabi").count(), 1);
  assert.equal(await page.locator("#def-mongi").count(), 1);
  assert.ok(await page.locator("#sc1 [data-p=truck]").count());
  assert.ok(await page.locator("#l1 [data-p=tail]").count());
});
```

테스트 서버는 Node `http` 모듈로 작업 디렉터리의 파일만 제공하고, 브라우저는 번들된 Playwright를 사용한다. CDN 로딩 실패가 테스트를 불안정하게 만들지 않도록 GSAP 요청은 브라우저 컨텍스트에서 최소 호환 fixture로 응답하되, defs 삽입과 실제 DOM 복제 코드는 원본을 실행한다.

- [ ] **Step 2: 테스트를 실행해 `webtoon.html`이 아직 공용 defs를 로드하지 않아 실패하는지 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/webtoon-browser.test.cjs`

Expected: FAIL because the webtoon does not request `characters.js`, or the truck/background differs from the shared definition.

- [ ] **Step 3: 인라인 defs 블록을 제거하고 공용 스크립트 로드**

```html
<body>
<script src="characters.js"></script>
```

`<svg class="svg-defs">...</svg>` 전체를 제거한다. 씬별 고유 마크업과 `.yard` 배경 host는 유지하고 `def-yard` 복제 로직을 계속 사용한다. 씬 1의 공용 방 배경도 `def-room`에서 복제하도록 `.room` host와 초기화 코드를 맞춘다.

- [ ] **Step 4: 브라우저 테스트를 실행해 통과 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/webtoon-browser.test.cjs`

Expected: shared defs and cloned assets assertions pass.

---

### Task 3: webtoon 오프스크린 무한 트윈 정지

**Files:**
- Modify: `webtoon.html:67-68`
- Modify: `webtoon.html:741-1089`
- Test: `tests/webtoon-browser.test.cjs`

**Interfaces:**
- Consumes: `PrototypeRuntime.createLoopController`
- Produces: `sceneTL(sel, len, loops)` with ScrollTrigger `onEnter`, `onEnterBack`, `onLeave`, `onLeaveBack`
- Produces: 표지용 `coverLoops`

- [ ] **Step 1: 초기 화면 밖 씬의 트윈이 정지되고 진입 씬만 재개되는 실패 테스트 작성**

```js
test("only the entered webtoon scene resumes its decorative loops", async () => {
  const page = await openLocalPage("webtoon.html");
  const state = await page.evaluate(() =>
    window.__prototypeDebug.sceneLoops.map(group =>
      group.items().map(tween => tween.paused())
    )
  );
  assert.ok(state[1].every(Boolean));
  await page.evaluate(() => window.__prototypeDebug.enterScene(1));
  const entered = await page.evaluate(() =>
    window.__prototypeDebug.sceneLoops[1].items().map(tween => tween.paused())
  );
  assert.ok(entered.every(value => value === false));
});
```

디버그 객체는 테스트와 수동 성능 확인에 필요한 읽기 전용 controller 참조와 ScrollTrigger 콜백 호출 도우미만 노출한다. 별도의 테스트 전용 production 메서드는 추가하지 않는다.

- [ ] **Step 2: 테스트를 실행해 모든 트윈이 즉시 재생되어 실패하는지 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/webtoon-browser.test.cjs`

Expected: FAIL because scene loops are not grouped or paused.

- [ ] **Step 3: 씬별 loop controller와 ScrollTrigger 콜백 구현**

```js
function sceneTL(sel, len, loops) {
  return gsap.timeline({
    scrollTrigger: {
      trigger: sel,
      start: "top top",
      end: "+=" + len,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      onEnter: () => loops.enter(),
      onEnterBack: () => loops.enter(),
      onLeave: () => loops.leave(),
      onLeaveBack: () => loops.leave(),
    },
    defaults: { ease: "none" },
  });
}
```

각 씬 블록 시작에 controller를 만들고 모든 `repeat: -1` 트윈을 `loops.add(...)`로 등록한다. 표지는 IntersectionObserver로 진입/이탈을 controller에 전달한다. motion query 변경은 모든 controller의 `syncMotion(event.matches)`로 전달한다.

- [ ] **Step 4: `content-visibility`를 보수적으로 적용하고 pin 동작 확인**

```css
.scene { content-visibility: auto; contain-intrinsic-size: 100vh; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

Playwright에서 각 씬의 ScrollTrigger pin spacer 높이가 0이 아니고 마지막 씬까지 스크롤 가능한지 확인한다. 실패하면 `content-visibility` 두 속성만 제거하고 loop 정지는 유지한다.

- [ ] **Step 5: 테스트를 실행해 통과 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/webtoon-browser.test.cjs`

Expected: defs, scene loop lifecycle, and page-height tests all pass.

---

### Task 4: 모든 활성 프로토타입의 boil/reduced-motion 및 자막 접근성

**Files:**
- Modify: `webtoon.html`
- Modify: `player.html:132-170`
- Modify: `swap-test.html:100-112`
- Modify: `kid-style.html:279-297`
- Test: `tests/prototype-pages.test.cjs`

**Interfaces:**
- Consumes: `PrototypeRuntime.createBoilController`
- Consumes: `PrototypeRuntime.createLoopController`
- Produces: 각 페이지의 `boilController`

- [ ] **Step 1: 페이지별 실제 런타임 상태를 확인하는 실패 테스트 작성**

```js
for (const file of ["webtoon.html", "player.html", "swap-test.html", "kid-style.html"]) {
  test(`${file} stops boil for reduced motion`, async () => {
    const page = await openLocalPage(file, { reducedMotion: "reduce" });
    assert.equal(await page.evaluate(() => window.__prototypeDebug.boil.isRunning()), false);
  });
}

test("player exposes caption changes as a polite live region", async () => {
  const page = await openLocalPage("player.html");
  const caption = page.locator("#caption");
  assert.equal(await caption.getAttribute("aria-live"), "polite");
  assert.equal(await caption.getAttribute("aria-atomic"), "true");
});
```

- [ ] **Step 2: 테스트를 실행해 130ms 독립 타이머와 live-region 부재로 실패 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/prototype-pages.test.cjs`

Expected: FAIL for pages without the shared controller and for missing caption attributes.

- [ ] **Step 3: 공용 런타임과 접근성 속성 적용**

각 대상 페이지는 GSAP 실행 스크립트 전에 다음을 로드한다.

```html
<script src="prototype-runtime.js"></script>
```

각 독립 `setInterval(..., 130)` 블록을 다음 형태로 교체한다.

```js
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const boilController = PrototypeRuntime.createBoilController({
  nodes: document.querySelectorAll("feTurbulence.boil"),
  intervalMs: 200,
  documentRef: document,
  motionQuery,
});
boilController.start();
```

`player.html`은 다음 마크업을 사용한다.

```html
<div id="caption" aria-live="polite" aria-atomic="true"></div>
```

`player.html`, `swap-test.html`, `kid-style.html`의 장식용 무한 트윈도 loop controller에 등록하고 reduced motion이면 정지한다.

- [ ] **Step 4: 페이지 테스트를 실행해 통과 확인**

Run: `NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/prototype-pages.test.cjs`

Expected: all four pages report stopped boil under reduced motion and player caption attributes pass.

---

### Task 5: 아트 제작 계약과 실험 인덱스

**Files:**
- Create: `ART-SPEC.md`
- Modify: `index.html:120-151`

**Interfaces:**
- Produces: 외부 아트 납품자가 사용할 SVG 파츠 체크리스트
- Produces: 현재 비교 대상, 보조 실험, 초기 아카이브로 분류된 인덱스

- [ ] **Step 1: `ART-SPEC.md` 작성**

문서는 필수 그룹 이름(`body`, `head`, `earL`, `earR`, `tail`, `eyes`, `mouth`, `bell`), `(0,0)` 발밑 원점, 관절을 가로지르는 통짜 path 금지, 연결부 겹침, 표정용 `data-face`, 필터/마스크/래스터 공개, 텍스트 처리 규칙과 수동 납품 체크리스트를 포함한다. `new_char.svg`는 고개 회전 불가와 꼬리 누락의 실패 사례로 설명한다.

- [ ] **Step 2: index 카드 역할 재분류**

```html
<p class="sub">현재 비교 대상 — 동일한 SVG 리그, 다른 재생 방식</p>
<!-- webtoon.html, player.html -->
<p class="sub">보조 기술 실험</p>
<!-- lottie.html, kid-style.html, swap-test.html -->
<p class="sub">초기 아카이브</p>
<!-- svg-gsap.html -->
```

Lottie 카드에는 “단일 씬·5개 레이어의 저복잡도 프로토타입”이라고 쓰고, swap-test 카드에는 “외부 SVG의 파츠 분리 요구 검증”이라고 쓴다. 기존 파일 링크는 모두 유지한다.

- [ ] **Step 3: 링크 무결성 검사**

Run:

```bash
node -e 'const fs=require("fs"); const h=fs.readFileSync("index.html","utf8"); for(const x of h.matchAll(/href="([^"]+\\.html)"/g)){if(!fs.existsSync(x[1]))throw Error(x[1])}'
```

Expected: exit 0 with no missing local HTML links.

---

### Task 6: 전체 회귀 및 브라우저 검증

**Files:**
- Modify only if a regression is found: files from Tasks 1-5

**Interfaces:**
- Consumes: all prior task outputs
- Produces: verified prototype comparison baseline

- [ ] **Step 1: 전체 자동 테스트 실행**

Run:

```bash
NODE_PATH=/Users/choijimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node --test tests/*.test.cjs
```

Expected: all tests pass, 0 fail.

- [ ] **Step 2: HTML/JavaScript 구문 및 링크 검사**

Run:

```bash
node --check characters.js
node --check prototype-runtime.js
node -e 'const fs=require("fs"); for(const f of fs.readdirSync(".").filter(x=>x.endsWith(".html"))){const h=fs.readFileSync(f,"utf8"); for(const x of h.matchAll(/(?:src|href)="([^"]+)"/g)){const p=x[1]; if(!/^https?:|^data:|^#/.test(p)&&!fs.existsSync(p)) throw Error(`${f}: ${p}`)}}'
```

Expected: JavaScript parses and every local asset reference exists.

- [ ] **Step 3: Playwright에서 핵심 사용자 흐름 확인**

검증 항목:

- `webtoon.html`을 첫 장면부터 마지막 장면까지 스크롤하고 다시 위로 이동해 콘솔 오류가 없는지 확인한다.
- 화면 밖 scene controller의 모든 트윈은 paused이고 현재 scene만 resumed인지 확인한다.
- `player.html`의 다음/이전/일시정지 버튼을 누르고 프레임·자막이 갱신되는지 확인한다.
- reduced-motion 컨텍스트에서 boil과 무한 트윈이 멈추지만 웹툰 스크롤과 자막은 유지되는지 확인한다.
- `swap-test.html`의 캐릭터·필터·목걸이 토글과 다시 재생 버튼이 동작하는지 확인한다.

- [ ] **Step 4: 변경 파일과 범위 재확인**

Run: `find . -maxdepth 3 -type f -newer docs/superpowers/specs/2026-07-30-svg-prototype-comparison-design.md -print`

Expected: 설계·계획·테스트·공용 런타임·대상 HTML·`ART-SPEC.md`만 표시되고 Lottie JSON과 SVG 원본은 변경되지 않는다.
