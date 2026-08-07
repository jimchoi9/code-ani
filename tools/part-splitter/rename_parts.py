#!/usr/bin/env python3
"""Rename numbered part PNGs and synchronize their manifest entries."""

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
from typing import Sequence


NAME_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class RenamePartsError(ValueError):
    """Raised before mutation when a rename contract is invalid."""


@dataclass(frozen=True)
class RenameItem:
    source_id: str
    source: Path
    name: str
    target: Path


@dataclass(frozen=True)
class RenamePlan:
    directory: Path
    manifest_path: Path
    items: tuple[RenameItem, ...]
    manifest: dict


def _read_json(path: Path, label: str) -> object:
    if not path.is_file():
        raise RenamePartsError(f"{label} 파일이 없습니다: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RenamePartsError(f"{label} JSON을 읽지 못했습니다: {error}") from error


def validate_rename(directory: Path, mapping_path: Path) -> RenamePlan:
    if not directory.is_dir():
        raise RenamePartsError(f"파츠 디렉터리가 없습니다: {directory}")

    raw_mapping = _read_json(mapping_path, "매핑")
    if not isinstance(raw_mapping, dict) or not raw_mapping:
        raise RenamePartsError("매핑은 비어 있지 않은 JSON object여야 합니다.")
    if not all(
        isinstance(source_id, str) and isinstance(name, str)
        for source_id, name in raw_mapping.items()
    ):
        raise RenamePartsError("매핑의 번호와 이름은 모두 문자열이어야 합니다.")
    mapping: dict[str, str] = raw_mapping

    invalid_names = sorted(
        name for name in mapping.values() if not NAME_PATTERN.fullmatch(name)
    )
    if invalid_names:
        raise RenamePartsError(
            "새 이름은 소문자 영문, 숫자, 하이픈만 사용할 수 있습니다: "
            + ", ".join(invalid_names)
        )
    duplicate_names = sorted(
        {name for name in mapping.values() if list(mapping.values()).count(name) > 1}
    )
    if duplicate_names:
        raise RenamePartsError("중복된 새 이름이 있습니다: " + ", ".join(duplicate_names))

    source_files = {
        path.stem: path for path in sorted(directory.glob("part-*.png"))
    }
    missing_mappings = sorted(set(source_files) - set(mapping))
    if missing_mappings:
        raise RenamePartsError(
            "매핑되지 않은 PNG가 있습니다: " + ", ".join(missing_mappings)
        )
    missing_pngs = sorted(set(mapping) - set(source_files))
    if missing_pngs:
        raise RenamePartsError(
            "존재하지 않는 PNG가 매핑에 있습니다: " + ", ".join(missing_pngs)
        )

    manifest_path = directory / "manifest.json"
    raw_manifest = _read_json(manifest_path, "manifest")
    if not isinstance(raw_manifest, dict) or not isinstance(
        raw_manifest.get("parts"), list
    ):
        raise RenamePartsError("manifest에 parts 배열이 없습니다.")
    manifest_ids = {
        part.get("id")
        for part in raw_manifest["parts"]
        if isinstance(part, dict)
    }
    missing_manifest = sorted(set(mapping) - manifest_ids)
    if missing_manifest:
        raise RenamePartsError(
            "manifest에 없는 파츠가 매핑에 있습니다: " + ", ".join(missing_manifest)
        )

    items = tuple(
        RenameItem(
            source_id=source_id,
            source=source_files[source_id],
            name=name,
            target=directory / f"{name}.png",
        )
        for source_id, name in mapping.items()
    )
    source_paths = {item.source for item in items}
    collisions = sorted(
        item.target.name
        for item in items
        if item.target.exists() and item.target not in source_paths
    )
    if collisions:
        raise RenamePartsError(
            "이미 존재하는 대상 파일과 충돌합니다: " + ", ".join(collisions)
        )

    renamed_parts = []
    for part in raw_manifest["parts"]:
        if not isinstance(part, dict) or part.get("id") not in mapping:
            continue
        source_id = part["id"]
        name = mapping[source_id]
        renamed_parts.append(
            {
                "id": name,
                "file": f"{name}.png",
                "sourceId": source_id,
                **{
                    key: value
                    for key, value in part.items()
                    if key not in {"id", "file", "sourceId"}
                },
            }
        )
    renamed_manifest = {
        **raw_manifest,
        "version": 2,
        "parts": renamed_parts,
    }
    return RenamePlan(
        directory=directory,
        manifest_path=manifest_path,
        items=items,
        manifest=renamed_manifest,
    )


def apply_rename(plan: RenamePlan) -> None:
    stage = Path(tempfile.mkdtemp(prefix=".rename-stage-", dir=plan.directory))
    backup = Path(tempfile.mkdtemp(prefix=".rename-backup-", dir=plan.directory))
    installed: list[Path] = []
    backed_up: list[tuple[Path, Path]] = []
    try:
        for item in plan.items:
            shutil.copy2(item.source, stage / item.target.name)
        (stage / "manifest.json").write_text(
            json.dumps(plan.manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        originals = [item.source for item in plan.items]
        originals.append(plan.manifest_path)
        for source in originals:
            backup_path = backup / source.name
            os.replace(source, backup_path)
            backed_up.append((backup_path, source))

        staged_files = [stage / item.target.name for item in plan.items]
        staged_files.append(stage / "manifest.json")
        for staged in staged_files:
            target = plan.directory / staged.name
            os.replace(staged, target)
            installed.append(target)
    except Exception:
        for target in reversed(installed):
            if target.exists() or target.is_symlink():
                target.unlink()
        for backup_path, source in reversed(backed_up):
            if backup_path.exists() or backup_path.is_symlink():
                os.replace(backup_path, source)
        raise
    finally:
        shutil.rmtree(stage, ignore_errors=True)
        shutil.rmtree(backup, ignore_errors=True)


def rename_parts(
    directory: Path,
    mapping_path: Path,
    dry_run: bool = False,
) -> int:
    plan = validate_rename(directory, mapping_path)
    if not dry_run:
        apply_rename(plan)
    return len(plan.items)


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="번호 기반 파츠 PNG를 의미 기반 이름으로 변경합니다."
    )
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--mapping", required=True, type=Path)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="검증만 수행하고 파일을 변경하지 않음",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    arguments = build_argument_parser().parse_args(argv)
    try:
        count = rename_parts(
            arguments.directory,
            arguments.mapping,
            dry_run=arguments.dry_run,
        )
    except (RenamePartsError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    if arguments.dry_run:
        print(f"검증 완료: {count}개 파츠를 변경할 수 있습니다.")
    else:
        print(f"{count}개 파츠의 이름과 manifest를 변경했습니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
