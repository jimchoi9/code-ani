# PNG Character Rig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 투명 PNG 파츠를 조립해 관절 동작, 표정·방향 전환과 “안녕하세요!” 립싱크를 시험하는 독립 프로토타입을 추가한다.

**Architecture:** `png-rig.html`이 무대와 HTML 컨트롤을 제공하고 `png-rig.js`가 파츠 경로, 관절 좌표, UI 상태와 GSAP 타임라인을 관리한다. 배치 래퍼와 모션 래퍼를 분리해 기본 조립 좌표를 보존하며, 실제 자산은 `output/character/`에서 직접 읽는다.

**Tech Stack:** 정적 HTML, CSS, JavaScript, transparent PNG, GSAP 3.12.5, Node.js 내장 테스트 러너, Playwright

## Global Constraints

- 기존 PNG와 `output/character/manifest.json`을 수정하지 않는다.
- 새 npm 의존성을 추가하지 않는다.
- 정면 리그는 머리, 몸통, 좌우 팔, 묶음 다리와 묶음 발을 사용한다.
- 표정은 기본, 행복, 놀람, 화남, 슬픔의 머리 전체 PNG를 교체한다.
- 방향은 정면, 왼쪽 3/4, 오른쪽 3/4, 측면 완성 포즈 PNG를 교체한다.
- 안녕하세요 동작은 팔, 머리, 말풍선과 `closed → a → o → u → smile → closed` 입 순환을 함께 재생한다.
- 동작 재실행과 전환 시 이전 GSAP 타임라인과 입 타이머를 정리한다.
- reduced-motion에서도 표정, 방향, 말풍선과 입 교체는 유지한다.
- 현재 디렉터리는 Git 저장소가 아니므로 commit 단계는 생략한다.

---

### Task 1: 정적 리그 무대와 컨트롤

**Files:**
- Create: `png-rig.html`
- Create: `png-rig.js`
- Modify: `index.html`
- Create: `tests/png-rig-static.test.cjs`

**Interfaces:**
- Produces: `#png-rig`, `#rig-character`, `#pose-character`, `#speech-bubble`, `#rig-status`
- Produces: `[data-action]`, `[data-expression]`, `[data-direction]`, `#toggle-joints`
- Produces: `window.PngRigConfig` with asset paths and joint positions

- [ ] 브라우저 DOM에서 무대, 접근 가능한 컨트롤, 필수 PNG 경로와 index 카드를 확인하는 실패 테스트를 작성한다.
- [ ] `node --test`로 `png-rig.html` 부재 실패를 확인한다.
- [ ] 반응형 무대, 레이어드 정면 캐릭터, 완성 포즈 이미지, 말풍선, 관절 표시와 컨트롤을 구현한다.
- [ ] `index.html` 보조 기술 실험에 “PNG 파츠 리깅” 카드를 추가한다.
- [ ] 정적 브라우저 테스트 통과를 확인한다.

정면 레이어는 다음 계약을 사용한다.

```html
<div id="rig-character">
  <div class="part lower-body"><img src="output/character/leg.png" alt=""></div>
  <div class="part feet"><img src="output/character/foot.png" alt=""></div>
  <div class="part torso"><img src="output/character/torso.png" alt=""></div>
  <div class="part arm arm-left"><div class="motion"><img src="output/character/left-arm.png" alt=""></div></div>
  <div class="part arm arm-right"><div class="motion"><img src="output/character/right-arm.png" alt=""></div></div>
  <div class="part head"><div class="motion"><img id="expression-image" alt=""></div></div>
  <div id="mouth-mask"><img id="mouth-image" alt=""></div>
</div>
```

---

### Task 2: 표정·방향·관절 동작 상태

**Files:**
- Modify: `png-rig.js`
- Create: `tests/png-rig-browser.test.cjs`
- Modify: `tests/browser-helpers.cjs`

**Interfaces:**
- Produces: `setExpression(id: string): boolean`
- Produces: `setDirection(id: string): boolean`
- Produces: `playAction(id: string): boolean`
- Produces: `stopCurrentAction(): void`
- Produces: `window.__pngRigDebug` with `expression()`, `direction()`, `activeAction()`, `actionCount(id)`, `mouthFrame()`, `isReducedMotion()`

- [ ] 표정 이미지/aria-pressed 변경, 방향 완성 포즈 전환, 관절 토글과 기본 동작 재실행을 확인하는 실패 브라우저 테스트를 작성한다.
- [ ] 테스트를 실행해 `window.__pngRigDebug` 부재 실패를 확인한다.
- [ ] 표정과 방향 상태 전환을 구현하고 정면 외 방향에서 레이어드 리그를 숨긴다.
- [ ] 머리 끄덕이기, 팔 흔들기, 점프하기 타임라인과 단일 활성 동작 정책을 구현한다.
- [ ] 관절 표시 토글과 polite 상태 메시지를 구현한다.
- [ ] Task 2 브라우저 테스트 통과를 확인한다.

핵심 상태는 다음 형태를 사용한다.

```js
const state = {
  expression: "neutral",
  direction: "front",
  activeAction: null,
  timeline: null,
  mouthTimer: null,
  actionCounts: new Map()
};

function stopCurrentAction() {
  state.timeline?.kill();
  state.timeline = null;
  clearTimeout(state.mouthTimer);
  state.mouthTimer = null;
  resetMotionLayers();
}
```

---

### Task 3: 안녕하세요 립싱크, 수명주기와 회귀 검증

**Files:**
- Modify: `png-rig.js`
- Modify: `tests/png-rig-browser.test.cjs`
- Modify: `tests/prototype-pages.test.cjs`

**Interfaces:**
- Consumes: Task 2의 `stopCurrentAction`, state와 모션 레이어
- Produces: `playHello(): boolean`
- Produces: `playMouthSequence(frames: string[], intervalMs: number): void`

- [ ] 안녕하세요 말풍선, 입 프레임 진행, 반복 실행 정리, reduced-motion과 visibility 중단 실패 테스트를 추가한다.
- [ ] 테스트를 실행해 hello/lifecycle 동작 부재 실패를 확인한다.
- [ ] `closed, a, o, u, smile, closed` 입 시퀀스와 팔·머리 타임라인을 구현한다.
- [ ] reduced-motion 분기와 문서 숨김 정지를 구현한다.
- [ ] `prototype-pages.test.cjs`의 JavaScript 오류 회귀 목록에 `png-rig.html`을 추가한다.
- [ ] 390px 모바일 viewport에서 무대와 버튼이 화면 안에 있는지 검증한다.
- [ ] PNG 리그 전용 테스트와 기존 전체 회귀 테스트를 실행한다.
- [ ] 실제 브라우저에서 관절 연결부, 표정·방향, 안녕하세요 동작과 모바일 화면을 시각 검증한다.

입 시퀀스는 다음 자산을 사용한다.

```js
const mouthFrames = {
  closed: "output/character/mouth-closed.png",
  a: "output/character/mouth-a.png",
  o: "output/character/mouth-o.png",
  u: "output/character/mouth-u.png",
  smile: "output/character/mouth-smile.png"
};
```
