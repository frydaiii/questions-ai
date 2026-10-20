import type { Answers, Question } from "../../types";
import { answerStatus, type AnswerStatus } from "../../lib/grader";
import { FlagIcon } from "../Icons";

interface NavigatorProps {
  questions: Question[];
  answers: Answers;
  flags: string[];
  current: number;
  onSelect: (index: number) => void;
}

const STATUS_TEXT: Record<AnswerStatus, string> = {
  complete: "answered",
  partial: "partly answered",
  empty: "not answered",
};

/** Grid of question numbers showing answered / partial / flagged / current state. */
export function Navigator({ questions, answers, flags, current, onSelect }: NavigatorProps) {
  const statuses = questions.map((q) => answerStatus(q, answers[q.id]));
  const answered = statuses.filter((s) => s === "complete").length;

  return (
    <nav className="navigator" aria-label="Questions in this set">
      <p className="navigator__summary">
        <strong>{answered}</strong> of {questions.length} answered
        {flags.length > 0 && (
          <>
            {" "}
            · <strong>{flags.length}</strong> flagged
          </>
        )}
      </p>
      <ol className="navigator__grid">
        {questions.map((q, i) => {
          const status = statuses[i] as AnswerStatus;
          const flagged = flags.includes(q.id);
          const isCurrent = i === current;
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`nav-cell nav-cell--${status}${isCurrent ? " is-current" : ""}${flagged ? " is-flagged" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${i + 1}, ${STATUS_TEXT[status]}${flagged ? ", flagged" : ""}`}
                onClick={() => onSelect(i)}
              >
                {i + 1}
                {flagged && (
                  <span className="nav-cell__flag" aria-hidden="true">
                    <FlagIcon size={10} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="navigator__legend" aria-label="Legend">
        <li>
          <span className="legend-swatch legend-swatch--complete" aria-hidden="true" /> Answered
        </li>
        <li>
          <span className="legend-swatch legend-swatch--partial" aria-hidden="true" /> Partly answered
        </li>
        <li>
          <span className="legend-swatch legend-swatch--empty" aria-hidden="true" /> Not answered
        </li>
        <li>
          <span className="legend-swatch legend-swatch--flag" aria-hidden="true">
            <FlagIcon size={10} />
          </span>{" "}
          Flagged
        </li>
      </ul>
    </nav>
  );
}
