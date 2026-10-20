"""Export the question bank as a single JSON bundle for the static practice web app.

The bundle (default: web/public/bank.json) contains:
  - meta:      bundle format version, content hash, counts
  - domains:   id, name, task statements (from blueprint.json)
  - concepts:  the concept taxonomy (from the question schema enum) with parent groups
  - questions: standalone questions only (case-study questions are excluded because
               their stems depend on a shared scenario the app does not show)
  - theory:    theory cards keyed by id

Before exporting, the validator's fatal gates are run (same as `validate.py` progress
mode). The export aborts with a non-zero exit code if any of them fail, or if the bundle
itself fails its own integrity checks (dangling theory refs, cards without references).

Output is deterministic: keys are sorted, records are sorted by id, and there is no
timestamp, so re-running on unchanged data produces a byte-identical file.

Usage:
    python tools/export_web.py
    python tools/export_web.py --output path/to/bank.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loader  # noqa: E402

BUNDLE_FORMAT_VERSION = 1
DEFAULT_OUTPUT = loader.REPO_ROOT / "web" / "public" / "bank.json"

QUESTION_FIELDS = (
    "id", "domain", "task_statement", "type", "difficulty", "theory_refs", "stem",
    "select_count", "options", "correct", "matching", "correct_pairs", "explanation",
    "concepts", "tags",
)
THEORY_FIELDS = (
    "id", "domain", "task_statements", "title", "summary", "key_points", "rule_of_thumb",
    "common_confusions", "related_tech", "references",
)


class ExportError(Exception):
    """Raised when the bank cannot be exported; carries every problem found."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__(f"{len(problems)} problem(s)")
        self.problems = problems


def collect_validation_issues() -> list[str]:
    """Run the validator's fatal (non-strict) gates and return issue strings."""
    import validate  # imported lazily so build_bundle() stays usable without jsonschema

    issues: list[Any] = []
    issues.extend(validate.validate_theory_cards())
    issues.extend(validate.validate_questions())
    referential = validate.validate_theory_referential(
        loader.load_theory_cards(), loader.load_questions(), orphan_mode="warn"
    )
    issues.extend(i for i in referential if i.rule != "referential.orphan_theory_card_warning")
    issues.extend(validate.validate_case_studies())
    issues.extend(validate.validate_quality())
    return [str(i) for i in issues]


def concept_taxonomy() -> list[dict[str, str]]:
    """Concept labels in schema order, each tagged with its parent group."""
    schema = loader.load_schema("question")
    labels: list[str] = schema["properties"]["concepts"]["items"]["enum"]
    try:
        import stats

        groups: dict[str, Iterable[str]] = stats.PARENT_CONCEPT_GROUPS
    except Exception:  # stats is optional for grouping; fall back to a single group
        groups = {}
    parent_of = {c: g for g, members in groups.items() for c in members}
    return [{"name": c, "group": parent_of.get(c, "Other")} for c in labels]


def _pick(record: dict, fields: Iterable[str]) -> dict:
    return {f: record[f] for f in fields if f in record}


def build_bundle(
    theory_records: list[loader.Record],
    question_records: list[loader.Record],
    blueprint: dict,
    concepts: list[dict[str, str]],
) -> dict:
    """Assemble the web bundle. Raises ExportError on any integrity problem."""
    problems: list[str] = []

    for rec in [*theory_records, *question_records]:
        if rec.parse_error is not None:
            problems.append(str(rec.parse_error))

    theory: dict[str, dict] = {}
    for rec in theory_records:
        if rec.data is None:
            continue
        card = _pick(rec.data, THEORY_FIELDS)
        if card.get("id") in theory:
            problems.append(f"{rec.location()}: duplicate theory card id {card.get('id')}")
        if not card.get("references"):
            problems.append(f"{rec.location()}: theory card {card.get('id')} has no references")
        theory[card["id"]] = card

    concept_names = {c["name"] for c in concepts}
    questions: list[dict] = []
    seen_ids: set[str] = set()
    for rec in question_records:
        q = rec.data
        if q is None or q.get("case_study_id"):
            continue
        if q.get("id") in seen_ids:
            problems.append(f"{rec.location()}: duplicate question id {q.get('id')}")
        seen_ids.add(q.get("id"))
        refs = q.get("theory_refs") or []
        if not refs:
            problems.append(f"{rec.location()}: {q.get('id')} has no theory_refs")
        for ref in refs:
            if ref not in theory:
                problems.append(f"{rec.location()}: {q.get('id')} references unknown theory card {ref}")
        for c in q.get("concepts") or []:
            if c not in concept_names:
                problems.append(f"{rec.location()}: {q.get('id')} has unknown concept {c!r}")
        questions.append(_pick(q, QUESTION_FIELDS))

    if problems:
        raise ExportError(problems)

    questions.sort(key=lambda q: q["id"])
    domains = [
        {
            "id": d["id"],
            "name": d["name"],
            "task_statements": [{"id": t["id"], "title": t["title"]} for t in d.get("task_statements", [])],
        }
        for d in sorted(blueprint["domains"], key=lambda d: d["id"])
    ]
    content = {
        "domains": domains,
        "concepts": concepts,
        "questions": questions,
        "theory": dict(sorted(theory.items())),
    }
    digest = hashlib.sha256(_canonical(content).encode("utf-8")).hexdigest()[:16]
    return {
        "meta": {
            "format_version": BUNDLE_FORMAT_VERSION,
            "hash": digest,
            "title": blueprint.get("exam", {}).get("name", "Practice Bank"),
            "question_count": len(questions),
            "theory_count": len(theory),
        },
        **content,
    }


def _canonical(data: Any) -> str:
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def write_bundle(bundle: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_canonical(bundle) + "\n", encoding="utf-8", newline="\n")


def summarize(bundle: dict) -> str:
    qs = bundle["questions"]
    by_level = Counter(q["difficulty"] for q in qs)
    by_cell = Counter((q["difficulty"], q["domain"]) for q in qs)
    domain_ids = [d["id"] for d in bundle["domains"]]
    lines = [
        f"Exported {len(qs)} standalone questions and {len(bundle['theory'])} theory cards "
        f"(hash {bundle['meta']['hash']}).",
        "",
        "level    total  " + "  ".join(f"D{d:<2}" for d in domain_ids),
    ]
    for level in ("easy", "medium", "hard"):
        cells = "  ".join(f"{by_cell[(level, d)]:<3}" for d in domain_ids)
        lines.append(f"{level:<8} {by_level[level]:<6} {cells}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="bundle output path")
    args = parser.parse_args(argv)

    issues = collect_validation_issues()
    if issues:
        print(f"FAILED: validator reported {len(issues)} issue(s); not exporting.\n", file=sys.stderr)
        for issue in issues:
            print(f"  {issue}", file=sys.stderr)
        return 1

    try:
        bundle = build_bundle(
            loader.load_theory_cards(), loader.load_questions(), loader.load_blueprint(), concept_taxonomy()
        )
    except ExportError as e:
        print(f"FAILED: {len(e.problems)} export problem(s):\n", file=sys.stderr)
        for p in e.problems:
            print(f"  {p}", file=sys.stderr)
        return 1

    write_bundle(bundle, args.output)
    print(summarize(bundle))
    print(f"\nWrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
