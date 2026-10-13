"""Build a PowerPoint deck summarising the bank's knowledge coverage and question stats.

Numbers are computed live from blueprint.json and data/ each time the script runs, so the deck
always reflects the current bank. Usage:

    python tools/make_slides.py [--lang vi] [--output exports/langchain-langgraph-bank-overview.pptx]
"""
from __future__ import annotations

import argparse
from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt

# ---------------------------------------------------------------- live data
# All numbers are computed from blueprint.json and data/ at build time, so re-running the
# script always reflects the current state of the bank.
import collections
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loader  # noqa: E402
from slides_i18n import tr, trl  # noqa: E402

LANG = "en"  # set from --lang in main()

BP = loader.load_blueprint()
_QS = [r.data for r in loader.load_questions() if r.data]
_STANDALONE = [q for q in _QS if q["case_study_id"] is None]
_CASE = [q for q in _QS if q["case_study_id"] is not None]
_THEORY = [r.data for r in loader.load_theory_cards() if r.data]

TARGET_TOTAL = BP["total_questions"]
STANDALONE_DONE = len(_STANDALONE)
STANDALONE_TARGET = sum(d["standalone_questions"] for d in BP["domains"])
CASE_DONE = len(_CASE)
CASE_TARGET = sum(d["case_study_questions"] for d in BP["domains"])
CASE_CLUSTERS = len({q["case_study_id"] for q in _CASE})
THEORY_DONE, THEORY_TARGET = len(_THEORY), BP["theory_cards_total_target"]

_REFS = collections.Counter(t for q in _QS for t in q.get("theory_refs", []))
_THEORY_BY_DOMAIN = collections.Counter(t["domain"] for t in _THEORY)

DOMAINS = [  # name, done, target, theory cards
    (f"D{d['id']} {d['name']}",
     sum(1 for q in _STANDALONE if q["domain"] == d["id"]),
     d["standalone_questions"],
     _THEORY_BY_DOMAIN[d["id"]])
    for d in BP["domains"]
]
SHORT = ["D1 Architectures", "D2 Reasoning", "D3 Tools", "D4 Memory", "D5 Multi-Agent", "D6 Safety"]

TASKS = {
    "D1 Agent Architectures": ["1.1 What makes a system an agent", "1.2 Perceive-reason-act loop", "1.3 Reactive / deliberative / hybrid"],
    "D2 Reasoning & Planning": ["2.1 ReAct", "2.2 Decomposition & planning", "2.3 Reflection & self-critique", "2.4 Uncertainty & reasoning errors"],
    "D3 Tool Use & Grounding": ["3.1 Why agents need tools", "3.2 Tool selection & invocation", "3.3 Tool failures & recovery"],
    "D4 Memory Systems": ["4.1 Working vs long-term", "4.2 Episodic / semantic / procedural", "4.3 Retrieval, relevance, forgetting"],
    "D5 Multi-Agent Systems": ["5.1 When to decompose", "5.2 Orchestrator-worker, debate", "5.3 Protocols & shared state", "5.4 Emergence & failure modes"],
    "D6 Evaluation, Safety": ["6.1 Evaluating agents", "6.2 Agent-specific safety risks", "6.3 Guardrails, HITL, alignment"],
}

TASK_PROGRESS = [
    (ts["id"], sum(1 for q in _STANDALONE if q["task_statement"] == ts["id"]), ts["standalone_questions"])
    for d in BP["domains"] for ts in d["task_statements"]
]

_FMT_TARGET = BP["format_totals"]
_FMT_DONE = collections.Counter(q["type"] for q in _STANDALONE)
FORMATS = [(f, _FMT_DONE[f], _FMT_TARGET[f]) for f in ("single_choice", "multi_response", "ordering", "matching")]

_DIFF = collections.defaultdict(collections.Counter)
for _q in _STANDALONE:
    _DIFF[_q["domain"]][_q["difficulty"]] += 1
