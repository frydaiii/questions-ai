import { useId, type ReactNode } from "react";
import type { Answer, Question } from "../../types";
import { formatHint, FORMAT_LABEL } from "../../lib/format";
import { QuestionInput } from "./QuestionInput";

interface QuestionCardProps {
  question: Question;
  value: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
  layout?: string[];
  domainName: string;
  /** e.g. "Question 4 of 30" */
  heading: string;
  headerAside?: ReactNode;
}

export function QuestionCard({ question, value, onChange, layout, domainName, heading, headerAside }: QuestionCardProps) {
  const id = useId();
  const stemId = `${id}-stem`;
  const hintId = `${id}-hint`;
  return (
    <article className="question-card" aria-labelledby={`${id}-heading`}>
      <header className="question-card__header">
        <div className="question-card__meta">
          <h2 id={`${id}-heading`} className="question-card__number" tabIndex={-1}>
            {heading}
          </h2>
          <span className="chip">{domainName}</span>
          <span className="chip chip--outline">{FORMAT_LABEL[question.type]}</span>
        </div>
        {headerAside}
      </header>
      <p id={stemId} className="question-card__stem">
        {question.stem}
      </p>
      <p id={hintId} className="question-card__hint">
        {formatHint(question.type, question.select_count)}
      </p>
      <QuestionInput
        question={question}
        value={value}
        onChange={onChange}
        layout={layout}
        labelledBy={stemId}
        describedBy={hintId}
      />
    </article>
  );
}
