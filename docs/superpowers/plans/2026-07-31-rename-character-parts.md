# Character Part Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 작성한 번호→의미 이름 매핑으로 PNG를 안전하게 변경하고 manifest를 현재 보존된 파츠와 동기화한다.

**Architecture:** 독립 CLI가 매핑·PNG·manifest의 완전 일치를 먼저 검증한다. 새 파일과 manifest를 staging한 뒤 기존 파일을 backup으로 이동하고 교체하며, 실패 시 원복한다.

**Tech Stack:** Python 3.12, pathlib, json, tempfile, shutil, unittest

## Global Constraints

- 현재 존재하는 모든 `part-*.png`에 정확히 하나의 이름이 있어야 한다.
- 이름은 소문자 영문·숫자·하이픈만 허용하고 중복을 금지한다.
- 삭제된 PNG의 manifest 항목은 결과에서 제외한다.
- 결과 manifest는 `id`, `file`을 새 이름으로 바꾸고 `sourceId`에 원 번호를 보존한다.
- 처리 실패 시 PNG와 manifest를 변경하지 않는다.
- 현재 디렉터리는 Git 저장소가 아니므로 commit 단계는 생략한다.

---

### Task 1: 검증과 안전한 리네이밍

**Files:**
- Create: `tools/part-splitter/rename_parts.py`
- Create: `tools/part-splitter/tests/test_rename_parts.py`
- Modify: `output/character/part-name-map.json`
- Modify: `output/character/manifest.json`
- Rename: `output/character/part-*.png`

**Interfaces:**
- Produces: `validate_rename(directory: Path, mapping_path: Path) -> RenamePlan`
- Produces: `apply_rename(plan: RenamePlan) -> None`
- Produces: CLI `rename_parts.py --directory DIR --mapping FILE`

- [ ] 실제 PNG 두 개와 삭제된 manifest 항목 fixture로 성공 테스트를 작성한다.
- [ ] 테스트를 실행해 `rename_parts` 모듈 부재로 실패를 확인한다.
- [ ] 매핑 누락·존재하지 않는 번호·중복·잘못된 이름·대상 충돌 시 무변경 테스트를 추가한다.
- [ ] 검증, staging, backup, rollback과 manifest version 2 변환을 구현한다.
- [ ] 테스트 전체 통과를 확인한다.
- [ ] 실제 매핑의 `part-020`을 `part-022`로 교정하고 dry validation을 실행한다.
- [ ] 실제 출력에 적용하고 PNG 21개, manifest 21개, sourceId 21개를 검증한다.
