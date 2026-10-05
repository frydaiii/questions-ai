"""Shared file discovery and JSON parsing for the AIF-C01 question bank tooling.

Every loader function returns a list of Record objects. A Record carries the
parsed data (or None on parse failure) plus enough location info (file path,
and index within the file's top-level array) for validators to produce
precise, actionable error messages.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
BLUEPRINT_PATH = REPO_ROOT / "blueprint.json"
SCHEMA_DIR = REPO_ROOT / "schema"
THEORY_DIR = REPO_ROOT / "data" / "theory"
QUESTIONS_DIR = REPO_ROOT / "data" / "questions"
CASE_STUDIES_DIR = REPO_ROOT / "data" / "case-studies"


@dataclass
class LoadError:
    file: Path
    message: str
    index: Optional[int] = None  # position within a top-level JSON array, if applicable

    def location(self) -> str:
        rel = self._rel_path()
        if self.index is not None:
            return f"{rel}[{self.index}]"
        return rel

    def _rel_path(self) -> str:
        try:
            return str(self.file.relative_to(REPO_ROOT))
        except ValueError:
            return str(self.file)

    def __str__(self) -> str:
        return f"{self.location()}: {self.message}"


@dataclass
class Record:
    file: Path
    index: int
    data: Optional[dict] = None
    parse_error: Optional[LoadError] = None

    def location(self) -> str:
        try:
            rel = str(self.file.relative_to(REPO_ROOT))
        except ValueError:
            rel = str(self.file)
        return f"{rel}[{self.index}]"

    @property
    def record_id(self) -> Optional[str]:
        if self.data is None:
            return None
        return self.data.get("id")


def load_json_file(path: Path) -> tuple[Optional[Any], Optional[LoadError]]:
    """Parse a single JSON file. Returns (data, None) or (None, LoadError)."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        return None, LoadError(path, f"could not read file: {e}")
    try:
        return json.loads(text), None
    except json.JSONDecodeError as e:
        return None, LoadError(path, f"malformed JSON: {e.msg} (line {e.lineno}, col {e.colno})")


def load_records_from_array_file(path: Path) -> list[Record]:
    """Load a file expected to contain a top-level JSON array of objects.

    If the file fails to parse at all, returns a single Record with index 0
    and the parse_error set. If it parses but isn't a list, same treatment.
    Otherwise returns one Record per array element (non-dict elements get a
    parse_error attached but are still yielded so callers can report them).
    """
    data, err = load_json_file(path)
    if err is not None:
        return [Record(file=path, index=0, parse_error=err)]
    if not isinstance(data, list):
        return [Record(
            file=path,
            index=0,
            parse_error=LoadError(path, f"expected a top-level JSON array, got {type(data).__name__}"),
        )]
    records: list[Record] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            records.append(Record(
                file=path,
                index=i,
                parse_error=LoadError(path, f"expected an object, got {type(item).__name__}", index=i),
            ))
        else:
            records.append(Record(file=path, index=i, data=item))
    return records


def discover_theory_files() -> list[Path]:
    if not THEORY_DIR.exists():
        return []
    return sorted(THEORY_DIR.glob("d[1-5].json"))


def discover_question_files() -> list[Path]:
    if not QUESTIONS_DIR.exists():
        return []
    files: list[Path] = []
    for d in range(1, 6):
        domain_dir = QUESTIONS_DIR / f"d{d}"
        if domain_dir.exists():
            files.extend(sorted(domain_dir.glob("*.json")))
    return files


def discover_case_study_files() -> list[Path]:
    if not CASE_STUDIES_DIR.exists():
        return []
    return sorted(CASE_STUDIES_DIR.glob("cs-*.json"))


def load_theory_cards() -> list[Record]:
    records: list[Record] = []
    for path in discover_theory_files():
        records.extend(load_records_from_array_file(path))
    return records


def load_questions() -> list[Record]:
    records: list[Record] = []
    for path in discover_question_files():
        records.extend(load_records_from_array_file(path))
    return records


def load_case_studies() -> list[Record]:
    records: list[Record] = []
    for path in discover_case_study_files():
        records.extend(load_records_from_array_file(path))
    return records


def load_blueprint() -> dict:
    data, err = load_json_file(BLUEPRINT_PATH)
    if err is not None:
        raise RuntimeError(str(err))
    return data


def load_schema(name: str) -> dict:
    """name is e.g. 'theory', 'question', 'case-study'."""
    path = SCHEMA_DIR / f"{name}.schema.json"
    data, err = load_json_file(path)
    if err is not None:
        raise RuntimeError(str(err))
    return data
