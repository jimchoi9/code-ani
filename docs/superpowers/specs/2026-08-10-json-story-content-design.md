# JSON 기반 스토리 콘텐츠 분리 설계

## 배경

현재 앨리스 스토리의 원고, 분기 데이터, 조건부 본문 선택, 읽기 시간 계산이 `alice-branching-mvp/src/story-data.js` 한 파일에 함께 있다. 장면 본문을 수정하려면 실행 코드가 있는 파일을 직접 편집해야 하고, C1의 첫 만남·재회처럼 경로에 따라 달라지는 문장도 JavaScript 구현과 섞여 있다.

앞으로 외부 에이전트가 원고 파일을 받아 수정할 수 있어야 한다. 또한 같은 분기 구조를 공유하면서 문장과 어휘 수준만 다른 `easy`와 `hard` 난이도를 관리할 수 있어야 한다.

## 목표

- 스토리 분기 구조와 표시 원고를 서로 다른 JSON 파일로 분리한다.
- 현재 원고 전체를 `hard` 난이도로 보존한다.
- `easy` 원고는 이번 작업에서 작성하지 않지만 같은 구조로 나중에 추가할 수 있게 한다.
- 제목, 본문, 선택지, 대사, 조건부 문장과 부모 노트를 JavaScript 수정 없이 변경할 수 있게 한다.
- 외부 에이전트가 원고 JSON만 수정해도 구조 오류를 자동으로 발견할 수 있게 한다.
- 기존 저장 세션, 분기 결과, 여섯 결말과 세 UI의 동작을 유지한다.

## 비목표

- 쉬운 난이도 원고 작성
- 난이도 선택 UI 추가
- 분기 구조나 결말 의미 변경
- 기존 삽화 교체
- CMS 또는 원격 스토리 API 연결
- 런타임 중 사용자 생성 원고 불러오기

## 선택한 구조

공통 분기 그래프와 난이도별 완전한 원고 파일을 분리한다.

```text
alice-branching-mvp/
├── story/
│   ├── graph.json
│   ├── content/
│   │   └── hard.json
│   └── schemas/
│       ├── graph.schema.json
│       └── content.schema.json
└── src/
    ├── story-data.js
    ├── story-engine.js
    └── vocabulary.js
```

`graph.json`은 장면 ID, 장면 유형, 연결, 선택 효과, 결말 매핑, 삽화 키와 조건부 콘텐츠 선택 규칙을 가진다. `hard.json`은 화면에 표시되는 모든 텍스트, 장면별 낱말과 해당 난이도의 뜻풀이를 가진다. `story-engine.js`는 두 JSON을 결합하고 현재 세션 상태에 맞는 장면을 만드는 순수 함수만 제공한다. `story-data.js`와 `vocabulary.js`는 기존 소비자가 사용하던 export를 유지하는 호환 진입점으로 축소한다.

한 파일에 모든 난이도를 중첩하거나 `hard`에서 일부 필드만 덮어쓰는 상속 구조는 사용하지 않는다. 난이도 파일 하나만 전달해도 전체 원고를 검토할 수 있어야 하기 때문이다.

## 공통 그래프 모델

`graph.json`은 사용자에게 보이는 문장을 포함하지 않는다. 선택지에는 안정적인 ID를 부여하고, 원고 파일은 이 ID에 문구를 연결한다.

```json
{
  "id": "alice-branching-mvp",
  "startSceneId": "S00",
  "defaultLevel": "hard",
  "sceneOrder": ["S00", "S01", "S02", "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "E1", "E2", "E3", "E4", "E5", "E6"],
  "scenes": {
    "S00": {
      "type": "choice",
      "art": "start_rabbit_hole",
      "choices": [
        { "id": "shrink", "nextSceneId": "S01" },
        { "id": "grow", "nextSceneId": "S02" }
      ]
    }
  }
}
```

그래프가 관리하는 필드는 다음과 같다.

