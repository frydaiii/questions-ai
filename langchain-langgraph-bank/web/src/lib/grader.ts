import type { Answer, Question } from "../types";

export type AnswerStatus = "empty" | "partial" | "complete";

function asList(answer: Answer | undefined): string[] {
  return Array.isArray(answer) ? answer : [];
}

function asPairs(answer: Answer | undefined): Record<string, string> {
  return answer && !Array.isArray(answer) ? answer : {};
}

/** How far the user got with a question (used by the navigator and submit dialog). */
export function answerStatus(q: Question, answer: Answer | undefined): AnswerStatus {
  if (answer === undefined) return "empty";
  switch (q.type) {
    case "single_choice":
      return asList(answer).length > 0 ? "complete" : "empty";
    case "multi_response": {
      const n = asList(answer).length;
      return n === 0 ? "empty" : n === q.select_count ? "complete" : "partial";
    }
    case "ordering":
      return asList(answer).length === q.options.length ? "complete" : "empty";
    case "matching": {
      const pairs = asPairs(answer);
      const n = q.matching.left.filter((l) => pairs[l.key]).length;
      return n === 0 ? "empty" : n === q.matching.left.length ? "complete" : "partial";
    }
  }
}

/** All-or-nothing grading for every format. Unanswered is incorrect. */
export function gradeQuestion(q: Question, answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  switch (q.type) {
    case "single_choice":
    case "multi_response": {
      const picked = new Set(asList(answer));
      return picked.size === q.correct.length && q.correct.every((k) => picked.has(k));
    }
    case "ordering": {
      const order = asList(answer);
      return order.length === q.correct.length && q.correct.every((k, i) => order[i] === k);
    }
    case "matching": {
      const pairs = asPairs(answer);
      const expected = Object.entries(q.correct_pairs);
      return (
        expected.length === q.matching.left.length &&
        expected.every(([left, right]) => pairs[left] === right) &&
        Object.keys(pairs).every((left) => left in q.correct_pairs)
      );
    }
  }
}

/** Informational per-position / per-pair breakdown for the review screen. */
export interface PartComparison {
  key: string;
  yours: string | undefined;
  expected: string;
  correct: boolean;
}

export function compareParts(q: Question, answer: Answer | undefined): PartComparison[] {
  if (q.type === "ordering") {
    const order = asList(answer);
    return q.correct.map((expected, i) => ({
      key: String(i + 1),
      yours: order[i],
      expected,
      correct: order[i] === expected,
    }));
  }
  if (q.type === "matching") {
    const pairs = asPairs(answer);
    return q.matching.left.map((l) => {
      const expected = q.correct_pairs[l.key] ?? "";
      return { key: l.key, yours: pairs[l.key], expected, correct: pairs[l.key] === expected };
    });
  }
  return [];
}
