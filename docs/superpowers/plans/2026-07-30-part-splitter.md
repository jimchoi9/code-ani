# OpenCV Part Splitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 투명 또는 균일한 단색 배경의 PNG 파츠 시트를 개별 투명 PNG, 검수 preview, 위치 manifest로 안전하게 분리하는 CLI를 만든다.

**Architecture:** `part_splitter.py`는 이미지 로드·배경 mask·component 추출·crop·manifest·preview·안전한 출력 교체를 작은 함수로 분리한다. Python 내장 `unittest`는 테스트 안에서 실제 PNG fixture를 생성하고 공개 함수와 CLI subprocess를 통해 사용자 관찰 결과를 검증한다.

**Tech Stack:** Python 3.11+, OpenCV headless, NumPy, unittest, argparse

## Global Constraints

- PNG만 입력으로 허용한다.
- 실제 alpha transparency 또는 균일한 단색 배경만 지원한다.
- 기본 tolerance는 30, min-area는 500, padding은 16이다.
- 파츠는 bounding box의 y, x 순으로 정렬한다.
- 기존 출력은 `--overwrite` 없이는 변경하지 않는다.
- `--overwrite`는 `part-*.png`, `preview.png`, `manifest.json`만 교체한다.
- 처리 실패 시 부분 산출물을 남기지 않는다.
- 현재 디렉터리는 Git 저장소가 아니므로 커밋 단계는 실행하지 않는다.

---

### Task 1: 배경 mask와 component 추출

**Files:**
- Create: `tools/part-splitter/requirements.txt`
- Create: `tools/part-splitter/part_splitter.py`
- Create: `tools/part-splitter/tests/test_part_splitter.py`

**Interfaces:**
- Produces: `parse_background(value: str) -> str | tuple[int, int, int]`
- Produces: `build_foreground_mask(image: np.ndarray, background, tolerance: int) -> tuple[np.ndarray, dict]`
- Produces: `find_parts(mask: np.ndarray, min_area: int) -> tuple[np.ndarray, list[Part]]`
- Produces: `Part(label, x, y, width, height, area)`

- [ ] **Step 1: alpha와 단색 배경의 실제 mask 결과를 검사하는 실패 테스트 작성**

```python
def test_alpha_sheet_returns_two_parts_in_reading_order(self):
    image = np.zeros((80, 100, 4), dtype=np.uint8)
    image[5:25, 60:90] = (0, 0, 255, 255)
    image[40:70, 10:30] = (255, 0, 0, 255)
    mask, info = build_foreground_mask(image, "auto", 30)
    labels, parts = find_parts(mask, min_area=20)
    self.assertEqual(info["mode"], "transparent")
    self.assertEqual([(p.x, p.y, p.width, p.height) for p in parts],
                     [(60, 5, 30, 20), (10, 40, 20, 30)])
```

```python
def test_auto_solid_background_ignores_small_noise(self):
    image = np.full((80, 100, 3), (0, 255, 0), dtype=np.uint8)
    image[10:30, 10:30] = (0, 0, 255)
    image[50:75, 60:90] = (255, 0, 0)
    image[35, 35] = (0, 0, 0)
    mask, info = build_foreground_mask(image, "auto", 30)
    labels, parts = find_parts(mask, min_area=20)
    self.assertEqual(info["mode"], "solid")
    self.assertEqual(len(parts), 2)
```

- [ ] **Step 2: 테스트를 실행해 모듈 부재로 실패 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: FAIL because `part_splitter.py` does not exist.

- [ ] **Step 3: 최소 mask와 component 구현**

```python
@dataclass(frozen=True)
class Part:
    label: int
    x: int
    y: int
    width: int
    height: int
    area: int

def find_parts(mask, min_area):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    parts = [
        Part(i, int(x), int(y), int(w), int(h), int(area))
        for i, (x, y, w, h, area) in enumerate(stats[1:], 1)
        if area >= min_area
    ]
    return labels, sorted(parts, key=lambda part: (part.y, part.x))
```

`build_foreground_mask`는 alpha가 실제로 0인 픽셀이 있으면 alpha를 사용하고, 그렇지 않으면 네 모서리 RGB 중앙값과 Euclidean distance를 사용한다. 3×3 opening과 closing을 각각 한 번 적용한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: alpha and solid background tests pass.

---

### Task 2: 파츠 PNG, preview와 manifest

**Files:**
- Modify: `tools/part-splitter/part_splitter.py`
- Modify: `tools/part-splitter/tests/test_part_splitter.py`

**Interfaces:**
- Consumes: `Part`, component label image
- Produces: `split_image(image, background, tolerance, min_area, padding) -> SplitResult`
- Produces: `write_split_result(result, source, output_dir) -> None`
- Produces: `SplitResult(parts, crops, preview, manifest)`

- [ ] **Step 1: 실제 출력 PNG와 manifest를 검사하는 실패 테스트 작성**

```python
def test_split_writes_isolated_rgba_parts_and_manifest(self):
    source = self.write_alpha_fixture()
    output = self.root / "out"
    result = split_file(source, output, background="auto",
                        tolerance=30, min_area=20, padding=3)
    first = cv2.imread(str(output / "part-001.png"), cv2.IMREAD_UNCHANGED)
    manifest = json.loads((output / "manifest.json").read_text())
    self.assertEqual(first.shape[2], 4)
    self.assertEqual(int(np.count_nonzero(first[:, :, 3])), 600)
    self.assertEqual(manifest["canvas"], {"width": 100, "height": 80})
    self.assertEqual(manifest["parts"][0]["bbox"],
                     {"x": 60, "y": 5, "width": 30, "height": 20})
    self.assertTrue((output / "preview.png").exists())
    self.assertEqual(result.part_count, 2)
```