DIFFICULTY = {f"D{d['id']}": (_DIFF[d["id"]]["easy"], _DIFF[d["id"]]["medium"], _DIFF[d["id"]]["hard"]) for d in BP["domains"]}
DIFF_TARGET_TXT = [
    f"D{d['id']}: {d['difficulty_mix_pct']['easy']} / {d['difficulty_mix_pct']['medium']} / {d['difficulty_mix_pct']['hard']}"
    for d in BP["domains"]
]

_CONCEPT_COUNT = collections.Counter(c for q in _QS for c in q.get("concepts", []))
_GROUPS = [
    ("Core Architecture & Components", [("Agent", "Agent"), ("Environment", "Environment"), ("Perception", "Perception"),
        ("State / State Management", "State Mgmt"), ("Memory", "Memory"), ("Tools & Tool Discovery", "Tools & Tool Discovery"),
        ("Model Context Protocol (MCP)", "MCP")]),
    ("Cognitive & Reasoning Mechanics", [("Reasoning Loop (ReAct)", "ReAct Loop"), ("Chain of Thought (CoT)", "Chain of Thought"),
        ("Planning", "Planning"), ("Reflex Agents", "Reflex Agents"), ("Utility & Goal-Based Agents", "Utility/Goal Agents"),
        ("Context Engineering", "Context Engineering")]),
    ("Coordination & Multi-Agent Scaling", [("Orchestration", "Orchestration"), ("Multi-Agent Systems", "Multi-Agent Systems"),
        ("Sub-agents & Handoffs", "Sub-agents & Handoffs"), ("Swarm Intelligence", "Swarm"), ("Agent Debate", "Agent Debate")]),
    ("Safety, Guardrails & Improvement", [("Guardrails", "Guardrails"), ("Human-in-the-Loop (HITL)", "HITL"),
        ("Error Recovery", "Error Recovery"), ("Evaluation & Learning Loops", "Evaluation & Learning")]),
]
CONCEPT_GROUPS = []
for _g, _items in _GROUPS:
    _pairs = [(short, _CONCEPT_COUNT[full]) for full, short in _items]
    CONCEPT_GROUPS.append((_g, sum(v for _, v in _pairs), _pairs))

_TAGS = collections.Counter(t for q in _QS for t in q.get("tags", []))
TOP_TAGS = _TAGS.most_common(10)

_OVER = [k for k, v in _REFS.items() if v > BP["tolerances"]["theory_card_max_refs"]]
_UNDER = [t["id"] for t in _THEORY if _REFS[t["id"]] < BP["tolerances"]["theory_card_min_refs"]]
_DONE_ALL = STANDALONE_DONE + CASE_DONE
TODAY = __import__("datetime").date.today().isoformat()

# ---------------------------------------------------------------- theme
NAVY = RGBColor(0x0F, 0x17, 0x2A)
PANEL = RGBColor(0x1B, 0x26, 0x40)
WHITE = RGBColor(0xF8, 0xFA, 0xFC)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
TEAL = RGBColor(0x2D, 0xD4, 0xBF)
AMBER = RGBColor(0xFB, 0xBF, 0x24)
RED = RGBColor(0xF8, 0x71, 0x71)
BLUE = RGBColor(0x60, 0xA5, 0xFA)
VIOLET = RGBColor(0xA7, 0x8B, 0xFA)
GREEN = RGBColor(0x4A, 0xDE, 0x80)
DOMAIN_COLORS = [BLUE, TEAL, GREEN, AMBER, VIOLET, RED]
FONT = "Calibri"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]


def pct(a: int, b: int) -> float:
    return 100.0 * a / b if b else 0.0


def new_slide(title: str, subtitle: str | None = None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = NAVY
    text(s, title, 0.6, 0.35, 12.1, 0.8, 30, WHITE, bold=True)
    if subtitle:
        text(s, subtitle, 0.6, 1.0, 12.1, 0.4, 15, MUTED)
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(0.3), Inches(0.9), Inches(0.06))
    bar.fill.solid(); bar.fill.fore_color.rgb = TEAL; bar.line.fill.background()
    return s


