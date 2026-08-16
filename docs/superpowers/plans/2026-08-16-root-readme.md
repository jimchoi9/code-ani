# Root README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장소의 목적, 실행 방법, 데모별 기술, 확장용 스타터와 보조 도구를 설명하는 루트 `README.md`를 작성하고 현재 브랜치에 게시한다.

**Architecture:** 루트 `README.md`를 저장소의 단일 입구 문서로 추가한다. 상세 사용법은 기존 `moving-story-starter/README.md`와 `tools/part-splitter/README.md`로 연결하고, 루트 문서는 프로젝트 탐색과 기술 비교에 집중한다.

**Tech Stack:** Markdown, HTML/CSS/JavaScript, SVG, GSAP 3.12.5, ScrollTrigger, lottie-web 5.12.2, Python 정적 서버, Node.js 테스트 러너, OpenCV

## Global Constraints

- 애플리케이션 코드와 기존 문서는 변경하지 않고 루트 `README.md`만 추가한다.
- 루트의 HTML 프로토타입, `moving-story-starter`, OpenCV 파츠 분리기를 다룬다.
- 각 데모는 목적, 핵심 기술, 입력·재생 구조, 접근성·성능 처리를 실제 코드에서 확인된 범위로 설명한다.
- 루트에는 `package.json`이 없으므로 루트에서 `npm test`를 실행하라고 안내하지 않는다.
- 환경 고유 `NODE_PATH`는 일반 사용법으로 문서화하지 않는다.
- README 구현 커밋을 `jimchoi9/docs-repo-overview` 브랜치에 푸시한다.

---

### Task 1: 루트 프로젝트 안내서 작성과 게시

**Files:**
- Create: `README.md`
- Reference: `index.html`
- Reference: `webtoon.html`
- Reference: `player.html`
- Reference: `parallax.html`
- Reference: `png-rig.html`
- Reference: `interaction.html`
- Reference: `lottie.html`
- Reference: `kid-style.html`
- Reference: `svg-gsap.html`
- Reference: `swap-test.html`
- Reference: `moving-story-starter/README.md`
- Reference: `moving-story-starter/package.json`
- Reference: `tools/part-splitter/README.md`

**Interfaces:**
- Consumes: 저장소의 실제 HTML 진입점, npm scripts, 기존 도구 문서
- Produces: GitHub에서 렌더링되는 루트 `README.md`와 실행 가능한 상대 링크·명령

- [ ] **Step 1: README 부재와 필수 대상 파일 존재 확인**

Run:

```bash
test ! -e README.md
for path in index.html webtoon.html player.html parallax.html png-rig.html interaction.html lottie.html kid-style.html svg-gsap.html swap-test.html moving-story-starter/README.md moving-story-starter/package.json tools/part-splitter/README.md; do test -e "$path" || exit 1; done
```

Expected: exit code 0. 루트 `README.md`는 아직 없고 모든 문서 대상이 존재한다.

- [ ] **Step 2: 루트 README 작성**

Create `README.md` with these exact top-level sections and content contracts:

```markdown
# Moving Story Prototypes

## 프로젝트 소개
“나비와 몽이”를 소재로 JSON/SVG/PNG 기반 인터랙티브 동화 표현 방식을 비교한다. 네이티브 웹 기술과 SVG, GSAP, ScrollTrigger, Lottie, OpenCV를 사용한다.

## 빠른 실행
루트에서는 `python3 -m http.server 8000 --bind 127.0.0.1` 후 `http://127.0.0.1:8000/`을 연다. CDN 의존성과 `moving-story-starter`의 별도 `npm test`, `npm run serve` 절차를 안내한다.

## 데모와 사용 기술
`webtoon.html`, `player.html`, `parallax.html`, `png-rig.html`, `interaction.html`, `lottie.html`, `kid-style.html`, `svg-gsap.html`, `swap-test.html` 각각에 링크하고 설계 문서에 승인된 기술 상세를 서술한다.

## 확장용 스타터
`moving-story-starter`의 실행 방법과 `animation`, `story`, `components`, `assets` 책임을 설명한다.

## 캐릭터 파츠 분리 도구
`tools/part-splitter`의 입력·출력·비지원 범위를 설명하고 상세 README로 연결한다.

## 주요 폴더
루트 프로토타입, 스타터, 테스트, 도구, 출력물, 설계 문서를 짧은 트리로 설명한다.

## 테스트
스타터 테스트 명령을 제시하고 루트 테스트의 성격을 설명한다.
```

데모 설명에는 다음 사실을 포함한다.

- Webtoon: GSAP Timeline, ScrollTrigger scrub, SVG `data-p` 파츠, IntersectionObserver, reduced-motion
- Player: paused timeline, GSAP ticker, 자동 재생, 클릭·Space·방향키 입력
- Parallax: 7개 깊이 레이어, 스크롤·포인터, `requestAnimationFrame`, touch pan, reduced-motion
- PNG rig: 투명 PNG 절대 배치, 관절 pivot, 표정·방향·립싱크, 반복 실행 정리
- Interaction: SVG hit area, 클릭·터치·Enter·Space, 대상별 timeline, `aria-live`, reduced-motion
- Lottie: 손작성 `nabi_scene1.json`, lottie-web SVG renderer, 스크롤-프레임 매핑
- Kid style: SVG filters, 5fps boil 효과, GSAP/ScrollTrigger, reduced-motion
- SVG baseline: 단일 장면 SVG, GSAP 무한 tween, ScrollTrigger scrub
- Swap test: `characters.js` 공용 defs, SVG `<use>`, `data-p` 선택자, 좌표·transform 래퍼 검증

- [ ] **Step 3: 문서 계약을 자동 확인**

Run:

```bash
for text in "## 프로젝트 소개" "## 빠른 실행" "## 데모와 사용 기술" "## 확장용 스타터" "## 캐릭터 파츠 분리 도구" "## 주요 폴더" "## 테스트" "webtoon.html" "player.html" "parallax.html" "png-rig.html" "interaction.html" "lottie.html" "kid-style.html" "svg-gsap.html" "swap-test.html"; do rg -Fq "$text" README.md || exit 1; done
git diff --check
```

Expected: exit code 0, 모든 필수 섹션과 데모 링크가 존재하고 공백 오류가 없다.

- [ ] **Step 4: README의 로컬 Markdown 링크 확인**

Run:

```bash
node -e 'const fs=require("fs"); const text=fs.readFileSync("README.md","utf8"); const links=[...text.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)].map(m=>m[1].split("#")[0]); const missing=[...new Set(links)].filter(Boolean).filter(p=>!fs.existsSync(p)); if(missing.length){console.error(missing.join("\n")); process.exit(1)}'
```

Expected: exit code 0, 존재하지 않는 로컬 링크가 없다.

- [ ] **Step 5: 스타터 테스트 실행**

Run:

```bash
cd moving-story-starter && npm test
```

Expected: Node test runner의 모든 테스트가 통과한다.

- [ ] **Step 6: README 구현 커밋**

```bash
git add README.md docs/superpowers/plans/2026-08-16-root-readme.md
git commit -m "docs: add repository overview"
```

- [ ] **Step 7: 현재 브랜치 게시**

Run:

```bash
git push -u origin jimchoi9/docs-repo-overview
```

Expected: 원격 `origin/jimchoi9/docs-repo-overview`가 새 커밋을 가리킨다.
