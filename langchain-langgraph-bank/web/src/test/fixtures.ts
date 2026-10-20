import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Bank, ChoiceQuestion, Level, MatchingQuestion, Question, TheoryCard } from "../types";

let realBank: Bank | undefined;

/** The real exported bundle (web/public/bank.json). Run `npm run data` if it is missing. */
export function loadRealBank(): Bank {
  if (!realBank) {
    // Vitest runs from the web/ directory (jsdom makes import.meta.url non-file).
    const path = resolve(process.cwd(), "public", "bank.json");
    realBank = JSON.parse(readFileSync(path, "utf-8")) as Bank;
  }
  return realBank;
}

const explanation = {
  why_correct: "Because it is right.",
  why_incorrect: {} as Record<string, string>,
  rule_of_thumb: "Remember the rule.",
};

let counter = 0;
const nextId = (domain: number) => `Q-D${domain}-${String(++counter).padStart(4, "0")}`;

export function single(overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  const domain = overrides.domain ?? 1;
  return {
    id: nextId(domain),
    domain,
    task_statement: `${domain}.1`,
    type: "single_choice",
    difficulty: "easy",
    theory_refs: ["TH-D1-001"],
    stem: "Which option is correct?",
    select_count: 1,
    options: [
      { key: "A", text: "Alpha" },
      { key: "B", text: "Bravo" },
      { key: "C", text: "Charlie" },
      { key: "D", text: "Delta" },
    ],
    correct: ["B"],
    explanation: { ...explanation, why_incorrect: { A: "A is wrong.", C: "C is wrong.", D: "D is wrong." } },
    concepts: ["Agent"],
    tags: ["t"],
    ...overrides,
  };
}

export function multi(overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  return single({
    type: "multi_response",
    select_count: 2,
    stem: "Which two are correct? (Select 2)",
    correct: ["A", "C"],
    explanation: { ...explanation, why_incorrect: { B: "B is wrong.", D: "D is wrong." } },
    ...overrides,
  });
}

export function ordering(overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  return single({
    type: "ordering",
    select_count: 3,
    stem: "Put these steps in order.",
    options: [
      { key: "A", text: "First step" },
      { key: "B", text: "Second step" },
      { key: "C", text: "Third step" },
    ],
    correct: ["A", "B", "C"],
    explanation,
    ...overrides,
  });
}

export function matching(overrides: Partial<MatchingQuestion> = {}): MatchingQuestion {
  const domain = overrides.domain ?? 1;
  return {
    id: nextId(domain),
    domain,
    task_statement: `${domain}.1`,
    type: "matching",
    difficulty: "easy",
    theory_refs: ["TH-D1-001"],
    stem: "Match each term to its description.",
    select_count: 3,
    matching: {
      left: [
        { key: "L1", text: "Chatbot" },
        { key: "L2", text: "Workflow" },
        { key: "L3", text: "Agent" },
      ],
      right: [
        { key: "R1", text: "Turn-by-turn dialogue" },
        { key: "R2", text: "Fixed sequence of steps" },
        { key: "R3", text: "Model decides its actions" },
      ],
    },
    correct_pairs: { L1: "R1", L2: "R2", L3: "R3" },
    explanation,
    concepts: ["Agent"],
    tags: ["t"],
    ...overrides,
  };
}

export function card(id: string, overrides: Partial<TheoryCard> = {}): TheoryCard {
  return {
    id,
    domain: 1,
    task_statements: ["1.1"],
    title: `Card ${id}`,
    summary: "A summary of the idea.",
    key_points: ["Point one", "Point two"],
    rule_of_thumb: "Card rule of thumb.",
    common_confusions: ["A common confusion."],
    related_tech: ["ReAct"],
    references: ["https://arxiv.org/abs/2210.03629"],
    ...overrides,
  };
}

/** A small bank: 6 domains x `perCell` questions at each level, mixed formats. */
export function makeBank(perCell = 8, questions?: Question[]): Bank {
  const qs: Question[] =
    questions ??
    (["easy", "medium", "hard"] as Level[]).flatMap((difficulty) =>
      [1, 2, 3, 4, 5, 6].flatMap((domain) =>
        Array.from({ length: perCell }, (_, i) => {
          const base = { domain, difficulty, concepts: [i % 2 ? "Planning" : "Memory"] };
          if (i === 0) return ordering(base);
          if (i === 1) return matching(base);
          if (i === 2) return multi(base);
          return single(base);
        }),
      ),
    );
  return {
    meta: { format_version: 1, hash: "testhash", title: "Test Bank", question_count: qs.length, theory_count: 2 },
    domains: [1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `Domain ${id}`, task_statements: [] })),
    concepts: [
      { name: "Agent", group: "Core" },
      { name: "Memory", group: "Core" },
      { name: "Planning", group: "Reasoning" },
    ],
    questions: qs,
    theory: { "TH-D1-001": card("TH-D1-001"), "TH-D1-002": card("TH-D1-002") },
  };
}
