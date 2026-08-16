# 루트 README 설계

## 목표

저장소를 처음 방문한 사람이 프로젝트의 목적을 이해하고, 루트의 브라우저 데모와 독립형 `moving-story-starter`를 바로 실행할 수 있는 루트 `README.md`를 작성한다. 각 데모는 단순 링크 목록이 아니라 사용 기술, 입력 방식, 애니메이션 실행 구조, 접근성·성능 고려 사항을 설명한다.

## 독자와 범위

- 주요 독자는 저장소를 처음 보는 개발자와 애니메이션 제작자다.
- 루트의 HTML 프로토타입, `moving-story-starter`, OpenCV 파츠 분리기를 다룬다.
- 구현 세부 코드를 복제하거나 개발 이력을 장황하게 나열하지 않는다.
- 애플리케이션 코드와 기존 문서는 변경하지 않고 루트 `README.md`만 추가한다.

## 문서 구성

### 프로젝트 소개

“나비와 몽이”를 소재로 JSON/SVG/PNG 기반 인터랙티브 동화 표현 방식을 실험하고 비교하는 저장소임을 설명한다. 핵심 기술로 네이티브 HTML/CSS/JavaScript, SVG, GSAP, ScrollTrigger, Lottie, OpenCV를 소개한다.

### 빠른 실행

루트에서 Python 정적 서버를 실행해 데모 인덱스를 여는 방법과 `moving-story-starter`에서 테스트 및 서버를 실행하는 방법을 분리한다. GSAP과 Lottie 데모가 CDN 라이브러리를 사용하므로 최초 실행 시 네트워크 연결이 필요함을 명시한다.

### 데모별 기술 설명

다음 파일을 각각 설명한다.

- `webtoon.html`: SVG 파츠 리깅, GSAP Timeline, ScrollTrigger scrub, IntersectionObserver 기반 루프 수명주기
- `player.html`: paused GSAP timeline, ticker 기반 진행 표시, 자동 재생, 클릭·키보드 장면 제어
- `parallax.html`: 깊이별 레이어, 스크롤·포인터 입력, 독립 패럴랙스 런타임, reduced-motion 처리
- `png-rig.html`: 투명 PNG 파츠 조립, 관절 회전, 표정·방향 전환, 립싱크
- `interaction.html`: SVG hit area, 마우스·터치·키보드 입력 통합, 대상별 GSAP 반응과 말풍선
- `lottie.html`: 손작성 Lottie JSON, lottie-web SVG 렌더링, 스크롤-프레임 매핑
- `kid-style.html`: SVG+GSAP 기반 손그림 필터와 낮은 갱신 빈도의 boil 효과
- `svg-gsap.html`: 단일 장면 SVG+GSAP+ScrollTrigger 기준선
- `swap-test.html`: 공용 캐릭터 정의 재사용, 캐릭터 교체, 파츠 선택자와 좌표 계약 검증

각 설명은 데모의 목적과 기술이 선택된 이유를 함께 담는다. 실제 파일에서 확인되지 않은 프레임워크, 빌드 도구, 기능은 언급하지 않는다.

### 확장용 스타터와 보조 도구

`moving-story-starter/src`의 `animation`, `story`, `components`, `assets` 책임을 설명한다. `tools/part-splitter`는 배경 제거와 connected component 분리, 투명 PNG·미리보기·manifest 생성을 담당하며 의미 추론이나 자동 리깅은 하지 않는다고 안내한다.

### 주요 폴더와 테스트

저장소의 핵심 폴더를 짧은 트리로 제시한다. 스타터 테스트 명령을 기본 검증 방법으로 안내하고, 루트 `tests`에는 정적·브라우저 회귀 테스트가 있다는 수준으로 설명한다. 환경 고유 `NODE_PATH`는 일반 사용법으로 문서화하지 않는다.

## 오류 방지 원칙

- 모든 링크와 명령은 저장소 루트 기준 상대 경로 및 실제 스크립트와 일치시킨다.
- 루트에는 `package.json`이 없으므로 루트에서 `npm test`를 실행하라고 안내하지 않는다.
- 파츠 분리기의 설치·세부 옵션은 기존 도구 README로 연결하고 중복하지 않는다.
- 외부 CDN을 로드하지 못해 일부 애니메이션 데모가 동작하지 않을 수 있음을 실행 안내에서 알린다.

## 검증 기준

- `README.md`에 프로젝트 소개, 빠른 실행, 데모별 기술, 스타터 구조, 파츠 분리기, 주요 폴더가 모두 포함된다.
- 문서에 언급한 모든 로컬 파일과 폴더가 존재한다.
- 실행 명령이 기존 `package.json`과 도구 README의 명령에 부합한다.
- Markdown 링크가 상대 경로로 작성되고 `git diff --check`를 통과한다.
- README 작성 커밋을 현재 브랜치 `jimchoi9/docs-repo-overview`에 푸시한다.
