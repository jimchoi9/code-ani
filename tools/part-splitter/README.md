# OpenCV 파츠 시트 분리기

투명 배경 또는 균일한 단색 배경 위에 **서로 떨어져 배치된 파츠**를
개별 투명 PNG로 분리하는 작은 CLI 도구입니다. 각 파츠의 원본 위치와
기본 pivot을 담은 `manifest.json`, 번호가 표시된 `preview.png`도 함께
생성합니다.

이 도구는 파츠의 의미(머리, 팔, 표정 등)를 추론하거나 자동 리깅하지
않습니다. 안정적으로 자동화할 수 있는 배경 제거와 connected component
분리까지만 담당합니다.

## 설치

프로젝트 루트에서 실행합니다.

```bash
python3 -m venv .venv-part-splitter
.venv-part-splitter/bin/python -m pip install \
  -r tools/part-splitter/requirements.txt
```

Windows PowerShell에서는 가상환경의 Python 경로를
`.venv-part-splitter\Scripts\python.exe`로 바꾸면 됩니다.

## 빠른 사용법

배경을 자동 판별하려면:

```bash
.venv-part-splitter/bin/python \
  tools/part-splitter/part_splitter.py character-sheet.png \
  --output output/character
```

실제 alpha 투명 배경임을 명시하려면:

```bash
.venv-part-splitter/bin/python \
  tools/part-splitter/part_splitter.py character-sheet.png \
  --background transparent \
  --min-area 500 \
  --padding 16 \
  --output output/character
```

흰색이나 초록색 같은 단색 배경을 직접 지정할 수도 있습니다.

```bash
.venv-part-splitter/bin/python \
  tools/part-splitter/part_splitter.py character-sheet.png \
  --background "#FFFFFF" \
  --tolerance 30 \
  --output output/character
```

쉘이 `#`을 주석으로 해석하지 않도록 RGB 값은 따옴표로 감싸는 편이
안전합니다.

## 옵션

```text
input                   입력 PNG 파일
--output DIR            필수 출력 디렉터리
--background VALUE      auto, transparent, #RRGGBB (기본: auto)
--tolerance N           배경색과의 RGB 거리 허용값 (기본: 30)
--min-area N            저장할 최소 component 면적 (기본: 500)
--padding N             crop 주변 투명 여백 (기본: 16)
--overwrite             기존 splitter 산출물만 교체
```

`auto`는 이미지에 실제 투명 픽셀이 있으면 alpha를 사용합니다. 그렇지
않으면 네 모서리 영역의 중앙 색을 단색 배경으로 추정합니다. 모서리의
색상 차이가 `tolerance`보다 크면 잘못 분리하는 대신 오류로 중단합니다.

## 입력 시트 제작 규칙

- PNG만 사용합니다.
- 실제 투명 배경 또는 하나의 균일한 단색 배경을 사용합니다.
- 각 파츠 사이에 투명/배경 픽셀 간격을 둡니다.
- 그림자, 라벨, 설명선, 장식은 넣지 않습니다.
- 파츠 내부에서 배경과 같은 색을 써야 한다면 투명 배경을 권장합니다.
- 관절 파츠는 회전할 때 틈이 생기지 않도록 숨은 연결 영역까지 그립니다.

JPEG, 사진·그라데이션 배경, 이미지에 구워진 체크무늬, 서로 닿거나 겹친
파츠는 지원하지 않습니다. 예를 들어 현재 샘플 `character1.png`처럼
그라데이션이 있는 캐릭터 시트는 먼저 실제 투명 배경이나 완전한 단색
배경 PNG로 다시 내보내야 합니다.

## 출력

```text
output/character/
├── part-001.png
├── part-002.png
├── ...
├── preview.png
└── manifest.json
```

파츠는 위에서 아래로, 같은 높이에서는 왼쪽에서 오른쪽으로 번호가
붙습니다. 각 PNG는 현재 component만 불투명하며, padding 안에 들어온
다른 파츠는 투명 처리됩니다.

`manifest.json`의 주요 필드는 다음과 같습니다.

- `canvas`: 원본 캔버스 크기
- `background`: 실제 사용한 배경 판별 방식, 색상, tolerance
- `bbox`: 원본 캔버스 기준 파츠 경계
- `crop`: 원본 캔버스 기준 저장 영역
- `pivot`: crop 좌표계 기준 bbox 중심
- `area`: foreground component 픽셀 수

`pivot`은 자동 리깅 결과가 아니라 후속 애니메이션 작업에서 사람이
수정할 기본값입니다.

## 기존 출력 보호

출력 디렉터리가 비어 있지 않으면 기본 실행은 중단됩니다.
`--overwrite`를 사용하면 다음 파일만 staging 후 교체합니다.

- `part-*.png`
- `preview.png`
- `manifest.json`

그 밖의 파일은 보존합니다. 새 산출물 저장 도중 실패하면 기존 splitter
산출물을 복원합니다.

## 조정 가이드

- 작은 점이나 글자가 파츠로 잡힘: `--min-area`를 올립니다.
- 얇은 외곽선이 빠짐: `--tolerance`를 조금 낮춥니다.
- 배경 얼룩이 foreground로 잡힘: 배경을 균일하게 만들거나
  `--background "#RRGGBB"`를 명시합니다.
- 한 파츠가 여러 파일로 나뉨: 원본에서 끊어진 선이나 투명 틈을
  연결합니다.
- 여러 파츠가 한 파일로 합쳐짐: 원본에서 파츠 사이를 더 띄웁니다.

## 테스트

```bash
.venv-part-splitter/bin/python -m unittest discover \
  -s tools/part-splitter/tests -v
```
