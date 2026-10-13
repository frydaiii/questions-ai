"""Vietnamese translations for tools/make_slides.py.

`tr(text, lang)` returns `text` unchanged for lang == "en". For "vi" it looks the English string up
in EXACT first and then tries the PATTERNS (for strings that embed live numbers). Strings that have
no translation are returned unchanged, so a missing entry degrades gracefully to English.
Technical identifiers (tool names, tag names, taxonomy concept labels, file names) stay in English.
"""
from __future__ import annotations

import re

EXACT: dict[str, str] = {
    # title
    "AI Agent Theory Question Bank": "Ng\u00e2n h\u00e0ng c\u00e2u h\u1ecfi l\u00fd thuy\u1ebft AI Agent",
    "Knowledge coverage & question statistics": "\u0110\u1ed9 ph\u1ee7 ki\u1ebfn th\u1ee9c & th\u1ed1ng k\u00ea c\u00e2u h\u1ecfi",
    "Framework-agnostic theory behind LangChain / LangGraph-style agents":
        "L\u00fd thuy\u1ebft \u0111\u1ed9c l\u1eadp framework \u0111\u1eb1ng sau c\u00e1c agent ki\u1ec3u LangChain / LangGraph",
    # overview
    "What this bank is": "Ng\u00e2n h\u00e0ng c\u00e2u h\u1ecfi n\u00e0y l\u00e0 g\u00ec",
    "Original, self-study curriculum for agent design \u2014 not tied to any library's API":
        "Gi\u00e1o tr\u00ecnh t\u1ef1 h\u1ecdc nguy\u00ean b\u1ea3n v\u1ec1 thi\u1ebft k\u1ebf agent \u2014 kh\u00f4ng g\u1eafn v\u1edbi API c\u1ee7a b\u1ea5t k\u1ef3 th\u01b0 vi\u1ec7n n\u00e0o",
    "questions in the bank": "c\u00e2u h\u1ecfi trong ng\u00e2n h\u00e0ng",
    "domains / task statements": "domain / task statement",
    "formats: single, multi, ordering, matching": "d\u1ea1ng c\u00e2u: m\u1ed9t \u0111\u00e1p \u00e1n, nhi\u1ec1u \u0111\u00e1p \u00e1n, s\u1eafp x\u1ebfp, gh\u00e9p c\u1eb7p",
    "theory cards": "th\u1ebb l\u00fd thuy\u1ebft",
    "Every question links to 1+ reusable theory cards and carries a full explanation (why correct / why each distractor is wrong / rule of thumb).":
        "M\u1ed7i c\u00e2u h\u1ecfi li\u00ean k\u1ebft v\u1edbi 1+ th\u1ebb l\u00fd thuy\u1ebft t\u00e1i s\u1eed d\u1ee5ng v\u00e0 c\u00f3 gi\u1ea3i th\u00edch \u0111\u1ea7y \u0111\u1ee7 (v\u00ec sao \u0111\u00fang / v\u00ec sao t\u1eebng \u0111\u00e1p \u00e1n nhi\u1ec5u sai / quy t\u1eafc ng\u00f3n tay).",
    "Tagged with fine-grained tags and normalized curriculum-level concepts (e.g. Context Engineering, ReAct, MCP).":
        "G\u1eafn tag chi ti\u1ebft v\u00e0 kh\u00e1i ni\u1ec7m \u0111\u01b0\u1ee3c chu\u1ea9n h\u00f3a theo gi\u00e1o tr\u00ecnh (v\u00ed d\u1ee5 Context Engineering, ReAct, MCP).",
    "Teaches the concepts that transfer across frameworks \u2014 ReAct loops, planning, tool use, memory, multi-agent coordination, safety \u2014 rather than LangChain/LangGraph API mechanics.":
        "D\u1ea1y c\u00e1c kh\u00e1i ni\u1ec7m d\u00f9ng \u0111\u01b0\u1ee3c cho m\u1ecdi framework \u2014 v\u00f2ng l\u1eb7p ReAct, l\u1eadp k\u1ebf ho\u1ea1ch, d\u00f9ng c\u00f4ng c\u1ee5, b\u1ed9 nh\u1edb, ph\u1ed1i h\u1ee3p \u0111a agent, an to\u00e0n \u2014 ch\u1ee9 kh\u00f4ng ph\u1ea3i c\u01a1 ch\u1ebf API c\u1ee7a LangChain/LangGraph.",
    "Quality gates: JSON Schema, referential checks, answer-key checks, near-duplicate detection, blueprint conformance, pytest suite.":
        "C\u1ed5ng ki\u1ec3m \u0111\u1ecbnh ch\u1ea5t l\u01b0\u1ee3ng: JSON Schema, ki\u1ec3m tra tham chi\u1ebfu, ki\u1ec3m tra \u0111\u00e1p \u00e1n, ph\u00e1t hi\u1ec7n tr\u00f9ng l\u1eb7p g\u1ea7n gi\u1ed1ng, kh\u1edbp blueprint, b\u1ed9 test pytest.",
    # progress
    "Overall progress": "Ti\u1ebfn \u0111\u1ed9 t\u1ed5ng th\u1ec3",
    "Authored": "\u0110\u00e3 so\u1ea1n",
    "Remaining": "C\u00f2n l\u1ea1i",
    # curriculum
    "Knowledge map: 6 domains, 20 task statements": "B\u1ea3n \u0111\u1ed3 ki\u1ebfn th\u1ee9c: 6 domain, 20 task statement",
    "What the bank teaches": "Ng\u00e2n h\u00e0ng d\u1ea1y nh\u1eefng g\u00ec",
    "D1 Agent Architectures & Foundations": "D1 Ki\u1ebfn tr\u00fac & n\u1ec1n t\u1ea3ng Agent",
    "D2 Reasoning & Planning": "D2 Suy lu\u1eadn & L\u1eadp k\u1ebf ho\u1ea1ch",
    "D3 Tool Use & Grounding": "D3 D\u00f9ng c\u00f4ng c\u1ee5 & Grounding",
    "D4 Memory Systems": "D4 H\u1ec7 th\u1ed1ng b\u1ed9 nh\u1edb",
    "D5 Multi-Agent Systems": "D5 H\u1ec7 th\u1ed1ng \u0111a agent",
    "D6 Evaluation, Safety & Alignment": "D6 \u0110\u00e1nh gi\u00e1, An to\u00e0n & Alignment",
    "D1 Agent Architectures": "D1 Ki\u1ebfn tr\u00fac Agent",
    "D6 Evaluation, Safety": "D6 \u0110\u00e1nh gi\u00e1, An to\u00e0n",
    "D1 Architectures": "D1 Ki\u1ebfn tr\u00fac",
    "D2 Reasoning": "D2 Suy lu\u1eadn",
    "D3 Tools": "D3 C\u00f4ng c\u1ee5",
    "D4 Memory": "D4 B\u1ed9 nh\u1edb",
    "D5 Multi-Agent": "D5 \u0110a agent",
    "D6 Safety": "D6 An to\u00e0n",
    "1.1 What makes a system an agent": "1.1 \u0110i\u1ec1u g\u00ec l\u00e0m n\u00ean m\u1ed9t agent",
    "1.2 Perceive-reason-act loop": "1.2 V\u00f2ng l\u1eb7p c\u1ea3m nh\u1eadn-suy lu\u1eadn-h\u00e0nh \u0111\u1ed9ng",
    "1.3 Reactive / deliberative / hybrid": "1.3 Ph\u1ea3n x\u1ea1 / c\u00e2n nh\u1eafc / lai",
    "2.1 ReAct": "2.1 ReAct",
    "2.2 Decomposition & planning": "2.2 Ph\u00e2n r\u00e3 & l\u1eadp k\u1ebf ho\u1ea1ch",
    "2.3 Reflection & self-critique": "2.3 Ph\u1ea3n t\u01b0 & t\u1ef1 ph\u00ea ph\u00e1n",
    "2.4 Uncertainty & reasoning errors": "2.4 B\u1ea5t \u0111\u1ecbnh & l\u1ed7i suy lu\u1eadn",
    "3.1 Why agents need tools": "3.1 V\u00ec sao agent c\u1ea7n c\u00f4ng c\u1ee5",
    "3.2 Tool selection & invocation": "3.2 Ch\u1ecdn & g\u1ecdi c\u00f4ng c\u1ee5",
    "3.3 Tool failures & recovery": "3.3 L\u1ed7i c\u00f4ng c\u1ee5 & ph\u1ee5c h\u1ed3i",
    "4.1 Working vs long-term": "4.1 Ng\u1eafn h\u1ea1n vs d\u00e0i h\u1ea1n",
    "4.2 Episodic / semantic / procedural": "4.2 S\u1ef1 ki\u1ec7n / ng\u1eef ngh\u0129a / th\u1ee7 t\u1ee5c",
    "4.3 Retrieval, relevance, forgetting": "4.3 Truy xu\u1ea5t, li\u00ean quan, qu\u00ean",
    "5.1 When to decompose": "5.1 Khi n\u00e0o n\u00ean t\u00e1ch agent",
    "5.2 Orchestrator-worker, debate": "5.2 Orchestrator-worker, tranh bi\u1ec7n",
    "5.3 Protocols & shared state": "5.3 Giao th\u1ee9c & tr\u1ea1ng th\u00e1i chung",
    "5.4 Emergence & failure modes": "5.4 Hi\u1ec7n t\u01b0\u1ee3ng n\u1ed5i sinh & ki\u1ec3u l\u1ed7i",
    "6.1 Evaluating agents": "6.1 \u0110\u00e1nh gi\u00e1 agent",
    "6.2 Agent-specific safety risks": "6.2 R\u1ee7i ro an to\u00e0n \u0111\u1eb7c th\u00f9 c\u1ee7a agent",
    "6.3 Guardrails, HITL, alignment": "6.3 Guardrail, HITL, alignment",
    # domains table
    "Coverage by domain": "\u0110\u1ed9 ph\u1ee7 theo domain",
    "Standalone questions authored vs. target": "C\u00e2u h\u1ecfi \u0111\u1ed9c l\u1eadp \u0111\u00e3 so\u1ea1n so v\u1edbi m\u1ee5c ti\u00eau",
    "Domain": "Domain",
    "Target": "M\u1ee5c ti\u00eau",
    "Complete": "Ho\u00e0n th\u00e0nh",
    "Theory cards ": "Th\u1ebb l\u00fd thuy\u1ebft",
    # tasks
    "Coverage by task statement": "\u0110\u1ed9 ph\u1ee7 theo task statement",
    "Authored questions as % of target (standalone)": "S\u1ed1 c\u00e2u \u0111\u00e3 so\u1ea1n theo % m\u1ee5c ti\u00eau (\u0111\u1ed9c l\u1eadp)",
    "% complete": "% ho\u00e0n th\u00e0nh",
    # theory
    "Theory card library": "Th\u01b0 vi\u1ec7n th\u1ebb l\u00fd thuy\u1ebft",
    "Theory cards": "Th\u1ebb l\u00fd thuy\u1ebft",
    "Card health": "T\u00ecnh tr\u1ea1ng th\u1ebb",
    "Each card: summary, key points, rule of thumb, common confusions, research references":
        "M\u1ed7i th\u1ebb g\u1ed3m: t\u00f3m t\u1eaft, \u00fd ch\u00ednh, quy t\u1eafc ng\u00f3n tay, nh\u1ea7m l\u1eabn th\u01b0\u1eddng g\u1eb7p, t\u00e0i li\u1ec7u nghi\u00ean c\u1ee9u tham chi\u1ebfu",
    "Sources limited to arXiv, Anthropic, OpenAI, DeepMind, Google Research, Microsoft, ACL, NeurIPS, PMLR":
        "Ngu\u1ed3n gi\u1edbi h\u1ea1n \u1edf arXiv, Anthropic, OpenAI, DeepMind, Google Research, Microsoft, ACL, NeurIPS, PMLR",
    # formats
    "Question formats": "D\u1ea1ng c\u00e2u h\u1ecfi",
    "Standalone mix matches the blueprint: 330 single-choice, 90 multi-response, 30 ordering, 30 matching":
        "C\u01a1 c\u1ea5u c\u00e2u \u0111\u1ed9c l\u1eadp kh\u1edbp blueprint: 330 m\u1ed9t \u0111\u00e1p \u00e1n, 90 nhi\u1ec1u \u0111\u00e1p \u00e1n, 30 s\u1eafp x\u1ebfp, 30 gh\u00e9p c\u1eb7p",
    "single_choice": "M\u1ed9t \u0111\u00e1p \u00e1n (single_choice)",
    "multi_response": "Nhi\u1ec1u \u0111\u00e1p \u00e1n (multi_response)",
    "ordering": "S\u1eafp x\u1ebfp (ordering)",
    "matching": "Gh\u00e9p c\u1eb7p (matching)",
    # difficulty
    "Difficulty mix by domain": "Ph\u00e2n b\u1ed1 \u0111\u1ed9 kh\u00f3 theo domain",
    "Every domain is within the blueprint's \u00b13 percentage-point tolerance per level":
        "M\u1ecdi domain \u0111\u1ec1u n\u1eb1m trong dung sai \u00b13 \u0111i\u1ec3m ph\u1ea7n tr\u0103m c\u1ee7a blueprint \u1edf t\u1eebng m\u1ee9c",
    "Easy": "D\u1ec5", "Medium": "Trung b\u00ecnh", "Hard": "Kh\u00f3",
    "Targets (easy / med / hard)": "M\u1ee5c ti\u00eau (d\u1ec5 / TB / kh\u00f3)",
    "Actual counts are shown on the bars; labels hide zero values.":
        "S\u1ed1 th\u1ef1c t\u1ebf hi\u1ec3n th\u1ecb tr\u00ean c\u1ed9t; nh\u00e3n b\u1eb1ng 0 \u0111\u01b0\u1ee3c \u1ea9n.",
    # concepts
    "Concept coverage": "\u0110\u1ed9 ph\u1ee7 kh\u00e1i ni\u1ec7m",
    "Normalized curriculum labels per question (a question can carry several)":
        "Nh\u00e3n gi\u00e1o tr\u00ecnh chu\u1ea9n h\u00f3a cho m\u1ed7i c\u00e2u (m\u1ed9t c\u00e2u c\u00f3 th\u1ec3 c\u00f3 nhi\u1ec1u nh\u00e3n)",
    "Questions": "C\u00e2u h\u1ecfi",
    "Group totals": "T\u1ed5ng theo nh\u00f3m",
    "Core Architecture & Components": "Ki\u1ebfn tr\u00fac l\u00f5i & th\u00e0nh ph\u1ea7n",
    "Cognitive & Reasoning Mechanics": "C\u01a1 ch\u1ebf nh\u1eadn th\u1ee9c & suy lu\u1eadn",
    "Coordination & Multi-Agent Scaling": "Ph\u1ed1i h\u1ee3p & m\u1edf r\u1ed9ng \u0111a agent",
    "Safety, Guardrails & Improvement": "An to\u00e0n, guardrail & c\u1ea3i ti\u1ebfn",
    # tags
    "Top authoring tags": "Tag so\u1ea1n c\u00e2u ph\u1ed5 bi\u1ebfn nh\u1ea5t",
    "Fine-grained keywords for search and filtering": "T\u1eeb kh\u00f3a chi ti\u1ebft \u0111\u1ec3 t\u00ecm ki\u1ebfm v\u00e0 l\u1ecdc",
    # cases
    "Cross-domain case studies": "Case study li\u00ean domain",
    "Warehouse operations agent with protocol tools and human release control":
        "Agent v\u1eadn h\u00e0nh kho v\u1edbi c\u00f4ng c\u1ee5 qua giao th\u1ee9c v\u00e0 ng\u01b0\u1eddi duy\u1ec7t ph\u00e1t h\u00e0nh",
    "Customs-clearance agent team at a freight forwarder":
        "\u0110\u1ed9i agent th\u00f4ng quan t\u1ea1i c\u00f4ng ty giao nh\u1eadn v\u1eadn t\u1ea3i",
    "Incident-response agent team at a payments processor":
        "\u0110\u1ed9i agent \u1ee9ng ph\u00f3 s\u1ef1 c\u1ed1 t\u1ea1i c\u00f4ng ty x\u1eed l\u00fd thanh to\u00e1n",
    "Multi-agent insurance claims adjudication with uncertainty, independent review, and injection risk":
        "Th\u1ea9m \u0111\u1ecbnh b\u1ed3i th\u01b0\u1eddng b\u1ea3o hi\u1ec3m \u0111a agent: b\u1ea5t \u0111\u1ecbnh, \u0111\u00e1nh gi\u00e1 \u0111\u1ed9c l\u1eadp v\u00e0 r\u1ee7i ro injection",
    "DevOps incident-response agent team with timeout, memory, contention, and approval concerns":
        "\u0110\u1ed9i agent \u1ee9ng ph\u00f3 s\u1ef1 c\u1ed1 DevOps: timeout, b\u1ed9 nh\u1edb, tranh ch\u1ea5p t\u00e0i nguy\u00ean v\u00e0 ph\u00ea duy\u1ec7t",
    # completion
    "Completion & quality gates": "Ho\u00e0n th\u00e0nh & c\u1ed5ng ch\u1ea5t l\u01b0\u1ee3ng",
    "What was completed": "Nh\u1eefng g\u00ec \u0111\u00e3 ho\u00e0n th\u00e0nh",
    "Verification": "Ki\u1ec3m ch\u1ee9ng",
    "Format mix matched per domain by rewriting surplus single-choice items into multi-response, ordering and matching":
        "C\u01a1 c\u1ea5u d\u1ea1ng c\u00e2u kh\u1edbp t\u1eebng domain nh\u1edd vi\u1ebft l\u1ea1i c\u00e1c c\u00e2u m\u1ed9t \u0111\u00e1p \u00e1n d\u01b0 th\u00e0nh nhi\u1ec1u \u0111\u00e1p \u00e1n, s\u1eafp x\u1ebfp v\u00e0 gh\u00e9p c\u1eb7p",
    "Difficulty rebalanced to blueprint targets in every domain":
        "\u0110\u1ed9 kh\u00f3 \u0111\u01b0\u1ee3c c\u00e2n b\u1eb1ng l\u1ea1i theo m\u1ee5c ti\u00eau blueprint \u1edf m\u1ecdi domain",
    "Weak templated D5/D6 stubs rewritten as scenario-based questions":
        "C\u00e1c c\u00e2u D5/D6 s\u01a1 s\u00e0i theo m\u1eabu \u0111\u01b0\u1ee3c vi\u1ebft l\u1ea1i th\u00e0nh c\u00e2u t\u00ecnh hu\u1ed1ng",
    "validate.py --strict: schema, uniqueness, references, answer keys, explanations, near-duplicate stems, answer-position balance, blueprint counts":
        "validate.py --strict: schema, t\u00ednh duy nh\u1ea5t, tham chi\u1ebfu, \u0111\u00e1p \u00e1n, gi\u1ea3i th\u00edch, \u0111\u1ec1 b\u00e0i g\u1ea7n tr\u00f9ng, c\u00e2n b\u1eb1ng v\u1ecb tr\u00ed \u0111\u00e1p \u00e1n, s\u1ed1 l\u01b0\u1ee3ng theo blueprint",
    "pytest suite passes (58 tests)": "B\u1ed9 test pytest \u0111\u1ea1t (58 test)",
    "Keep the deck current: python tools/make_slides.py recomputes every number":
        "Gi\u1eef b\u1ed9 slide c\u1eadp nh\u1eadt: python tools/make_slides.py t\u00ednh l\u1ea1i m\u1ecdi s\u1ed1 li\u1ec7u",
    # toolchain
    "Toolchain": "B\u1ed9 c\u00f4ng c\u1ee5",
    "Everything is reproducible from the command line": "M\u1ecdi th\u1ee9 \u0111\u1ec1u t\u00e1i t\u1ea1o \u0111\u01b0\u1ee3c t\u1eeb d\u00f2ng l\u1ec7nh",
    "Schema, references, answer keys, explanations, duplicates, blueprint gates (--strict for exact match)":
        "Schema, tham chi\u1ebfu, \u0111\u00e1p \u00e1n, gi\u1ea3i th\u00edch, tr\u00f9ng l\u1eb7p, c\u1ed5ng blueprint (--strict \u0111\u1ec3 kh\u1edbp tuy\u1ec7t \u0111\u1ed1i)",
    "Coverage dashboard: domain/task progress, format & difficulty mix, theory usage, tags, concepts":
        "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n \u0111\u1ed9 ph\u1ee7: ti\u1ebfn \u0111\u1ed9 domain/task, d\u1ea1ng c\u00e2u & \u0111\u1ed9 kh\u00f3, m\u1ee9c d\u00f9ng th\u1ebb, tag, kh\u00e1i ni\u1ec7m",
    "Exports every question to exports/langchain-langgraph-questions.xlsx":
        "Xu\u1ea5t to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi ra exports/langchain-langgraph-questions.xlsx",
    "Test suite with one broken fixture per validator rule + blueprint arithmetic checks":
        "B\u1ed9 test v\u1edbi m\u1ed9t fixture l\u1ed7i cho m\u1ed7i quy t\u1eafc validator + ki\u1ec3m tra s\u1ed1 h\u1ecdc c\u1ee7a blueprint",
}

