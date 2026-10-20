import { useState } from "react";
import { Link } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { NEEDS_IMPROVEMENT_BELOW, persistentWeaknesses, rankTheory } from "../lib/analytics";
import { formatDate, LEVEL_INFO, pctLabel } from "../lib/format";
import { clearHistory, loadHistory, type Attempt } from "../lib/storage";
import { Dialog } from "../components/Dialog";
import { TheoryButton, useTheoryDialog } from "../components/TheoryDialog";
import { Meter } from "../components/ScoreRing";

/** How many recent attempts the "persistent weak areas" view aggregates. */
export const TREND_WINDOW = 5;
const CHART_MAX_POINTS = 20;

export function HistoryPage() {
  usePageTitle("History");
  const { bank, domainName } = useBank();
  const theory = useTheoryDialog();
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadHistory());
  const [confirmClear, setConfirmClear] = useState(false);

  const recent = attempts.slice(-TREND_WINDOW);
  const weakConcepts = persistentWeaknesses(recent.map((a) => a.concepts));
  const weakDomains = persistentWeaknesses(recent.map((a) => a.domains));

  if (attempts.length === 0) {
    return (
      <div className="page empty-state">
        <h1 className="page-title">No history yet</h1>
        <p className="muted">
          Finished sets are saved in this browser so you can track your progress and recurring weak areas.
        </p>
        <Link to="/" className="btn btn--primary">
          Start your first set
        </Link>
      </div>
    );
  }

  const scores = attempts.map((a) => (a.total ? a.correct / a.total : 0));
  const average = scores.reduce((s, x) => s + x, 0) / scores.length;
  const best = Math.max(...scores);
  const recentAvg = scores.slice(-TREND_WINDOW).reduce((s, x) => s + x, 0) / Math.min(TREND_WINDOW, scores.length);

  return (
    <div className="page page--history">
      <header className="page-header page-header--split">
        <div>
          <p className="eyebrow">Saved in this browser</p>
          <h1 className="page-title">Your progress</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>
          Clear history
        </button>
      </header>

      <ul className="kpis" aria-label="Summary">
        <li className="kpi">
          <span className="kpi__value">{attempts.length}</span>
          <span className="kpi__label">sets completed</span>
        </li>
        <li className="kpi">
          <span className="kpi__value">{pctLabel(average)}</span>
          <span className="kpi__label">average score</span>
        </li>
        <li className="kpi">
          <span className="kpi__value">{pctLabel(recentAvg)}</span>
          <span className="kpi__label">last {Math.min(TREND_WINDOW, attempts.length)} sets</span>
        </li>
        <li className="kpi">
          <span className="kpi__value">{pctLabel(best)}</span>
          <span className="kpi__label">best score</span>
        </li>
      </ul>

      <section className="panel" aria-labelledby="trend-title">
        <h2 id="trend-title" className="section-title">
          Score trend
        </h2>
        <TrendChart attempts={attempts.slice(-CHART_MAX_POINTS)} />
      </section>

      <section className="panel" aria-labelledby="persistent-title">
        <div className="section-head">
          <h2 id="persistent-title" className="section-title">
            Recurring weak areas
          </h2>
          <p className="muted small">
            Across your last {recent.length} set{recent.length === 1 ? "" : "s"}: areas below{" "}
            {pctLabel(NEEDS_IMPROVEMENT_BELOW)} with at least 3 questions.
          </p>
        </div>
        {weakDomains.length === 0 && weakConcepts.length === 0 ? (
          <p className="success-note">Nothing is consistently below target. Nice work — try a harder level.</p>
        ) : (
          <div className="persistent-grid">
            <div>
              <h3 className="subsection-title">Domains</h3>
              {weakDomains.length === 0 ? (
                <p className="muted small">All domains are on track.</p>
              ) : (
                <ul className="persistent-list">
                  {weakDomains.map((w) => {
                    const name = domainName(Number(w.name));
                    return (
                      <li key={w.name}>
                        <div className="persistent-list__head">
                          <span>{name}</span>
                          <span className="muted small">
                            {w.correct}/{w.total} · {pctLabel(w.pct)}
                          </span>
                        </div>
                        <Meter value={w.pct} label={`${name}: ${pctLabel(w.pct)}`} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <h3 className="subsection-title">Concepts</h3>
              {weakConcepts.length === 0 ? (
                <p className="muted small">All concepts are on track.</p>
              ) : (
                <ul className="persistent-list">
                  {weakConcepts.map((w) => {
                    const cards = rankTheory(
                      bank.questions.filter((q) => q.concepts.includes(w.name)),
                      bank,
                    ).slice(0, 2);
                    return (
                      <li key={w.name}>
                        <div className="persistent-list__head">
                          <span>{w.name}</span>
                          <span className="muted small">
                            {w.correct}/{w.total} · {pctLabel(w.pct)}
                          </span>
                        </div>
                        <Meter value={w.pct} label={`${w.name}: ${pctLabel(w.pct)}`} />
                        {cards.length > 0 && (
                          <ul className="theory-btn-list theory-btn-list--compact">
                            {cards.map((id) => (
                              <li key={id}>
                                <TheoryButton cardId={id} onOpen={theory.open} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="attempts-title">
        <h2 id="attempts-title" className="section-title">
          All sets
        </h2>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Completed sets, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Level</th>
                <th scope="col">Score</th>
                <th scope="col">
                  <span className="sr-only">Report</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...attempts].reverse().map((a) => (
                <tr key={a.id}>
                  <th scope="row">{formatDate(a.finishedAt)}</th>
                  <td>
                    <span className={`chip chip--level chip--${a.level}`}>{LEVEL_INFO[a.level].label}</span>
                  </td>
                  <td>
                    {a.correct}/{a.total} · {pctLabel(a.total ? a.correct / a.total : 0)}
                  </td>
                  <td className="table__action">
                    <Link to={`/results/${a.id}`}>
                      View report<span className="sr-only"> for {formatDate(a.finishedAt)}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all history?"
        description={`This permanently deletes ${attempts.length} saved set${attempts.length === 1 ? "" : "s"} from this browser.`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                clearHistory();
                setAttempts([]);
                setConfirmClear(false);
              }}
            >
              Clear history
            </button>
          </>
        }
      >
        <p className="muted">Your set in progress (if any) is not affected.</p>
      </Dialog>

      {theory.dialog}
    </div>
  );
}

/** SVG line chart of score per attempt with the 70% target line. The table below is the text alternative. */
export function TrendChart({ attempts }: { attempts: Attempt[] }) {
  const w = 640;
  const h = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const scores = attempts.map((a) => (a.total ? a.correct / a.total : 0));
  const x = (i: number) => pad.left + (attempts.length === 1 ? innerW / 2 : (i / (attempts.length - 1)) * innerW);
  const y = (v: number) => pad.top + (1 - v) * innerH;
  const points = scores.map((s, i) => `${x(i)},${y(s)}`).join(" ");
  const first = scores[0] ?? 0;
  const last = scores[scores.length - 1] ?? 0;
  const summary =
    attempts.length === 1
      ? `One set so far, scoring ${pctLabel(last)}.`
      : `Scores over your last ${attempts.length} sets, from ${pctLabel(first)} to ${pctLabel(last)}. Target is ${pctLabel(NEEDS_IMPROVEMENT_BELOW)}.`;

  return (
    <figure className="trend">
      <svg viewBox={`0 0 ${w} ${h}`} className="trend__svg" role="img" aria-label={summary}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)} className="trend__grid" />
            <text x={pad.left - 8} y={y(v) + 4} className="trend__axis" textAnchor="end">
              {v * 100}%
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          x2={w - pad.right}
          y1={y(NEEDS_IMPROVEMENT_BELOW)}
          y2={y(NEEDS_IMPROVEMENT_BELOW)}
          className="trend__target"
        />
        <text x={w - pad.right} y={y(NEEDS_IMPROVEMENT_BELOW) - 6} className="trend__target-label" textAnchor="end">
          target {pctLabel(NEEDS_IMPROVEMENT_BELOW)}
        </text>
        {attempts.length > 1 && <polyline points={points} className="trend__line" fill="none" />}
        {scores.map((s, i) => (
          <circle key={attempts[i]?.id} cx={x(i)} cy={y(s)} r={5} className={`trend__dot trend__dot--${attempts[i]?.level}`}>
            <title>
              {`${formatDate(attempts[i]?.finishedAt ?? "")}: ${pctLabel(s)} (${LEVEL_INFO[attempts[i]?.level ?? "easy"].label})`}
            </title>
          </circle>
        ))}
      </svg>
      <figcaption className="trend__legend muted small">
        <span>
          <span className="level-dot level-dot--easy" aria-hidden="true" /> Easy
        </span>
        <span>
          <span className="level-dot level-dot--medium" aria-hidden="true" /> Medium
        </span>
        <span>
          <span className="level-dot level-dot--hard" aria-hidden="true" /> Hard
        </span>
        <span>Full details are in the table below.</span>
      </figcaption>
    </figure>
  );
}
