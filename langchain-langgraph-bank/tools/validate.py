"""Validator for the LangChain/LangGraph practice question bank.

Gates:
  - Structural: every file parses; every record validates against its schema.
  - Uniqueness: theory/question IDs are globally unique.
  - Answer-key integrity, explanation completeness.
  - Referential integrity (theory<->question, case-study<->question).
  - Quality/anti-pattern checks (duplicate stems, answer-position skew).
  - Blueprint conformance (progress mode: non-fatal gaps; strict mode: fatal).

Usage:
    python tools/validate.py            # progress mode
    python tools/validate.py --strict   # strict mode
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import jsonschema

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loader  # noqa: E402


@dataclass
class ValidationIssue:
    rule: str
    location: str
    message: str

    def __str__(self) -> str:
        return f"[{self.rule}] {self.location}: {self.message}"


class ValidationResult:
    def __init__(self) -> None:
        self.issues: list[ValidationIssue] = []

    def add(self, rule: str, location: str, message: str) -> None:
        self.issues.append(ValidationIssue(rule=rule, location=location, message=message))

    @property
    def ok(self) -> bool:
        return len(self.issues) == 0

    def __iter__(self):
        return iter(self.issues)

    def __len__(self) -> int:
        return len(self.issues)


def _record_location(record: "loader.Record") -> str:
    try:
        rel = str(record.file.relative_to(loader.REPO_ROOT))
    except ValueError:
        rel = str(record.file)
    return f"{rel}[{record.index}]"


def validate_theory_structural(
    records: list["loader.Record"],
    schema: dict,
) -> ValidationResult:
    """Structural gate: parse errors + schema validation for theory cards."""
    result = ValidationResult()
    validator = jsonschema.Draft7Validator(schema)

    for record in records:
        loc = _record_location(record)

        if record.parse_error is not None:
            result.add("structural.parse", loc, record.parse_error.message)
            continue

        errors = sorted(validator.iter_errors(record.data), key=lambda e: list(e.path))
        for err in errors:
            path = "/".join(str(p) for p in err.path) or "<root>"
            result.add("structural.schema", f"{loc}.{path}", err.message)

    return result


def validate_theory_uniqueness(records: list["loader.Record"]) -> ValidationResult:
    """Uniqueness gate: theory card IDs must be globally unique."""
    result = ValidationResult()
    seen: dict[str, "loader.Record"] = {}

    for record in records:
        if record.data is None:
            continue
        rid = record.data.get("id")
        if rid is None:
            continue
        loc = _record_location(record)
        if rid in seen:
            first_loc = _record_location(seen[rid])
            result.add(
                "uniqueness.duplicate_id",
                loc,
                f"duplicate theory card id '{rid}' (first seen at {first_loc})",
            )
        else:
            seen[rid] = record

    return result


def validate_theory_cards() -> ValidationResult:
    """Run all currently-implemented theory-card gates and merge results."""
    records = loader.load_theory_cards()
    schema = loader.load_schema("theory")

    combined = ValidationResult()
    combined.issues.extend(validate_theory_structural(records, schema).issues)
    combined.issues.extend(validate_theory_uniqueness(records).issues)
    return combined


# ---------------------------------------------------------------------------
# Question gates
# ---------------------------------------------------------------------------

def validate_question_structural(
    records: list["loader.Record"],
    schema: dict,
) -> ValidationResult:
    """Structural gate: parse errors + schema validation (incl. per-type
    conditionals) for questions."""
    result = ValidationResult()
    validator = jsonschema.Draft7Validator(schema)

    for record in records:
        loc = _record_location(record)

        if record.parse_error is not None:
            result.add("structural.parse", loc, record.parse_error.message)
            continue

        errors = sorted(validator.iter_errors(record.data), key=lambda e: list(e.path))
        for err in errors:
            path = "/".join(str(p) for p in err.path) or "<root>"
            result.add("structural.schema", f"{loc}.{path}", err.message)

    return result


def validate_question_uniqueness(records: list["loader.Record"]) -> ValidationResult:
    """Uniqueness gate: question IDs must be globally unique."""
    result = ValidationResult()
    seen: dict[str, "loader.Record"] = {}

    for record in records:
        if record.data is None:
            continue
        rid = record.data.get("id")
        if rid is None:
            continue
        loc = _record_location(record)
        if rid in seen:
            first_loc = _record_location(seen[rid])
            result.add(
                "uniqueness.duplicate_id",
                loc,
                f"duplicate question id '{rid}' (first seen at {first_loc})",
            )
        else:
            seen[rid] = record

    return result


def validate_answer_key(records: list["loader.Record"]) -> ValidationResult:
    """Answer-key integrity gate.

    - every key in `correct` must exist among the valid keys for the question
      (options keys for single_choice/multi_response/ordering; left keys for
      matching via correct_pairs)
    - len(correct) == select_count for single_choice/multi_response
    - single_choice: exactly 1 correct key
    - multi_response: 2-3 correct keys
    - ordering: `correct` must be a permutation of all option keys (same set,
      same length, no duplicates/missing)
    - matching: `correct_pairs` must cover every left-item key exactly once,
      with only valid right-item keys as values
    """
    result = ValidationResult()

    for record in records:
        if record.data is None:
            continue
        data = record.data
        loc = _record_location(record)
        qtype = data.get("type")

        if qtype in ("single_choice", "multi_response", "ordering"):
            options = data.get("options") or []
            option_keys = [o.get("key") for o in options if isinstance(o, dict)]
            correct = data.get("correct") or []
            select_count = data.get("select_count")

            unknown = [k for k in correct if k not in option_keys]
            if unknown:
                result.add(
                    "answer_key.unknown_option",
                    loc,
                    f"correct references key(s) not present in options: {unknown}",
                )

            if qtype == "single_choice":
                if len(correct) != 1:
                    result.add(
                        "answer_key.count_mismatch",
                        loc,
                        f"single_choice must have exactly 1 correct key, found {len(correct)}",
                    )
                if select_count != 1:
                    result.add(
                        "answer_key.select_count_mismatch",
                        loc,
                        f"single_choice select_count must be 1, found {select_count}",
                    )

            elif qtype == "multi_response":
                if not (2 <= len(correct) <= 3):
                    result.add(
                        "answer_key.count_mismatch",
                        loc,
                        f"multi_response must have 2-3 correct keys, found {len(correct)}",
                    )
                if select_count != len(correct):
                    result.add(
                        "answer_key.select_count_mismatch",
                        loc,
                        f"select_count ({select_count}) must equal len(correct) ({len(correct)})",
                    )

            elif qtype == "ordering":
                if sorted(correct) != sorted(option_keys) or len(correct) != len(option_keys):
                    result.add(
                        "answer_key.not_a_permutation",
                        loc,
                        f"ordering 'correct' must be a permutation of option keys {option_keys}, "
                        f"found {correct}",
                    )

        elif qtype == "matching":
            matching = data.get("matching") or {}
            left_items = matching.get("left") or []
            right_items = matching.get("right") or []
            left_keys = [i.get("key") for i in left_items if isinstance(i, dict)]
            right_keys = [i.get("key") for i in right_items if isinstance(i, dict)]
            correct_pairs = data.get("correct_pairs") or {}

            missing_left = [k for k in left_keys if k not in correct_pairs]
            if missing_left:
                result.add(
                    "answer_key.matching_incomplete",
                    loc,
                    f"correct_pairs is missing entries for left key(s): {missing_left}",
                )

            extra_left = [k for k in correct_pairs if k not in left_keys]
            if extra_left:
                result.add(
                    "answer_key.matching_unknown_left",
                    loc,
                    f"correct_pairs references left key(s) not present in matching.left: {extra_left}",
                )

            bad_right = [
                (k, v) for k, v in correct_pairs.items() if v not in right_keys
            ]
            if bad_right:
                result.add(
                    "answer_key.matching_unknown_right",
                    loc,
                    f"correct_pairs references right key(s) not present in matching.right: {bad_right}",
                )

    return result


_MIN_EXPLANATION_WORDS = 40
_MAX_EXPLANATION_WORDS = 400


def _all_option_keys(data: dict) -> list[str]:
    qtype = data.get("type")
    if qtype == "matching":
        matching = data.get("matching") or {}
        return [i.get("key") for i in (matching.get("left") or []) if isinstance(i, dict)]
    options = data.get("options") or []
    return [o.get("key") for o in options if isinstance(o, dict)]


def validate_explanation_completeness(records: list["loader.Record"]) -> ValidationResult:
    """Explanation-completeness gate.

    - why_incorrect must have an entry for every non-correct option/left-key,
      and no entry for a correct one (single_choice/multi_response/ordering
      use `correct`; matching has no "incorrect" concept in the same sense,
      so it is exempt from the correct/incorrect split but still needs a
      populated why_incorrect... in practice matching questions get an empty
      why_incorrect object, which is allowed).
    - why_correct and rule_of_thumb must be present and non-trivial (schema
      already enforces minLength; this gate enforces the word-count band).
    """
    result = ValidationResult()

    for record in records:
        if record.data is None:
            continue
        data = record.data
        loc = _record_location(record)
        qtype = data.get("type")
        explanation = data.get("explanation") or {}
        why_correct = explanation.get("why_correct", "")
        why_incorrect = explanation.get("why_incorrect", {}) or {}
        rule_of_thumb = explanation.get("rule_of_thumb", "")

        if qtype in ("single_choice", "multi_response", "ordering"):
            all_keys = _all_option_keys(data)
            correct = set(data.get("correct") or [])
            incorrect_keys = [k for k in all_keys if k not in correct]

            missing = [k for k in incorrect_keys if k not in why_incorrect]
            if missing:
                result.add(
                    "explanation.missing_why_incorrect",
                    loc,
                    f"why_incorrect is missing entries for non-correct option(s): {missing}",
                )

            extra = [k for k in why_incorrect if k in correct]
            if extra:
                result.add(
                    "explanation.why_incorrect_on_correct_option",
                    loc,
                    f"why_incorrect has entries for correct option(s), which should have no "
                    f"why_incorrect entry: {extra}",
                )

        total_words = len(why_correct.split()) + len(rule_of_thumb.split()) + sum(
            len(v.split()) for v in why_incorrect.values()
        )
        if total_words < _MIN_EXPLANATION_WORDS:
            result.add(
                "explanation.too_short",
                loc,
                f"total explanation is {total_words} words, below the minimum of "
                f"{_MIN_EXPLANATION_WORDS}",
            )
        elif total_words > _MAX_EXPLANATION_WORDS:
            result.add(
                "explanation.too_long",
                loc,
                f"total explanation is {total_words} words, above the maximum of "
                f"{_MAX_EXPLANATION_WORDS}",
            )

    return result


def validate_questions() -> ValidationResult:
    """Run all currently-implemented question gates and merge results."""
    records = loader.load_questions()
    schema = loader.load_schema("question")

    combined = ValidationResult()
    combined.issues.extend(validate_question_structural(records, schema).issues)
    combined.issues.extend(validate_question_uniqueness(records).issues)

    # Downstream gates assume structurally-valid records; skip records that
    # already failed structural validation to avoid confusing cascade errors.
    structural = validate_question_structural(records, schema)
    bad_locations = {i.location for i in structural if i.rule.startswith("structural")}
    clean_records = [r for r in records if _record_location(r) not in bad_locations]

    combined.issues.extend(validate_answer_key(clean_records).issues)
    combined.issues.extend(validate_explanation_completeness(clean_records).issues)
    return combined


# ---------------------------------------------------------------------------
# Referential integrity gates
# ---------------------------------------------------------------------------

def validate_theory_referential(
    theory_records: list["loader.Record"],
    question_records: list["loader.Record"],
    orphan_mode: str = "warn",
) -> ValidationResult:
    """Referential gate between theory cards and questions.

    - every question's theory_refs entries must resolve to a real theory card
    - every theory card should be referenced by at least one question
      (orphan check); orphan_mode="warn" reports as a warning-level issue
      that does not fail the build, orphan_mode="fail" is a hard failure
      (flipped on once the full library exists).
    """
    result = ValidationResult()

    theory_ids = {r.data["id"] for r in theory_records if r.data and r.data.get("id")}
    referenced: set[str] = set()

    for record in question_records:
        if record.data is None:
            continue
        loc = _record_location(record)
        refs = record.data.get("theory_refs") or []
        for ref in refs:
            if ref not in theory_ids:
                result.add(
                    "referential.dangling_theory_ref",
                    loc,
                    f"theory_refs references unknown theory card id '{ref}'",
                )
            else:
                referenced.add(ref)

    orphans = sorted(theory_ids - referenced)
    if orphans:
        rule = "referential.orphan_theory_card" if orphan_mode == "fail" else "referential.orphan_theory_card_warning"
        for orphan_id in orphans:
            owner = next(
                (r for r in theory_records if r.data and r.data.get("id") == orphan_id),
                None,
            )
            loc = _record_location(owner) if owner else orphan_id
            result.add(rule, loc, f"theory card '{orphan_id}' is not referenced by any question")

    return result


def validate_case_study_structural(
    records: list["loader.Record"],
    schema: dict,
) -> ValidationResult:
    """Structural gate: parse errors + schema validation for case studies."""
    result = ValidationResult()
    validator = jsonschema.Draft7Validator(schema)

    for record in records:
        loc = _record_location(record)
        if record.parse_error is not None:
            result.add("structural.parse", loc, record.parse_error.message)
            continue
        errors = sorted(validator.iter_errors(record.data), key=lambda e: list(e.path))
        for err in errors:
            path = "/".join(str(p) for p in err.path) or "<root>"
            result.add("structural.schema", f"{loc}.{path}", err.message)

    return result


def validate_case_study_consistency(
    case_study_records: list["loader.Record"],
    question_records: list["loader.Record"],
) -> ValidationResult:
    """Bidirectional consistency gate between case studies and questions.

    - every question_ids entry in a case study must resolve to a real question
    - every question whose case_study_id is set must be listed in that case
      study's question_ids (and vice versa)
    - a question's case_study_id must resolve to a real case study
    """
    result = ValidationResult()

    questions_by_id = {
        r.data["id"]: r for r in question_records if r.data and r.data.get("id")
    }
    case_studies_by_id = {
        r.data["id"]: r for r in case_study_records if r.data and r.data.get("id")
    }

    for cs_record in case_study_records:
        if cs_record.data is None:
            continue
        cs_loc = _record_location(cs_record)
        cs_id = cs_record.data.get("id")
        for qid in cs_record.data.get("question_ids", []):
            if qid not in questions_by_id:
                result.add(
                    "referential.case_study_dangling_question",
                    cs_loc,
                    f"case study '{cs_id}' lists unknown question id '{qid}'",
                )
                continue
            q_record = questions_by_id[qid]
            if q_record.data.get("case_study_id") != cs_id:
                result.add(
                    "referential.case_study_mismatch",
                    _record_location(q_record),
                    f"question '{qid}' is listed in case study '{cs_id}' but its own "
                    f"case_study_id is '{q_record.data.get('case_study_id')}'",
                )

    for q_record in question_records:
        if q_record.data is None:
            continue
        cs_id = q_record.data.get("case_study_id")
        if cs_id is None:
            continue
        if cs_id not in case_studies_by_id:
            result.add(
                "referential.question_dangling_case_study",
                _record_location(q_record),
                f"question '{q_record.data.get('id')}' references unknown case_study_id '{cs_id}'",
            )
            continue
        cs_record = case_studies_by_id[cs_id]
        if q_record.data.get("id") not in cs_record.data.get("question_ids", []):
            result.add(
                "referential.case_study_mismatch",
                _record_location(q_record),
                f"question '{q_record.data.get('id')}' has case_study_id '{cs_id}' but is not "
                f"listed in that case study's question_ids",
            )

    return result


def validate_case_studies() -> ValidationResult:
    """Run all case-study gates and merge results."""
    case_study_records = loader.load_case_studies()
    question_records = loader.load_questions()
    schema = loader.load_schema("case-study")

    combined = ValidationResult()
    combined.issues.extend(validate_case_study_structural(case_study_records, schema).issues)
    combined.issues.extend(
        validate_case_study_consistency(case_study_records, question_records).issues
    )
    return combined


# ---------------------------------------------------------------------------
# Quality / anti-pattern gates
# ---------------------------------------------------------------------------

def _normalize_stem(stem: str) -> str:
    return " ".join(stem.lower().split())


def validate_duplicate_stems(
    records: list["loader.Record"],
    near_duplicate_threshold: float = 0.90,
) -> ValidationResult:
    """Quality gate: no exact-duplicate or near-duplicate question stems.

    Uses rapidfuzz token-sort-ratio similarity (0-100 scale, converted to a
    0-1 fraction) to flag stems that are suspiciously similar even if not
    byte-identical.
    """
    result = ValidationResult()

    try:
        from rapidfuzz import fuzz
    except ImportError:  # pragma: no cover - dependency should always be installed
        return result

    normalized: list[tuple[str, "loader.Record"]] = []
    for record in records:
        if record.data is None:
            continue
        stem = record.data.get("stem")
        if not stem:
            continue
        normalized.append((_normalize_stem(stem), record))

    for i in range(len(normalized)):
        norm_i, rec_i = normalized[i]
        for j in range(i + 1, len(normalized)):
            norm_j, rec_j = normalized[j]
            if norm_i == norm_j:
                result.add(
                    "quality.duplicate_stem",
                    _record_location(rec_j),
                    f"stem is an exact duplicate of {rec_i.data.get('id')} at {_record_location(rec_i)}",
                )
                continue
            similarity = fuzz.token_sort_ratio(norm_i, norm_j) / 100.0
            if similarity >= near_duplicate_threshold:
                result.add(
                    "quality.near_duplicate_stem",
                    _record_location(rec_j),
                    f"stem is {similarity:.0%} similar to {rec_i.data.get('id')} at "
                    f"{_record_location(rec_i)} (threshold {near_duplicate_threshold:.0%})",
                )

    return result


def validate_answer_position_distribution(
    records: list["loader.Record"],
    tolerance_pct_points: float = 15.0,
) -> ValidationResult:
    """Quality gate: correct-answer position (A/B/C/D/...) should be roughly
    uniform across single_choice questions, catching the 'answer is usually
    B' artifact common in generated question banks.

    Only evaluated once there are enough single_choice questions to make the
    statistic meaningful (at least 20), to avoid false positives on small
    seed batches.
    """
    result = ValidationResult()

    single_choice = [
        r for r in records
        if r.data and r.data.get("type") == "single_choice" and r.data.get("correct")
    ]
    if len(single_choice) < 20:
        return result

    from collections import Counter

    positions = Counter(r.data["correct"][0] for r in single_choice)
    total = sum(positions.values())

    # Expected uniformity is based on the full universe of option keys seen
    # across these questions (e.g. A/B/C/D), not just the keys that happen to
    # be correct at least once -- otherwise a bank where every answer is "A"
    # would see expected_pct=100% (only one distinct correct key observed)
    # and never trigger the skew check.
    all_option_keys: set[str] = set()
    for r in single_choice:
        all_option_keys.update(o.get("key") for o in (r.data.get("options") or []))
    num_keys = len(all_option_keys) or len(positions) or 1
    expected_pct = 100.0 / num_keys

    for key in sorted(all_option_keys):
        count = positions.get(key, 0)
        actual_pct = 100.0 * count / total
        if abs(actual_pct - expected_pct) > tolerance_pct_points:
            result.add(
                "quality.answer_position_skew",
                "single_choice answer distribution",
                f"correct answer '{key}' appears in {actual_pct:.1f}% of single_choice questions "
                f"(expected ~{expected_pct:.1f}%, tolerance +/-{tolerance_pct_points}pp)",
            )

    return result


def validate_quality() -> ValidationResult:
    """Run all quality/anti-pattern gates across the full question set."""
    records = loader.load_questions()

    combined = ValidationResult()
    combined.issues.extend(validate_duplicate_stems(records).issues)
    combined.issues.extend(validate_answer_position_distribution(records).issues)
    return combined


# ---------------------------------------------------------------------------
# Blueprint conformance gate
# ---------------------------------------------------------------------------

def validate_blueprint_conformance(strict: bool = False) -> ValidationResult:
    """Compare actual counts (per domain, task statement, format, difficulty)
    against blueprint.json.

    Progress mode (strict=False): reports every gap as an informational issue
    but the caller treats these as non-fatal (run() only fails the exit code
    on strict mode for this gate).
    Strict mode (strict=True): same issues, but callers should treat them as
    fatal.
    """
    result = ValidationResult()
    blueprint = loader.load_blueprint()
    records = loader.load_questions()
    valid_records = [r for r in records if r.data is not None]

    rule_prefix = "blueprint.strict" if strict else "blueprint.progress"

    for domain in blueprint["domains"]:
        did = domain["id"]
        domain_questions = [r for r in valid_records if r.data.get("domain") == did]
        standalone = [r for r in domain_questions if r.data.get("case_study_id") is None]

        actual_standalone = len(standalone)
        expected_standalone = domain["standalone_questions"]
        if actual_standalone != expected_standalone:
            result.add(
                f"{rule_prefix}.domain_count",
                f"domain {did}",
                f"{actual_standalone}/{expected_standalone} standalone questions",
            )

        for ts in domain["task_statements"]:
            ts_questions = [r for r in standalone if r.data.get("task_statement") == ts["id"]]
            actual_ts = len(ts_questions)
            expected_ts = ts["standalone_questions"]
            if actual_ts != expected_ts:
                result.add(
                    f"{rule_prefix}.task_statement_count",
                    f"task statement {ts['id']}",
                    f"{actual_ts}/{expected_ts} standalone questions",
                )

        from collections import Counter
        fmt_counts = Counter(r.data.get("type") for r in standalone)
        for fmt, expected_count in domain["format_mix"].items():
            actual_count = fmt_counts.get(fmt, 0)
            if actual_count != expected_count:
                result.add(
                    f"{rule_prefix}.format_mix",
                    f"domain {did} format {fmt}",
                    f"{actual_count}/{expected_count} questions",
                )

    return result


def run(strict: bool = False) -> int:
    theory_result = validate_theory_cards()
    question_result = validate_questions()

    theory_records = loader.load_theory_cards()
    question_records = loader.load_questions()
    orphan_mode = "fail" if strict else "warn"
    referential_result = validate_theory_referential(theory_records, question_records, orphan_mode=orphan_mode)

    case_study_result = validate_case_studies()
    quality_result = validate_quality()
    blueprint_result = validate_blueprint_conformance(strict=strict)

    combined = ValidationResult()
    combined.issues.extend(theory_result.issues)
    combined.issues.extend(question_result.issues)
    combined.issues.extend(case_study_result.issues)
    combined.issues.extend(quality_result.issues)

    # Referential: dangling refs always fail; orphan warnings only fail in strict mode.
    fatal_referential = [
        i for i in referential_result
        if i.rule != "referential.orphan_theory_card_warning"
    ]
    warning_referential = [
        i for i in referential_result
        if i.rule == "referential.orphan_theory_card_warning"
    ]
    combined.issues.extend(fatal_referential)

    # Blueprint conformance: only fatal in strict mode.
    if strict:
        combined.issues.extend(blueprint_result.issues)

    if warning_referential:
        print(f"WARNING: {len(warning_referential)} orphan theory card(s) (not yet referenced "
              f"by any question):")
        for issue in warning_referential:
            print(f"  {issue}")
        print()

    if not strict and not blueprint_result.ok:
        print(f"PROGRESS: {len(blueprint_result)} blueprint gap(s) remaining (non-fatal in "
              f"progress mode):")
        for issue in list(blueprint_result)[:10]:
            print(f"  {issue}")
        if len(blueprint_result) > 10:
            print(f"  ... and {len(blueprint_result) - 10} more")
        print()

    if combined.ok:
        print("OK: all theory cards, questions, and case studies passed structural, "
              "uniqueness, referential, answer-key, explanation, and quality checks.")
        return 0

    print(f"FAILED: {len(combined)} issue(s) found:\n")
    for issue in combined:
        print(f"  {issue}")
    return 1


if __name__ == "__main__":
    strict_mode = "--strict" in sys.argv
    sys.exit(run(strict=strict_mode))