- `id`, `startSceneId`, `sceneOrder`, `defaultLevel`
- 장면의 `type`과 기본 `art`
- 선택과 칩의 안정적인 `id`
- `nextSceneId`
- `encounterId`, `gardenEntry`, `endingVariation` 같은 세션 효과
- 만남별 결말 ID 매핑
- 조건에 따른 삽화 키 선택
- 조건부 원고 블록을 선택하는 규칙
- 읽기 시간 계산 상수와 화면 수

선택지 ID는 저장 데이터와 원고의 연결 키이므로 한 번 공개된 뒤 이름을 바꾸지 않는다. 표시 문구는 자유롭게 바꿀 수 있다.

## 난이도 원고 모델

`content/hard.json`은 현재 `story-data.js`의 모든 표시 텍스트를 그대로 옮긴다.

```json
{
  "storyId": "alice-branching-mvp",
  "level": "hard",
  "title": "너의 선택으로 열리는 앨리스의 이상한 나라",
  "vocabulary": {
    "황급히": "아주 급하게, 서둘러서",
    "먹음직스러운": "보기만 해도 먹고 싶은 마음이 드는"
  },
  "scenes": {
    "S00": {
      "title": "토끼굴 — 이야기의 시작",
      "body": [
        "따스한 오후였어요.",
        "바로 그때였어요."
      ],
      "vocab": ["황급히", "먹음직스러운"],
      "choices": {
        "shrink": "작은 문을 열어 본다",
        "grow": "{TREAT}{을/를} 먹어 본다"
      }
    }
  }
}
```

긴 본문은 이스케이프된 하나의 문자열 대신 문단 문자열 배열로 저장한다. 엔진은 배열을 기존 렌더러가 기대하는 빈 줄로 구분된 문자열로 결합한다. 외부 에이전트는 문단 단위로 원고를 수정할 수 있고 JSON의 `\n\n`을 직접 관리하지 않아도 된다.

난이도 원고가 관리하는 필드는 다음과 같다.

- 스토리 제목
- 장면 제목과 본문 문단
- 선택지와 칩의 표시 문구
- 칩 응답과 프롬프트
- 장면별 낱말 목록
- 난이도별 낱말 뜻풀이
- 조건부 본문 블록
- 결말 특성 표시 문구, 선택 회상 문구와 부모 노트

`vocabulary.js`에 있는 현재 뜻풀이는 `hard.json`의 `vocabulary`로 함께 옮긴다. 이렇게 해야 미래의 `easy.json`이 쉬운 낱말과 쉬운 뜻풀이를 JavaScript 수정 없이 정의할 수 있다. `vocabulary.js`의 `getVocabulary()`와 `recordVocabulary()` 공개 API는 생성 번들의 기본 난이도 어휘를 사용하도록 유지한다.

## 조건부 원고 블록

C1의 고양이 첫 만남·재회처럼 경로에 따라 달라지는 원고는 JavaScript 조건문에 문장을 넣지 않는다. 그래프는 어떤 상태에서 어떤 변형 키를 고를지만 선언하고, 실제 문장은 난이도 원고에 둔다.

`graph.json` 예시:

```json
{
  "contentSelectors": {
    "catMeeting": {
      "stateKey": "encounterId",
      "cases": {
        "A1": "reunion",
        "B1": "reunion"
      },
      "default": "first"
    }
  }
}
```

`hard.json` 예시:

```json
{
  "C1": {
    "title": "안개 언덕",
    "body": [
      "길이 끝나는 곳에 낮은 언덕이 있었어요.",
      { "block": "catMeeting" },
      "미소는 대답하지 않았어요."
    ],
    "blocks": {
      "catMeeting": {
        "first": ["{HERO}{은/는} 그 미소를 처음 보았어요."],
        "reunion": ["{HERO}{은/는} 익숙한 미소를 알아보았어요."]
      }
    }
  }
}
```

본문 배열의 원소는 일반 문단 문자열 또는 `{ "block": "블록 ID" }` 참조다. 엔진은 그래프의 selector로 변형 키를 고른 뒤 해당 난이도 파일의 문단을 삽입한다. selector에 맞는 변형이 없거나 기본값이 없으면 조용히 빈 문자열로 처리하지 않고 명시적인 데이터 오류를 발생시킨다.