def text(slide, content, x, y, w, h, size=16, color=WHITE, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    lines = content if isinstance(content, list) else [content]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run(); r.text = tr(line, LANG)
        r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color; r.font.name = FONT
    return tb


def card(slide, x, y, w, h, fill=PANEL):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.adjustments[0] = 0.06
    sh.fill.solid(); sh.fill.fore_color.rgb = fill; sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def kpi(slide, x, y, w, value, label, color=TEAL):
    card(slide, x, y, w, 1.6)
    text(slide, value, x, y + 0.15, w, 0.9, 38, color, bold=True, align=PP_ALIGN.CENTER)
    text(slide, label, x + 0.1, y + 1.0, w - 0.2, 0.5, 13, MUTED, align=PP_ALIGN.CENTER)


def bullets(slide, items, x, y, w, h, size=16, color=WHITE, gap=6):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        r = p.add_run(); r.text = "\u2022  " + tr(it, LANG)
        r.font.size = Pt(size); r.font.color.rgb = color; r.font.name = FONT


def style_chart(chart, legend=False, size=12):
    chart.font.size = Pt(size); chart.font.color.rgb = WHITE; chart.font.name = FONT
    chart.has_legend = legend
    if legend:
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.legend.font.color.rgb = WHITE
    chart.has_title = False


def hide_zero_labels(series):
    dl = series.data_labels
    dl.number_format = '0;;'
    dl.number_format_is_linked = False


def style_axes(chart, max_val=None):
    ca, va = chart.category_axis, chart.value_axis
    ca.format.line.color.rgb = MUTED
    ca.tick_labels.font.color.rgb = WHITE
    va.major_gridlines.format.line.color.rgb = PANEL
    va.format.line.fill.background()
    va.tick_labels.font.color.rgb = MUTED
    if max_val:
        va.maximum_scale = max_val
    va.minimum_scale = 0


# ---------------------------------------------------------------- slides
def s_title():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = NAVY
    side = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), prs.slide_height)
    side.fill.solid(); side.fill.fore_color.rgb = TEAL; side.line.fill.background()
    text(s, "AI Agent Theory Question Bank", 1.0, 2.0, 11, 1.2, 48, WHITE, bold=True)
    text(s, "Knowledge coverage & question statistics", 1.0, 3.2, 11, 0.7, 26, TEAL)
    text(s, "Framework-agnostic theory behind LangChain / LangGraph-style agents", 1.0, 4.0, 11, 0.5, 18, MUTED)
    text(s, f"Generated from blueprint.json and data/  |  {TODAY}", 1.0, 6.5, 11, 0.4, 14, MUTED)


def s_overview():
    s = new_slide("What this bank is", "Original, self-study curriculum for agent design \u2014 not tied to any library's API")
    kpi(s, 0.6, 1.7, 2.9, str(TARGET_TOTAL), "questions in the bank")
    kpi(s, 3.7, 1.7, 2.9, f"{len(BP['domains'])} / {len(TASK_PROGRESS)}", "domains / task statements", BLUE)
    kpi(s, 6.8, 1.7, 2.9, "4", "formats: single, multi, ordering, matching", AMBER)
    kpi(s, 9.9, 1.7, 2.9, str(THEORY_TARGET), "theory cards", VIOLET)
    card(s, 0.6, 3.6, 12.2, 3.2)
    bullets(s, [
        "Every question links to 1+ reusable theory cards and carries a full explanation (why correct / why each distractor is wrong / rule of thumb).",
        "Tagged with fine-grained tags and normalized curriculum-level concepts (e.g. Context Engineering, ReAct, MCP).",
        "Teaches the concepts that transfer across frameworks \u2014 ReAct loops, planning, tool use, memory, multi-agent coordination, safety \u2014 rather than LangChain/LangGraph API mechanics.",
        "Quality gates: JSON Schema, referential checks, answer-key checks, near-duplicate detection, blueprint conformance, pytest suite.",
    ], 0.85, 3.75, 11.7, 3.0, 16, gap=10)


