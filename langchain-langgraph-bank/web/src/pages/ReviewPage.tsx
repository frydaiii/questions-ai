import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { gradeAll } from "../lib/analytics";
import { LEVEL_INFO, formatDate } from "../lib/format";
import type { Attempt } from "../lib/storage";
import { ReviewItem } from "../components/review/ReviewItem";
import { useTheoryDialog } from "../components/TheoryDialog";
import { ArrowLeftIcon } from "../components/Icons";
import { AttemptNotFound, useAttempt } from "./ResultsPage";

type Show = "all" | "incorrect" | "flagged";
const SHOWS: { value: Show; label: string }[] = [
  { value: "all", label: "All" },
  { value: "incorrect", label: "Incorrect" },
  { value: "flagged", label: "Flagged" },
];

export function ReviewPage() {
  const attempt = useAttempt();
  if (!attempt) return <AttemptNotFound />;
  return <Review attempt={attempt} />;
}

function Review({ attempt }: { attempt: Attempt }) {
  usePageTitle("Review answers");
  const { bank, questionsById } = useBank();
  const theory = useTheoryDialog();
  const [params, setParams] = useSearchParams();

  const showParam = params.get("show");
  const show: Show = showParam === "incorrect" || showParam === "flagged" ? showParam : "all";
  const domain = params.get("domain") ?? "";
  const concept = params.get("concept") ?? "";

  const results = useMemo(() => {
    const qs = attempt.questionIds.flatMap((id) => questionsById.get(id) ?? []);
    return gradeAll(qs, attempt.answers).map((r, i) => ({ ...r, number: i + 1, flagged: attempt.flags.includes(r.question.id) }));
  }, [attempt, questionsById]);

  const counts = {
    all: results.length,
    incorrect: results.filter((r) => !r.correct).length,
    flagged: results.filter((r) => r.flagged).length,
  };

  const conceptsInSet = useMemo(
    () => [...new Set(results.flatMap((r) => r.question.concepts))].sort((a, b) => a.localeCompare(b)),
    [results],
  );
  const domainsInSet = bank.domains.filter((d) => results.some((r) => r.question.domain === d.id));

  const visible = results.filter(
    (r) =>
      (show === "all" || (show === "incorrect" ? !r.correct : r.flagged)) &&
      (!domain || String(r.question.domain) === domain) &&
      (!concept || r.question.concepts.includes(concept)),
  );

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || (key === "show" && value === "all")) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const filtered = show !== "all" || domain || concept;

  return (
    <div className="page page--review">
      <header className="page-header">
        <Link to={`/results/${attempt.id}`} className="back-link">
          <ArrowLeftIcon size={16} /> Back to results
        </Link>
        <p className="eyebrow">
          {LEVEL_INFO[attempt.level].label} set · {formatDate(attempt.finishedAt)}
        </p>
        <h1 className="page-title">Review answers</h1>
      </header>

      <div className="filter-bar" role="search" aria-label="Filter questions">
        <fieldset className="segmented">
          <legend className="sr-only">Show</legend>
          {SHOWS.map((s) => (
            <label key={s.value} className={`segmented__option${show === s.value ? " is-active" : ""}`}>
              <input
                type="radio"
                name="show"
                value={s.value}
                checked={show === s.value}
                onChange={() => update("show", s.value)}
              />
              {s.label} <span className="segmented__count">{counts[s.value]}</span>
            </label>
          ))}
        </fieldset>
        <div className="filter-bar__selects">
          <label className="field">
            <span className="field__label">Domain</span>
            <select className="select" value={domain} onChange={(e) => update("domain", e.target.value)}>
              <option value="">All domains</option>
              {domainsInSet.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  D{d.id} · {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Concept</span>
            <select className="select" value={concept} onChange={(e) => update("concept", e.target.value)}>
              <option value="">All concepts</option>
              {conceptsInSet.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="filter-summary" aria-live="polite">
        Showing {visible.length} of {results.length} questions
        {filtered && (
          <>
            {" "}
            ·{" "}
            <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear filters
            </button>
          </>
        )}
      </p>

      {visible.length === 0 ? (
        <div className="empty-inline">
          <p>No questions match these filters.</p>
        </div>
      ) : (
        <ol className="review-list">
          {visible.map((r) => (
            <li key={r.question.id}>
              <ReviewItem
                number={r.number}
                question={r.question}
                answer={attempt.answers[r.question.id]}
                correct={r.correct}
                flagged={r.flagged}
                onOpenCard={theory.open}
              />
            </li>
          ))}
        </ol>
      )}

      {theory.dialog}
    </div>
  );
}