- [ ] **Step 2: 테스트를 실행해 출력 API 부재로 실패 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: FAIL because `split_file` does not exist.

- [ ] **Step 3: crop, alpha, preview, manifest 구현**

각 파츠 crop은 padding으로 확장하고, 현재 component label과 일치하는 픽셀만 alpha 255로 둔다. preview는 밝은 회색 바탕에 원본을 합성하고 OpenCV rectangle/text로 번호를 그린다. manifest pivot은 crop 좌표계의 bbox 중심으로 계산한다.

- [ ] **Step 4: padding 경계와 인접 component 격리 테스트 추가**

```python
def test_crop_clamps_padding_and_excludes_neighbor(self):
    result = split_image(self.edge_fixture(), "transparent", 30, 5, 10)
    self.assertEqual(result.parts[0].crop["x"], 0)
    self.assertEqual(result.parts[0].crop["y"], 0)
    self.assertEqual(np.unique(result.crops[0][:, :, 3]).tolist(), [0, 255])
```

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: output, manifest, preview, padding tests pass.

---

### Task 3: CLI 검증과 안전한 overwrite

**Files:**
- Modify: `tools/part-splitter/part_splitter.py`
- Modify: `tools/part-splitter/tests/test_part_splitter.py`

**Interfaces:**
- Produces: `main(argv: Sequence[str] | None = None) -> int`
- Produces: CLI exit 0 on success, exit 2 on usage/input contract errors, exit 1 on processing failures

- [ ] **Step 1: 기존 출력 보호와 선택적 교체 실패 테스트 작성**

```python
def test_existing_output_is_preserved_without_overwrite(self):
    output = self.root / "out"
    output.mkdir()
    marker = output / "keep.txt"
    marker.write_text("keep")
    completed = self.run_cli(self.source, "--output", output)
    self.assertNotEqual(completed.returncode, 0)
    self.assertEqual(marker.read_text(), "keep")

def test_overwrite_replaces_only_splitter_outputs(self):
    output = self.root / "out"
    output.mkdir()
    (output / "keep.txt").write_text("keep")
    (output / "part-999.png").write_bytes(b"old")
    completed = self.run_cli(self.source, "--output", output, "--overwrite")
    self.assertEqual(completed.returncode, 0)
    self.assertEqual((output / "keep.txt").read_text(), "keep")
    self.assertFalse((output / "part-999.png").exists())
```

- [ ] **Step 2: CLI 테스트를 실행해 실패 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: FAIL because argparse and overwrite protection are missing.

- [ ] **Step 3: argparse, validation, staging output 구현**

`main`은 `.png` 확장자, 파일 존재, tolerance/min-area/padding 범위와 background 구문을 검사한다. 산출물은 출력 디렉터리의 임시 하위 디렉터리에 먼저 쓰고 성공 후 기존 splitter 산출물만 제거한 다음 `os.replace`로 이동한다.

- [ ] **Step 4: 잘못된 입력 계약 테스트 추가**

```python
def test_cli_rejects_non_png_and_invalid_numbers(self):
    bad = self.root / "sheet.jpg"
    bad.write_bytes(b"not an image")
    self.assertNotEqual(self.run_cli(bad, "--output", self.root / "out").returncode, 0)
    self.assertNotEqual(self.run_cli(self.source, "--output", self.root / "out2",
                                    "--padding", "-1").returncode, 0)
```

alpha 없는 이미지의 transparent 모드, 불균일한 네 모서리와 빈 mask도 각각 예외와 non-zero exit를 검증한다.

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `python -m unittest discover -s tools/part-splitter/tests -v`

Expected: all unit and CLI tests pass.

---

### Task 4: 설치 및 사용 문서와 실제 샘플 검증

**Files:**
- Create: `tools/part-splitter/README.md`
- Modify: `tools/part-splitter/requirements.txt`

**Interfaces:**
- Consumes: completed CLI
- Produces: reproducible virtualenv setup and usage guide

- [ ] **Step 1: 의존성 고정**

```text
numpy>=2.0,<3
opencv-python-headless>=4.10,<5
```

- [ ] **Step 2: README 작성**

README에는 virtualenv 생성, requirements 설치, alpha/단색 예제 명령, 입력 계약, 출력 구조, manifest 필드, 한계와 오류 해결을 포함한다.

- [ ] **Step 3: 전체 테스트와 help 실행**

Run:

```bash
.venv-part-splitter/bin/python -m unittest discover -s tools/part-splitter/tests -v
.venv-part-splitter/bin/python tools/part-splitter/part_splitter.py --help
```

Expected: all tests pass and help lists every specified option.

- [ ] **Step 4: 합성 샘플 end-to-end 실행**

테스트 fixture 생성 함수를 이용해 `/tmp`가 아닌 workspace의 임시 테스트 디렉터리에 PNG를 만들고 CLI를 실행한다. 출력 PNG alpha, preview 크기, manifest part count를 확인한 뒤 테스트 임시 디렉터리만 제거한다.
