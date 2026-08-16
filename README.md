# Moving Story Prototypes

“나비와 몽이”를 소재로, 코드 기반 캐릭터 애니메이션과 움직이는 동화를 만드는 여러 방식을 비교하는 프로토타입 저장소입니다.

## 프로젝트 소개

이 프로젝트는 하나의 이야기와 캐릭터를 다양한 재생 방식으로 구현해 다음 질문을 검증합니다.

- SVG 캐릭터를 파츠 단위로 나누면 어느 수준까지 코드로 연기시킬 수 있는가?
- 같은 장면을 스크롤형 웹툰과 자동 재생형 그림책으로 어떻게 재사용할 수 있는가?
- SVG, 투명 PNG, Lottie JSON은 제작·리깅·재생 측면에서 어떤 차이가 있는가?
- 패럴랙스, 포인터 반응, 클릭·터치 상호작용을 모션 감소 설정과 함께 안전하게 운영할 수 있는가?

주요 구현은 빌드 과정 없는 HTML, CSS, JavaScript와 SVG로 구성됩니다. 애니메이션에는 [GSAP](https://gsap.com/)과 ScrollTrigger, Lottie 비교안에는 [lottie-web](https://github.com/airbnb/lottie-web), 이미지 파츠 전처리에는 Python과 OpenCV를 사용합니다.

## 빠른 실행

### 전체 프로토타입

저장소 루트에서 정적 서버를 실행합니다.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 <http://127.0.0.1:8000/>을 열면 데모 인덱스가 표시됩니다. 주요 애니메이션 페이지는 GSAP 또는 lottie-web을 CDN에서 불러오므로 처음 실행할 때 네트워크 연결이 필요합니다.

### 확장용 스타터

```bash
cd moving-story-starter
npm test
npm run serve
```

브라우저에서 <http://127.0.0.1:8080>을 엽니다. 별도의 번들러나 프레임워크 설치는 필요하지 않습니다.

## 데모와 사용 기술

### [세로 스크롤 웹툰](webtoon.html)

다섯 개 장면을 긴 세로 페이지에 배치하고, 독자의 스크롤 위치를 장면의 재생 위치로 사용합니다.

- `characters.js`에 정의된 SVG 캐릭터를 `<use>`로 복제하고 `data-p`가 붙은 머리, 꼬리, 표정, 장신구 파츠를 선택해 움직입니다.
- GSAP Timeline이 등장, 이동, 표정 변화 같은 장면 연기를 구성하고 ScrollTrigger의 `scrub`이 타임라인 진행률을 스크롤에 연결합니다.
- 반복되는 꼬리·방울·배경 모션은 장면별 loop controller로 관리합니다. IntersectionObserver로 화면 밖 장면과 표지의 무한 트윈을 멈춰 불필요한 작업을 줄입니다.
- `prefers-reduced-motion`과 문서 표시 상태를 `prototype-runtime.js`에서 함께 반영하여 장식용 반복 모션을 중지합니다.

### [자동 재생 플레이어](player.html)

웹툰과 같은 SVG 리그와 이야기 장면을 그림책처럼 순서대로 재생하는 비교안입니다.

- 각 장면은 일시 정지 상태의 GSAP Timeline으로 만들어지고, 플레이어가 현재 장면의 재생·정지·재시작·전환을 소유합니다.
- GSAP ticker에서 현재 타임라인 진행률을 읽어 진행 표시와 재생 상태를 동기화합니다.
- 화면 클릭으로 다음 장면을 열고, Space로 재생·일시 정지, 좌우 방향키로 이전·다음 장면을 제어할 수 있습니다.
- 장면을 건너뛰거나 다시 실행할 때 진행 중인 tween과 반복 모션을 정리해 타임라인이 중복되지 않도록 합니다. 모션 감소 설정에서는 정적인 완성 상태를 우선합니다.

### [패럴랙스 산책](parallax.html)

평면 장면을 일곱 개 깊이 레이어로 나누어 스크롤과 포인터에 반응하는 공간감을 실험합니다.

- 하늘, 먼 산, 건물, 길, 캐릭터, 가까운 풀처럼 서로 다른 깊이 계수를 가진 SVG 레이어를 구성합니다.
- `parallax.js`가 세로 스크롤 진행도와 포인터 좌표를 합성하고, `requestAnimationFrame`에서 레이어별 transform을 한 번에 갱신합니다.
- 포인터를 쓸 수 없는 터치 환경에서도 세로 스크롤이 유지되도록 `touch-action: pan-y`를 사용합니다.
- 모션 켜기/끄기 상태와 `prefers-reduced-motion`을 반영하며, 모션을 끄면 레이어를 안정적인 정지 위치로 되돌립니다.

### [PNG 파츠 리깅](png-rig.html)

SVG 대신 투명 PNG 조각을 겹쳐 하나의 캐릭터로 조립할 때의 리깅 가능성을 확인합니다.

- 몸통, 머리, 팔, 눈, 입 같은 이미지를 절대 좌표로 배치하고 배치 컨테이너와 애니메이션 컨테이너를 분리합니다. 덕분에 화면상의 위치와 관절 회전을 독립적으로 조절할 수 있습니다.
- 파츠별 pivot을 기준으로 GSAP 회전·이동을 적용하고, 표정 이미지 교체와 좌우 방향 전환을 지원합니다.
- “안녕하세요” 동작에서는 입 모양 프레임을 순환시켜 간단한 립싱크를 만듭니다.
- 새 동작을 실행하거나 탭이 숨겨질 때 기존 타임라인과 입 모양 타이머를 정리해 반복 실행이 겹치지 않게 합니다.

### [인터랙션 놀이터](interaction.html)

장면 속 캐릭터와 사물을 독자가 직접 눌러 반응시키는 입력 실험입니다.

- 보이는 SVG 그림과 별도로 투명 hit area를 두어 작은 파츠도 마우스와 터치로 쉽게 선택할 수 있게 합니다.
- 클릭·터치와 키보드 Enter/Space 입력을 하나의 활성화 경로로 모으고, 대상별 GSAP Timeline이 흔들기, 점프, 회전 등의 반응을 재생합니다.
- 대상을 바꾸거나 같은 대상을 다시 누르면 이전 반응을 초기화하여 transform이 누적되지 않습니다.
- 키보드 포커스, `aria-live` 말풍선, 터치용 `touch-action`, `prefers-reduced-motion` 대체 반응을 포함합니다.

### [Lottie 기준선](lottie.html)

단일 장면을 손으로 작성한 [`nabi_scene1.json`](nabi_scene1.json)과 lottie-web으로 재생하는 저복잡도 비교안입니다.

- lottie-web의 SVG renderer가 JSON의 도형, 레이어, 키프레임을 브라우저 SVG로 변환합니다.
- 애니메이션을 자동 재생하는 대신 스크롤 진행률을 전체 프레임 범위로 환산하고 `goToAndStop`으로 해당 프레임을 표시합니다.
- 스크롤 이벤트에서는 직접 렌더링하지 않고 `requestAnimationFrame`으로 갱신을 묶습니다.
- 현재 JSON은 Lottie 파이프라인과 스크롤 프레임 매핑 가능성을 확인하기 위한 기준선이며, SVG 캐릭터 리그와 동일한 표현 품질을 목표로 하지는 않습니다.

### [어린이 그림풍](kid-style.html)

애니메이션 구조는 SVG+GSAP으로 유지하고 그림의 질감만 어린이 손그림처럼 바꾼 스타일 비교안입니다.

- SVG filter와 불규칙한 외곽선을 사용해 종이 위에 그린 듯한 질감을 만듭니다.
- `prototype-runtime.js`가 약 200ms마다 필터 seed를 바꾸는 약 5fps의 boil 효과를 제어합니다. 낮은 갱신 빈도로 손그림 떨림을 표현하면서 지속적인 고주사율 렌더링을 피합니다.
- GSAP의 반복 파츠 모션과 ScrollTrigger 기반 장면 진행은 기본 SVG 기준안과 같은 방식으로 동작합니다.
- 문서가 숨겨졌거나 `prefers-reduced-motion`이 설정된 경우 boil과 장식용 무한 모션을 실행하지 않습니다.

### [SVG + GSAP 단일 장면 기준선](svg-gsap.html)

한 장면 안에서 SVG 리깅과 GSAP ScrollTrigger 조합의 최소 구조를 보여주는 기술 기준선입니다.

- 머리, 꼬리, 방울처럼 분리된 SVG 그룹에 독립적인 무한 tween을 적용합니다.
- 본편 연기는 GSAP Timeline으로 구성하고 ScrollTrigger의 `scrub`으로 스크롤 위치와 연결합니다.
- 다른 데모의 수명주기나 데이터 구조를 도입하기 전, SVG 파츠 분리와 transform origin이 올바른지 빠르게 확인하는 용도입니다.

### [캐릭터 교체 실험](swap-test.html)

장면 연출을 유지하면서 캐릭터 정의만 교체할 수 있는지 검증합니다.

- `characters.js`의 공용 SVG `<defs>`를 `<use>`로 복제하여 같은 장면에 서로 다른 캐릭터 구현을 주입합니다.
- `data-p` 파츠 이름을 공통 선택자 계약으로 사용하므로 연출 코드는 개별 SVG path 구조에 직접 의존하지 않습니다.
- 배치, 연출, 좌우 반전·크기, 필터를 서로 다른 transform 래퍼로 분리해 GSAP 이동값이 반전되거나 덮어써지는 문제를 방지합니다.
- 눈 깜빡임, 꼬리·방울 반복 동작, 표정 전환을 통해 새 캐릭터가 좌표 원점과 관절 pivot 계약을 만족하는지 확인합니다. 납품 규칙은 [`ART-SPEC.md`](ART-SPEC.md)에 정리되어 있습니다.

## 확장용 스타터

[`moving-story-starter`](moving-story-starter/)는 루트 프로토타입에서 검증한 패턴을 새 프로젝트로 옮기기 쉽게 정리한 네이티브 ES 모듈 예제입니다.

```text
moving-story-starter/src/
├── animation/    모션 실행 정책, 패럴랙스 계산, 리깅 선택자, GSAP 어댑터
├── story/        장면, 레이어 깊이, 자막, beat 데이터
├── components/   이야기 데이터로 접근 가능한 화면 마크업 생성
├── assets/       캐릭터, 배경, 소품의 원본과 납품 규칙
└── app.js        렌더링·애니메이션·컨트롤을 조립하는 진입점
```

스토리 데이터와 애니메이션 실행 코드를 분리했기 때문에 장면이나 그림을 교체해도 런타임 계약을 유지할 수 있습니다. GSAP을 불러오지 못한 경우에도 정적인 이야기 화면은 렌더링됩니다. 자세한 확장 방법은 [스타터 README](moving-story-starter/README.md)를 참고하세요.

## 캐릭터 파츠 분리 도구

[`tools/part-splitter`](tools/part-splitter/)는 투명 배경 또는 균일한 단색 배경 위에 떨어져 있는 캐릭터 파츠를 OpenCV connected component 분석으로 분리하는 Python CLI입니다.

도구는 개별 투명 `part-*.png`, 번호가 표시된 `preview.png`, 원본 좌표·crop·기본 pivot을 담은 `manifest.json`을 생성합니다. 파츠가 머리인지 팔인지 의미를 추론하거나 자동 리깅하지는 않습니다. 설치 방법과 배경·면적·padding 옵션은 [파츠 분리기 README](tools/part-splitter/README.md)에 정리되어 있습니다.

## 주요 폴더

```text
.
├── *.html                    표현 방식별 독립 브라우저 데모
├── characters.js            공용 SVG 캐릭터와 배경 정의
├── prototype-runtime.js     모션 감소·페이지 표시 상태·boil 실행 정책
├── moving-story-starter/    다른 프로젝트로 확장할 수 있는 최소 예제
├── tools/part-splitter/     OpenCV 기반 PNG 파츠 분리 CLI
├── tests/                   루트 데모의 정적·브라우저 회귀 테스트
├── output/                  파츠 분리 샘플 산출물
└── docs/superpowers/        기능별 설계 문서와 구현 계획
```

## 루트 파일 안내

### 문서와 공용 파일

| 파일 | 설명 |
| --- | --- |
| [`README.md`](README.md) | 프로젝트 소개, 실행 방법, 데모와 폴더 구성을 정리한 현재 문서입니다. |
| [`ART-SPEC.md`](ART-SPEC.md) | SVG 캐릭터의 좌표 원점, 필수 파츠 이름, 관절과 표정 구성 등 아트 납품 규칙입니다. |
| [`index.html`](index.html) | 전체 이야기와 기술 실험 페이지로 이동하는 데모 인덱스입니다. |
| [`characters.js`](characters.js) | 나비, 몽이, 부엉 할아버지와 장면 배경을 담은 공용 SVG `<defs>` 원본입니다. |
| [`prototype-runtime.js`](prototype-runtime.js) | 모션 감소 설정, 페이지 표시 상태, boil 타이머와 반복 tween의 실행 여부를 관리합니다. |
| [`parallax.js`](parallax.js) | 스크롤·포인터 입력을 깊이별 SVG transform으로 변환하는 패럴랙스 런타임입니다. |
| [`png-rig.js`](png-rig.js) | PNG 파츠 캐릭터의 관절, 표정, 방향, 동작과 립싱크를 제어합니다. |

### 데모 페이지

| 파일 | 설명 |
| --- | --- |
| [`webtoon.html`](webtoon.html) | ScrollTrigger로 다섯 장면을 스크롤 진행률에 맞춰 재생하는 세로 웹툰입니다. |
| [`player.html`](player.html) | 같은 이야기와 SVG 리그를 자동 재생·클릭·키보드 방식으로 감상하는 플레이어입니다. |
| [`parallax.html`](parallax.html) | 일곱 개 깊이 레이어의 스크롤·포인터 패럴랙스를 시험하는 페이지입니다. |
| [`png-rig.html`](png-rig.html) | 투명 PNG 파츠 조립, 관절 회전, 표정과 립싱크를 시험하는 페이지입니다. |
| [`interaction.html`](interaction.html) | 캐릭터와 사물의 클릭·터치·키보드 반응을 시험하는 인터랙션 놀이터입니다. |
| [`lottie.html`](lottie.html) | Lottie JSON을 SVG로 렌더링하고 스크롤 위치를 프레임에 연결하는 기준선입니다. |
| [`kid-style.html`](kid-style.html) | SVG 필터와 낮은 프레임의 boil 효과를 적용한 어린이 손그림풍 비교안입니다. |
| [`svg-gsap.html`](svg-gsap.html) | 단일 장면에서 SVG 파츠와 GSAP ScrollTrigger 조합을 확인하는 최소 기준선입니다. |
| [`swap-test.html`](swap-test.html) | 공용 파츠 계약을 유지하면서 캐릭터 SVG를 교체할 수 있는지 검증하는 페이지입니다. |

### 데이터와 이미지 에셋

| 파일 | 설명 |
| --- | --- |
| [`nabi_scene1.json`](nabi_scene1.json) | `lottie.html`이 불러오는 단일 장면 Lottie 애니메이션 데이터입니다. |
| [`character-sheet.png`](character-sheet.png) | OpenCV 파츠 분리기의 예제 입력으로 사용하는 투명 배경 캐릭터 시트입니다. |
| [`new_char.svg`](new_char.svg) | `swap-test.html`에서 불러오는 자동 트레이싱 캐릭터 교체 실험용 SVG입니다. |
| [`Create_spritesheet_collage_elements_202608022347.png`](Create_spritesheet_collage_elements_202608022347.png) | 스프라이트 시트 제작 과정에서 보관한 1200×896 PNG 참조 이미지입니다. |
| [`Create_spritesheet_collage_elements_202608022347.jpeg`](Create_spritesheet_collage_elements_202608022347.jpeg) | 위 참조 이미지의 JPEG 버전이며 런타임에서는 직접 사용하지 않습니다. |

## 테스트

독립형 스타터의 데이터·컴포넌트·패럴랙스·런타임 계약은 다음 명령으로 검증합니다.

```bash
cd moving-story-starter
npm test
```

루트 [`tests`](tests/)에는 각 프로토타입의 DOM 계약을 확인하는 정적 테스트와 실제 입력·수명주기를 검증하는 브라우저 테스트가 있습니다. 브라우저 테스트는 Playwright가 제공되는 개발 환경을 전제로 합니다.
