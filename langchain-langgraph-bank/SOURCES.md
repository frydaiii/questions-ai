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
one URL pointing to a real, relevant primary source (an academic paper or
industry publication) for readers who want to go deeper on that concept.

As of 2026-10-13, all six domains (`d1`–`d6`, 116 theory cards) are authored
and **76 distinct reference URLs** are cited: **71 arXiv papers** and **5
industry/lab pages**. Titles below were fetched from arxiv.org (or the
publisher's page) on that date and compared with the title of the theory
card(s) that cite them.

**Match column:** *Yes* = the paper directly supports the card's concept.
*Partial* = the paper is related background but is not the primary source for
the specific claim (the card is a general-knowledge explanation, not a
summary of the paper).

### Domain 1 — Agent foundations (`d1.json`)

| arXiv ID | Verified title | Match |
|---|---|---|
| [2308.11432](https://arxiv.org/abs/2308.11432) | *A Survey on Large Language Model based Autonomous Agents* | Yes — agent definition/components/architecture |
| [2309.07864](https://arxiv.org/abs/2309.07864) | *The Rise and Potential of Large Language Model Based Agents: A Survey* | Yes — agent spectrum, agents vs chatbots vs workflows |
| [2302.04761](https://arxiv.org/abs/2302.04761) | *Toolformer: Language Models Can Teach Themselves to Use Tools* | Yes — tool use (also cited in d3) |
| [2210.03629](https://arxiv.org/abs/2210.03629) | *ReAct: Synergizing Reasoning and Acting in Language Models* | Yes — interleaved reasoning/action (also d2, d3) |
| [2201.11903](https://arxiv.org/abs/2201.11903) | *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* | Yes — also d2 |
| [2305.04091](https://arxiv.org/abs/2305.04091) | *Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models* | Yes — deliberative planning (also d2, d3) |
| [2303.11366](https://arxiv.org/abs/2303.11366) | *Reflexion: Language Agents with Verbal Reinforcement Learning* | Yes — feedback loop (also d2, d4) |

### Domain 2 — Reasoning and planning (`d2.json`)

| arXiv ID | Verified title | Match |
|---|---|---|
| [2305.10601](https://arxiv.org/abs/2305.10601) | *Tree of Thoughts: Deliberate Problem Solving with Large Language Models* | Yes |
| [2303.17651](https://arxiv.org/abs/2303.17651) | *Self-Refine: Iterative Refinement with Self-Feedback* | Yes — self-critique loops |
| [2203.11171](https://arxiv.org/abs/2203.11171) | *Self-Consistency Improves Chain of Thought Reasoning in Language Models* | Yes |
| [2305.18323](https://arxiv.org/abs/2305.18323) | *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models* | Yes — decoupled planning |
| [2305.04388](https://arxiv.org/abs/2305.04388) | *Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting* | Yes — reasoning-trace faithfulness |
| [2207.05221](https://arxiv.org/abs/2207.05221) | *Language Models (Mostly) Know What They Know* | Yes — uncertainty/calibration |
| [2404.10960](https://arxiv.org/abs/2404.10960) | *Uncertainty-Based Abstention in LLMs Improves Safety and Reduces Hallucinations* | Yes — selective abstention |
| [2305.14325](https://arxiv.org/abs/2305.14325) | *Improving Factuality and Reasoning in Language Models through Multiagent Debate* | Partial — cited for ambiguity handling (d2) and debate (d5) |

### Domain 3 — Tool use (`d3.json`)

| Reference | Verified title | Match |
|---|---|---|
| [2211.10435](https://arxiv.org/abs/2211.10435) | *PAL: Program-aided Language Models* | Yes — delegating computation to code |
| [2211.12588](https://arxiv.org/abs/2211.12588) | *Program of Thoughts Prompting: Disentangling Computation from Reasoning for Numerical Reasoning Tasks* | Yes |
| [2305.11738](https://arxiv.org/abs/2305.11738) | *CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing* | Yes — verify outputs with tools |
| [2112.09332](https://arxiv.org/abs/2112.09332) | *WebGPT: Browser-assisted question-answering with human feedback* | Yes — citation/attribution |
| [2305.14627](https://arxiv.org/abs/2305.14627) | *Enabling Large Language Models to Generate Text with Citations* | Yes — citation/attribution |
| [2305.15334](https://arxiv.org/abs/2305.15334) | *Gorilla: Large Language Model Connected with Massive APIs* | Partial — API/tool discovery, not protocol-mediated exchange per se |
| [openai.com/…/introducing-structured-outputs-in-the-api](https://openai.com/index/introducing-structured-outputs-in-the-api/) | *Introducing Structured Outputs in the API* (OpenAI) | Yes — schema-conformant function calling |
| [anthropic.com/engineering/writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | *Writing effective tools for agents — with agents* (Anthropic) | Yes — tool response design |
| [anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents) | *Building effective agents* (Anthropic) | Yes — also cited in d1 |

### Domain 4 — Memory (`d4.json`)

| arXiv ID | Verified title | Match |
|---|---|---|
| [2304.03442](https://arxiv.org/abs/2304.03442) | *Generative Agents: Interactive Simulacra of Human Behavior* | Yes — memory types (also d5) |
| [2310.08560](https://arxiv.org/abs/2310.08560) | *MemGPT: Towards LLMs as Operating Systems* | Yes — tiered memory/paging |
| [2308.15022](https://arxiv.org/abs/2308.15022) | *Recursively Summarizing Enables Long-Term Dialogue Memory in Large Language Models* | Yes — rolling summarization |
| [2112.00114](https://arxiv.org/abs/2112.00114) | *Show Your Work: Scratchpads for Intermediate Computation with Language Models* | Yes — scratchpad as working memory |
| [2305.10250](https://arxiv.org/abs/2305.10250) | *MemoryBank: Enhancing Large Language Models with Long-Term Memory* | Yes — decay/reinforcement |
| [2305.16291](https://arxiv.org/abs/2305.16291) | *Voyager: An Open-Ended Embodied Agent with Large Language Models* | Yes — skill library as procedural memory |
| [2307.03172](https://arxiv.org/abs/2307.03172) | *Lost in the Middle: How Language Models Use Long Contexts* | Yes for d4 position effects; Partial for d5 sub-agent context isolation |
| [2402.07867](https://arxiv.org/abs/2402.07867) | *PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of Large Language Models* | Yes — memory poisoning |

### Domain 5 — Multi-agent systems (`d5.json`)

| arXiv ID | Verified title | Match |
|---|---|---|
| [2308.08155](https://arxiv.org/abs/2308.08155) | *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation* | Yes — orchestration |
| [2308.00352](https://arxiv.org/abs/2308.00352) | *MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework* | Yes — handoffs, shared state, SOPs |
| [2307.07924](https://arxiv.org/abs/2307.07924) | *ChatDev: Communicative Agents for Software Development* | Yes — role specialization, pipelines |
| [2303.17760](https://arxiv.org/abs/2303.17760) | *CAMEL: Communicative Agents for "Mind" Exploration of Large Language Model Society* | Yes — decomposition |
| [2308.10848](https://arxiv.org/abs/2308.10848) | *AgentVerse: Facilitating Multi-Agent Collaboration and Exploring Emergent Behaviors* | Yes — boundaries, hierarchy |
| [2411.04468](https://arxiv.org/abs/2411.04468) | *Magentic-One: A Generalist Multi-Agent System for Solving Complex Tasks* | Yes — hierarchical teams |
| [2305.19118](https://arxiv.org/abs/2305.19118) | *Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate* | Yes — debate, conformity |
| [2406.04692](https://arxiv.org/abs/2406.04692) | *Mixture-of-Agents Enhances Large Language Model Capabilities* | Partial — layered aggregation, cited for swarm-style coordination |
| [2406.11776](https://arxiv.org/abs/2406.11776) | *Improving Multi-Agent Debate with Sparse Communication Topology* | Partial — communication topology, cited for blackboard card |
| [2507.01701](https://arxiv.org/abs/2507.01701) | *Exploring Advanced LLM Multi-Agent Systems Based on Blackboard Architecture* | Yes — blackboard |
| [2312.04511](https://arxiv.org/abs/2312.04511) | *An LLM Compiler for Parallel Function Calling* | Yes — parallelism/dependencies |
| [2503.13657](https://arxiv.org/abs/2503.13657) | *Why Do Multi-Agent LLM Systems Fail?* | Yes — cost, groupthink, failure modes |
| [2410.07283](https://arxiv.org/abs/2410.07283) | *Prompt Infection: LLM-to-LLM Prompt Injection within Multi-Agent Systems* | Yes — malicious contagion |
| [2502.14143](https://arxiv.org/abs/2502.14143) | *Multi-Agent Risks from Advanced AI* | Yes — collusion, contagion |
| [2505.02279](https://arxiv.org/abs/2505.02279) | *A survey of agent interoperability protocols: MCP, ACP, A2A, and ANP* | Yes — interoperability protocols |
| [2505.18279](https://arxiv.org/abs/2505.18279) | *Collaborative Memory: Multi-User Memory Sharing in LLM Agents with Dynamic Access Control* | Yes — shared vs private memory |
| [anthropic.com/engineering/multi-agent-research-system](https://www.anthropic.com/engineering/multi-agent-research-system) | *How we built our multi-agent research system* (Anthropic) | Yes — cost/context isolation |
| [2308.03688](https://arxiv.org/abs/2308.03688) | *AgentBench: Evaluating LLMs as Agents* | Partial — benchmark paper, cited for failure containment/runaway loops (d5) and evaluation (d6) |


### Domain 6 — Evaluation, safety, and oversight (`d6.json`)

| Reference | Verified title | Match |
|---|---|---|
| [2310.06770](https://arxiv.org/abs/2310.06770) | *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?* | Yes — outcome-based task success |
| [2311.12983](https://arxiv.org/abs/2311.12983) | *GAIA: a benchmark for General AI Assistants* | Yes — outcome-based task success |
| [2406.12045](https://arxiv.org/abs/2406.12045) | *τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains* | Yes — end-state success, pass^k |
| [2107.03374](https://arxiv.org/abs/2107.03374) | *Evaluating Large Language Models Trained on Code* | Yes — pass@k |
| [2401.13178](https://arxiv.org/abs/2401.13178) | *AgentBoard: An Analytical Evaluation Board of Multi-turn LLM Agents* | Yes — trajectory/step-level evaluation |
| [2407.01502](https://arxiv.org/abs/2407.01502) | *AI Agents That Matter* | Yes — cost-controlled evaluation, robustness |
| [2005.04118](https://arxiv.org/abs/2005.04118) | *Beyond Accuracy: Behavioral Testing of NLP models with CheckList* | Yes — regression/robustness suites |
| [2306.05685](https://arxiv.org/abs/2306.05685) | *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* | Yes — LLM-as-judge biases (also d5) |
| [2309.15817](https://arxiv.org/abs/2309.15817) | *Identifying the Risks of LM Agents with an LM-Emulated Sandbox* | Yes — emulated-sandbox testing |
| [1606.06565](https://arxiv.org/abs/1606.06565) | *Concrete Problems in AI Safety* | Partial — general side-effects/safe-exploration background; cited for tool misuse and excessive agency |
| [2302.12173](https://arxiv.org/abs/2302.12173) | *Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection* | Yes — indirect prompt injection |
| [2403.02691](https://arxiv.org/abs/2403.02691) | *InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents* | Yes |
| [2406.13352](https://arxiv.org/abs/2406.13352) | *AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents* | Yes |
| [2503.18813](https://arxiv.org/abs/2503.18813) | *Defeating Prompt Injections by Design* | Yes — least privilege / capability control |
| [2312.06674](https://arxiv.org/abs/2312.06674) | *Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations* | Yes — layered guardrails |
| [2501.18837](https://arxiv.org/abs/2501.18837) | *Constitutional Classifiers: Defending against Universal Jailbreaks across Thousands of Hours of Red Teaming* | Yes — layered guardrails |
| [2105.14111](https://arxiv.org/abs/2105.14111) | *Goal Misgeneralization in Deep Reinforcement Learning* | Yes |
| [2210.01790](https://arxiv.org/abs/2210.01790) | *Goal Misgeneralization: Why Correct Specifications Aren't Enough For Correct Goals* | Yes |
| [2201.03544](https://arxiv.org/abs/2201.03544) | *The Effects of Reward Misspecification: Mapping and Mitigating Misaligned Models* | Yes — reward hacking |
| [2209.13085](https://arxiv.org/abs/2209.13085) | *Defining and Characterizing Reward Hacking* | Yes |
| [deepmind.google/…/specification-gaming-the-flip-side-of-ai-ingenuity](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/) | *Specification gaming: the flip side of AI ingenuity* (Google DeepMind) | Yes |
| [2310.13548](https://arxiv.org/abs/2310.13548) | *Towards Understanding Sycophancy in Language Models* | Yes — sycophancy |
| [2401.05566](https://arxiv.org/abs/2401.05566) | *Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training* | Yes — deceptive behavior |
| [2203.02155](https://arxiv.org/abs/2203.02155) | *Training language models to follow instructions with human feedback* | Partial — RLHF background, cited for human approval/escalation cards |
| [2212.08073](https://arxiv.org/abs/2212.08073) | *Constitutional AI: Harmlessness from AI Feedback* | Partial — alignment background, cited for escalation signals and oversight limits |
| [2305.18290](https://arxiv.org/abs/2305.18290) | *Direct Preference Optimization: Your Language Model is Secretly a Reward Model* | Yes — alignment training techniques |

**Caveat:** these are checks of ID-to-title correspondence and topical fit, not
a line-by-line audit of whether every specific claim in every theory card
precisely matches that paper's findings. The papers are real and topically
relevant, but the card content itself is an original, general-knowledge
explanation, not a direct summary or quotation of the paper. Rows marked
*Partial* are the weakest fits and the best candidates to replace if a more
direct primary source is found.

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

