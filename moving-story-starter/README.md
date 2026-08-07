# Moving Story Starter

코드 기반 캐릭터 애니메이션, 장면 데이터, 패럴랙스를 분리한 움직이는 동화용 최소 프로젝트입니다.

## 실행

```bash
cd moving-story-starter
npm test
npm run serve
```

브라우저에서 `http://127.0.0.1:8080`을 엽니다.

## 책임 분리

```text
src/assets       그림 원본과 납품 규칙
src/animation    모션 런타임, 패럴랙스, 리깅, GSAP 어댑터
src/story        장면·레이어·beat 데이터
src/components   데이터에서 접근 가능한 마크업 생성
src/app.js       위 모듈들을 조립하는 진입점
```

## 새 장면 추가

1. `src/story/scene-04.js`에서 장면 객체를 만듭니다.
2. 각 레이어에 `key`, `depth`, `scroll` 값을 지정합니다.
3. `src/story/story-data.js`의 `scenes` 배열에 추가합니다.
4. 새로운 그림 유형이 필요하면 `StoryStage.js`의 `renderArtwork()`에 렌더러를 추가합니다.

## 캐릭터 교체

- SVG 파츠는 `data-p="head"`, `data-p="tail"`처럼 이름을 붙입니다.
- 표정은 `data-face="happy"` 형식으로 그룹화합니다.
- PNG 파츠는 배치 컨테이너와 애니메이션 컨테이너를 분리합니다.
- GSAP 이야기 동작과 패럴랙스가 같은 요소의 transform을 수정하지 않게 래퍼를 나눕니다.

## 실제 프로젝트로 확장할 때

- `timeline.js`에 ScrollTrigger 기반 장면 pin/scrub 어댑터를 추가합니다.
- 음성이 필요하면 beat 데이터에 오디오 URL과 viseme 타임코드를 추가합니다.
- 이미지가 많아지면 선로딩과 장면 단위 해제를 구현합니다.
- 프레임워크를 도입하더라도 animation과 story 데이터 계약은 그대로 유지할 수 있습니다.

