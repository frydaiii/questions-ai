import { describe, expect, it } from "vitest";
import {
  buildReport,
  gradeAll,
  NEEDS_IMPROVEMENT_BELOW,
  persistentWeaknesses,
  rankTheory,
  summarizeTallies,
} from "./analytics";
import { card, makeBank, single } from "../test/fixtures";
import type { Question } from "../types";

function bankWith(questions: Question[]) {
  const bank = makeBank(0, questions);
  bank.theory = {
    "TH-A": card("TH-A"),
    "TH-B": card("TH-B"),
    "TH-C": card("TH-C"),
  };
  return bank;
}

/** single() questions answered right ("B") or wrong ("A"). */
const right = ["B"];
const wrong = ["A"];

describe("buildReport", () => {
  it("computes the overall score", () => {
    const qs = [single(), single(), single(), single()];
    const bank = bankWith(qs);
    const r = buildReport(bank, gradeAll(qs, { [qs[0]!.id]: right, [qs[1]!.id]: right, [qs[2]!.id]: wrong }));
    expect(r.overall).toEqual({ correct: 2, total: 4, pct: 0.5 });
    expect(r.results.map((x) => x.answered)).toEqual([true, true, true, false]);
  });

  it(`flags domains below ${NEEDS_IMPROVEMENT_BELOW * 100}% and keeps exactly 70% on track`, () => {
    // Domain 1: 7/10 = 70% (on track). Domain 2: 2/3 = 66.7% (needs improvement).
    const d1 = Array.from({ length: 10 }, () => single({ domain: 1 }));
    const d2 = Array.from({ length: 3 }, () => single({ domain: 2 }));
    const bank = bankWith([...d1, ...d2]);
    const answers = Object.fromEntries([
      ...d1.map((q, i) => [q.id, i < 7 ? right : wrong]),
      ...d2.map((q, i) => [q.id, i < 2 ? right : wrong]),
    ]);
    const r = buildReport(bank, gradeAll([...d1, ...d2], answers));
    expect(r.domains.map((d) => [d.id, d.correct, d.total, d.needsImprovement])).toEqual([
      [1, 7, 10, false],
      [2, 2, 3, true],
    ]);
    expect(r.domains[0]?.name).toBe("Domain 1");
  });

  it("omits domains that have no questions in the set", () => {
    const qs = [single({ domain: 3 })];
    const r = buildReport(bankWith(qs), gradeAll(qs, {}));
    expect(r.domains.map((d) => d.id)).toEqual([3]);
  });

  it("scores concepts, counting a question in each of its concepts, and flags low samples", () => {
    const qs = [
      single({ concepts: ["Memory", "Planning"] }),
      single({ concepts: ["Memory"] }),
      single({ concepts: ["Agent"] }),
    ];
    const r = buildReport(bankWith(qs), gradeAll(qs, { [qs[0]!.id]: wrong, [qs[1]!.id]: right, [qs[2]!.id]: right }));
    const byName = Object.fromEntries(r.concepts.map((c) => [c.name, c]));
    expect(byName.Memory).toMatchObject({ correct: 1, total: 2, missed: 1, lowSample: false, needsImprovement: true });
    expect(byName.Planning).toMatchObject({ correct: 0, total: 1, lowSample: true, needsImprovement: true });
    expect(byName.Agent).toMatchObject({ correct: 1, total: 1, lowSample: true, needsImprovement: false });
    expect(byName.Planning?.group).toBe("Reasoning");
    expect(r.concepts.map((c) => c.name)).toEqual(["Agent", "Memory", "Planning"]);
  });

  it("ranks weak concepts by accuracy, then by misses, then by name", () => {
    const mk = (concept: string, n: number) => Array.from({ length: n }, () => single({ concepts: [concept] }));
    const memory = mk("Memory", 4); // 1/4 = 25%, 3 misses
    const planning = mk("Planning", 2); // 0/2 = 0%, 2 misses
    const agent = mk("Agent", 8); // 2/8 = 25%, 6 misses
    const orchestration = mk("Orchestration", 4); // 1/4 = 25%, 3 misses (ties Memory)
    const ok = mk("Guardrails", 2); // 2/2 = 100%
    const qs = [...memory, ...planning, ...agent, ...orchestration, ...ok];
    const answers = Object.fromEntries([
      ...memory.map((q, i) => [q.id, i < 1 ? right : wrong]),
      ...planning.map((q) => [q.id, wrong]),
      ...agent.map((q, i) => [q.id, i < 2 ? right : wrong]),
      ...orchestration.map((q, i) => [q.id, i < 1 ? right : wrong]),
      ...ok.map((q) => [q.id, right]),
    ]);
    const r = buildReport(bankWith(qs), gradeAll(qs, answers));
    expect(r.weakConcepts.map((c) => c.name)).toEqual(["Planning", "Agent", "Memory", "Orchestration"]);
  });

  it("lists de-duplicated theory cards for each weak concept, most-referenced first", () => {
    const qs = [
      single({ concepts: ["Memory"], theory_refs: ["TH-B", "TH-A"] }),
      single({ concepts: ["Memory"], theory_refs: ["TH-A"] }),
      single({ concepts: ["Memory"], theory_refs: ["TH-C"] }), // answered right: not listed
      single({ concepts: ["Memory"], theory_refs: ["TH-MISSING"] }), // unknown card: ignored
    ];
    const r = buildReport(
      bankWith(qs),
      gradeAll(qs, { [qs[0]!.id]: wrong, [qs[1]!.id]: wrong, [qs[2]!.id]: right, [qs[3]!.id]: wrong }),
    );
    const memory = r.weakConcepts.find((c) => c.name === "Memory");
    expect(memory?.theoryIds).toEqual(["TH-A", "TH-B"]);
    expect(memory?.missedQuestionIds).toEqual([qs[0]!.id, qs[1]!.id, qs[3]!.id]);
  });

  it("has no weak concepts when everything is right", () => {
    const qs = [single(), single({ concepts: ["Planning"] })];
    const r = buildReport(bankWith(qs), gradeAll(qs, { [qs[0]!.id]: right, [qs[1]!.id]: right }));
    expect(r.weakConcepts).toEqual([]);
    expect(r.overall.pct).toBe(1);
  });
});

describe("rankTheory", () => {
  it("breaks count ties by id", () => {
    const qs = [single({ theory_refs: ["TH-C", "TH-A"] })];
    expect(rankTheory(qs, bankWith(qs))).toEqual(["TH-A", "TH-C"]);
  });
});

describe("summarizeTallies and persistentWeaknesses", () => {
  it("summarizes per domain and concept", () => {
    const qs = [single({ domain: 2, concepts: ["Memory", "Agent"] }), single({ domain: 2, concepts: ["Memory"] })];
    const t = summarizeTallies(gradeAll(qs, { [qs[0]!.id]: right }));
    expect(t.domains).toEqual({ "2": [1, 2] });
    expect(t.concepts).toEqual({ Memory: [1, 2], Agent: [1, 1] });
  });

  it("aggregates across attempts and ignores areas with too few questions", () => {
    const weak = persistentWeaknesses([
      { Memory: [1, 3], Planning: [0, 1], Agent: [3, 3] },
      { Memory: [1, 2], Planning: [0, 1], Agent: [1, 2] },
    ]);
    // Memory 2/5 = 40%; Planning 0/2 (below min sample of 3); Agent 4/5 = 80%.
    expect(weak).toEqual([{ name: "Memory", correct: 2, total: 5, attempts: 2, pct: 0.4 }]);
  });
});
