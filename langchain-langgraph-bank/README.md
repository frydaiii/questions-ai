# AI Agent Theory Practice Question Bank

A 500-question original practice bank covering **framework-agnostic AI agent theory** -- agent
architectures, reasoning and planning, tool use, memory systems, multi-agent systems, and
evaluation/safety -- built around reusable theory cards, a strict JSON Schema, and a Python
validator/stats toolchain.

> **Disclaimer:** This is an independent, original study resource. It is **not affiliated with,
> endorsed by, or reviewed by any AI vendor or framework maintainer**. This bank is deliberately
> framework-agnostic: it does not test the API mechanics of any specific library (e.g. LangChain,
> LangGraph, AutoGPT). Instead it covers the underlying concepts common to AI agent systems in
> general -- the kind of knowledge that transfers across frameworks and informs how to design,
> evaluate, and reason about agentic systems. There is no official certification exam for this
> material; the domain/task-statement structure below is an original curriculum design intended
> for self-study and interview preparation. All questions, explanations, and theory cards are
> original content.

## Status

The bank is complete against `blueprint.json`: 500 questions (480 standalone + 20 case-study
questions in 5 cross-domain clusters) and 116 theory cards. `python tools/validate.py --strict`
passes. Run `python tools/stats.py` at any time to see current coverage.

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
    d1.json ... d6.json      Theory cards, one file per domain.
  questions/
    d1/ ... d6/               Question batches, one folder per domain.
  case-studies/
    cs-01.json ...           Cross-domain scenario clusters (3-5 linked questions each).
tools/
  loader.py                  Shared file discovery/parsing with precise error locations.
                              Domain count is read from blueprint.json (domain_range.max)
                              rather than hardcoded.
  validate.py                Validator: structural, referential, answer-key, explanation,
                              quality, and blueprint-conformance gates.
  stats.py                   Coverage dashboard (progress bars, format/difficulty breakdown,
                              theory usage histogram, tag frequency).
  export_xlsx.py              Export all questions to an Excel workbook.
  requirements.txt           jsonschema, pytest, rapidfuzz, openpyxl.
tests/
  test_validate.py           pytest suite covering every validator rule.
  test_blueprint.py          Smoke tests on blueprint.json's internal arithmetic.
  fixtures/                  One deliberately-broken file per validator rule.
```

## Curriculum structure this bank targets

500 questions across 6 domains and 20 task statements, covering concepts that apply regardless of
which agent framework or vendor stack is used:

| # | Domain | Weight | Bank questions |
|---|---|---|---|
| 1 | Agent Architectures & Foundations | 15% | 75 |
| 2 | Reasoning & Planning | 18% | 90 |
| 3 | Tool Use & Grounding | 17% | 85 |
| 4 | Memory Systems | 17% | 85 |
| 5 | Multi-Agent Systems | 18% | 90 |
| 6 | Evaluation, Safety & Alignment | 15% | 75 |

Each domain is broken into 3-4 task statements (20 total: 3+4+3+3+4+3). See `blueprint.json` for
the exact per-task-statement question counts, format mix, and difficulty mix targets.

20 of the 500 questions are grouped into 5 cross-domain case-study clusters (3-4 linked questions
each); the rest are standalone. `format_mix`/`format_totals` cover standalone questions only
(480 total: 330 single_choice + 90 multi_response + 30 ordering + 30 matching).

## Data model

**Theory card** (`data/theory/dN.json`): a reusable explanation of one concept, referenced by many
questions.

```json
{
  "id": "TH-D2-006",
  "domain": 2,
  "task_statements": ["2.1", "2.3"],
  "title": "ReAct: interleaving reasoning traces with tool-use actions",
  "summary": "...",
  "key_points": ["...", "..."],
  "rule_of_thumb": "...",
  "common_confusions": ["..."],
  "related_tech": ["ReAct", "Reflexion", "chain-of-thought"],
  "references": ["https://arxiv.org/abs/..."]
}
```

**Question** (`data/questions/dN/*.json`): one of four formats -- `single_choice`,
`multi_response`, `ordering`, `matching`. Every question links to 1+ theory cards via
`theory_refs`.

```json
{
  "id": "Q-D2-0142",
  "domain": 2,
  "task_statement": "2.1",
  "type": "single_choice",
  "difficulty": "medium",
  "theory_refs": ["TH-D2-006", "TH-D2-011"],
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
  "tags": ["reasoning", "react"],
  "concepts": ["Reasoning Loop (ReAct)", "Tools & Tool Discovery"]
}
```

`ordering` questions use a full-permutation `correct` array. `matching` questions replace
`options` with a `matching: { left: [...], right: [...] }` object and a `correct_pairs` map
instead of `correct`.

**Case study** (`data/case-studies/cs-NN.json`): a scenario shared by 3-5 questions across
domains (e.g. designing a multi-agent research assistant touches Reasoning & Planning, Tool Use,
Memory, and Multi-Agent Systems domains in one scenario).

Allowed reference domains for theory-card citations are academic/industry research sources:
`arxiv.org`, `www.anthropic.com`, `openai.com`, `deepmind.google`, `research.google`,
`www.microsoft.com`, `aclanthology.org`, `proceedings.neurips.cc`, `proceedings.mlr.press`.
Framework or vendor product documentation is intentionally excluded, since this bank does not
test any specific library's API.

## Using the tools

```bash
pip install -r tools/requirements.txt

python tools/validate.py            # progress mode: reports gaps, exits 0
python tools/validate.py --strict   # strict mode: exact blueprint match required

python tools/stats.py               # coverage dashboard
python tools/stats.py --theory      # theory card library grouped by domain/task statement

python tools/export_xlsx.py         # export all questions to exports/langchain-langgraph-questions.xlsx
python tools/export_xlsx.py --output path/to/questions.xlsx

python tools/make_slides.py         # build exports/langchain-langgraph-bank-overview.pptx (needs python-pptx)

pytest tests/                       # validator rule test suite
```



### Concept classification

Every question has a `concepts` array containing one or more labels from the supplied AI concept taxonomy. `tags` remain fine-grained authoring/search keywords; `concepts` are normalized curriculum-level classifications. A question may have multiple concepts when it tests a cross-cutting mechanism (for example, tool selection can also involve context engineering and orchestration). All 500 questions carry concept labels, and every taxonomy label is used at least once.
