# Parallax Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 SVG 캐릭터를 활용한 스크롤·포인터 반응형 패럴랙스 기술 실험 페이지를 추가한다.

**Architecture:** `parallax.html`이 깊이 메타데이터가 있는 SVG 레이어를 제공하고, `parallax.js`의 단일 컨트롤러가 스크롤 진행도와 정규화된 포인터 좌표를 합쳐 각 레이어의 transform을 계산한다. 모션 감소, 비활성 문서, 효과 토글은 같은 컨트롤러에서 프레임 루프와 transform 상태를 관리한다.

**Tech Stack:** HTML5, SVG, CSS, JavaScript, Node test runner, Playwright

## Global Constraints

- 외부 애니메이션 라이브러리를 추가하지 않는다.
- 기존 `characters.js`의 `def-nabi`와 `def-mongi`를 재사용한다.
- `prefers-reduced-motion: reduce`에서는 정적인 장면을 제공한다.
- 390px 모바일 화면에서 가로 스크롤이 발생하지 않아야 한다.

---

### Task 1: 정적 무대와 진입점

**Files:**
- Create: `tests/parallax-static.test.cjs`
- Create: `parallax.html`
- Modify: `index.html`

**Interfaces:**
- Consumes: `characters.js`의 SVG 캐릭터 defs
- Produces: `#parallax-stage`, `[data-parallax-layer][data-depth][data-scroll]`, `#parallax-progress`, `#toggle-parallax`

- [ ] **Step 1: 페이지 구조와 메인 카드에 대한 실패 테스트 작성**
- [ ] **Step 2: `node --test tests/parallax-static.test.cjs`가 파일과 요소 부재로 실패하는지 확인**
- [ ] **Step 3: 7개 이상 SVG 깊이 레이어, 진행 표시, 토글 버튼을 가진 `parallax.html`과 `index.html` 카드를 구현**
- [ ] **Step 4: 정적 테스트 통과 확인**

### Task 2: 깊이 계산과 입력 처리

**Files:**
- Create: `tests/parallax-browser.test.cjs`
- Create: `parallax.js`
- Modify: `parallax.html`

**Interfaces:**
- Consumes: 각 레이어의 `data-depth: number`, `data-scroll: number`
- Produces: `window.__parallaxDebug`의 `progress()`, `pointer()`, `enabled()`, `isReducedMotion()`, `isFramePending()`

- [ ] **Step 1: 스크롤 시 전경이 배경보다 크게 움직이고 진행도가 갱신되는 실패 테스트 작성**
- [ ] **Step 2: 브라우저 테스트가 디버그 API 부재로 실패하는지 확인**
- [ ] **Step 3: 스크롤과 포인터를 정규화하고 한 개의 `requestAnimationFrame`에서 레이어 transform을 적용**
- [ ] **Step 4: 스크롤·포인터 테스트 통과 확인**

### Task 3: 비교 토글과 안전한 생명주기

**Files:**
- Modify: `tests/parallax-browser.test.cjs`
- Modify: `parallax.js`

**Interfaces:**
- Consumes: `#toggle-parallax`, `visibilitychange`, `matchMedia("(prefers-reduced-motion: reduce)")`
- Produces: 토글 상태의 `aria-pressed`, 정지 상태의 `transform: none`

- [ ] **Step 1: 효과 끄기, 모션 감소, 숨김 문서 동작의 실패 테스트 작성**
- [ ] **Step 2: 예상 상태 불일치로 실패하는지 확인**
- [ ] **Step 3: reset/stop/resume 생명주기 구현**
- [ ] **Step 4: 생명주기 테스트 통과 확인**

### Task 4: 모바일과 전체 회귀 검증

**Files:**
- Modify: `tests/parallax-browser.test.cjs`
- Modify: `tests/prototype-pages.test.cjs`

**Interfaces:**
- Consumes: 390×844 viewport
- Produces: viewport 안에 포함되는 무대와 컨트롤, 오류 없이 초기화되는 전체 페이지 목록

- [ ] **Step 1: 모바일 경계와 전체 초기화 목록에 패럴랙스 페이지를 추가**
- [ ] **Step 2: 전체 Node·Playwright·Python 회귀 테스트 실행**
- [ ] **Step 3: 실제 브라우저에서 데스크톱과 모바일 장면을 시각 검증**

