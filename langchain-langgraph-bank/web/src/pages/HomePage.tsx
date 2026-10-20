import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { generateSet, PER_DOMAIN, SET_SIZE } from "../lib/generator";
import { newSeed } from "../lib/random";
import {
  clearSession,
  createSession,
  loadHistory,
  loadSession,
  recentlySeenIds,
  saveSession,
  type SessionState,
} from "../lib/storage";
import { formatDate, LEVEL_INFO, pctLabel } from "../lib/format";
import { answerStatus } from "../lib/grader";
import { LEVELS, type Level } from "../types";
import { Dialog } from "../components/Dialog";
import { ArrowRightIcon } from "../components/Icons";

export function HomePage() {
  usePageTitle(undefined);
  const { bank, questionsById } = useBank();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(() => loadSession(bank.meta.hash));
  const history = useMemo(() => loadHistory(), []);
  const lastAttempt = history[history.length - 1];
  const [level, setLevel] = useState<Level>(() => session?.level ?? lastAttempt?.level ?? "easy");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Level, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of bank.questions) c[q.difficulty]++;
    return c;
  }, [bank]);

  const sessionProgress = useMemo(() => {
    if (!session) return 0;
    return session.questionIds.filter((id) => {
      const q = questionsById.get(id);
      return q && answerStatus(q, session.answers[id]) === "complete";
    }).length;
  }, [session, questionsById]);

  const start = () => {
    const set = generateSet(bank, level, newSeed(), { seenIds: recentlySeenIds(history) });
    saveSession(createSession(bank, set));
    navigate("/exam");
  };

  const onStart = () => (session ? setConfirmReplace(true) : start());

  const discard = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="page page--home">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">AI agent theory · {bank.questions.length} questions</p>
        <h1 id="hero-title" className="hero__title">
          Practice the ideas behind <span className="text-gradient">AI agents</span>
        </h1>
        <p className="hero__lead">
          Take a {SET_SIZE}-question set, then see exactly where you stand: scores by domain, the concepts that need
          work, and the theory card and sources behind every question.
        </p>
      </section>

      {session && (
        <section className="resume-card" aria-labelledby="resume-title">
          <div>
            <h2 id="resume-title" className="resume-card__title">
              You have a set in progress
            </h2>
            <p className="muted">
              {LEVEL_INFO[session.level].label} · {sessionProgress} of {session.questionIds.length} answered · started{" "}
              {formatDate(session.startedAt)}
            </p>
          </div>
          <div className="resume-card__actions">
            <button type="button" className="btn btn--ghost" onClick={discard}>
              Discard
            </button>
            <Link to="/exam" className="btn btn--primary">
              Resume set <ArrowRightIcon size={18} />
            </Link>
          </div>
        </section>
      )}

      <section className="panel start-panel" aria-labelledby="start-title">
        <h2 id="start-title" className="section-title">
          Start a new set
        </h2>
        <fieldset className="level-picker">
          <legend className="level-picker__legend">Choose a level</legend>
          <div className="level-picker__options">
            {LEVELS.map((l) => (
              <label key={l} className={`level-card level-card--${l}`}>
                <input
                  type="radio"
                  name="level"
                  value={l}
                  checked={level === l}
                  onChange={() => setLevel(l)}
                  className="level-card__input"
                />
                <span className="level-card__body">
                  <span className="level-card__head">
                    <span className={`level-dot level-dot--${l}`} aria-hidden="true" />
                    <span className="level-card__label">{LEVEL_INFO[l].label}</span>
                    <span className="level-card__count">{counts[l]} questions</span>
                  </span>
                  <span className="level-card__blurb">{LEVEL_INFO[l].blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <ul className="facts" aria-label="About each set">
          <li>
            <strong>{SET_SIZE}</strong> questions
          </li>
          <li>
            <strong>{PER_DOMAIN}</strong> from each of {bank.domains.length} domains
          </li>
          <li>
            <strong>4</strong> question formats
          </li>
          <li>
            <strong>No</strong> timer
          </li>
        </ul>

        <div className="start-panel__cta">
          <button type="button" className="btn btn--primary btn--lg" onClick={onStart}>
            Start {SET_SIZE}-question set <ArrowRightIcon size={18} />
          </button>
          {lastAttempt && (
            <p className="muted small">
              Last set: {LEVEL_INFO[lastAttempt.level].label}, {pctLabel(lastAttempt.correct / (lastAttempt.total || 1))}{" "}
              · <Link to={`/results/${lastAttempt.id}`}>view report</Link> · <Link to="/history">all history</Link>
            </p>
          )}
        </div>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          How it works
        </h2>
        <ol className="how__steps">
          <li>
            <span className="how__num" aria-hidden="true">1</span>
            <div>
              <h3>Answer at your own pace</h3>
              <p className="muted">Move freely between questions, flag the ones you’re unsure of, and submit when ready.</p>
            </div>
          </li>
          <li>
            <span className="how__num" aria-hidden="true">2</span>
            <div>
              <h3>See your weak areas</h3>
              <p className="muted">
                Domains under 70% and the weakest concepts are flagged “needs improvement”, with what to study next.
              </p>
            </div>
          </li>
          <li>
            <span className="how__num" aria-hidden="true">3</span>
            <div>
              <h3>Learn from every question</h3>
              <p className="muted">Review explanations, open the theory card behind each question, and follow its sources.</p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title" className="section-title">
          What’s covered
        </h2>
        <ul className="domain-grid">
          {bank.domains.map((d) => (
            <li key={d.id} className="domain-tile">
              <span className="domain-tile__id">Domain {d.id}</span>
              <span className="domain-tile__name">{d.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="Replace your set in progress?"
        description="Starting a new set discards the answers in your current set. This can’t be undone."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmReplace(false)}>
              Keep current set
            </button>
            <button type="button" className="btn btn--danger" onClick={start}>
              Discard and start new
            </button>
          </>
        }
      >
        <p className="muted">
          Current set: {session && LEVEL_INFO[session.level].label}, {sessionProgress} answered. New set:{" "}
          {LEVEL_INFO[level].label}.
        </p>
      </Dialog>
    </div>
  );
}
