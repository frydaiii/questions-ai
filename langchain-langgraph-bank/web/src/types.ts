// Types mirroring web/public/bank.json as produced by tools/export_web.py.

export type Level = "easy" | "medium" | "hard";
export const LEVELS: readonly Level[] = ["easy", "medium", "hard"] as const;

export type QuestionType = "single_choice" | "multi_response" | "ordering" | "matching";

export interface KeyedText {
  key: string;
  text: string;
}

export interface Explanation {
  why_correct: string;
  why_incorrect: Record<string, string>;
  rule_of_thumb: string;
}

interface QuestionBase {
  id: string;
  domain: number;
  task_statement: string;
  difficulty: Level;
  theory_refs: string[];
  stem: string;
  select_count: number;
  explanation: Explanation;
  concepts: string[];
  tags: string[];
}

export interface ChoiceQuestion extends QuestionBase {
  type: "single_choice" | "multi_response" | "ordering";
  options: KeyedText[];
  /** For ordering questions, the full correct permutation of option keys. */
  correct: string[];
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  matching: { left: KeyedText[]; right: KeyedText[] };
  correct_pairs: Record<string, string>;
}

export type Question = ChoiceQuestion | MatchingQuestion;

export interface TheoryCard {
  id: string;
  domain: number;
  task_statements: string[];
  title: string;
  summary: string;
  key_points: string[];
  rule_of_thumb: string;
  common_confusions: string[];
  related_tech?: string[];
  references: string[];
}

export interface Domain {
  id: number;
  name: string;
  task_statements: { id: string; title: string }[];
}

export interface Concept {
  name: string;
  group: string;
}

export interface Bank {
  meta: {
    format_version: number;
    hash: string;
    title: string;
    question_count: number;
    theory_count: number;
  };
  domains: Domain[];
  concepts: Concept[];
  questions: Question[];
  theory: Record<string, TheoryCard>;
}

/**
 * A user's answer.
 * - single_choice / multi_response: selected option keys
 * - ordering: option keys in the user's chosen order
 * - matching: left key -> right key
 */
export type Answer = string[] | Record<string, string>;
export type Answers = Record<string, Answer | undefined>;