동일한 방식으로 다음 조건부 콘텐츠를 표현한다.

- C1의 고양이 첫 만남과 재회
- C2의 담장 진입과 정문 진입
- 결말 앞부분의 `TRUTH`, `SHIELD`, `TURN` 변주
- 각 결말의 여왕 선택 회상 문장
- 결말 변주에 추가되는 부모 노트

삽화 변경은 원고가 아니라 그래프의 presentation selector로 처리한다. C2의 작은 몸·큰 몸 삽화와 결말 변주 스폿 이미지가 이에 해당한다.

## 런타임 로딩과 호환성

현재 앱은 동기적인 ES 모듈 import로 `story`와 `resolveScene()`을 사용한다. 브라우저 시작 시 `graph.json`과 `hard.json`을 `fetch`해서 비동기 초기화하는 구조로 바꾸면 앱 전체 부팅 경로와 테스트가 불필요하게 복잡해진다.

따라서 이번 단계에서는 JSON을 빌드 전에 JavaScript 모듈로 생성하는 짧은 생성 스크립트를 사용한다.

```text
story/graph.json + story/content/hard.json
                    ↓ npm run story:build
src/generated/story-bundle.js
                    ↓
src/story-engine.js → src/story-data.js
```

`src/generated/story-bundle.js`는 생성 산출물이지만 저장소에 포함한다. 정적 서버에서도 기존처럼 동기적으로 실행할 수 있고, 앱 실행에 런타임 네트워크 요청이 추가되지 않는다. JSON 수정 후 생성 파일이 오래된 상태인지 테스트가 검사한다.

기본 난이도는 `hard`다. 이번 작업에는 난이도 선택 UI나 URL 파라미터를 추가하지 않는다. 나중에 `easy.json`이 생기면 생성기가 두 난이도를 번들에 포함하고, 별도 UI 작업에서 선택된 레벨을 엔진에 전달한다.

`story-data.js`는 다음 기존 공개 API를 유지한다.

- `story`
- `getScene(sceneId)`
- `resolveScene(sceneId, session)`
- `estimateRouteSeconds(route)`
- `ENDING_BY_ENCOUNTER`
- `ENDING_VARIATIONS`

`vocabulary.js`도 `vocabulary`, `getVocabulary()`와 `recordVocabulary()`를 그대로 제공한다. 따라서 `app.js`, 세 UI 렌더러와 세션 저장 형식은 이번 변경에서 바꾸지 않는다.

## 생성과 검증

`npm run story:build`는 다음 순서로 동작한다.

1. `graph.json`과 모든 `content/*.json`을 읽는다.
2. JSON Schema와 교차 파일 규칙을 검증한다. JSON Schema Draft 2020-12 검증에는 브라우저 번들에 포함되지 않는 개발 의존성 `ajv`를 사용한다.
3. 문단 배열과 조건부 블록을 보존한 데이터 모듈을 생성한다.
4. 결정적인 키 순서와 포맷으로 `src/generated/story-bundle.js`를 쓴다.

`npm run story:check`는 파일을 쓰지 않고 같은 검증을 수행하며, 생성 결과가 현재 번들과 다르면 실패한다. `npm test`는 `story:check`를 먼저 실행하도록 연결한다.

검증 규칙은 다음을 포함한다.

- 그래프의 모든 `nextSceneId`가 존재한다.
- 모든 장면에서 결말에 도달할 수 있다.
- `sceneOrder`와 실제 장면 ID 집합이 같다.
- 원고의 장면 ID 집합이 그래프와 같다.
- 각 선택과 칩의 ID가 난이도 원고에 정확히 한 번 존재한다.
- 본문의 block 참조가 해당 장면의 `blocks`에 존재한다.
- selector의 모든 변형 키와 기본 키가 난이도 원고에 존재한다.
- 모든 개인화 토큰이 허용 목록을 통과한다.
- 각 장면은 현재 계약에 맞는 1~2개의 낱말을 가진다.
- 장면에서 사용하는 모든 낱말이 같은 난이도 파일의 `vocabulary`에 정의돼 있다.
- 난이도 원고에 사용되지 않는 고아 뜻풀이 항목이 없다.
- 모든 삽화 키가 비주얼노벨 manifest에 존재한다.
- `hard.json`에는 17개 장면과 6개 결말이 모두 있다.
- 생성 번들이 소스 JSON과 동기화돼 있다.

