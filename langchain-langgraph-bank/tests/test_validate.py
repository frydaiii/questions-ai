"""Validator rule test suite for the LangChain/LangGraph question bank.

Each fixture in tests/fixtures/ is deliberately broken in exactly one way and
must trigger exactly the rule it's named for. Unlike the fixture tests, the
"seed data" tests below check properties of whatever real content currently
exists in data/ -- at this stage that's an empty skeleton, so those tests
assert the bank validates cleanly and (once content is added) will track
blueprint targets rather than hardcoded historical counts.
"""
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

import loader  # noqa: E402
import validate  # noqa: E402

FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures"


def _validate_single_file(path: Path) -> validate.ValidationResult:
    """Run the theory structural+uniqueness gates against exactly one file."""
    records = loader.load_records_from_array_file(path)
    schema = loader.load_schema("theory")
    result = validate.ValidationResult()
    result.issues.extend(validate.validate_theory_structural(records, schema).issues)
    result.issues.extend(validate.validate_theory_uniqueness(records).issues)
    return result


class TestSeedTheoryCardsValidateClean:
    def test_all_theory_cards_pass(self):
        result = validate.validate_theory_cards()
        assert result.ok, f"theory cards should validate cleanly, got: {[str(i) for i in result]}"

    def test_theory_card_count_within_blueprint_target(self):
        records = loader.load_theory_cards()
        blueprint = loader.load_blueprint()
        assert len(records) <= blueprint["theory_cards_total_target"], (
            f"found {len(records)} theory cards, which exceeds the blueprint target of "
            f"{blueprint['theory_cards_total_target']}"
        )

    def test_domain_card_counts_do_not_exceed_blueprint(self):
        records = loader.load_theory_cards()
        blueprint = loader.load_blueprint()
        from collections import Counter
        counts = Counter(r.data["domain"] for r in records if r.data)
        for domain in blueprint["domains"]:
            assert counts.get(domain["id"], 0) <= domain["theory_cards_target"], (
                f"domain {domain['id']}: found {counts.get(domain['id'], 0)} cards, "
                f"exceeds target {domain['theory_cards_target']}"
            )


