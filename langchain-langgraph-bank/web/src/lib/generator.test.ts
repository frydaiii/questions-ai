import { describe, expect, it } from "vitest";
import { generateSet } from "./generator";
import { LEVELS, type Question } from "../types";
import { loadRealBank, makeBank, matching, ordering, single } from "../test/fixtures";

const bank = loadRealBank();
const byId = new Map(bank.questions.map((q) => [q.id, q]));
const lookup = (id: string) => byId.get(id) as Question;

describe("generateSet on the real bank", () => {
  for (const level of LEVELS) {
    it(`builds 30 unique ${level} questions, 5 per domain`, () => {
      for (const seed of [1, 2, 3, 42, 99999]) {
        const set = generateSet(bank, level, seed);
        expect(set.questionIds).toHaveLength(30);
        expect(new Set(set.questionIds).size).toBe(30);
        const qs = set.questionIds.map(lookup);
        expect(qs.every((q) => q.difficulty === level)).toBe(true);
        for (const d of bank.domains) {
          expect(qs.filter((q) => q.domain === d.id)).toHaveLength(5);
        }
      }
    });

    it(`includes at least 20% non-single-choice questions at ${level}`, () => {
      for (const seed of [7, 8, 9, 10]) {
        const qs = generateSet(bank, level, seed).questionIds.map(lookup);
        expect(qs.filter((q) => q.type !== "single_choice").length).toBeGreaterThanOrEqual(6);
      }
    });
  }

  it("is deterministic for a given seed and varies across seeds", () => {
    const a = generateSet(bank, "medium", 123);
    const b = generateSet(bank, "medium", 123);
    const c = generateSet(bank, "medium", 124);
    expect(a).toEqual(b);
    expect(a.questionIds).not.toEqual(c.questionIds);
  });

  it("prefers questions the user has not seen", () => {
    const first = generateSet(bank, "medium", 5);
    const second = generateSet(bank, "medium", 6, { seenIds: new Set(first.questionIds) });
    const overlap = second.questionIds.filter((id) => first.questionIds.includes(id));
    expect(overlap).toEqual([]);
  });

  it("falls back to seen questions when the unseen pool runs out", () => {
    const allEasy = new Set(bank.questions.filter((q) => q.difficulty === "easy").map((q) => q.id));
    const set = generateSet(bank, "easy", 11, { seenIds: allEasy });
    expect(set.questionIds).toHaveLength(30);
  });

  it("scrambles ordering and matching layouts so they never give the answer away", () => {
    for (const level of LEVELS) {
      for (let seed = 0; seed < 25; seed++) {
        const set = generateSet(bank, level, seed);
        for (const id of set.questionIds) {
          const q = lookup(id);
          const layout = set.layout[id];
          if (q.type === "ordering") {
            expect([...(layout ?? [])].sort()).toEqual(q.options.map((o) => o.key).sort());
            expect(layout).not.toEqual(q.correct);
          } else if (q.type === "matching") {
            expect([...(layout ?? [])].sort()).toEqual(q.matching.right.map((r) => r.key).sort());
            const aligned = q.matching.left.every((l, i) => q.correct_pairs[l.key] === layout?.[i]);
            expect(aligned).toBe(false);
          } else {
            expect(layout).toBeUndefined();
          }
        }
      }
    }
  });

  it("does not reorder options of choice questions", () => {
    const set = generateSet(bank, "hard", 3);
    const q = lookup(set.questionIds[0] as string);
    expect(q).toBe(byId.get(q.id));
  });
});

describe("generateSet edge cases", () => {
  it("tops up from other domains when one domain is short", () => {
    const qs = [
      ...[1, 2, 3, 4, 5].flatMap((domain) => Array.from({ length: 7 }, () => single({ domain }))),
      single({ domain: 6 }),
      single({ domain: 6 }),
    ];
    const set = generateSet(makeBank(0, qs), "easy", 1);
    expect(set.questionIds).toHaveLength(30);
    expect(new Set(set.questionIds).size).toBe(30);
  });

  it("returns a smaller set when the whole level pool is too small", () => {
    const qs = [single(), single({ domain: 2 }), ordering({ domain: 3 }), matching({ domain: 4 })];
    const set = generateSet(makeBank(0, qs), "easy", 1);
    expect(set.questionIds).toHaveLength(4);
  });

  it("spreads non-single formats across types", () => {
    const small = makeBank(8);
    const ids = new Map(small.questions.map((q) => [q.id, q]));
    const set = generateSet(small, "easy", 77);
    const types = new Set(set.questionIds.map((id) => ids.get(id)?.type));
    expect(types).toEqual(new Set(["single_choice", "multi_response", "ordering", "matching"]));
  });
});