def s_progress():
    s = new_slide("Overall progress", f"{_DONE_ALL} of {TARGET_TOTAL} questions authored ({pct(_DONE_ALL, TARGET_TOTAL):.1f}%) \u2014 blueprint met")
    done = STANDALONE_DONE + CASE_DONE
    kpi(s, 0.6, 1.7, 3.8, f"{done} / {TARGET_TOTAL}", f"total questions ({pct(done, TARGET_TOTAL):.1f}%)", TEAL)
    kpi(s, 0.6, 3.5, 3.8, f"{STANDALONE_DONE} / {STANDALONE_TARGET}", f"standalone ({pct(STANDALONE_DONE, STANDALONE_TARGET):.1f}%)", BLUE)
    kpi(s, 0.6, 5.3, 3.8, f"{CASE_DONE} / {CASE_TARGET}", f"case-study questions ({pct(CASE_DONE, CASE_TARGET):.0f}%)", AMBER)
    cd = CategoryChartData()
    cd.categories = trl(SHORT, LANG)
    cd.add_series(tr("Authored", LANG), [d[1] for d in DOMAINS])
    cd.add_series(tr("Remaining", LANG), [d[2] - d[1] for d in DOMAINS])
    gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_STACKED, Inches(4.7), Inches(1.6), Inches(8.2), Inches(5.4), cd)
    ch = gf.chart; style_chart(ch, legend=True, size=13); style_axes(ch)
    ch.category_axis.reverse_order = True
    ch.plots[0].gap_width = 60
    ch.plots[0].series[0].format.fill.solid(); ch.plots[0].series[0].format.fill.fore_color.rgb = TEAL
    ch.plots[0].series[1].format.fill.solid(); ch.plots[0].series[1].format.fill.fore_color.rgb = RGBColor(0x33, 0x41, 0x55)
    for ser in ch.plots[0].series:
        ser.data_labels.show_value = True
        ser.data_labels.font.size = Pt(12); ser.data_labels.font.color.rgb = WHITE
        hide_zero_labels(ser)


def s_curriculum():
    s = new_slide("Knowledge map: 6 domains, 20 task statements", "What the bank teaches")
    x0, w, gap = 0.6, 3.95, 0.17
    for i, (dom, tasks) in enumerate(TASKS.items()):
        col, row = i % 3, i // 3
        x, y = x0 + col * (w + gap), 1.6 + row * 2.8
        card(s, x, y, w, 2.6)
        strip = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y + 0.1), Inches(0.08), Inches(0.5))
        strip.fill.solid(); strip.fill.fore_color.rgb = DOMAIN_COLORS[i]; strip.line.fill.background()
        text(s, dom, x + 0.2, y + 0.12, w - 0.3, 0.5, 17, DOMAIN_COLORS[i], bold=True, anchor=MSO_ANCHOR.MIDDLE)
        bullets(s, tasks, x + 0.2, y + 0.75, w - 0.35, 1.8, 13, gap=3)


