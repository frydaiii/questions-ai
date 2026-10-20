import type { Answers, Bank, Question } from "../types";
import { gradeQuestion } from "./grader";

/** A domain or concept scoring below this share is flagged "needs improvement". */
export const NEEDS_IMPROVEMENT_BELOW = 0.7;
/** Concepts seen in fewer questions than this are flagged "low sample". */
export const LOW_SAMPLE_BELOW = 2;

export interface Tally {
  correct: number;
  total: number;
}

export interface QuestionResult {
  question: Question;
  correct: boolean;
  answered: boolean;
}

export interface DomainScore extends Tally {
  id: number;
  name: string;
  pct: number;
  needsImprovement: boolean;
}

export interface ConceptScore extends Tally {
  name: string;
  group: string;
  pct: number;
  missed: number;
  lowSample: boolean;
  needsImprovement: boolean;
  /** Theory cards behind the missed questions, most-referenced first. */
  theoryIds: string[];
  missedQuestionIds: string[];
}

export interface Report {
  overall: Tally & { pct: number };
  results: QuestionResult[];
  domains: DomainScore[];
  /** Every concept that appeared in the set, alphabetical. */
  concepts: ConceptScore[];
  /** Concepts below the threshold: weakest first, then most misses. */
  weakConcepts: ConceptScore[];
}

const pct = (t: Tally) => (t.total === 0 ? 0 : t.correct / t.total);

export function gradeAll(questions: Question[], answers: Answers): QuestionResult[] {
  return questions.map((question) => {
    const answer = answers[question.id];
    return { question, correct: gradeQuestion(question, answer), answered: answer !== undefined };
  });
}

export function buildReport(bank: Bank, results: QuestionResult[]): Report {
  const overall = {
    correct: results.filter((r) => r.correct).length,
    total: results.length,
  };

  const domains: DomainScore[] = [];
  for (const d of bank.domains) {
    const inDomain = results.filter((r) => r.question.domain === d.id);
    if (inDomain.length === 0) continue;
    const tally = { correct: inDomain.filter((r) => r.correct).length, total: inDomain.length };
    domains.push({ id: d.id, name: d.name, ...tally, pct: pct(tally), needsImprovement: pct(tally) < NEEDS_IMPROVEMENT_BELOW });
  }

  const groupOf = new Map(bank.concepts.map((c) => [c.name, c.group]));
  const byConcept = new Map<string, QuestionResult[]>();
  for (const r of results) {
    for (const c of r.question.concepts) {
      byConcept.set(c, [...(byConcept.get(c) ?? []), r]);
    }
  }

  const concepts: ConceptScore[] = [...byConcept.entries()].map(([name, rs]) => {
    const tally = { correct: rs.filter((r) => r.correct).length, total: rs.length };
    const missed = rs.filter((r) => !r.correct);
    return {
      name,
      group: groupOf.get(name) ?? "Other",
      ...tally,
      pct: pct(tally),
      missed: missed.length,
      lowSample: tally.total < LOW_SAMPLE_BELOW,
      needsImprovement: pct(tally) < NEEDS_IMPROVEMENT_BELOW,
      theoryIds: rankTheory(missed.map((r) => r.question), bank),
      missedQuestionIds: missed.map((r) => r.question.id),
    };
  });
  concepts.sort((a, b) => a.name.localeCompare(b.name));

  const weakConcepts = concepts
    .filter((c) => c.needsImprovement)
    .sort((a, b) => a.pct - b.pct || b.missed - a.missed || a.name.localeCompare(b.name));

  return { overall: { ...overall, pct: pct(overall) }, results, domains, concepts, weakConcepts };
}

/** Distinct theory cards referenced by the given questions, most-referenced first. */
export function rankTheory(questions: Question[], bank: Bank): string[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    for (const ref of q.theory_refs) {
      if (bank.theory[ref]) counts.set(ref, (counts.get(ref) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
}

/** Per-domain and per-concept tallies, compact enough to keep in history. */
export function summarizeTallies(results: QuestionResult[]) {
  const domains: Record<string, [number, number]> = {};
  const concepts: Record<string, [number, number]> = {};
  const add = (map: Record<string, [number, number]>, key: string, ok: boolean) => {
    const cur = map[key] ?? [0, 0];
    map[key] = [cur[0] + (ok ? 1 : 0), cur[1] + 1];
  };
  for (const r of results) {
    add(domains, String(r.question.domain), r.correct);
    for (const c of r.question.concepts) add(concepts, c, r.correct);
  }
  return { domains, concepts };
}

export interface PersistentWeakness extends Tally {
  name: string;
  pct: number;
  attempts: number;
}

/**
 * Aggregate stored tallies across several attempts and return the areas that stay below
 * the threshold, weakest first. Areas with fewer than `minQuestions` questions overall are
 * ignored to avoid flagging noise.
 */
export function persistentWeaknesses(
  tallies: Record<string, [number, number]>[],
  minQuestions = 3,
): PersistentWeakness[] {
  const agg = new Map<string, { correct: number; total: number; attempts: number }>();
  for (const t of tallies) {
    for (const [name, [correct, total]] of Object.entries(t)) {
      const cur = agg.get(name) ?? { correct: 0, total: 0, attempts: 0 };
      agg.set(name, { correct: cur.correct + correct, total: cur.total + total, attempts: cur.attempts + 1 });
    }
  }
  return [...agg.entries()]
    .map(([name, v]) => ({ name, ...v, pct: pct(v) }))
    .filter((w) => w.total >= minQuestions && w.pct < NEEDS_IMPROVEMENT_BELOW)
    .sort((a, b) => a.pct - b.pct || b.total - a.total || a.name.localeCompare(b.name));
}
