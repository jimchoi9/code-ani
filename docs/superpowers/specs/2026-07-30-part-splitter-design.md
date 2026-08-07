# OpenCV 파츠 시트 자동 분리기 설계

## 목적

투명 배경 또는 단색 배경 위에 서로 떨어져 배치된 캐릭터 파츠 시트를 입력받아 각 파츠를 투명 PNG로 분리한다. 분리 결과의 원본 위치와 기본 회전축 후보를 JSON으로 보존하고, 사람이 결과를 빠르게 검수할 수 있는 번호 표시 preview를 함께 만든다.

이 도구는 캐릭터 의미를 추론하거나 관절을 자동 리깅하지 않는다. 컴퓨터 비전으로 안정적으로 처리할 수 있는 foreground 분리와 connected component 추출까지만 담당한다.

## 입력 계약

- 입력 형식은 PNG다.
- 입력 배경은 실제 alpha transparency 또는 하나의 균일한 단색이다.
- 각 파츠는 다른 파츠와 픽셀 단위로 닿지 않아야 한다.
- 그림자, 라벨, 설명선, 체크무늬 배경과 장식 요소를 포함하지 않는다.
- 단색 배경과 파츠의 주요 색상이 충분히 달라야 한다.
- 관절 파츠는 회전 시 틈이 생기지 않도록 연결부 아래의 숨은 영역까지 포함한다.

JPEG, 그라데이션, 사진 배경, 이미지에 구워진 체크무늬와 서로 겹친 파츠는 1차 버전에서 지원하지 않는다.

## CLI

실행 진입점은 `tools/part-splitter/part_splitter.py`다.

```bash
python tools/part-splitter/part_splitter.py character-sheet.png \
  --background auto \
  --tolerance 30 \
  --min-area 500 \
  --padding 16 \
  --output output/character
```

옵션:

- `input`: 필수 PNG 경로
- `--output`: 필수 출력 디렉터리
- `--background`: `auto`, `transparent`, `#RRGGBB` 중 하나, 기본값 `auto`
- `--tolerance`: 단색 배경과 foreground를 구분할 RGB 거리, 기본값 30
- `--min-area`: 저장할 connected component의 최소 픽셀 면적, 기본값 500
- `--padding`: crop 외곽의 투명 여백, 기본값 16
- `--overwrite`: 기존 출력 디렉터리의 splitter 산출물을 교체할 때만 사용

잘못된 입력, 지원하지 않는 확장자, 비어 있는 mask, 파츠 0개, 유효하지 않은 색상이나 음수 옵션은 명확한 오류 메시지와 non-zero exit code를 반환한다.

## 처리 흐름

### 이미지와 배경 판별

OpenCV의 `IMREAD_UNCHANGED`로 PNG를 읽어 alpha 채널을 보존한다.

- `transparent`: alpha가 0보다 큰 픽셀을 foreground 후보로 사용한다.
- `#RRGGBB`: 지정 색상과 각 픽셀의 RGB Euclidean distance가 tolerance보다 큰 픽셀을 foreground로 사용한다.
- `auto`: 실제 투명 픽셀이 존재하면 alpha 방식을 선택한다. 그렇지 않으면 네 모서리의 RGB 중앙값을 배경색으로 사용한다.

`transparent`가 지정됐지만 alpha 채널이 없으면 실패한다. `auto` 단색 모드에서 네 모서리의 색상 편차가 tolerance보다 크면 균일한 배경이 아닌 것으로 판단해 실패한다.

### mask 정리

foreground mask는 8-bit binary mask로 만든다.

- 3×3 opening 1회로 작은 isolated noise를 제거한다.
- 3×3 closing 1회로 외곽선 내부의 1px 수준 단절을 보정한다.
- connected component 면적이 `min-area`보다 작으면 제외한다.

파츠 내부의 눈, 입, 색상 영역은 채워진 캐릭터 실루엣과 연결되므로 하나의 component로 유지된다. 배경과 같은 색을 캐릭터 내부에서 사용하면 해당 영역의 alpha가 뚫릴 수 있다는 제한을 문서와 경고에 명시한다.

### crop과 alpha