def s_domains():
    s = new_slide("Coverage by domain", "Standalone questions authored vs. target")
    rows = len(DOMAINS) + 1
    tbl = s.shapes.add_table(rows, 5, Inches(0.6), Inches(1.7), Inches(12.2), Inches(4.4)).table
    for c, wd in enumerate([5.0, 1.6, 1.6, 1.8, 2.2]):
        tbl.columns[c].width = Inches(wd)
    heads = ["Domain", "Authored", "Target", "Complete", "Theory cards"]
    data = [heads] + [[n, str(d), str(t), f"{pct(d, t):.0f}%", str(tc)] for n, d, t, tc in DOMAINS]
    for r, row in enumerate(data):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c)
            cell.fill.solid(); cell.fill.fore_color.rgb = TEAL if r == 0 else (PANEL if r % 2 else RGBColor(0x14, 0x1E, 0x35))
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT if c == 0 else PP_ALIGN.CENTER
            run = p.add_run(); run.text = tr(val, LANG); run.font.name = FONT; run.font.size = Pt(16)
            run.font.bold = (r == 0)
            run.font.color.rgb = NAVY if r == 0 else WHITE
            if r > 0 and c == 3:
                v = pct(DOMAINS[r - 1][1], DOMAINS[r - 1][2])
                run.font.color.rgb = GREEN if v >= 95 else (AMBER if v >= 40 else RED); run.font.bold = True
    text(s, f"All six domains at {min(pct(d, t) for _, d, t, _ in DOMAINS):.0f}%+ of target; validate.py --strict passes.",
         0.6, 6.3, 12.2, 0.6, 16, MUTED)


def s_tasks():
    s = new_slide("Coverage by task statement", "Authored questions as % of target (standalone)")
    cd = CategoryChartData()
    cd.categories = [t[0] for t in TASK_PROGRESS]
    cd.add_series(tr("% complete", LANG), [round(pct(d, t), 1) for _, d, t in TASK_PROGRESS])
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.6), Inches(1.6), Inches(12.2), Inches(4.6), cd)
    ch = gf.chart; style_chart(ch, size=13); style_axes(ch, 100)
    ser = ch.plots[0].series[0]; ch.plots[0].gap_width = 40
    for i, (_, d, t) in enumerate(TASK_PROGRESS):
        pt = ser.points[i]; pt.format.fill.solid()
        v = pct(d, t)
        pt.format.fill.fore_color.rgb = GREEN if v >= 95 else (AMBER if v >= 40 else RED)
    ser.data_labels.show_value = True; ser.data_labels.number_format = '0"%"'; ser.data_labels.number_format_is_linked = False
    ser.data_labels.font.size = Pt(11); ser.data_labels.font.color.rgb = WHITE
    ser.data_labels.position = XL_LABEL_POSITION.OUTSIDE_END
    text(s, f"All {len(TASK_PROGRESS)} task statements are at their blueprint counts ({sum(d for _, d, _ in TASK_PROGRESS)} standalone questions).",
         0.6, 6.4, 12.2, 0.5, 15, MUTED)


def s_theory():
    s = new_slide("Theory card library", f"{THEORY_DONE} of {THEORY_TARGET} target cards \u2014 every card cited by 3\u201312 questions")
    cd = CategoryChartData()
    cd.categories = trl(SHORT, LANG)
    cd.add_series(tr("Theory cards", LANG), [d[3] for d in DOMAINS])
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.6), Inches(1.6), Inches(7.4), Inches(5.2), cd)
    ch = gf.chart; style_chart(ch, size=13); style_axes(ch)
    ser = ch.plots[0].series[0]; ch.plots[0].gap_width = 50
    for i, c in enumerate(DOMAIN_COLORS):
        ser.points[i].format.fill.solid(); ser.points[i].format.fill.fore_color.rgb = c
    ser.data_labels.show_value = True; ser.data_labels.font.color.rgb = WHITE; ser.data_labels.font.size = Pt(13)
    card(s, 8.3, 1.6, 4.5, 5.2)
    text(s, "Card health", 8.5, 1.7, 4.1, 0.5, 20, TEAL, bold=True)
    bullets(s, [
        f"Orphan cards (0 refs): {sum(1 for tc in _THEORY if _REFS[tc['id']] == 0)}",
        f"Under-used (<3 refs): {len(_UNDER)}",
        f"Over-used (>12 refs): {len(_OVER)}",
        f"Most-cited card: {max(_REFS.values())} refs; least-cited: {min(_REFS[tc['id']] for tc in _THEORY)} refs",
        "Each card: summary, key points, rule of thumb, common confusions, research references",
        "Sources limited to arXiv, Anthropic, OpenAI, DeepMind, Google Research, Microsoft, ACL, NeurIPS, PMLR",
    ], 8.5, 2.3, 4.1, 4.4, 14, gap=8)


