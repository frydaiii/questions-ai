import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { sessionReducer, type SessionAction } from "../lib/session";
import type { SessionState } from "../lib/storage";
import {
  addAttempt,
  clearSession,
  finalizeSession,
  loadSession,
  saveSession,
} from "../lib/storage";
import { answerStatus } from "../lib/grader";
import { LEVEL_INFO } from "../lib/format";
import { QuestionCard } from "../components/questions/QuestionCard";
import { toggleChoice } from "../components/questions/choice";
import { Navigator } from "../components/exam/Navigator";
import { SubmitDialog } from "../components/exam/SubmitDialog";
import { Dialog } from "../components/Dialog";
import { ArrowLeftIcon, ArrowRightIcon, FlagIcon, GridIcon } from "../components/Icons";

export function ExamPage() {
  const { bank } = useBank();
  const [initial] = useState(() => loadSession(bank.meta.hash));

  if (!initial) {
    return <NoSession />;
  }
  return <ExamSession initial={initial} />;
}

function NoSession() {
  usePageTitle("No set in progress");
  return (
    <div className="page empty-state">
      <h1 className="page-title">No set in progress</h1>
      <p className="muted">Pick a level on the practice page to start a new 30-question set.</p>
      <Link to="/" className="btn btn--primary">
        Choose a level
      </Link>
    </div>
  );
}

const TEXT_ENTRY = new Set(["SELECT", "TEXTAREA"]);

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (TEXT_ENTRY.has(el.tagName) || el.isContentEditable) return true;
  if (el instanceof HTMLInputElement) return !["radio", "checkbox", "button"].includes(el.type);
  return false;
}

function ExamSession({ initial }: { initial: SessionState }) {
  const { bank, questionsById, domainName } = useBank();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(sessionReducer, initial);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /** Navigate, optionally moving focus to the new question's heading (navigator, submit dialog). */
  const go = useCallback((action: SessionAction, focusCard = false) => {
    dispatch(action);
    if (focusCard) {
      requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>("h2")?.focus());
    }
  }, []);

  const questions = useMemo(
    () => state.questionIds.flatMap((id) => questionsById.get(id) ?? []),
    [state.questionIds, questionsById],
  );
  const total = questions.length;
  const current = Math.min(state.current, Math.max(0, total - 1));
  const question = questions[current];
  const answeredCount = questions.filter((q) => answerStatus(q, state.answers[q.id]) === "complete").length;

  usePageTitle(total ? `Question ${current + 1} of ${total}` : "No set in progress");

  // Persist on every change so a reload resumes exactly here.
  useEffect(() => {
    saveSession(state);
  }, [state]);

  const submit = () => {
    const attempt = finalizeSession(bank, { ...state, questionIds: questions.map((q) => q.id) });
    addAttempt(attempt);
    clearSession();
    navigate(`/results/${attempt.id}`, { replace: true });
  };

  // Keyboard shortcuts: A–E / 1–5 choose, ←/→ move, F flag.
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      if (submitOpen || drawerOpen || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const target = e.target as HTMLElement | null;
      const inChoiceInput = target instanceof HTMLInputElement;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (inChoiceInput) return; // native radio-group arrow navigation wins
        e.preventDefault();
        dispatch({ type: e.key === "ArrowLeft" ? "prev" : "next" });
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        dispatch({ type: "toggleFlag", id: question.id });
        return;
      }
      if (question.type === "single_choice" || question.type === "multi_response") {
        const k = e.key.toUpperCase();
        const byLetter = question.options.find((o) => o.key === k);
        const byNumber = /^[1-9]$/.test(e.key) ? question.options[Number(e.key) - 1] : undefined;
        const option = byLetter ?? byNumber;
        if (!option) return;
        e.preventDefault();
        const selected = (state.answers[question.id] as string[] | undefined) ?? [];
        dispatch({ type: "answer", id: question.id, answer: toggleChoice(question, selected, option.key) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, state.answers, submitOpen, drawerOpen]);

  if (!question) return <NoSession />;

  const flagged = state.flags.includes(question.id);
  const isLast = current === total - 1;
  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

  const navigator = (
    <Navigator
      questions={questions}
      answers={state.answers}
      flags={state.flags}
      current={current}
      onSelect={(i) => {
        setDrawerOpen(false);
        go({ type: "goto", index: i }, true);
      }}
    />
  );

  return (
    <div className="exam">
      <div className="exam__topbar">
        <div className="exam__topbar-inner">
          <div className="exam__status">
            <span className={`chip chip--level chip--${state.level}`}>{LEVEL_INFO[state.level].label}</span>
            <span className="exam__progress-label">
              <strong>{answeredCount}</strong>/{total} answered
            </span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answeredCount}
            aria-valuetext={`${answeredCount} of ${total} answered`}
          >
            <span className="progress__bar" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="exam__topbar-actions">
            <button type="button" className="btn btn--ghost btn--sm exam__drawer-btn" onClick={() => setDrawerOpen(true)}>
              <GridIcon size={18} /> Questions
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setSubmitOpen(true)}>
              Submit
            </button>
          </div>
        </div>
      </div>

      <div className="exam__body">
        <div className="exam__main" ref={cardRef}>
          <QuestionCard
            key={question.id}
            question={question}
            value={state.answers[question.id]}
            onChange={(answer) => dispatch({ type: "answer", id: question.id, answer })}
            layout={state.layout[question.id]}
            domainName={domainName(question.domain)}
            heading={`Question ${current + 1} of ${total}`}
            headerAside={
              <button
                type="button"
                className={`flag-btn${flagged ? " is-on" : ""}`}
                aria-pressed={flagged}
                onClick={() => dispatch({ type: "toggleFlag", id: question.id })}
              >
                <FlagIcon size={16} /> {flagged ? "Flagged" : "Flag for review"}
              </button>
            }
          />

          <div className="exam__pager">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => dispatch({ type: "prev" })}
              disabled={current === 0}
            >
              <ArrowLeftIcon size={18} /> Previous
            </button>
            {isLast ? (
              <button type="button" className="btn btn--primary" onClick={() => setSubmitOpen(true)}>
                Review &amp; submit
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "next" })}>
                Next <ArrowRightIcon size={18} />
              </button>
            )}
          </div>
          <p className="shortcuts muted small">
            Shortcuts: <kbd>A</kbd>–<kbd>E</kbd> or <kbd>1</kbd>–<kbd>5</kbd> choose · <kbd>←</kbd> <kbd>→</kbd> move ·{" "}
            <kbd>F</kbd> flag
          </p>
        </div>

        <aside className="exam__side" aria-label="Question navigator">
          {navigator}
        </aside>
      </div>

      <div className="sr-only" aria-live="polite">
        {`Question ${current + 1} of ${total}`}
      </div>

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Questions" variant="side" size="sm">
        {navigator}
      </Dialog>

      <SubmitDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmit={submit}
        onGoTo={(i) => {
          setSubmitOpen(false);
          go({ type: "goto", index: i }, true);
        }}
        questions={questions}
        answers={state.answers}
        flags={state.flags}
      />
    </div>
  );
}
