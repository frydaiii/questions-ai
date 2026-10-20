import { useRef } from "react";
import type { Answers, Question } from "../../types";
import { answerStatus } from "../../lib/grader";
import { Dialog } from "../Dialog";

interface SubmitDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onGoTo: (index: number) => void;
  questions: Question[];
  answers: Answers;
  flags: string[];
}

export function SubmitDialog({ open, onClose, onSubmit, onGoTo, questions, answers, flags }: SubmitDialogProps) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const indexed = questions.map((q, i) => ({ q, i, status: answerStatus(q, answers[q.id]) }));
  const answered = indexed.filter((x) => x.status === "complete");
  const unanswered = indexed.filter((x) => x.status === "empty");
  const partial = indexed.filter((x) => x.status === "partial");
  const flagged = indexed.filter((x) => flags.includes(x.q.id));
  const allDone = answered.length === questions.length;

  const jumpList = (label: string, items: typeof indexed) =>
    items.length > 0 && (
      <div className="submit-summary__group">
        <h3 className="submit-summary__label">{label}</h3>
        <ul className="jump-list">
          {items.map(({ i }) => (
            <li key={i}>
              <button type="button" className="jump-chip" onClick={() => onGoTo(i)} aria-label={`Go to question ${i + 1}`}>
                {i + 1}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Submit this set?"
      description={
        allDone
          ? "You’ve answered every question. You can still go back and change answers before submitting."
          : "Unanswered questions are marked incorrect. Partly answered questions get no credit."
      }
      size="sm"
      initialFocus={keepRef}
      footer={
        <>
          <button ref={keepRef} type="button" className="btn btn--ghost" onClick={onClose}>
            Keep working
          </button>
          <button type="button" className="btn btn--primary" onClick={onSubmit}>
            Submit set
          </button>
        </>
      }
    >
      <dl className="submit-stats">
        <div>
          <dt>Answered</dt>
          <dd data-testid="count-answered">{answered.length}</dd>
        </div>
        <div className={unanswered.length + partial.length ? "is-warning" : undefined}>
          <dt>Unanswered</dt>
          <dd data-testid="count-unanswered">{unanswered.length + partial.length}</dd>
        </div>
        <div className={flagged.length ? "is-flag" : undefined}>
          <dt>Flagged</dt>
          <dd data-testid="count-flagged">{flagged.length}</dd>
        </div>
      </dl>
      <div className="submit-summary">
        {jumpList("Not answered", unanswered)}
        {jumpList("Partly answered", partial)}
        {jumpList("Flagged for review", flagged)}
      </div>
    </Dialog>
  );
}
