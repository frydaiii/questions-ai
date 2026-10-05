"""Coverage dashboard for the LangChain/LangGraph practice question bank.

Usage:
    python tools/stats.py            # coverage dashboard
    python tools/stats.py --theory   # theory card library grouped by domain/task statement
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loader  # noqa: E402

BAR_WIDTH = 30


def _progress_bar(actual: int, target: int, width: int = BAR_WIDTH) -> str:
    if target <= 0:
        return "[" + " " * width + "] n/a"
    frac = min(actual / target, 1.0)
    filled = int(round(frac * width))
    bar = "#" * filled + "-" * (width - filled)
    pct = 100.0 * actual / target
    marker = " (!)" if actual > target else ""
    return f"[{bar}] {actual:>4}/{target:<4} ({pct:5.1f}%){marker}"


def _load_valid_questions() -> list[dict]:
    records = loader.load_questions()
    return [r.data for r in records if r.data is not None]


def _load_valid_theory_cards() -> list[dict]:
    records = loader.load_theory_cards()
    return [r.data for r in records if r.data is not None]


def print_domain_progress(blueprint: dict, questions: list[dict]) -> None:
    print("=" * 70)
    print("DOMAIN PROGRESS (standalone questions)")
    print("=" * 70)
    for domain in blueprint["domains"]:
        did = domain["id"]
        standalone = [
            q for q in questions
            if q.get("domain") == did and q.get("case_study_id") is None
        ]
        print(f"D{did} {domain['name']:<55} {_progress_bar(len(standalone), domain['standalone_questions'])}")
    print()


def print_task_statement_progress(blueprint: dict, questions: list[dict]) -> None:
    print("=" * 70)
    print("TASK STATEMENT PROGRESS (standalone questions)")
    print("=" * 70)
    for domain in blueprint["domains"]:
        did = domain["id"]
        for ts in domain["task_statements"]:
            ts_questions = [
                q for q in questions
                if q.get("domain") == did
                and q.get("task_statement") == ts["id"]
                and q.get("case_study_id") is None
            ]
            label = f"{ts['id']} {ts['title'][:50]}"
            print(f"{label:<58} {_progress_bar(len(ts_questions), ts['standalone_questions'])}")
    print()


def print_format_breakdown(blueprint: dict, questions: list[dict]) -> None:
    print("=" * 70)
    print("FORMAT MIX (standalone questions, overall)")
    print("=" * 70)
    standalone = [q for q in questions if q.get("case_study_id") is None]
    counts = Counter(q.get("type") for q in standalone)
    for fmt in ("single_choice", "multi_response", "ordering", "matching"):
        target = blueprint["format_totals"][fmt]
        print(f"{fmt:<20} {_progress_bar(counts.get(fmt, 0), target)}")
    print()


def print_difficulty_breakdown(blueprint: dict, questions: list[dict]) -> None:
    print("=" * 70)
    print("DIFFICULTY MIX (standalone questions, per domain)")
    print("=" * 70)
    for domain in blueprint["domains"]:
        did = domain["id"]
        standalone = [
            q for q in questions
            if q.get("domain") == did and q.get("case_study_id") is None
        ]
        total = len(standalone)
        counts = Counter(q.get("difficulty") for q in standalone)
        parts = []
        for level in ("easy", "medium", "hard"):
            c = counts.get(level, 0)
            pct = (100.0 * c / total) if total else 0.0
            target_pct = domain["difficulty_mix_pct"][level]
            parts.append(f"{level}={c} ({pct:.0f}%, target {target_pct}%)")
        print(f"D{did} {domain['name'][:40]:<42} {', '.join(parts)}")
    print()


def print_theory_usage_histogram(blueprint: dict, theory_cards: list[dict], questions: list[dict]) -> None:
    print("=" * 70)
    print("THEORY CARD USAGE")
    print("=" * 70)
    tolerances = blueprint.get("tolerances", {})
    min_refs = tolerances.get("theory_card_min_refs", 3)
    max_refs = tolerances.get("theory_card_max_refs", 12)

    usage: Counter = Counter()
    for q in questions:
        for ref in q.get("theory_refs", []) or []:
            usage[ref] += 1

    card_ids = {c["id"] for c in theory_cards}
    under_used = sorted(
        cid for cid in card_ids if usage.get(cid, 0) < min_refs
    )
    over_used = sorted(
        cid for cid in card_ids if usage.get(cid, 0) > max_refs
    )

    print(f"Total theory cards: {len(theory_cards)} (target {blueprint['theory_cards_total_target']})")
    print(f"Cards referenced by 0 questions (orphans): {sum(1 for cid in card_ids if usage.get(cid, 0) == 0)}")
    print(f"Under-used (<{min_refs} refs, excluding orphans): {len(under_used)}")
    if under_used:
        print("  " + ", ".join(under_used[:20]) + (" ..." if len(under_used) > 20 else ""))
    print(f"Over-used (>{max_refs} refs): {len(over_used)}")
    if over_used:
        print("  " + ", ".join(over_used[:20]) + (" ..." if len(over_used) > 20 else ""))
    print()


def print_tag_frequency(questions: list[dict]) -> None:
    print("=" * 70)
    print("TAG FREQUENCY (top 20)")
    print("=" * 70)
    counts: Counter = Counter()
    for q in questions:
        for tag in q.get("tags", []) or []:
            counts[tag] += 1
    for tag, count in counts.most_common(20):
        print(f"  {tag:<30} {count}")
    print()


def print_theory_library(theory_cards: list[dict]) -> None:
    print("=" * 70)
    print("THEORY CARD LIBRARY (grouped by domain / task statement)")
    print("=" * 70)

    by_domain: dict[int, list[dict]] = defaultdict(list)
    for card in theory_cards:
        by_domain[card.get("domain")].append(card)

    for did in sorted(by_domain):
        print(f"\nDomain {did} ({len(by_domain[did])} cards)")
        print("-" * 70)
        by_ts: dict[str, list[dict]] = defaultdict(list)
        for card in by_domain[did]:
            for ts in card.get("task_statements", []):
                by_ts[ts].append(card)
        for ts in sorted(by_ts):
            print(f"  {ts}:")
            for card in sorted(by_ts[ts], key=lambda c: c["id"]):
                print(f"    {card['id']}  {card['title']}")
    print()


def main() -> int:
    blueprint = loader.load_blueprint()
    questions = _load_valid_questions()
    theory_cards = _load_valid_theory_cards()

    if "--theory" in sys.argv:
        print_theory_library(theory_cards)
        return 0

    print_domain_progress(blueprint, questions)
    print_task_statement_progress(blueprint, questions)
    print_format_breakdown(blueprint, questions)
    print_difficulty_breakdown(blueprint, questions)
    print_theory_usage_histogram(blueprint, theory_cards, questions)
    print_tag_frequency(questions)

    total_standalone = len([q for q in questions if q.get("case_study_id") is None])
    total_case_study = len([q for q in questions if q.get("case_study_id") is not None])
    print("=" * 70)
    print(f"TOTAL: {total_standalone} standalone + {total_case_study} case-study = "
          f"{total_standalone + total_case_study} / {blueprint['total_questions']} questions")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