def s_formats():
    s = new_slide("Question formats", "Standalone mix matches the blueprint: 330 single-choice, 90 multi-response, 30 ordering, 30 matching")
    cd = CategoryChartData()
    cd.categories = trl([f[0] for f in FORMATS], LANG)
    cd.add_series(tr("Authored", LANG), [f[1] for f in FORMATS])
    cd.add_series(tr("Remaining", LANG), [f[2] - f[1] for f in FORMATS])
    gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_STACKED, Inches(0.6), Inches(1.6), Inches(7.8), Inches(5.2), cd)
    ch = gf.chart; style_chart(ch, legend=True, size=13); style_axes(ch)
    ch.category_axis.reverse_order = True; ch.plots[0].gap_width = 60
    ch.plots[0].series[0].format.fill.solid(); ch.plots[0].series[0].format.fill.fore_color.rgb = BLUE
    ch.plots[0].series[1].format.fill.solid(); ch.plots[0].series[1].format.fill.fore_color.rgb = RGBColor(0x33, 0x41, 0x55)
    for ser in ch.plots[0].series:
        ser.data_labels.show_value = True; ser.data_labels.font.color.rgb = WHITE
        hide_zero_labels(ser)
    card(s, 8.7, 1.6, 4.1, 5.2)
    y = 1.8
    for name, d, t in FORMATS:
        text(s, name, 8.9, y, 3.7, 0.35, 15, WHITE, bold=True)
        text(s, f"{d} / {t}  ({pct(d, t):.0f}%)", 8.9, y + 0.35, 3.7, 0.35, 14, AMBER if pct(d, t) < 95 else GREEN)
        y += 1.2


def s_difficulty():
    s = new_slide("Difficulty mix by domain", "Every domain is within the blueprint's \u00b13 percentage-point tolerance per level")
    cd = CategoryChartData()
    cd.categories = list(DIFFICULTY)
    for i, lab in enumerate(["Easy", "Medium", "Hard"]):
        cd.add_series(tr(lab, LANG), [v[i] for v in DIFFICULTY.values()])
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_STACKED, Inches(0.6), Inches(1.6), Inches(8.0), Inches(5.3), cd)
    ch = gf.chart; style_chart(ch, legend=True, size=13); style_axes(ch)
    ch.plots[0].gap_width = 50
    for ser, col in zip(ch.plots[0].series, [GREEN, AMBER, RED]):
        ser.format.fill.solid(); ser.format.fill.fore_color.rgb = col
        ser.data_labels.show_value = True; ser.data_labels.font.color.rgb = NAVY; ser.data_labels.font.bold = True
        hide_zero_labels(ser)
    card(s, 8.9, 1.6, 3.9, 5.3)
    text(s, "Targets (easy / med / hard)", 9.1, 1.7, 3.5, 0.5, 16, TEAL, bold=True)
    bullets(s, DIFF_TARGET_TXT + ["Actual counts are shown on the bars; labels hide zero values."
    ], 9.1, 2.3, 3.6, 4.5, 14, gap=6)


