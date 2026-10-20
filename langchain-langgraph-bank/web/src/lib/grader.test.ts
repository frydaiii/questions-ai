import { describe, expect, it } from "vitest";
import { answerStatus, compareParts, gradeQuestion } from "./grader";
import { matching, multi, ordering, single } from "../test/fixtures";

describe("gradeQuestion", () => {
  it("single_choice: exact key", () => {
    const q = single();
    expect(gradeQuestion(q, ["B"])).toBe(true);
    expect(gradeQuestion(q, ["A"])).toBe(false);
    expect(gradeQuestion(q, [])).toBe(false);
    expect(gradeQuestion(q, undefined)).toBe(false);
    expect(gradeQuestion(q, ["B", "A"])).toBe(false);
  });

  it("multi_response: exact set, order-insensitive, no partial credit", () => {
    const q = multi();
    expect(gradeQuestion(q, ["A", "C"])).toBe(true);
    expect(gradeQuestion(q, ["C", "A"])).toBe(true);
    expect(gradeQuestion(q, ["A"])).toBe(false);
    expect(gradeQuestion(q, ["A", "B"])).toBe(false);
    expect(gradeQuestion(q, ["A", "C", "D"])).toBe(false);
    expect(gradeQuestion(q, ["A", "A"])).toBe(false);
    expect(gradeQuestion(q, { L1: "A" })).toBe(false);
  });

  it("ordering: exact sequence", () => {
    const q = ordering();
    expect(gradeQuestion(q, ["A", "B", "C"])).toBe(true);
    expect(gradeQuestion(q, ["A", "C", "B"])).toBe(false);
    expect(gradeQuestion(q, ["A", "B"])).toBe(false);
    expect(gradeQuestion(q, undefined)).toBe(false);
  });

  it("matching: every pair must be right", () => {
    const q = matching();
    expect(gradeQuestion(q, { L1: "R1", L2: "R2", L3: "R3" })).toBe(true);
    expect(gradeQuestion(q, { L1: "R1", L2: "R3", L3: "R2" })).toBe(false);
    expect(gradeQuestion(q, { L1: "R1", L2: "R2" })).toBe(false);
    expect(gradeQuestion(q, {})).toBe(false);
    expect(gradeQuestion(q, ["R1"])).toBe(false);
  });
});

describe("answerStatus", () => {
  it("tracks empty, partial and complete answers", () => {
    expect(answerStatus(single(), undefined)).toBe("empty");
    expect(answerStatus(single(), ["A"])).toBe("complete");
    expect(answerStatus(multi(), ["A"])).toBe("partial");
    expect(answerStatus(multi(), ["A", "B"])).toBe("complete");
    expect(answerStatus(ordering(), ["C", "B", "A"])).toBe("complete");
    expect(answerStatus(ordering(), undefined)).toBe("empty");
    expect(answerStatus(matching(), { L1: "R2" })).toBe("partial");
    expect(answerStatus(matching(), { L1: "R2", L2: "R1", L3: "R3" })).toBe("complete");
    expect(answerStatus(matching(), {})).toBe("empty");
  });
});

describe("compareParts", () => {
  it("compares ordering per position", () => {
    const parts = compareParts(ordering(), ["A", "C", "B"]);
    expect(parts.map((p) => p.correct)).toEqual([true, false, false]);
    expect(parts[1]).toMatchObject({ key: "2", yours: "C", expected: "B" });
  });

  it("compares matching per pair", () => {
    const parts = compareParts(matching(), { L1: "R1", L2: "R3" });
    expect(parts.map((p) => p.correct)).toEqual([true, false, false]);
    expect(parts[2]?.yours).toBeUndefined();
  });

  it("is empty for choice questions", () => {
    expect(compareParts(single(), ["A"])).toEqual([]);
  });
});