class TestMalformedJsonFixture:
    def test_triggers_parse_error(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_malformed_json.json")
        assert not result.ok
        assert any(i.rule == "structural.parse" for i in result)

    def test_error_message_mentions_json_issue(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_malformed_json.json")
        parse_issues = [i for i in result if i.rule == "structural.parse"]
        assert len(parse_issues) == 1
        assert "malformed JSON" in parse_issues[0].message or "Expecting" in parse_issues[0].message


class TestMissingFieldFixture:
    def test_triggers_schema_error(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_missing_field.json")
        assert not result.ok
        assert any(i.rule == "structural.schema" for i in result)

    def test_error_names_missing_field(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_missing_field.json")
        schema_issues = [i for i in result if i.rule == "structural.schema"]
        assert any("rule_of_thumb" in i.message for i in schema_issues)


class TestDuplicateIdFixture:
    def test_triggers_uniqueness_error(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_duplicate_id.json")
        assert not result.ok
        assert any(i.rule == "uniqueness.duplicate_id" for i in result)

    def test_error_names_the_duplicate_id(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_duplicate_id.json")
        dup_issues = [i for i in result if i.rule == "uniqueness.duplicate_id"]
        assert len(dup_issues) == 1
        assert "TH-D1-903" in dup_issues[0].message


class TestBadReferenceDomainFixture:
    def test_triggers_schema_error_on_references(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_bad_reference_domain.json")
        assert not result.ok
        assert any(
            i.rule == "structural.schema" and "references" in i.location
            for i in result
        )


class TestPreciseLocationReporting:
    def test_issue_location_includes_file_and_index(self):
        result = _validate_single_file(FIXTURES_DIR / "theory_missing_field.json")
        schema_issues = [i for i in result if i.rule == "structural.schema"]
        assert len(schema_issues) >= 1
        assert "theory_missing_field.json[0]" in schema_issues[0].location


class TestValidateEntrypoint:
    def test_run_returns_zero_on_clean_data(self):
        exit_code = validate.run()
        assert exit_code == 0


# ---------------------------------------------------------------------------
# Question gates
# ---------------------------------------------------------------------------

def _validate_single_question_file(path: Path) -> validate.ValidationResult:
    """Run all question gates against exactly one file."""
    records = loader.load_records_from_array_file(path)
    schema = loader.load_schema("question")
    result = validate.ValidationResult()
    result.issues.extend(validate.validate_question_structural(records, schema).issues)
    result.issues.extend(validate.validate_question_uniqueness(records).issues)
    result.issues.extend(validate.validate_answer_key(records).issues)
    result.issues.extend(validate.validate_explanation_completeness(records).issues)
    return result


class TestSeedQuestionsValidateClean:
    def test_all_questions_pass(self):
        result = validate.validate_questions()
        assert result.ok, f"questions should validate cleanly, got: {[str(i) for i in result]}"

    def test_question_count_within_blueprint_target(self):
        records = loader.load_questions()
        blueprint = loader.load_blueprint()
        assert len(records) <= blueprint["total_questions"], (
            f"found {len(records)} questions, exceeds blueprint target of {blueprint['total_questions']}"
        )


class TestSingleChoiceConditional:
    def test_all_single_choice_questions_satisfy_conditional(self):
        records = loader.load_questions()
        sc = [r for r in records if r.data and r.data.get("type") == "single_choice"]
        for r in sc:
            assert len(r.data["correct"]) == 1
            assert r.data["select_count"] == 1


class TestMultiResponseConditional:
    def test_all_multi_response_questions_satisfy_conditional(self):
        records = loader.load_questions()
        mr = [r for r in records if r.data and r.data.get("type") == "multi_response"]
        for r in mr:
            assert 2 <= len(r.data["correct"]) <= 3
            assert r.data["select_count"] == len(r.data["correct"])


class TestOrderingConditional:
    def test_all_ordering_questions_are_permutations(self):
        records = loader.load_questions()
        ordering = [r for r in records if r.data and r.data.get("type") == "ordering"]
        for r in ordering:
            option_keys = [o["key"] for o in r.data["options"]]
            assert sorted(r.data["correct"]) == sorted(option_keys)


class TestMatchingConditional:
    def test_all_matching_questions_have_no_options_field(self):
        records = loader.load_questions()
        matching = [r for r in records if r.data and r.data.get("type") == "matching"]
        for r in matching:
            assert "options" not in r.data
            assert "matching" in r.data
            assert "correct_pairs" in r.data


class TestSchemaViolationMultiResponseFixture:
    def test_triggers_schema_error_on_correct_minitems(self):
        result = _validate_single_question_file(
            FIXTURES_DIR / "question_schema_violation_multi_response.json"
        )
        assert not result.ok
        assert any(i.rule == "structural.schema" for i in result)


class TestUnknownAnswerKeyFixture:
    def test_triggers_unknown_option_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_unknown_answer_key.json")
        assert not result.ok
        assert any(i.rule == "answer_key.unknown_option" for i in result)

    def test_error_names_the_bad_key(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_unknown_answer_key.json")
        issues = [i for i in result if i.rule == "answer_key.unknown_option"]
        assert any("Z" in i.message for i in issues)


class TestAnswerCountMismatchFixture:
    def test_triggers_count_mismatch_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_answer_count_mismatch.json")
        assert not result.ok
        assert any(i.rule == "answer_key.count_mismatch" for i in result)


class TestOrderingNotPermutationFixture:
    def test_triggers_permutation_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_ordering_not_permutation.json")
        assert not result.ok
        assert any(i.rule == "answer_key.not_a_permutation" for i in result)


class TestMatchingIncompleteFixture:
    def test_triggers_matching_incomplete_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_matching_incomplete.json")
        assert not result.ok
        assert any(i.rule == "answer_key.matching_incomplete" for i in result)

    def test_error_names_the_missing_left_key(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_matching_incomplete.json")
        issues = [i for i in result if i.rule == "answer_key.matching_incomplete"]
        assert any("L3" in i.message for i in issues)


class TestMissingWhyIncorrectFixture:
    def test_triggers_missing_why_incorrect_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_missing_why_incorrect.json")
        assert not result.ok
        assert any(i.rule == "explanation.missing_why_incorrect" for i in result)

    def test_error_names_the_missing_option(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_missing_why_incorrect.json")
        issues = [i for i in result if i.rule == "explanation.missing_why_incorrect"]
        assert any("C" in i.message for i in issues)


class TestExplanationTooShortFixture:
    def test_triggers_too_short_gate(self):
        result = _validate_single_question_file(FIXTURES_DIR / "question_explanation_too_short.json")
        assert not result.ok
        assert any(i.rule == "explanation.too_short" for i in result)


class TestQuestionValidateEntrypoint:
    def test_run_returns_zero_on_clean_theory_and_question_data(self):
        exit_code = validate.run()
        assert exit_code == 0


# ---------------------------------------------------------------------------
# Referential integrity, quality, case-study gates
# ---------------------------------------------------------------------------

class TestDanglingTheoryRefFixture:
    def test_triggers_dangling_theory_ref_gate(self):
        theory_records = loader.load_theory_cards()
        question_records = loader.load_records_from_array_file(
            FIXTURES_DIR / "question_dangling_theory_ref.json"
        )
        result = validate.validate_theory_referential(theory_records, question_records)
        assert any(i.rule == "referential.dangling_theory_ref" for i in result)

    def test_error_names_the_missing_theory_id(self):
        theory_records = loader.load_theory_cards()
        question_records = loader.load_records_from_array_file(
            FIXTURES_DIR / "question_dangling_theory_ref.json"
        )
        result = validate.validate_theory_referential(theory_records, question_records)
        issues = [i for i in result if i.rule == "referential.dangling_theory_ref"]
        assert any("TH-D1-999" in i.message for i in issues)


class TestOrphanTheoryCardFixture:
    def test_triggers_orphan_warning_by_default(self):
        theory_records = loader.load_records_from_array_file(
            FIXTURES_DIR / "theory_orphan_card.json"
        )
        question_records = loader.load_questions()  # none reference the orphan fixture card
        result = validate.validate_theory_referential(theory_records, question_records, orphan_mode="warn")
        assert any(i.rule == "referential.orphan_theory_card_warning" for i in result)

    def test_orphan_becomes_fatal_in_fail_mode(self):
        theory_records = loader.load_records_from_array_file(
            FIXTURES_DIR / "theory_orphan_card.json"
        )
        question_records = loader.load_questions()
        result = validate.validate_theory_referential(theory_records, question_records, orphan_mode="fail")
        assert any(i.rule == "referential.orphan_theory_card" for i in result)


class TestDuplicateAndNearDuplicateStems:
    def test_exact_duplicate_stem_detected(self):
        records = loader.load_records_from_array_file(
            FIXTURES_DIR / "question_near_duplicate_stems.json"
        )
        result = validate.validate_duplicate_stems(records, near_duplicate_threshold=0.90)
        assert any(i.rule in ("quality.duplicate_stem", "quality.near_duplicate_stem") for i in result)

    def test_seed_questions_have_no_near_duplicates(self):
        records = loader.load_questions()
        result = validate.validate_duplicate_stems(records, near_duplicate_threshold=0.90)
        assert result.ok, f"seed questions should have no near-duplicates, got: {[str(i) for i in result]}"


class TestAnswerPositionSkewFixture:
    def test_triggers_skew_gate_on_20_all_a_questions(self):
        records = loader.load_records_from_array_file(
            FIXTURES_DIR / "question_answer_position_skew.json"
        )
        result = validate.validate_answer_position_distribution(records, tolerance_pct_points=15.0)
        assert any(i.rule == "quality.answer_position_skew" for i in result)

    def test_seed_questions_too_few_to_trigger_skew_check(self):
        records = loader.load_questions()
        result = validate.validate_answer_position_distribution(records, tolerance_pct_points=15.0)
        assert result.ok  # fewer than 20 single_choice questions in the seed set


class TestCaseStudySchemaAndConsistency:
    def test_case_study_schema_exists_and_loads(self):
        schema = loader.load_schema("case-study")
        assert schema["title"] == "CaseStudy"

    def test_empty_case_study_set_validates_clean(self):
        result = validate.validate_case_studies()
        assert result.ok

    def test_case_study_with_dangling_question_id_fails(self):
        cs_record_data = {
            "id": "CS-01",
            "title": "Fixture case study with a dangling question id",
            "scenario": "A" * 250,
            "question_ids": ["Q-D1-0001", "Q-D1-9999"],
        }
        fake_record = loader.Record(file=Path("fixture://cs"), index=0, data=cs_record_data)
        question_records = loader.load_questions()
        result = validate.validate_case_study_consistency([fake_record], question_records)
        assert any(i.rule == "referential.case_study_dangling_question" for i in result)


class TestBlueprintConformanceProgressMode:
    def test_progress_mode_reports_gaps_but_run_still_exits_zero_without_other_errors(self):
        # With an empty data skeleton against a 500-question blueprint, progress
        # mode must report the gap as informational without failing validate.run().
        result = validate.validate_blueprint_conformance(strict=False)
        assert not result.ok  # gaps definitely exist at this stage
        exit_code = validate.run(strict=False)
        assert exit_code == 0  # progress mode: gaps are non-fatal


class TestStatsToolImports:
    def test_stats_module_importable_and_main_runs(self):
        stats_path = REPO_ROOT / "tools" / "stats.py"
        assert stats_path.exists()
        sys.path.insert(0, str(REPO_ROOT / "tools"))
        import stats  # noqa: E402
        exit_code = stats.main()
        assert exit_code == 0
