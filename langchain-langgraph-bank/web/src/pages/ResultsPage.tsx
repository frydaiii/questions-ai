import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { useStartSet } from "../hooks/useStartSet";
import { buildReport, gradeAll, LOW_SAMPLE_BELOW, NEEDS_IMPROVEMENT_BELOW } from "../lib/analytics";
import { formatDate, formatDuration, LEVEL_INFO, pctLabel } from "../lib/format";
import { getAttempt, type Attempt } from "../lib/storage";
import { Meter, ScoreRing } from "../components/ScoreRing";
import { TheoryButton, useTheoryDialog } from "../components/TheoryDialog";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "../components/Icons";

export function useAttempt() {
  const { attemptId = "" } = useParams();
  return useMemo(() => getAttempt(attemptId), [attemptId]);
}

export function AttemptNotFound() {
  usePageTitle("Report not found");
  return (
    <div className="page empty-state">
      <h1 className="page-title">Report not found</h1>
      <p className="muted">
        This report isn’t in this browser’s history. History is stored locally, so it may have been cleared or created
        on another device.
      </p>
      <div className="row">
        <Link to="/" className="btn btn--primary">
          Start a new set
        </Link>
        <Link to="/history" className="btn btn--secondary">
          View history
        </Link>
      </div>
    </div>
  );
}

export function ResultsPage() {
  const attempt = useAttempt();
  if (!attempt) return <AttemptNotFound />;
  return <Results attempt={attempt} />;
}

