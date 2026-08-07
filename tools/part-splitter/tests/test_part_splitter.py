from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

TOOL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL_DIR))

from part_splitter import (  # noqa: E402
    PartSplitterError,
    build_foreground_mask,
    find_parts,
    parse_background,
    split_file,
    split_image,
)


class MaskAndComponentTests(unittest.TestCase):
    def test_background_parser_accepts_modes_and_rgb_hex(self) -> None:
        self.assertEqual(parse_background("auto"), "auto")
        self.assertEqual(parse_background("transparent"), "transparent")
        self.assertEqual(parse_background("#12AbF0"), (0x12, 0xAB, 0xF0))

    def test_background_parser_rejects_invalid_value(self) -> None:
        with self.assertRaises(PartSplitterError):
            parse_background("green")

    def test_alpha_sheet_returns_two_parts_in_reading_order(self) -> None:
        image = np.zeros((80, 100, 4), dtype=np.uint8)
        image[5:25, 60:90] = (0, 0, 255, 255)
        image[40:70, 10:30] = (255, 0, 0, 255)

        mask, info = build_foreground_mask(image, "auto", 30)
        labels, parts = find_parts(mask, min_area=20)

        self.assertEqual(info["mode"], "transparent")
        self.assertEqual(labels.shape, mask.shape)
        self.assertEqual(
            [(part.x, part.y, part.width, part.height) for part in parts],
            [(60, 5, 30, 20), (10, 40, 20, 30)],
        )

    def test_auto_solid_background_ignores_small_noise(self) -> None:
        image = np.full((80, 100, 3), (0, 255, 0), dtype=np.uint8)
        image[10:30, 10:30] = (0, 0, 255)
        image[50:75, 60:90] = (255, 0, 0)
        image[35, 35] = (0, 0, 0)

        mask, info = build_foreground_mask(image, "auto", 30)
        _, parts = find_parts(mask, min_area=20)

        self.assertEqual(info["mode"], "solid")
        self.assertEqual(info["color"], "#00FF00")
        self.assertEqual(len(parts), 2)

    def test_explicit_rgb_background_is_applied(self) -> None:
        image = np.full((40, 50, 3), (255, 255, 255), dtype=np.uint8)
        image[10:30, 15:35] = (0, 0, 0)

        mask, info = build_foreground_mask(image, (255, 255, 255), 5)
        _, parts = find_parts(mask, min_area=10)

        self.assertEqual(info, {"mode": "solid", "color": "#FFFFFF"})
        self.assertEqual(len(parts), 1)

    def test_auto_rejects_nonuniform_corner_background(self) -> None:
        image = np.full((40, 40, 3), (255, 255, 255), dtype=np.uint8)
        image[0, 0] = (0, 0, 0)
        image[0, -1] = (0, 0, 255)
        image[-1, 0] = (0, 255, 0)
        image[-1, -1] = (255, 0, 0)

        with self.assertRaisesRegex(PartSplitterError, "모서리"):
            build_foreground_mask(image, "auto", 30)

    def test_transparent_mode_rejects_image_without_alpha(self) -> None:
        image = np.zeros((20, 20, 3), dtype=np.uint8)

        with self.assertRaisesRegex(PartSplitterError, "alpha"):
            build_foreground_mask(image, "transparent", 30)

    def test_find_parts_rejects_empty_foreground(self) -> None:
        with self.assertRaisesRegex(PartSplitterError, "파츠"):
            find_parts(np.zeros((20, 20), dtype=np.uint8), min_area=10)


class OutputTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @staticmethod
    def alpha_fixture() -> np.ndarray:
        image = np.zeros((80, 100, 4), dtype=np.uint8)
        image[5:25, 60:90] = (0, 0, 255, 255)
        image[40:70, 10:30] = (255, 0, 0, 255)
        return image

    def write_alpha_fixture(self) -> Path:
        source = self.root / "character-sheet.png"
        self.assertTrue(cv2.imwrite(str(source), self.alpha_fixture()))
        return source

    def test_split_writes_isolated_rgba_parts_and_manifest(self) -> None:
        source = self.write_alpha_fixture()
        output = self.root / "out"

        result = split_file(
            source,
            output,
            background="auto",
            tolerance=30,
            min_area=20,
            padding=3,
        )

        first = cv2.imread(str(output / "part-001.png"), cv2.IMREAD_UNCHANGED)
        manifest = json.loads((output / "manifest.json").read_text())
        preview = cv2.imread(str(output / "preview.png"), cv2.IMREAD_UNCHANGED)
        self.assertEqual(first.shape[2], 4)
        self.assertEqual(int(np.count_nonzero(first[:, :, 3])), 600)
        self.assertEqual(manifest["canvas"], {"width": 100, "height": 80})
        self.assertEqual(
            manifest["parts"][0]["bbox"],
            {"x": 60, "y": 5, "width": 30, "height": 20},
        )
        self.assertEqual(
            manifest["parts"][0]["crop"],
            {"x": 57, "y": 2, "width": 36, "height": 26},
        )
        self.assertEqual(manifest["parts"][0]["pivot"], {"x": 18, "y": 13})
        self.assertEqual(preview.shape[:2], (80, 100))
        self.assertEqual(result.part_count, 2)

    def test_crop_clamps_padding_and_excludes_neighbor(self) -> None:
        image = np.zeros((30, 30, 4), dtype=np.uint8)
        image[0:8, 0:8] = (0, 0, 255, 255)
        image[0:8, 12:20] = (255, 0, 0, 255)

        result = split_image(
            image,
            background="transparent",
            tolerance=30,
            min_area=5,
            padding=10,
            source_name="edge.png",
        )

        self.assertEqual(result.parts[0].crop["x"], 0)
        self.assertEqual(result.parts[0].crop["y"], 0)
        self.assertEqual(int(np.count_nonzero(result.crops[0][:, :, 3])), 64)
        self.assertEqual(
            np.unique(result.crops[0][:, :, 3]).tolist(),
            [0, 255],
        )

    def test_manifest_records_background_and_source(self) -> None:
        result = split_image(
            self.alpha_fixture(),
            background="auto",
            tolerance=17,
            min_area=20,
            padding=0,
            source_name="source.png",
        )

        self.assertEqual(result.manifest["version"], 1)
        self.assertEqual(result.manifest["source"], "source.png")
        self.assertEqual(
            result.manifest["background"],
            {"mode": "transparent", "color": None, "tolerance": 17},
        )


class CliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "sheet.png"
        image = np.zeros((40, 50, 4), dtype=np.uint8)
        image[10:30, 15:35] = (0, 0, 255, 255)
        self.assertTrue(cv2.imwrite(str(self.source), image))

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def run_cli(self, *arguments: object) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(TOOL_DIR / "part_splitter.py"),
                *(str(argument) for argument in arguments),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_cli_success_reports_part_count(self) -> None:
        output = self.root / "out"
        completed = self.run_cli(
            self.source,
            "--output",
            output,
            "--min-area",
            20,
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("1개", completed.stdout)
        self.assertTrue((output / "part-001.png").exists())

    def test_existing_output_is_preserved_without_overwrite(self) -> None:
        output = self.root / "out"
        output.mkdir()
        marker = output / "keep.txt"
        marker.write_text("keep", encoding="utf-8")

        completed = self.run_cli(
            self.source,
            "--output",
            output,
            "--min-area",
            20,
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertEqual(marker.read_text(encoding="utf-8"), "keep")
        self.assertFalse((output / "part-001.png").exists())

    def test_overwrite_replaces_only_splitter_outputs(self) -> None:
        output = self.root / "out"
        output.mkdir()
        (output / "keep.txt").write_text("keep", encoding="utf-8")
        (output / "part-999.png").write_bytes(b"old")
        (output / "preview.png").write_bytes(b"old")

        completed = self.run_cli(
            self.source,
            "--output",
            output,
            "--min-area",
            20,
            "--overwrite",
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual((output / "keep.txt").read_text(encoding="utf-8"), "keep")
        self.assertFalse((output / "part-999.png").exists())
        self.assertTrue((output / "part-001.png").exists())
        self.assertGreater((output / "preview.png").stat().st_size, 3)

    def test_cli_rejects_non_png_and_invalid_numbers(self) -> None:
        bad = self.root / "sheet.jpg"
        bad.write_bytes(b"not an image")

        non_png = self.run_cli(bad, "--output", self.root / "out")
        negative = self.run_cli(
            self.source,
            "--output",
            self.root / "out2",
            "--padding",
            -1,
        )

        self.assertNotEqual(non_png.returncode, 0)
        self.assertIn("PNG", non_png.stderr)
        self.assertNotEqual(negative.returncode, 0)
        self.assertIn("padding", negative.stderr)

    def test_processing_failure_leaves_no_partial_outputs(self) -> None:
        opaque = self.root / "opaque.png"
        image = np.full((30, 30, 3), 255, dtype=np.uint8)
        self.assertTrue(cv2.imwrite(str(opaque), image))
        output = self.root / "out"

        completed = self.run_cli(
            opaque,
            "--output",
            output,
            "--background",
            "transparent",
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("alpha", completed.stderr)
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
