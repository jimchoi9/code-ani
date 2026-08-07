# 움직이는 동화 스타터 설계

## 목표

현재 작업 디렉터리 아래에 `moving-story-starter` 독립 폴더를 만들고, 기존 프로토타입에서 검증한 코드 기반 애니메이션·리깅·패럴랙스 구조를 새 프로젝트에서 바로 확장할 수 있는 실행형 뼈대로 제공한다.

## 선택한 접근

- 빈 폴더만 생성: 구조 확인은 쉽지만 모듈 연결 방식이 드러나지 않는다.
- 네이티브 ES 모듈 실행형 뼈대: 빌드 도구 없이 실행되고 각 책임의 연결을 확인할 수 있다.
- React/Vite 뼈대: 실제 제품 확장에는 유리하지만 현재 요청보다 설정과 의존성이 커진다.

네이티브 ES 모듈 방식을 사용한다. GSAP은 CDN에서 선택적으로 로드하는 이야기 타임라인 어댑터로 격리하고, 패럴랙스 계산·리깅 선택자·런타임은 라이브러리 독립 모듈로 만든다. GSAP을 불러오지 못해도 정적인 이야기 화면은 렌더링되어야 한다.

## 폴더 구조

```text
moving-story-starter/
├── index.html
├── styles.css
├── package.json
├── README.md
├── src/
│   ├── assets/
│   │   ├── characters/README.md
│   │   ├── backgrounds/README.md
│   │   └── props/README.md
│   ├── animation/
│   │   ├── runtime.js
│   │   ├── parallax.js
│   │   ├── rig.js
│   │   └── timeline.js
│   ├── story/
│   │   ├── story-data.js
│   │   ├── scene-01.js
│   │   ├── scene-02.js
│   │   └── scene-03.js
│   ├── components/
│   │   ├── StoryStage.js
│   │   ├── Caption.js
│   │   └── Controls.js
│   └── app.js
└── tests/
    ├── structure.test.mjs
    ├── parallax.test.mjs
    └── story.test.mjs
```

## 모듈 책임

- `runtime.js`: 모션 감소 설정과 문서 표시 상태를 하나의 실행 가능 상태로 결합한다.
- `parallax.js`: 스크롤 진행도와 포인터 좌표를 레이어 transform으로 변환하고 단일 RAF에서 적용한다.
- `rig.js`: `data-p` 파츠와 `data-face` 표정을 선택하며, 에셋 DOM 구조와 장면 코드를 분리한다.
- `timeline.js`: GSAP이 있을 때 beat 데이터를 타임라인으로 연결하고, 없으면 정적 렌더링을 유지한다.
- `story/*.js`: 장면 제목, 자막, 레이어 깊이, beat를 순수 데이터로 정의한다.
- `components/*.js`: 데이터로부터 접근 가능한 DOM을 만들며 애니메이션 상태를 소유하지 않는다.
- `app.js`: 렌더링, 런타임, 패럴랙스, 컨트롤을 조립한다.

## 샘플 화면

첫 번째 장면을 기본으로 렌더링한다. 하늘·산·캐릭터·전경 레이어가 포함되고, 스크롤과 포인터에 따라 깊이별로 움직인다. 이전/다음 버튼으로 세 개의 샘플 장면 데이터를 바꾸며, 자막은 `aria-live`로 갱신한다.

## 성공 기준

- 요청한 디렉터리와 파일이 모두 생성된다.
- `npm test`로 구조·패럴랙스 계산·스토리 데이터 계약을 검증할 수 있다.
- 로컬 HTTP 서버에서 `index.html`이 오류 없이 렌더링된다.
- 390px 모바일 폭에서 가로 오버플로가 발생하지 않는다.
- 모션 감소 환경에서 패럴랙스 프레임을 시작하지 않는다.

