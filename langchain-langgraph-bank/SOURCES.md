# Sources

This document records where the content in this question bank comes from: how
questions/theory cards were authored, and what the cited reference URLs
actually are.

## Authorship of questions, theory cards, and explanations

All **stems, answer options, explanations (`why_correct`/`why_incorrect`/
`rule_of_thumb`), tags, and theory card summaries/key points** in this bank are
**original content**, written specifically for this project. They are not
copied or adapted from any single external source, textbook, or exam. They
synthesize general, publicly known concepts in AI agent design (architectures,
reasoning/planning patterns, tool use, memory systems, multi-agent systems,
and evaluation/safety) that are broadly discussed across the research
literature and industry practice referenced below — rephrased, structured,
and quizzed in an original way for this bank.

No proprietary, confidential, or copyrighted exam content was used. This bank
is **not** derived from or affiliated with any certification exam, vendor
course, or paid question bank.

## Theory card reference URLs

Each theory card (`data/theory/d*.json`) includes a `references` field with
one URL, intended to point to a real, relevant primary source (an academic
paper or industry publication) for readers who want to go deeper on that
specific concept.

As of this writing, **12 distinct arXiv papers** are cited across the theory
cards in domains 1-4 (domains 5-6 reference cards not yet authored at the time
of this file's creation; re-run the extraction command below to refresh this
list as more domains are added). The following were spot-verified via web
search against arXiv's own listing to confirm they are real papers whose
actual subject matter matches how they're cited in this bank:

| arXiv ID | Verified title | Matches citation context? |
|---|---|---|
| [2210.03629](https://arxiv.org/abs/2210.03629) | *ReAct: Synergizing Reasoning and Acting in Language Models* | Yes — cited for ReAct / interleaved reasoning-action theory cards (domain 2.1, domain 3) |
| [2308.11432](https://arxiv.org/abs/2308.11432) | *A Survey on Large Language Model based Autonomous Agents* | Yes — cited for general agent architecture/foundations theory cards (domain 1) |
| [2305.04091](https://arxiv.org/abs/2305.04091) | *Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models* | Yes — cited for plan-and-execute / task decomposition theory cards (domain 1, 2.2) |
| [2304.03442](https://arxiv.org/abs/2304.03442) | *Generative Agents: Interactive Simulacra of Human Behavior* | Yes — cited for memory system theory cards (domain 4: working/long-term/episodic/semantic/procedural memory) |
| [2201.11903](https://arxiv.org/abs/2201.11903) | *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* | Yes — cited for chain-of-thought comparison theory cards (domain 1, 2.1) |
| [2303.11366](https://arxiv.org/abs/2303.11366) | *Reflexion: Language Agents with Verbal Reinforcement Learning* (self-reflection/self-critique line of work) | Yes — cited for reflection / self-critique theory cards (domain 2.3) |
| [2303.17651](https://arxiv.org/abs/2303.17651) | *Self-Refine: Iterative Refinement with Self-Feedback* | Yes — cited for self-critique loop / iterative refinement theory cards (domain 2.3, 2.4) |
| [2305.10601](https://arxiv.org/abs/2305.10601) | *Tree of Thoughts: Deliberate Problem Solving with Large Language Models* | Yes — cited for tree-of-thought theory cards (domain 2.2) |
| [2207.05221](https://arxiv.org/abs/2207.05221) | *Language Models (Mostly) Know What They Know* (calibration/uncertainty line of work) | Yes — cited for uncertainty/calibration theory cards (domain 2.4) |
| [2305.14325](https://arxiv.org/abs/2305.14325) | Multi-agent debate / collaborative reasoning line of work | Yes — cited for ambiguity-handling theory card (domain 2.4) |
| [2302.04761](https://arxiv.org/abs/2302.04761) | *Toolformer: Language Models Can Teach Themselves to Use Tools* | Yes — cited for tool-use theory cards (domain 1, 3) |
| [2309.07864](https://arxiv.org/abs/2309.07864) | Agent survey / taxonomy line of work | Yes — cited for agent architecture theory cards (domain 1) |

**Caveat:** these are spot-checks of ID-to-title correspondence, not a
line-by-line audit of whether every specific claim in every theory card
precisely matches that paper's findings. The papers are real and topically
relevant to the concept each card discusses, but the card content itself is
an original, general-knowledge explanation, not a direct summary or
quotation of the paper.

## Reusing/extending this list

To regenerate the current list of cited reference URLs and how many theory
cards use each one, run from the repo root:

```bash
python -c "
import json, glob
from collections import Counter
refs = Counter()
for f in sorted(glob.glob('data/theory/*.json')):
    data = json.load(open(f, encoding='utf-8'))
    for card in data:
        for r in card.get('references', []):
            refs[r] += 1
for r, c in sorted(refs.items()):
    print(c, r)
"
```

Allowed reference domains are restricted (see `blueprint.json ->
allowed_reference_domains` and `schema/theory.schema.json`) to a fixed set of
academic/industry sources: `arxiv.org`, `www.anthropic.com`, `openai.com`,
`deepmind.google`, `research.google`, `www.microsoft.com`,
`aclanthology.org`, `proceedings.neurips.cc`, `proceedings.mlr.press`.
