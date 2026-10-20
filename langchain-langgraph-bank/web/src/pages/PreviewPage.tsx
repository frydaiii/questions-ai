import { useMemo, useState } from "react";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { QuestionCard } from "../components/questions/QuestionCard";
import type { Answers, QuestionType } from "../types";
import { gradeQuestion } from "../lib/grader";

const TYPES: QuestionType[] = ["single_choice", "multi_response", "ordering", "matching"];

/** Dev-only page (/#/preview) showing one question of each format with live grading. */
export function PreviewPage() {
  usePageTitle("Component preview");
  const { bank, domainName } = useBank();
  const [answers, setAnswers] = useState<Answers>({});
  const samples = useMemo(
    () => TYPES.flatMap((t) => bank.questions.find((q) => q.type === t) ?? []),
    [bank],
  );

  return (
    <div className="page">
      <h1 className="page-title">Question format preview</h1>
      <p className="muted">Development only. One question of each format; answers aren’t saved.</p>
      <div className="stack">
        {samples.map((q) => (
          <div key={q.id}>
            <QuestionCard
              question={q}
              value={answers[q.id]}
              onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
              layout={q.type === "matching" ? [...q.matching.right.map((r) => r.key)].reverse() : undefined}
              domainName={domainName(q.domain)}
              heading={q.id}
            />
            <p className="muted small">
              Graded: {answers[q.id] === undefined ? "not answered" : gradeQuestion(q, answers[q.id]) ? "correct" : "incorrect"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
