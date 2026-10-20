"""Tests for tools/export_web.py (the static web app data bundle)."""
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

import export_web  # noqa: E402
import loader  # noqa: E402

FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures"


def _build():
    return export_web.build_bundle(
        loader.load_theory_cards(),
        loader.load_questions(),
        loader.load_blueprint(),
        export_web.concept_taxonomy(),
    )


@pytest.fixture(scope="module")
def bundle():
    return _build()


def test_exports_only_the_480_standalone_questions(bundle):
    assert len(bundle["questions"]) == 480
    assert bundle["meta"]["question_count"] == 480


def test_no_case_study_questions_or_field(bundle):
    for q in bundle["questions"]:
        assert "case_study_id" not in q
    case_ids = {
        r.data["id"] for r in loader.load_questions() if r.data and r.data.get("case_study_id")
    }
    assert case_ids, "expected the bank to contain case-study questions"
    assert case_ids.isdisjoint(q["id"] for q in bundle["questions"])


def test_every_theory_ref_resolves(bundle):
    for q in bundle["questions"]:
        assert q["theory_refs"]
        for ref in q["theory_refs"]:
            assert ref in bundle["theory"], f"{q['id']} -> {ref}"


def test_every_card_has_references(bundle):
    for card_id, card in bundle["theory"].items():
        assert card["id"] == card_id
        assert card["references"], card_id
        for key in ("title", "summary", "key_points", "rule_of_thumb", "common_confusions"):
            assert key in card


def test_domains_and_concepts(bundle):
    assert [d["id"] for d in bundle["domains"]] == [1, 2, 3, 4, 5, 6]
    assert all(d["name"] for d in bundle["domains"])
    names = {c["name"] for c in bundle["concepts"]}
    assert len(names) == 22
    used = {c for q in bundle["questions"] for c in q["concepts"]}
    assert used <= names


def test_each_level_can_fill_five_per_domain(bundle):
    for level in ("easy", "medium", "hard"):
        for d in range(1, 7):
            n = sum(1 for q in bundle["questions"] if q["difficulty"] == level and q["domain"] == d)
            assert n >= 5, f"{level} D{d} has only {n}"


def test_output_is_deterministic(tmp_path):
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    export_web.write_bundle(_build(), a)
    export_web.write_bundle(_build(), b)
    assert a.read_bytes() == b.read_bytes()
    parsed = json.loads(a.read_text(encoding="utf-8"))
    ids = [q["id"] for q in parsed["questions"]]
    assert ids == sorted(ids)


def test_hash_changes_with_content(bundle):
    records = loader.load_questions()
    for r in records:
        if r.data and not r.data.get("case_study_id"):
            r.data = {**r.data, "stem": r.data["stem"] + " (edited)"}
            break
    other = export_web.build_bundle(
        loader.load_theory_cards(), records, loader.load_blueprint(), export_web.concept_taxonomy()
    )
    assert other["meta"]["hash"] != bundle["meta"]["hash"]


def test_dangling_theory_ref_fixture_fails_export():
    broken = loader.load_records_from_array_file(FIXTURES_DIR / "question_dangling_theory_ref.json")
    with pytest.raises(export_web.ExportError) as exc:
        export_web.build_bundle(
            loader.load_theory_cards(), broken, loader.load_blueprint(), export_web.concept_taxonomy()
        )
    assert any("unknown theory card" in p for p in exc.value.problems)


def test_malformed_json_fixture_fails_export():
    broken = loader.load_records_from_array_file(FIXTURES_DIR / "theory_malformed_json.json")
    with pytest.raises(export_web.ExportError):
        export_web.build_bundle(broken, [], loader.load_blueprint(), export_web.concept_taxonomy())


def test_main_refuses_to_export_when_validator_fails(tmp_path, monkeypatch):
    monkeypatch.setattr(export_web, "collect_validation_issues", lambda: ["[x] somewhere: broken"])
    out = tmp_path / "bank.json"
    assert export_web.main(["--output", str(out)]) == 1
    assert not out.exists()


def test_main_writes_bundle(tmp_path, monkeypatch):
    monkeypatch.setattr(export_web, "collect_validation_issues", lambda: [])
    out = tmp_path / "bank.json"
    assert export_web.main(["--output", str(out)]) == 0
    assert json.loads(out.read_text(encoding="utf-8"))["meta"]["question_count"] == 480