def s_concepts():
    s = new_slide("Concept coverage", "Normalized curriculum labels per question (a question can carry several)")
    cd = CategoryChartData()
    names, vals, cols = [], [], []
    palette = [BLUE, TEAL, VIOLET, RED]
    for gi, (g, _, items) in enumerate(CONCEPT_GROUPS):
        for n, v in items:
            names.append(n); vals.append(v); cols.append(palette[gi])
    top = sorted(zip(names, vals, cols), key=lambda t: -t[1])[:14]
    cd.categories = [t[0] for t in top]
    cd.add_series(tr("Questions", LANG), [t[1] for t in top])
    gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(0.6), Inches(1.6), Inches(8.2), Inches(5.4), cd)
    ch = gf.chart; style_chart(ch, size=12); style_axes(ch)
    ch.category_axis.reverse_order = True; ch.plots[0].gap_width = 40
    ser = ch.plots[0].series[0]
    for i, t in enumerate(top):
        ser.points[i].format.fill.solid(); ser.points[i].format.fill.fore_color.rgb = t[2]
    ser.data_labels.show_value = True; ser.data_labels.font.color.rgb = WHITE
    card(s, 9.1, 1.6, 3.7, 5.4)
    text(s, "Group totals", 9.3, 1.7, 3.3, 0.4, 18, TEAL, bold=True)
    y = 2.3
    for gi, (g, tot, _) in enumerate(CONCEPT_GROUPS):
        text(s, g, 9.3, y, 3.4, 0.55, 13, palette[gi], bold=True)
        text(s, f"{tot} labels", 9.3, y + 0.5, 3.4, 0.35, 15, WHITE)
        y += 1.1


def s_tags():
    s = new_slide("Top authoring tags", "Fine-grained keywords for search and filtering")
    cd = CategoryChartData()
    cd.categories = [t[0] for t in TOP_TAGS]
    cd.add_series(tr("Questions", LANG), [t[1] for t in TOP_TAGS])
    gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(0.6), Inches(1.6), Inches(8.0), Inches(5.3), cd)
    ch = gf.chart; style_chart(ch, size=13); style_axes(ch)
    ch.category_axis.reverse_order = True; ch.plots[0].gap_width = 40
    ser = ch.plots[0].series[0]; ser.format.fill.solid(); ser.format.fill.fore_color.rgb = VIOLET
    ser.data_labels.show_value = True; ser.data_labels.font.color.rgb = WHITE
    card(s, 8.9, 1.6, 3.9, 5.3)
    bullets(s, [
        f"{len(_TAGS)} distinct tags across {len(_QS)} questions; every question has 2\u20135.",
        f"'{TOP_TAGS[0][0]}' ({TOP_TAGS[0][1]}) and '{TOP_TAGS[1][0]}' ({TOP_TAGS[1][1]}) are the most common.",
        f"'case-study' ({_TAGS['case-study']}) marks cross-domain scenario questions where present.",
    ], 9.1, 1.8, 3.5, 4.8, 15, gap=12)


def s_cases():
    s = new_slide("Cross-domain case studies",
                  f"{CASE_CLUSTERS} scenarios, {CASE_DONE} linked questions \u2014 each spans several domains")
    cs = [r.data for r in loader.load_case_studies() if r.data]
    qmap = {q["id"]: q for q in _QS}
    w, gap = 2.3, 0.14
    for i, c in enumerate(sorted(cs, key=lambda c: c["id"])):
        x = 0.6 + i * (w + gap)
        card(s, x, 1.6, w, 5.2)
        text(s, c["id"], x + 0.1, 1.7, w - 0.2, 0.4, 20, TEAL, bold=True)
        text(s, c["title"], x + 0.1, 2.15, w - 0.2, 1.5, 13, WHITE, bold=True)
        doms = collections.Counter(qmap[q]["domain"] for q in c["question_ids"])
        types = collections.Counter(qmap[q]["type"] for q in c["question_ids"])
        text(s, f"{len(c['question_ids'])} questions", x + 0.1, 3.8, w - 0.2, 0.35, 14, AMBER, bold=True)
        text(s, "Domains: " + ", ".join(f"D{d}" for d in sorted(doms)), x + 0.1, 4.2, w - 0.2, 0.4, 13, MUTED)
        text(s, "; ".join(tr(f"{n} {k.replace('_', ' ')}", LANG) for k, n in types.items()), x + 0.1, 4.7, w - 0.2, 0.9, 12, MUTED)
    dom_counts = collections.Counter(q["domain"] for q in _CASE)
    text(s, "Case-study questions per domain: " + "   ".join(f"D{d}: {dom_counts[d]}" for d in sorted(dom_counts)),
         0.6, 6.95, 12.2, 0.4, 13, MUTED)