# (regex over the English text, Vietnamese template using \1.. groups)
PATTERNS: list[tuple[str, str]] = [
    (r"Generated from blueprint\.json and data/  \|  (.+)", r"\u0110\u01b0\u1ee3c t\u1ea1o t\u1eeb blueprint.json v\u00e0 data/  |  \1"),
    (r"(\d+) of (\d+) questions authored \((.+?)%\) \u2014 blueprint met", r"\1/\2 c\u00e2u \u0111\u00e3 so\u1ea1n (\3%) \u2014 \u0111\u00e3 \u0111\u1ea1t blueprint"),
    (r"total questions \((.+)\)", r"t\u1ed5ng s\u1ed1 c\u00e2u h\u1ecfi (\1)"),
    (r"standalone \((.+)\)", r"c\u00e2u \u0111\u1ed9c l\u1eadp (\1)"),
    (r"case-study questions \((.+)\)", r"c\u00e2u case study (\1)"),
    (r"All six domains at (\d+)%\+ of target; validate\.py --strict passes\.",
     r"C\u1ea3 s\u00e1u domain \u0111\u1ea1t \u2265\1% m\u1ee5c ti\u00eau; validate.py --strict \u0111\u1ea1t."),
    (r"All (\d+) task statements are at their blueprint counts \((\d+) standalone questions\)\.",
     r"C\u1ea3 \1 task statement \u0111\u1ec1u \u0111\u1ee7 s\u1ed1 c\u00e2u theo blueprint (\2 c\u00e2u \u0111\u1ed9c l\u1eadp)."),
    (r"(\d+) of (\d+) target cards \u2014 every card cited by 3\u201312 questions",
     r"\1/\2 th\u1ebb m\u1ee5c ti\u00eau \u2014 m\u1ed7i th\u1ebb \u0111\u01b0\u1ee3c 3\u201312 c\u00e2u h\u1ecfi vi\u1ec7n d\u1eabn"),
    (r"Orphan cards \(0 refs\): (\d+)", r"Th\u1ebb m\u1ed3 c\u00f4i (0 tham chi\u1ebfu): \1"),
    (r"Under-used \(<3 refs\): (\d+)", r"Th\u1ebb d\u00f9ng \u00edt (<3 tham chi\u1ebfu): \1"),
    (r"Over-used \(>12 refs\): (\d+)", r"Th\u1ebb d\u00f9ng qu\u00e1 nhi\u1ec1u (>12 tham chi\u1ebfu): \1"),
    (r"Most-cited card: (\d+) refs; least-cited: (\d+) refs",
     r"Th\u1ebb \u0111\u01b0\u1ee3c d\u00f9ng nhi\u1ec1u nh\u1ea5t: \1 tham chi\u1ebfu; \u00edt nh\u1ea5t: \2 tham chi\u1ebfu"),
    (r"(\d+) labels", r"\1 nh\u00e3n"),
    (r"(\d+) distinct tags across (\d+) questions; every question has 2\u20135\.",
     r"\1 tag kh\u00e1c nhau tr\u00ean \2 c\u00e2u h\u1ecfi; m\u1ed7i c\u00e2u c\u00f3 2\u20135 tag."),
    (r"'(.+)' \((\d+)\) and '(.+)' \((\d+)\) are the most common\.",
     r"'\1' (\2) v\u00e0 '\3' (\4) l\u00e0 hai tag ph\u1ed5 bi\u1ebfn nh\u1ea5t."),
    (r"'case-study' \((\d+)\) marks cross-domain scenario questions where present\.",
     r"'case-study' (\1) \u0111\u00e1nh d\u1ea5u c\u00e1c c\u00e2u t\u00ecnh hu\u1ed1ng li\u00ean domain."),
    (r"(\d+) scenarios, (\d+) linked questions \u2014 each spans several domains",
     r"\1 t\u00ecnh hu\u1ed1ng, \2 c\u00e2u h\u1ecfi li\u00ean k\u1ebft \u2014 m\u1ed7i t\u00ecnh hu\u1ed1ng tr\u1ea3i qua nhi\u1ec1u domain"),
    (r"(\d+) questions", r"\1 c\u00e2u h\u1ecfi"),
    (r"Domains: (.+)", r"Domain: \1"),
    (r"Case-study questions per domain: (.+)", r"S\u1ed1 c\u00e2u case study theo domain: \1"),
    (r"(\d+) single choice", r"\1 m\u1ed9t \u0111\u00e1p \u00e1n"),
    (r"(\d+) multi response", r"\1 nhi\u1ec1u \u0111\u00e1p \u00e1n"),
    (r"(\d+) ordering", r"\1 s\u1eafp x\u1ebfp"),
    (r"(\d+) matching", r"\1 gh\u00e9p c\u1eb7p"),
    (r"(\d+)/(\d+) questions and (\d+)/(\d+) theory cards \u2014 blueprint fully met",
     r"\1/\2 c\u00e2u h\u1ecfi v\u00e0 \3/\4 th\u1ebb l\u00fd thuy\u1ebft \u2014 \u0111\u00e3 \u0111\u1ea1t \u0111\u1ea7y \u0111\u1ee7 blueprint"),
    (r"All (\d+) domains at target \((\d+) standalone \+ (\d+) case-study questions\)",
     r"C\u1ea3 \1 domain \u0111\u1ea1t m\u1ee5c ti\u00eau (\2 c\u00e2u \u0111\u1ed9c l\u1eadp + \3 c\u00e2u case study)"),
    (r"(\d+) task statements at their exact blueprint counts", r"\1 task statement \u0111\u00fang s\u1ed1 c\u00e2u theo blueprint"),
    (r"(\d+) new theory cards added, each verified against an allowed source domain",
     r"Th\u00eam \1 th\u1ebb l\u00fd thuy\u1ebft m\u1edbi, m\u1ed7i th\u1ebb \u0111\u00e3 \u0111\u01b0\u1ee3c ki\u1ec3m ch\u1ee9ng v\u1edbi ngu\u1ed3n thu\u1ed9c domain cho ph\u00e9p"),
    (r"Theory cards: (\d+) orphans, (\d+) under-used, (\d+) over-used",
     r"Th\u1ebb l\u00fd thuy\u1ebft: \1 m\u1ed3 c\u00f4i, \2 d\u00f9ng \u00edt, \3 d\u00f9ng qu\u00e1 nhi\u1ec1u"),
]
_UNI = re.compile(r"\\u([0-9a-fA-F]{4})")


def _decode(template: str) -> str:
    """Turn literal \\uXXXX sequences in raw replacement templates into characters (group refs like \\1 stay)."""
    return _UNI.sub(lambda m: chr(int(m.group(1), 16)), template)


_COMPILED = [(re.compile(p), _decode(r)) for p, r in PATTERNS]


def tr(s: str, lang: str) -> str:
    if lang != "vi" or not isinstance(s, str):
        return s
    if s in EXACT:
        return EXACT[s]
    # bullet-prefixed or whitespace-padded variants
    for rx, repl in _COMPILED:
        if rx.fullmatch(s):
            return rx.sub(repl, s)
    return s


def trl(items: list[str], lang: str) -> list[str]:
    return [tr(i, lang) for i in items]