각 component의 bounding box에 padding을 더하되 원본 캔버스를 넘지 않는다. 출력 RGB는 원본 픽셀을 유지하고 component mask를 alpha 채널로 사용한다. 다른 component가 crop 범위 안에 들어오더라도 현재 component mask 외부는 투명하게 처리한다.

파츠는 bounding box의 `y`, 그다음 `x` 기준으로 정렬하고 `part-001.png`부터 순차 저장한다.

### preview와 manifest

`preview.png`는 원본 위에 각 component의 bounding box와 `001`, `002` 번호를 표시한다. 배경이 투명한 입력은 밝은 체크무늬가 아닌 단색 검수 배경 위에 합성해 표시한다.

`manifest.json`은 다음 구조를 사용한다.

```json
{
  "version": 1,
  "source": "character-sheet.png",
  "background": {
    "mode": "transparent",
    "color": null,
    "tolerance": 30
  },
  "canvas": {
    "width": 2048,
    "height": 2048
  },
  "parts": [
    {
      "id": "part-001",
      "file": "part-001.png",
      "bbox": {
        "x": 120,
        "y": 80,
        "width": 360,
        "height": 410
      },
      "crop": {
        "x": 104,
        "y": 64,
        "width": 392,
        "height": 442
      },
      "pivot": {
        "x": 180,
        "y": 205
      },
      "area": 98214
    }
  ]
}
```

`pivot`은 파츠 crop 좌표계 기준 bounding box 중심이다. 자동 리깅 확정값이 아니라 사람이 수정할 기본값이다.

## 출력 안전성

도구는 출력 디렉터리 전체를 임의로 삭제하지 않는다.

- 출력 디렉터리가 없으면 생성한다.
- 출력 디렉터리에 splitter 산출물이 없고 비어 있으면 그대로 사용한다.
- splitter 산출물이 있거나 다른 파일이 존재하면 `--overwrite` 없이는 실패한다.
- `--overwrite`가 있으면 `part-*.png`, `preview.png`, `manifest.json`만 교체하고 관계없는 파일은 보존한다.
- 처리 중에는 임시 하위 디렉터리에 결과를 생성하고 성공한 뒤 대상 산출물을 교체해 부분 결과를 남기지 않는다.

## 프로젝트 구조

```text
tools/part-splitter/
├── README.md
├── requirements.txt
├── part_splitter.py
└── tests/
    └── test_part_splitter.py
```

`requirements.txt`는 `opencv-python-headless`와 호환되는 NumPy 범위를 고정한다. 테스트는 Python 내장 `unittest`를 사용해 별도 테스트 프레임워크 의존성을 추가하지 않는다.

## 테스트

합성 PNG fixture를 테스트 안에서 생성하고 임시 디렉터리에서 실행한다.

- alpha 배경의 두 파츠를 각각 투명 PNG로 분리한다.
- 초록색 단색 배경을 자동 감지해 두 파츠를 분리한다.
- 작은 noise component를 `min-area`로 제외한다.
- 파츠를 위→아래, 왼쪽→오른쪽으로 정렬한다.
- padding이 캔버스 경계를 넘지 않는다.
- crop 안에 인접 component가 있어도 현재 파츠 출력에는 포함되지 않는다.
- manifest의 bbox, crop, canvas, area와 기본 pivot이 정확하다.
- preview가 생성되고 원본 크기를 유지한다.
- alpha 없는 이미지에 `transparent` 모드를 사용하면 실패한다.
- 균일하지 않은 모서리를 `auto`로 판별하면 실패한다.
- 기존 출력 파일이 있으면 기본 실행은 실패한다.
- `--overwrite`는 splitter 산출물만 교체하고 관계없는 파일을 보존한다.
- 비 PNG 입력과 잘못된 CLI 옵션은 non-zero exit code를 반환한다.

## 성공 기준

- 입력 계약을 만족하는 합성 및 실제 파츠 시트에서 파츠 수가 정확하다.
- 출력 PNG는 원본 RGB 품질을 유지하고 배경과 다른 파츠가 투명하다.
- manifest만으로 각 파츠를 원본 캔버스 위치에 다시 합성할 수 있다.
- 실패 입력은 부분 산출물을 남기지 않는다.
- 기존 관계없는 파일을 삭제하지 않는다.
