import { useId, useState } from "react";
import type { Answer, Question } from "../../types";
import { compareParts } from "../../lib/grader";
import { FORMAT_LABEL } from "../../lib/format";
import { CheckIcon, ChevronDownIcon, FlagIcon, XIcon } from "../Icons";
import { ReferenceLink } from "../TheoryCardView";
import { TheoryButton } from "../TheoryDialog";
import { useBank } from "../../data/BankProvider";

interface ReviewItemProps {
  number: number;
  question: Question;
  answer: Answer | undefined;
  correct: boolean;
  flagged: boolean;
  onOpenCard: (id: string) => void;
  defaultExpanded?: boolean;
}

type Verdict = "correct" | "incorrect" | "unanswered";

const VERDICT_TEXT: Record<Verdict, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  unanswered: "Not answered",
};

export function ReviewItem({ number, question, answer, correct, flagged, onOpenCard, defaultExpanded }: ReviewItemProps) {
  const { bank, domainName } = useBank();
  const verdict: Verdict = correct ? "correct" : answer === undefined ? "unanswered" : "incorrect";
  const [expanded, setExpanded] = useState(defaultExpanded ?? verdict !== "correct");
  const bodyId = useId();
  const headingId = useId();

  const references = [
    ...new Set(question.theory_refs.flatMap((id) => bank.theory[id]?.references ?? [])),
  ];

  return (
    <article className={`review-item review-item--${verdict}`} aria-labelledby={headingId}>
      <header className="review-item__header">
        <div className="review-item__title-row">
          <h2 id={headingId} className="review-item__number">
            Question {number}
          </h2>
          <span className={`verdict-badge verdict-badge--${verdict}`}>
            {verdict === "correct" ? <CheckIcon size={14} /> : verdict === "incorrect" ? <XIcon size={14} /> : null}
            {VERDICT_TEXT[verdict]}
          </span>
          {flagged && (
            <span className="badge badge--flag">
              <FlagIcon size={12} /> Flagged
            </span>
          )}
        </div>
        <div className="review-item__chips">
          <span className="chip">{domainName(question.domain)}</span>
          <span className="chip chip--outline">{FORMAT_LABEL[question.type]}</span>
        </div>
      </header>
      <p className="review-item__stem">{question.stem}</p>

      <button
        type="button"
        className="disclosure-btn"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
      >
        <ChevronDownIcon size={16} className={expanded ? "rotate-180" : undefined} />
        {expanded ? "Hide answer & explanation" : "Show answer & explanation"}
      </button>

      <div id={bodyId} hidden={!expanded} className="review-item__body">
        <AnswerComparison question={question} answer={answer} />

        <section className="explain">
          <h3 className="explain__title">Why this is the answer</h3>
          <p>{question.explanation.why_correct}</p>
        </section>

        <div className="callout callout--tip"><p className="callout__label">Rule of thumb</p>
        <p>{question.explanation.rule_of_thumb}</p></div>

        <section className="review-item__theory">
          <h3 className="explain__title">Theory behind this question</h3>
          <ul className="theory-btn-list">
            {question.theory_refs.map((id) => (
              <li key={id}>
                <TheoryButton cardId={id} onOpen={onOpenCard} />
              </li>
            ))}
          </ul>
          {references.length > 0 && (
            <div className="review-item__refs">
              <span className="small strong">Sources:</span>
              <ul className="ref-list ref-list--inline">
                {references.map((url) => (
                  <li key={url}>
                    <ReferenceLink url={url} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="chip-list" aria-label="Concepts">
            {question.concepts.map((c) => (
              <li key={c} className="chip chip--soft">
                {c}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function AnswerComparison({ question, answer }: { question: Question; answer: Answer | undefined }) {
  const [showOthers, setShowOthers] = useState(false);

  if (question.type === "single_choice" || question.type === "multi_response") {
    const picked = new Set(Array.isArray(answer) ? answer : []);
    const correctKeys = new Set(question.correct);
    const hasOtherExplanations = question.options.some(
      (o) => !correctKeys.has(o.key) && !picked.has(o.key) && question.explanation.why_incorrect[o.key],
    );
    return (
      <div className="compare">
        <ul className="review-options" aria-label="Options">
          {question.options.map((o) => {
            const isCorrect = correctKeys.has(o.key);
            const isPicked = picked.has(o.key);
            const why = question.explanation.why_incorrect[o.key];
            const state = isCorrect ? (isPicked ? "hit" : "missed") : isPicked ? "wrong" : "neutral";
            const showWhy = !isCorrect && why && (isPicked || showOthers);
            return (
              <li key={o.key} className={`review-option review-option--${state}`}>
                <div className="review-option__main">
                  <span className="review-option__key" aria-hidden="true">
                    {o.key}
                  </span>
                  <span className="review-option__text">
                    <span className="sr-only">{o.key}. </span>
                    {o.text}
                  </span>
                  <span className="review-option__tags">
                    {isPicked && (
                      <span className={`tag tag--${isCorrect ? "success" : "danger"}`}>
                        {isCorrect ? <CheckIcon size={12} /> : <XIcon size={12} />} Your answer
                      </span>
                    )}
                    {isCorrect && (
                      <span className="tag tag--success">
                        <CheckIcon size={12} /> Correct answer
                      </span>
                    )}
                  </span>
                </div>
                {showWhy && <p className="review-option__why">{why}</p>}
              </li>
            );
          })}
        </ul>
        {picked.size === 0 && <p className="muted small">You didn’t answer this question.</p>}
        {hasOtherExplanations && (
          <button type="button" className="link-btn small" aria-pressed={showOthers} onClick={() => setShowOthers((v) => !v)}>
            {showOthers ? "Hide why the other options are wrong" : "Show why the other options are wrong"}
          </button>
        )}
      </div>
    );
  }

  const parts = compareParts(question, answer);
  const unanswered = answer === undefined;

  if (question.type === "ordering") {
    const text = new Map(question.options.map((o) => [o.key, o.text]));
    return (
      <div className="compare">
        {unanswered && <p className="muted small">You didn’t answer this question. The correct order is shown.</p>}
        <div className="table-wrap">
          <table className="table table--compare">
            <caption className="sr-only">Your order compared with the correct order</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                {!unanswered && <th scope="col">Your order</th>}
                <th scope="col">Correct order</th>
                {!unanswered && <th scope="col">Result</th>}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.key} className={unanswered ? undefined : p.correct ? "is-correct" : "is-wrong"}>
                  <th scope="row">{p.key}</th>
                  {!unanswered && <td>{p.yours ? text.get(p.yours) : "—"}</td>}
                  <td>{text.get(p.expected)}</td>
                  {!unanswered && <td>{p.correct ? <ResultMark ok /> : <ResultMark ok={false} />}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!unanswered && (
          <p className="muted small">Position-by-position comparison is for learning only; scoring is all-or-nothing.</p>
        )}
      </div>
    );
  }

  if (question.type === "matching") {
    const left = new Map(question.matching.left.map((l) => [l.key, l.text]));
    const right = new Map(question.matching.right.map((r) => [r.key, r.text]));
    return (
      <div className="compare">
        {unanswered && <p className="muted small">You didn’t answer this question. The correct matches are shown.</p>}
        <div className="table-wrap">
          <table className="table table--compare">
            <caption className="sr-only">Your matches compared with the correct matches</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                {!unanswered && <th scope="col">Your match</th>}
                <th scope="col">Correct match</th>
                {!unanswered && <th scope="col">Result</th>}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.key} className={unanswered ? undefined : p.correct ? "is-correct" : "is-wrong"}>
                  <th scope="row">{left.get(p.key)}</th>
                  {!unanswered && <td>{p.yours ? right.get(p.yours) : "—"}</td>}
                  <td>{right.get(p.expected)}</td>
                  {!unanswered && <td>{p.correct ? <ResultMark ok /> : <ResultMark ok={false} />}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!unanswered && (
          <p className="muted small">Pair-by-pair comparison is for learning only; scoring is all-or-nothing.</p>
        )}
      </div>
    );
  }

  return null;
}

function ResultMark({ ok }: { ok: boolean }) {
  return (
    <span className={`result-mark result-mark--${ok ? "ok" : "bad"}`}>
      {ok ? <CheckIcon size={14} /> : <XIcon size={14} />}
      {ok ? "Right" : "Wrong"}
    </span>
  );
}
