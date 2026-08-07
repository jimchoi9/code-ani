# Moving Story Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드 기반 애니메이션과 패럴랙스를 다른 프로젝트에서 확장할 수 있는 실행형 `moving-story-starter` 뼈대를 만든다.

**Architecture:** 네이티브 ES 모듈로 animation, story, components, assets 책임을 분리한다. `app.js`가 데이터와 UI를 조립하고, GSAP은 `timeline.js` 경계 안에서만 선택적으로 사용한다.

**Tech Stack:** HTML5, CSS, SVG, JavaScript ES Modules, optional GSAP 3, Node test runner

## Global Constraints

- 기존 프로토타입 파일은 수정하지 않는다.
- 새 파일은 모두 `moving-story-starter/` 아래에 둔다.
- 빌드 과정 없이 로컬 HTTP 서버에서 실행 가능해야 한다.
- 현재 작업공간은 Git 저장소가 아니므로 커밋 단계는 생략한다.

---

### Task 1: 구조와 순수 데이터 계약

**Files:**
- Create: `moving-story-starter/tests/structure.test.mjs`
- Create: `moving-story-starter/tests/story.test.mjs`
- Create: `moving-story-starter/src/story/scene-01.js`
- Create: `moving-story-starter/src/story/scene-02.js`
- Create: `moving-story-starter/src/story/scene-03.js`
- Create: `moving-story-starter/src/story/story-data.js`
- Create: asset README files

**Interfaces:**
- Produces: `story.scenes: Scene[]`, each scene containing `id`, `title`, `caption`, `palette`, `layers`, `beats`

- [ ] 구조와 세 장면 데이터 계약을 검증하는 실패 테스트 작성
- [ ] 파일 부재로 실패하는지 확인
- [ ] 최소 스토리 데이터와 에셋 가이드 구현
- [ ] 테스트 통과 확인

### Task 2: 애니메이션 핵심 모듈

**Files:**
- Create: `moving-story-starter/tests/parallax.test.mjs`
- Create: `moving-story-starter/src/animation/runtime.js`
- Create: `moving-story-starter/src/animation/parallax.js`
- Create: `moving-story-starter/src/animation/rig.js`
- Create: `moving-story-starter/src/animation/timeline.js`

**Interfaces:**
- Produces: `calculateLayerTransform`, `createParallaxController`, `createMotionRuntime`, `findPart`, `setExpression`, `createStoryTimeline`

- [ ] 깊이별 transform과 비활성 상태를 검증하는 실패 테스트 작성
- [ ] 모듈 부재로 실패하는지 확인
- [ ] 순수 계산 함수와 브라우저 컨트롤러 구현
- [ ] 테스트 통과 확인

### Task 3: 실행형 UI 조립

**Files:**
- Create: `moving-story-starter/index.html`
- Create: `moving-story-starter/styles.css`
- Create: `moving-story-starter/src/components/StoryStage.js`
- Create: `moving-story-starter/src/components/Caption.js`
- Create: `moving-story-starter/src/components/Controls.js`
- Create: `moving-story-starter/src/app.js`
- Create: `moving-story-starter/package.json`
- Create: `moving-story-starter/README.md`

**Interfaces:**
- Consumes: `story`, animation 모듈
- Produces: `#story-stage`, `[data-parallax-layer]`, `#story-caption`, 이전/다음/모션 버튼

- [ ] 실행 페이지의 접근 가능한 화면 계약을 구조 테스트에 추가
- [ ] 화면 파일 부재로 실패하는지 확인
- [ ] 세 장면 전환과 패럴랙스가 연결된 UI 구현
- [ ] 단위 테스트와 브라우저 시각 검증 수행

