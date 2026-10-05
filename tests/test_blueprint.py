"""Smoke test for blueprint.json: parses, weights sum to 100%, counts sum to 800."""
import json
from pathlib import Path

BLUEPRINT_PATH = Path(__file__).resolve().parent.parent / "blueprint.json"


def load_blueprint():
    with open(BLUEPRINT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_blueprint_parses():
    bp = load_blueprint()
    assert isinstance(bp, dict)


def test_domain_weights_sum_to_100():
    bp = load_blueprint()
    total = sum(d["weight_pct"] for d in bp["domains"])
    assert total == 100, f"domain weights sum to {total}, expected 100"


def test_total_questions_is_800():
    bp = load_blueprint()
    assert bp["total_questions"] == 800


def test_domain_totals_sum_to_800():
    bp = load_blueprint()
    total = sum(d["total_questions"] for d in bp["domains"])
    assert total == 800, f"domain total_questions sum to {total}, expected 800"


def test_standalone_plus_case_study_equals_domain_total():
    bp = load_blueprint()
    for d in bp["domains"]:
        assert d["standalone_questions"] + d["case_study_questions"] == d["total_questions"], (
            f"domain {d['id']}: standalone+case_study != total"
        )


def test_case_study_questions_sum_to_32():
    bp = load_blueprint()
    total = sum(d["case_study_questions"] for d in bp["domains"])
    assert total == 32, f"case study questions sum to {total}, expected 32"


def test_standalone_questions_sum_to_768():
    bp = load_blueprint()
    total = sum(d["standalone_questions"] for d in bp["domains"])
    assert total == 768, f"standalone questions sum to {total}, expected 768"


def test_task_statement_counts_sum_to_domain_standalone():
    bp = load_blueprint()
    for d in bp["domains"]:
        ts_total = sum(ts["standalone_questions"] for ts in d["task_statements"])
        assert ts_total == d["standalone_questions"], (
            f"domain {d['id']}: task statement counts sum to {ts_total}, "
            f"expected {d['standalone_questions']}"
        )


def test_format_mix_sums_to_domain_standalone():
    bp = load_blueprint()
    for d in bp["domains"]:
        fmt_total = sum(d["format_mix"].values())
        assert fmt_total == d["standalone_questions"], (
            f"domain {d['id']}: format mix sums to {fmt_total}, "
            f"expected {d['standalone_questions']}"
        )


def test_format_totals_match_domain_sums():
    bp = load_blueprint()
    for fmt in ("single_choice", "multi_response", "ordering", "matching"):
        total = sum(d["format_mix"][fmt] for d in bp["domains"])
        assert total == bp["format_totals"][fmt], (
            f"format {fmt}: domain sums to {total}, blueprint says {bp['format_totals'][fmt]}"
        )


def test_theory_cards_target_sums_to_total():
    bp = load_blueprint()
    total = sum(d["theory_cards_target"] for d in bp["domains"])
    assert total == bp["theory_cards_total_target"], (
        f"theory card targets sum to {total}, expected {bp['theory_cards_total_target']}"
    )


def test_all_14_task_statements_present():
    bp = load_blueprint()
    ts_ids = [ts["id"] for d in bp["domains"] for ts in d["task_statements"]]
    assert len(ts_ids) == 14, f"expected 14 task statements, found {len(ts_ids)}"
    assert len(set(ts_ids)) == 14, "task statement IDs must be unique"
