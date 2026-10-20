import type { Answers, Bank, Level } from "../types";
import { addAttempt, finalizeSession, type Attempt } from "../lib/storage";

/**
 * Store a finished attempt built from explicit answers and return it.
 * `questionIds` default to every question in the bank at `level` (or all questions).
 */
export function seedAttempt(
  bank: Bank,
  answers: Answers,
  opts: { questionIds?: string[]; level?: Level; flags?: string[]; at?: Date } = {},
): Attempt {
  const level = opts.level ?? "easy";
  const questionIds = opts.questionIds ?? bank.questions.filter((q) => q.difficulty === level).map((q) => q.id);
  const at = opts.at ?? new Date("2026-10-19T09:30:00Z");
  const attempt = finalizeSession(
    bank,
    {
      version: 1,
      bankHash: bank.meta.hash,
      level,
      seed: Math.floor(at.getTime() / 1000),
      questionIds,
      layout: {},
      answers,
      flags: opts.flags ?? [],
      current: 0,
      startedAt: new Date(at.getTime() - 20 * 60000).toISOString(),
    },
    at,
  );
  addAttempt(attempt);
  return attempt;
}