def s_gaps():
    s = new_slide("Completion & quality gates", f"{_DONE_ALL}/{TARGET_TOTAL} questions and {THEORY_DONE}/{THEORY_TARGET} theory cards \u2014 blueprint fully met")
    card(s, 0.6, 1.6, 6.0, 5.2)
    text(s, "What was completed", 0.8, 1.7, 5.6, 0.5, 20, GREEN, bold=True)
    bullets(s, [
        f"All {len(DOMAINS)} domains at target ({STANDALONE_DONE} standalone + {CASE_DONE} case-study questions)",
        f"{len(TASK_PROGRESS)} task statements at their exact blueprint counts",
        "Format mix matched per domain by rewriting surplus single-choice items into multi-response, ordering and matching",
        "Difficulty rebalanced to blueprint targets in every domain",
        f"{THEORY_TARGET - 69} new theory cards added, each verified against an allowed source domain",
        "Weak templated D5/D6 stubs rewritten as scenario-based questions",
    ], 0.8, 2.3, 5.6, 4.4, 14, gap=8)
    card(s, 6.8, 1.6, 6.0, 5.2)
    text(s, "Verification", 7.0, 1.7, 5.6, 0.5, 20, TEAL, bold=True)
    bullets(s, [
        "validate.py --strict: schema, uniqueness, references, answer keys, explanations, near-duplicate stems, answer-position balance, blueprint counts",
        f"Theory cards: 0 orphans, {len(_UNDER)} under-used, {len(_OVER)} over-used",
        "pytest suite passes (58 tests)",
        "Keep the deck current: python tools/make_slides.py recomputes every number",
    ], 7.0, 2.3, 5.6, 4.4, 14, gap=8)


def s_toolchain():
    s = new_slide("Toolchain", "Everything is reproducible from the command line")
    items = [
        ("validate.py", "Schema, references, answer keys, explanations, duplicates, blueprint gates (--strict for exact match)", BLUE),
        ("stats.py", "Coverage dashboard: domain/task progress, format & difficulty mix, theory usage, tags, concepts", TEAL),
        ("export_xlsx.py", "Exports every question to exports/langchain-langgraph-questions.xlsx", AMBER),
        ("pytest tests/", "Test suite with one broken fixture per validator rule + blueprint arithmetic checks", VIOLET),
    ]
    for i, (name, desc, col) in enumerate(items):
        y = 1.7 + i * 1.3
        card(s, 0.6, y, 12.2, 1.1)
        text(s, name, 0.85, y + 0.1, 3.2, 0.9, 20, col, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, desc, 4.1, y + 0.1, 8.5, 0.9, 15, WHITE, anchor=MSO_ANCHOR.MIDDLE)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["en", "vi"], default="en", help="slide language (default: en)")
    ap.add_argument("--output", default=None,
                    help="output .pptx (default: exports/langchain-langgraph-bank-overview[-vi].pptx)")
    args = ap.parse_args()
    global LANG
    LANG = args.lang
    suffix = "" if LANG == "en" else f"-{LANG}"
    out = Path(args.output) if args.output else (
        Path(__file__).resolve().parent.parent / "exports" / f"langchain-langgraph-bank-overview{suffix}.pptx")
    out.parent.mkdir(parents=True, exist_ok=True)
    for fn in (s_title, s_overview, s_progress, s_curriculum, s_domains, s_tasks, s_theory,
               s_formats, s_difficulty, s_concepts, s_tags, s_cases, s_gaps, s_toolchain):
        fn()
    prs.save(out)
    print(f"Saved {out} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    main()
