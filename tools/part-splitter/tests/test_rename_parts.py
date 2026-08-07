from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


TOOL_DIR = Path(__file__).resolve().parents[1]
SCRIPT = TOOL_DIR / "rename_parts.py"


class RenamePartsCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.directory = Path(self.temporary.name)
        (self.directory / "part-001.png").write_bytes(b"head-image")
        (self.directory / "part-002.png").write_bytes(b"body-image")
        self.manifest = {
            "version": 1,
            "source": "sheet.png",
            "parts": [
                {"id": "part-001", "file": "part-001.png", "area": 100},
                {"id": "part-002", "file": "part-002.png", "area": 200},
                {"id": "part-003", "file": "part-003.png", "area": 300},
            ],
        }
        (self.directory / "manifest.json").write_text(
            json.dumps(self.manifest),
            encoding="utf-8",
        )
        self.mapping = self.directory / "part-name-map.json"
        self.mapping.write_text(
            json.dumps({"part-001": "head", "part-002": "body"}),
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def run_cli(self, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--directory",
                str(self.directory),
                "--mapping",
                str(self.mapping),
                *extra,
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    def assert_originals_unchanged(self) -> None:
        self.assertEqual(
            (self.directory / "part-001.png").read_bytes(),
            b"head-image",
        )
        self.assertEqual(
            (self.directory / "part-002.png").read_bytes(),
            b"body-image",
        )
        current_manifest = json.loads(
            (self.directory / "manifest.json").read_text(encoding="utf-8")
        )
        self.assertEqual(current_manifest, self.manifest)

    def write_mapping(self, mapping: dict[str, str]) -> None:
        self.mapping.write_text(json.dumps(mapping), encoding="utf-8")

    def test_renames_current_pngs_and_filters_manifest(self) -> None:
        completed = self.run_cli()

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual((self.directory / "head.png").read_bytes(), b"head-image")
        self.assertEqual((self.directory / "body.png").read_bytes(), b"body-image")
        self.assertFalse((self.directory / "part-001.png").exists())
        self.assertFalse((self.directory / "part-002.png").exists())
        manifest = json.loads(
            (self.directory / "manifest.json").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["version"], 2)
        self.assertEqual(
            manifest["parts"],
            [
                {
                    "id": "head",
                    "file": "head.png",
                    "sourceId": "part-001",
                    "area": 100,
                },
                {
                    "id": "body",
                    "file": "body.png",
                    "sourceId": "part-002",
                    "area": 200,
                },
            ],
        )

    def test_dry_run_validates_without_changing_files(self) -> None:
        completed = self.run_cli("--dry-run")

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("검증", completed.stdout)
        self.assert_originals_unchanged()
        self.assertFalse((self.directory / "head.png").exists())

    def test_rejects_mapping_missing_a_current_png_without_changes(self) -> None:
        self.write_mapping({"part-001": "head"})

        completed = self.run_cli()

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("매핑되지 않은 PNG", completed.stderr)
        self.assertNotIn("Traceback", completed.stderr)
        self.assert_originals_unchanged()

    def test_rejects_mapping_for_missing_png_without_changes(self) -> None:
        self.write_mapping(
            {
                "part-001": "head",
                "part-002": "body",
                "part-999": "ghost",
            }
        )

        completed = self.run_cli()

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("존재하지 않는 PNG", completed.stderr)
        self.assert_originals_unchanged()

    def test_rejects_duplicate_names_without_changes(self) -> None:
        self.write_mapping({"part-001": "character", "part-002": "character"})

        completed = self.run_cli()

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("중복", completed.stderr)
        self.assert_originals_unchanged()

    def test_rejects_invalid_name_without_changes(self) -> None:
        self.write_mapping({"part-001": "Head Front", "part-002": "body"})

        completed = self.run_cli()

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("소문자", completed.stderr)
        self.assert_originals_unchanged()

    def test_rejects_existing_destination_without_changes(self) -> None:
        (self.directory / "head.png").write_bytes(b"unrelated")

        completed = self.run_cli()

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("대상 파일", completed.stderr)
        self.assert_originals_unchanged()
        self.assertEqual((self.directory / "head.png").read_bytes(), b"unrelated")


if __name__ == "__main__":
    unittest.main()