function Results({ attempt }: { attempt: Attempt }) {
  usePageTitle("Results");
  const { bank, questionsById } = useBank();
  const startSet = useStartSet();
  const theory = useTheoryDialog();

  const questions = useMemo(
    () => attempt.questionIds.flatMap((id) => questionsById.get(id) ?? []),
    [attempt, questionsById],
  );
  const report = useMemo(() => buildReport(bank, gradeAll(questions, attempt.answers)), [bank, questions, attempt]);
  const missing = attempt.questionIds.length - questions.length;
  const incorrect = report.results.filter((r) => !r.correct).length;
  const unanswered = report.results.filter((r) => !r.answered).length;
  const passed = report.overall.pct >= NEEDS_IMPROVEMENT_BELOW;
  const weakDomains = report.domains.filter((d) => d.needsImprovement);
  const duration = formatDuration(attempt.startedAt, attempt.finishedAt);
  const reviewBase = `/review/${attempt.id}`;

  return (
    <div className="page page--results">
      <header className="page-header">
        <p className="eyebrow">
          {LEVEL_INFO[attempt.level].label} set · {formatDate(attempt.finishedAt)}
          {duration && <> · {duration}</>}
        </p>
        <h1 className="page-title">Your results</h1>
      </header>

      {missing > 0 && (
        <p className="notice" role="note">
          <AlertIcon size={18} /> {missing} question{missing === 1 ? "" : "s"} from this set no longer exist in the
          current bank and {missing === 1 ? "is" : "are"} left out of this report.
        </p>
      )}

      <section className="panel score-panel" aria-labelledby="score-title">
        <h2 id="score-title" className="sr-only">
          Overall score
        </h2>
        <ScoreRing correct={report.overall.correct} total={report.overall.total} />
        <div className="score-panel__body">
          <p className={`verdict verdict--${passed ? "good" : "low"}`}>
            {passed ? <CheckIcon size={18} /> : <AlertIcon size={18} />}
            {passed ? "On track" : "Needs more practice"}
          </p>
          <p className="score-panel__text">
            {passed
              ? `You scored ${pctLabel(report.overall.pct)}, at or above the ${pctLabel(NEEDS_IMPROVEMENT_BELOW)} target.`
              : `You scored ${pctLabel(report.overall.pct)}, below the ${pctLabel(NEEDS_IMPROVEMENT_BELOW)} target.`}{" "}
            {weakDomains.length > 0
              ? `Focus first on ${weakDomains.map((d) => d.name).join(", ")}.`
              : "Every domain is at or above target."}
          </p>
          <ul className="stat-row" aria-label="Breakdown">
            <li>
              <span className="stat-row__value">{report.overall.correct}</span> correct
            </li>
            <li>
              <span className="stat-row__value">{incorrect - unanswered}</span> incorrect
            </li>
            <li>
              <span className="stat-row__value">{unanswered}</span> not answered
            </li>
            <li>
              <span className="stat-row__value">{attempt.flags.length}</span> flagged
            </li>
          </ul>
          <div className="row">
            {incorrect > 0 && (
              <Link to={`${reviewBase}?show=incorrect`} className="btn btn--primary">
                Review {incorrect} mistake{incorrect === 1 ? "" : "s"}
              </Link>
            )}
            <Link to={reviewBase} className="btn btn--secondary">
              Review all answers
            </Link>
            <button type="button" className="btn btn--ghost" onClick={() => startSet(attempt.level)}>
              New {LEVEL_INFO[attempt.level].label.toLowerCase()} set
            </button>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="domains-title">
        <div className="section-head">
          <h2 id="domains-title" className="section-title">
            Scores by domain
          </h2>
          <p className="muted small">Below {pctLabel(NEEDS_IMPROVEMENT_BELOW)} is flagged “needs improvement”.</p>
        </div>
        <ul className="domain-scores">
          {report.domains.map((d) => (
            <li key={d.id} className={`domain-score${d.needsImprovement ? " is-weak" : ""}`}>
              <div className="domain-score__head">
                <span className="domain-score__name">
                  <span className="muted">D{d.id}</span> {d.name}
                </span>
                <span className="domain-score__value">
                  {d.correct}/{d.total} · {pctLabel(d.pct)}
                </span>
              </div>
              <Meter value={d.pct} label={`${d.name}: ${pctLabel(d.pct)}`} />
              <div className="domain-score__foot">
                {d.needsImprovement ? (
                  <span className="badge badge--danger">
                    <AlertIcon size={14} /> Needs improvement
                  </span>
                ) : (
                  <span className="badge badge--success">
                    <CheckIcon size={14} /> On track
                  </span>
                )}
                {d.correct < d.total && (
                  <Link to={`${reviewBase}?show=incorrect&domain=${d.id}`} className="small">
                    Review {d.total - d.correct} missed
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="concepts-title">
        <div className="section-head">
          <h2 id="concepts-title" className="section-title">
            Concepts to improve
          </h2>
          <p className="muted small">
            Weakest first. “Low sample” means the concept appeared in fewer than {LOW_SAMPLE_BELOW} questions, so treat
            the score as a hint.
          </p>
        </div>
        {report.weakConcepts.length === 0 ? (
          <p className="success-note">
            <CheckIcon size={18} /> No weak concepts — every concept in this set scored {pctLabel(NEEDS_IMPROVEMENT_BELOW)}{" "}
            or higher.
          </p>
        ) : (
          <ol className="weak-list">
            {report.weakConcepts.map((c, i) => (
              <li key={c.name} className="weak-item">
                <span className="weak-item__rank" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="weak-item__body">
                  <div className="weak-item__head">
                    <h3 className="weak-item__name">{c.name}</h3>
                    <span className="weak-item__score">
                      {c.correct} of {c.total} correct · {pctLabel(c.pct)}
                    </span>
                    {c.lowSample && <span className="badge badge--neutral">Low sample</span>}
                  </div>
                  <p className="muted small">{c.group}</p>
                  {c.theoryIds.length > 0 && (
                    <div className="weak-item__study">
                      <span className="small strong">Study:</span>
                      <ul className="theory-btn-list">
                        {c.theoryIds.map((id) => (
                          <li key={id}>
                            <TheoryButton cardId={id} onOpen={theory.open} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link
                    to={`${reviewBase}?show=incorrect&concept=${encodeURIComponent(c.name)}`}
                    className="weak-item__link small"
                  >
                    Review {c.missed} missed question{c.missed === 1 ? "" : "s"} <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}

        <details className="disclosure">
          <summary>All concepts in this set ({report.concepts.length})</summary>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Score per concept</caption>
              <thead>
                <tr>
                  <th scope="col">Concept</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Score</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.concepts.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">{c.name}</th>
                    <td>
                      {c.correct}/{c.total}
                    </td>
                    <td>{pctLabel(c.pct)}</td>
                    <td>
                      {c.needsImprovement ? "Needs improvement" : "On track"}
                      {c.lowSample ? " (low sample)" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {theory.dialog}
    </div>
  );
}