`easy.json`을 추가할 때는 그래프와 동일한 장면·선택·블록 키를 가져야 한다. 문장, 문단 수, 낱말과 표시 문구는 다를 수 있지만 구조 키는 달라질 수 없다.

## 외부 에이전트 편집 계약

외부 에이전트에는 다음 파일만 제공해도 원고 작업이 가능해야 한다.

- 수정 대상 난이도의 원고 JSON
- `content.schema.json`
- 장면 ID와 경로를 설명하는 읽기 전용 그래프 요약
- 개인화 토큰 목록

일반적인 원고 수정에서는 `graph.json`, 생성 번들 또는 JavaScript 파일을 수정하지 않는다. 분기 자체를 바꾸는 별도 요청에서만 `graph.json`을 수정한다.

에이전트 작업 후 필수 명령은 다음과 같다.

```bash
npm run story:build
npm test
```

생성 파일을 직접 편집하면 `story:check`가 실패해야 한다. 이를 통해 JSON을 단일 원본으로 유지한다.

## 이전 절차

1. 현재 `story-data.js`의 구조 데이터를 `story/graph.json`으로 옮긴다.
2. 현재 표시 원고 전체를 `story/content/hard.json`으로 옮긴다.
3. 현재 낱말 뜻풀이를 `hard.json`의 `vocabulary`로 옮긴다.
4. C1, C2와 결말 조건부 원고를 명시적인 block과 selector로 바꾼다.
5. JSON Schema와 생성·검증 스크립트를 추가한다.
6. 생성 번들과 범용 `story-engine.js`를 만든다.
7. `story-data.js`와 `vocabulary.js`를 호환 export만 제공하는 진입점으로 축소한다.
8. 기존 스토리, 세션, UI 테스트가 동일한 결과를 검증하도록 유지한다.
9. JSON 원본과 생성 번들의 동기화 테스트를 추가한다.
10. README에 원고 수정 절차를 기록한다.

기존 `localStorage` 세션의 장면 ID, 선택 ID와 상태 키는 유지하므로 마이그레이션이 필요하지 않다.

## 테스트 전략

- 단위 테스트: 그래프와 원고 결합, 문단 조합, 조건부 block 선택
- 데이터 계약 테스트: 누락 장면, 잘못된 선택 ID, 존재하지 않는 block, 미등록 토큰 거부
- 경로 테스트: 여섯 만남이 C1과 C2를 거쳐 각각 기존 결말에 도달
- 조건 테스트: 고양이 경로는 `reunion`, 나머지 경로는 `first` 원고 사용
- 변주 테스트: 여섯 결말이 각각 세 여왕 답변 변주를 결합
- 호환 테스트: 기존 `story-data.js` 공개 API와 세션 형식 유지
- UI 테스트: current, minimal, visual-novel UI가 생성된 동일 장면을 렌더링
- 회귀 테스트: 전체 `npm test` 통과

## 성공 기준

- 현재 hard 원고와 모든 분기 결과가 데이터 이전 전후 동일하다.
- `story-data.js`에 장면별 원고 문장이 남아 있지 않다.
- C1의 첫 만남·재회 같은 조건부 문장을 `hard.json`만 수정해 바꿀 수 있다.
- 외부 에이전트가 `hard.json`을 수정한 뒤 두 명령만으로 생성과 검증을 마칠 수 있다.
- 미래의 `easy.json`은 JavaScript 로직 변경 없이 추가할 수 있다.
- 기존 126개 테스트와 새 데이터 검증 테스트가 모두 통과한다.
