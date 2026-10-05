# AIF-C01 Practice Question Bank

An 800-question original practice bank for the **AWS Certified AI Practitioner (AIF-C01)** exam,
built around reusable theory cards, a strict JSON Schema, and a Python validator/stats toolchain.

> **Disclaimer:** This is an independent, original study resource. It is **not affiliated with,
> endorsed by, or reviewed by Amazon Web Services (AWS)**. Domain weights and task statement
> structure are referenced from the publicly available AIF-C01 exam guide for coverage alignment
> only. All questions, explanations, and theory cards are original content.

## Status

Work in progress, built incrementally task-by-task. Run `python tools/stats.py` at any time to see
current coverage against the target blueprint (`blueprint.json`).

## Repository layout

```
blueprint.json              Single source of truth for all target counts (domains, task
                             statements, format mix, difficulty mix, tolerances).
schema/
  theory.schema.json         JSON Schema for theory cards.
  question.schema.json       JSON Schema for questions (all 4 formats).
  case-study.schema.json     JSON Schema for case-study clusters.
data/
  theory/
    d1.json ... d5.json      Theory cards, one file per domain.
  questions/
    d1/ ... d5/               Question batches (~30 per file), one folder per domain.
  case-studies/
    cs-01.json ... cs-08.json Cross-domain scenario clusters (3-5 linked questions each).
tools/
  loader.py                  Shared file discovery/parsing with precise error locations.
  validate.py                Validator: structural, referential, answer-key, explanation,
                              quality, and blueprint-conformance gates.
  stats.py                   Coverage dashboard (progress bars, format/difficulty breakdown,
                              theory usage histogram, tag frequency).
  requirements.txt           jsonschema, pytest, rapidfuzz.
tests/
  test_validate.py           pytest suite covering every validator rule.
  fixtures/                  One deliberately-broken file per validator rule.
```

## Exam structure this bank targets

AIF-C01: 65 scored questions, 90 minutes, pass score 700/1000. Five domains:

| # | Domain | Weight | Bank questions |
|---|---|---|---|
| 1 | Fundamentals of AI and ML | 20% | 160 |
| 2 | Fundamentals of Generative AI | 24% | 192 |
| 3 | Applications of Foundation Models | 28% | 224 |
| 4 | Guidelines for Responsible AI | 14% | 112 |
| 5 | Security, Compliance, and Governance for AI Solutions | 14% | 112 |

Each domain is broken into 2-4 task statements (14 total: 3+3+4+2+2). See `blueprint.json` for the
exact per-task-statement question counts, format mix, and difficulty mix targets.

32 of the 800 questions are grouped into 8 cross-domain case-study clusters (3-5 linked questions
each); the rest are standalone.

## Data model

**Theory card** (`data/theory/dN.json`): a reusable explanation of one concept, referenced by many
questions.

```json
{
  "id": "TH-D3-006",
  "domain": 3,
  "task_statements": ["3.1", "3.3"],
  "title": "Foundation model customization ladder: prompt engineering vs RAG vs fine-tuning vs continued pre-training",
  "summary": "...",
  "key_points": ["...", "..."],
  "rule_of_thumb": "...",
  "common_confusions": ["..."],
  "aws_services": ["Amazon Bedrock", "Amazon SageMaker"],
  "references": ["https://docs.aws.amazon.com/..."]
}
```

**Question** (`data/questions/dN/*.json`): one of four formats — `single_choice`, `multi_response`,
`ordering`, `matching`. Every question links to 1+ theory cards via `theory_refs`.

```json
{
  "id": "Q-D3-0142",
  "domain": 3,
  "task_statement": "3.2",
  "type": "single_choice",
  "difficulty": "medium",
  "theory_refs": ["TH-D3-006", "TH-D3-011"],
  "case_study_id": null,
  "stem": "...",
  "select_count": 1,
  "options": [{ "key": "A", "text": "..." }],
  "correct": ["B"],
  "explanation": {
    "why_correct": "...",
    "why_incorrect": { "A": "...", "C": "...", "D": "..." },
    "rule_of_thumb": "..."
  },
  "tags": ["rag", "bedrock"]
}
```

`ordering` questions use a full-permutation `correct` array. `matching` questions replace `options`
with a `matching: { left: [...], right: [...] }` object and `correct_pairs` map instead of `correct`.

**Case study** (`data/case-studies/cs-NN.json`): a scenario shared by 3-5 questions across domains.

Full schema reference, authoring conventions, and validator rule catalogue will be finalized in
`README.md` once the bank is complete (final task).

## Using the tools

```bash
pip install -r tools/requirements.txt

python tools/validate.py            # progress mode: reports gaps, exits 0
python tools/validate.py --strict   # strict mode: exact blueprint match required

python tools/stats.py               # coverage dashboard
python tools/stats.py --theory      # theory card library grouped by domain/task statement

python tools/export_xlsx.py         # export all questions to exports/aif-c01-questions.xlsx
python tools/export_xlsx.py --output path/to/questions.xlsx

pytest tests/                       # validator rule test suite
```
