#!/usr/bin/env python3
"""Split a simple character parts sheet into disconnected components."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence, TypeAlias

import cv2
import numpy as np

Background: TypeAlias = str | tuple[int, int, int]


class PartSplitterError(ValueError):
    """Raised when the input does not satisfy the splitter contract."""


@dataclass(frozen=True)
class Part:
    label: int
    x: int
    y: int
    width: int
    height: int
    area: int


@dataclass(frozen=True)
class OutputPart:
    component: Part
    id: str
    file: str
    crop: dict[str, int]


@dataclass
class SplitResult:
    parts: list[OutputPart]
    crops: list[np.ndarray]
    preview: np.ndarray
    manifest: dict

    @property
    def part_count(self) -> int:
        return len(self.parts)


def parse_background(value: str) -> Background:
    normalized = value.strip()
    if normalized in {"auto", "transparent"}:
        return normalized
    if re.fullmatch(r"#[0-9a-fA-F]{6}", normalized):
        return tuple(
            int(normalized[index : index + 2], 16) for index in (1, 3, 5)
        )
    raise PartSplitterError(
        "background는 auto, transparent 또는 #RRGGBB 형식이어야 합니다."
    )


def _validate_image(image: np.ndarray) -> None:
    if image.dtype != np.uint8:
        raise PartSplitterError("8-bit PNG 이미지만 지원합니다.")
    if image.ndim != 3 or image.shape[2] not in (3, 4):
        raise PartSplitterError("RGB 또는 RGBA PNG 이미지만 지원합니다.")


def _corner_samples(bgr: np.ndarray) -> np.ndarray:
    height, width = bgr.shape[:2]
    size = max(1, min(5, height // 4, width // 4))
    patches = (
        bgr[:size, :size],
        bgr[:size, width - size :],
        bgr[height - size :, :size],
        bgr[height - size :, width - size :],
    )
    return np.concatenate([patch.reshape(-1, 3) for patch in patches], axis=0)


def _solid_background_mask(
    image: np.ndarray,
    rgb: tuple[int, int, int],
    tolerance: int,
) -> np.ndarray:
    bgr = image[:, :, :3].astype(np.int16)
    background_bgr = np.array(rgb[::-1], dtype=np.int16)
    distance = np.linalg.norm(bgr - background_bgr, axis=2)
    return np.where(distance > tolerance, 255, 0).astype(np.uint8)


def build_foreground_mask(
    image: np.ndarray,
    background: Background,
    tolerance: int,
) -> tuple[np.ndarray, dict[str, str]]:
    _validate_image(image)
    if tolerance < 0:
        raise PartSplitterError("tolerance는 0 이상이어야 합니다.")

    has_alpha = image.shape[2] == 4
    has_transparency = has_alpha and bool(np.any(image[:, :, 3] < 255))

    if background == "transparent" or (background == "auto" and has_transparency):
        if not has_alpha:
            raise PartSplitterError("transparent 모드는 alpha 채널이 필요합니다.")
        if not has_transparency:
            raise PartSplitterError("alpha 채널에 실제 투명 픽셀이 없습니다.")
        mask = np.where(image[:, :, 3] > 0, 255, 0).astype(np.uint8)
        info = {"mode": "transparent"}
    else:
        if background == "auto":
            samples = _corner_samples(image[:, :, :3])
            median_bgr = np.median(samples, axis=0)
            deviations = np.linalg.norm(
                samples.astype(np.float32) - median_bgr.astype(np.float32), axis=1
            )
            if float(np.max(deviations)) > tolerance:
                raise PartSplitterError(
                    "네 모서리의 배경색이 균일하지 않습니다. "
                    "--background 색상을 직접 지정해 보세요."
                )
            bgr = tuple(int(round(value)) for value in median_bgr)
            rgb = bgr[::-1]
        else:
            if not isinstance(background, tuple) or len(background) != 3:
                raise PartSplitterError("올바르지 않은 background 값입니다.")
            rgb = background
        mask = _solid_background_mask(image, rgb, tolerance)
        info = {"mode": "solid", "color": f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"}

    kernel = np.ones((3, 3), dtype=np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    return mask, info


def find_parts(
    mask: np.ndarray,
    min_area: int,
) -> tuple[np.ndarray, list[Part]]:
    if min_area <= 0:
        raise PartSplitterError("min-area는 1 이상이어야 합니다.")
    if mask.ndim != 2 or mask.dtype != np.uint8:
        raise PartSplitterError("mask는 8-bit 단일 채널이어야 합니다.")

    _, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    parts = [
        Part(
            label=label,
            x=int(stats[label, cv2.CC_STAT_LEFT]),
            y=int(stats[label, cv2.CC_STAT_TOP]),
            width=int(stats[label, cv2.CC_STAT_WIDTH]),
            height=int(stats[label, cv2.CC_STAT_HEIGHT]),
            area=int(stats[label, cv2.CC_STAT_AREA]),
        )
        for label in range(1, stats.shape[0])
        if int(stats[label, cv2.CC_STAT_AREA]) >= min_area
    ]
    parts.sort(key=lambda part: (part.y, part.x))
    if not parts:
        raise PartSplitterError(
            "min-area 조건을 만족하는 파츠를 찾지 못했습니다."
        )
    return labels, parts


def _make_preview(image: np.ndarray, parts: list[Part]) -> np.ndarray:
    preview = np.full((*image.shape[:2], 3), 245, dtype=np.uint8)
    if image.shape[2] == 4:
        alpha = image[:, :, 3:4].astype(np.float32) / 255.0
        preview = np.clip(
            image[:, :, :3].astype(np.float32) * alpha
            + preview.astype(np.float32) * (1.0 - alpha),
            0,
            255,
        ).astype(np.uint8)
    else:
        preview = image[:, :, :3].copy()

    for index, part in enumerate(parts, start=1):
        end = (part.x + part.width - 1, part.y + part.height - 1)
        cv2.rectangle(preview, (part.x, part.y), end, (255, 0, 255), 1)
        label_y = max(12, part.y - 4)
        cv2.putText(
            preview,
            f"{index:03d}",
            (part.x, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (255, 0, 255),
            1,
            cv2.LINE_AA,
        )
    return preview


def split_image(
    image: np.ndarray,
    background: Background = "auto",
    tolerance: int = 30,
    min_area: int = 500,
    padding: int = 16,
    source_name: str = "image.png",
) -> SplitResult:
    if padding < 0:
        raise PartSplitterError("padding은 0 이상이어야 합니다.")
    if isinstance(background, str):
        background = parse_background(background)

    mask, background_info = build_foreground_mask(image, background, tolerance)
    labels, components = find_parts(mask, min_area)
    height, width = image.shape[:2]
    crops: list[np.ndarray] = []
    output_parts: list[OutputPart] = []
    manifest_parts: list[dict] = []

    for index, component in enumerate(components, start=1):
        crop_x = max(0, component.x - padding)
        crop_y = max(0, component.y - padding)
        crop_right = min(width, component.x + component.width + padding)
        crop_bottom = min(height, component.y + component.height + padding)
        crop_width = crop_right - crop_x
        crop_height = crop_bottom - crop_y

        source_crop = image[crop_y:crop_bottom, crop_x:crop_right, :3]
        component_alpha = np.where(
            labels[crop_y:crop_bottom, crop_x:crop_right] == component.label,
            255,
            0,
        ).astype(np.uint8)
        rgba_crop = np.dstack((source_crop, component_alpha))
        part_id = f"part-{index:03d}"
        filename = f"{part_id}.png"
        crop_data = {
            "x": crop_x,
            "y": crop_y,
            "width": crop_width,
            "height": crop_height,
        }
        bbox = {
            "x": component.x,
            "y": component.y,
            "width": component.width,
            "height": component.height,
        }
        pivot = {
            "x": component.x + component.width // 2 - crop_x,
            "y": component.y + component.height // 2 - crop_y,
        }

        crops.append(rgba_crop)
        output_parts.append(
            OutputPart(
                component=component,
                id=part_id,
                file=filename,
                crop=crop_data,
            )
        )
        manifest_parts.append(
            {
                "id": part_id,
                "file": filename,
                "bbox": bbox,
                "crop": crop_data,
                "pivot": pivot,
                "area": component.area,
            }
        )

    manifest = {
        "version": 1,
        "source": source_name,
        "background": {
            "mode": background_info["mode"],
            "color": background_info.get("color"),
            "tolerance": tolerance,
        },
        "canvas": {"width": width, "height": height},
        "parts": manifest_parts,
    }
    return SplitResult(
        parts=output_parts,
        crops=crops,
        preview=_make_preview(image, components),
        manifest=manifest,
    )


def write_split_result(
    result: SplitResult,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for part, crop in zip(result.parts, result.crops, strict=True):
        if not cv2.imwrite(str(output_dir / part.file), crop):
            raise PartSplitterError(f"PNG를 저장하지 못했습니다: {part.file}")
    if not cv2.imwrite(str(output_dir / "preview.png"), result.preview):
        raise PartSplitterError("preview.png를 저장하지 못했습니다.")
    (output_dir / "manifest.json").write_text(
        json.dumps(result.manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def split_file(
    source: str | Path,
    output_dir: str | Path,
    background: Background = "auto",
    tolerance: int = 30,
    min_area: int = 500,
    padding: int = 16,
    overwrite: bool = False,
) -> SplitResult:
    source_path = Path(source)
    destination = Path(output_dir)
    if source_path.suffix.lower() != ".png":
        raise PartSplitterError("입력 파일은 PNG 확장자여야 합니다.")
    if not source_path.is_file():
        raise PartSplitterError(f"입력 PNG 파일이 없습니다: {source_path}")
    if destination.exists() and not destination.is_dir():
        raise PartSplitterError(f"출력 경로가 디렉터리가 아닙니다: {destination}")
    if destination.exists() and any(destination.iterdir()) and not overwrite:
        raise PartSplitterError(
            "출력 디렉터리가 비어 있지 않습니다. 교체하려면 --overwrite를 사용하세요."
        )

    image = cv2.imread(str(source_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise PartSplitterError(f"PNG 이미지를 읽지 못했습니다: {source_path}")
    result = split_image(
        image,
        background=background,
        tolerance=tolerance,
        min_area=min_area,
        padding=padding,
        source_name=source_path.name,
    )
    _commit_split_result(result, destination, overwrite)
    return result


def _splitter_targets(output_dir: Path) -> list[Path]:
    targets = list(output_dir.glob("part-*.png"))
    targets.extend(output_dir / name for name in ("preview.png", "manifest.json"))
    return sorted(
        (path for path in targets if path.exists() or path.is_symlink()),
        key=lambda path: path.name,
    )


def _commit_split_result(
    result: SplitResult,
    output_dir: Path,
    overwrite: bool,
) -> None:
    created_output = not output_dir.exists()
    output_dir.mkdir(parents=True, exist_ok=True)
    stage_dir = Path(tempfile.mkdtemp(prefix=".part-splitter-stage-", dir=output_dir))
    backup_dir = Path(
        tempfile.mkdtemp(prefix=".part-splitter-backup-", dir=output_dir)
    )
    installed: list[Path] = []
    backed_up: list[tuple[Path, Path]] = []
    try:
        write_split_result(result, stage_dir)
        existing_targets = _splitter_targets(output_dir) if overwrite else []
        for target in existing_targets:
            if target.is_dir() and not target.is_symlink():
                raise PartSplitterError(
                    f"splitter 산출물 이름과 충돌하는 디렉터리가 있습니다: {target.name}"
                )
            backup = backup_dir / target.name
            os.replace(target, backup)
            backed_up.append((backup, target))

        for staged in sorted(stage_dir.iterdir(), key=lambda path: path.name):
            target = output_dir / staged.name
            os.replace(staged, target)
            installed.append(target)
    except Exception:
        for target in reversed(installed):
            if target.exists() or target.is_symlink():
                target.unlink()
        for backup, target in reversed(backed_up):
            if backup.exists() or backup.is_symlink():
                os.replace(backup, target)
        raise
    finally:
        shutil.rmtree(stage_dir, ignore_errors=True)
        shutil.rmtree(backup_dir, ignore_errors=True)
        if created_output:
            try:
                output_dir.rmdir()
            except OSError:
                pass


def _non_negative_integer(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("0 이상의 정수여야 합니다.") from error
    if parsed < 0:
        raise argparse.ArgumentTypeError("0 이상의 정수여야 합니다.")
    return parsed


def _positive_integer(value: str) -> int:
    parsed = _non_negative_integer(value)
    if parsed == 0:
        raise argparse.ArgumentTypeError("1 이상의 정수여야 합니다.")
    return parsed


def _background_argument(value: str) -> Background:
    try:
        return parse_background(value)
    except PartSplitterError as error:
        raise argparse.ArgumentTypeError(str(error)) from error


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "투명 또는 균일한 단색 배경의 PNG 파츠 시트를 "
            "개별 투명 PNG로 분리합니다."
        )
    )
    parser.add_argument("input", type=Path, help="입력 PNG 파일")
    parser.add_argument("--output", required=True, type=Path, help="출력 디렉터리")
    parser.add_argument(
        "--background",
        default="auto",
        type=_background_argument,
        metavar="auto|transparent|#RRGGBB",
        help="배경 판별 방식 또는 RGB 색상 (기본값: auto)",
    )
    parser.add_argument(
        "--tolerance",
        default=30,
        type=_non_negative_integer,
        help="배경색 RGB 거리 허용값 (기본값: 30)",
    )
    parser.add_argument(
        "--min-area",
        default=500,
        type=_positive_integer,
        help="최소 component 면적 (기본값: 500)",
    )
    parser.add_argument(
        "--padding",
        default=16,
        type=_non_negative_integer,
        help="crop 투명 여백 (기본값: 16)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="기존 splitter 산출물만 안전하게 교체",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_argument_parser()
    arguments = parser.parse_args(argv)
    if arguments.input.suffix.lower() != ".png":
        parser.error("입력 파일은 PNG 확장자여야 합니다.")
    if not arguments.input.is_file():
        parser.error(f"입력 PNG 파일이 없습니다: {arguments.input}")

    try:
        result = split_file(
            arguments.input,
            arguments.output,
            background=arguments.background,
            tolerance=arguments.tolerance,
            min_area=arguments.min_area,
            padding=arguments.padding,
            overwrite=arguments.overwrite,
        )
    except (PartSplitterError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print(
        f"{result.part_count}개 파츠를 저장했습니다: "
        f"{arguments.output.resolve()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
