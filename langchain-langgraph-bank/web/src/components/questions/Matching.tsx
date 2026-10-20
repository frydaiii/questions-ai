import { useId, useState } from "react";
import type { MatchingQuestion } from "../../types";

interface MatchingProps {
  question: MatchingQuestion;
  value: Record<string, string> | undefined;
  onChange: (pairs: Record<string, string> | undefined) => void;
  /** Display order of right-column keys from the session layout. */
  rightOrder: string[];
  labelledBy: string;
  describedBy?: string;
}

/**
 * Each left item gets a native <select> of numbered right-hand descriptions. A description
 * can be used once: picking one that is already used moves it (and says so).
 */
export function Matching({ question, value, onChange, rightOrder, labelledBy, describedBy }: MatchingProps) {
  const pairs = value ?? {};
  const baseId = useId();
  const [announcement, setAnnouncement] = useState("");
  const rightByKey = new Map(question.matching.right.map((r) => [r.key, r]));
  const right = rightOrder.flatMap((k) => rightByKey.get(k) ?? []);
  const number = new Map(right.map((r, i) => [r.key, i + 1]));
  const usedBy = new Map(Object.entries(pairs).map(([l, r]) => [r, l]));
  const leftText = new Map(question.matching.left.map((l) => [l.key, l.text]));

  const choose = (leftKey: string, rightKey: string) => {
    const next = { ...pairs };
    if (!rightKey) {
      delete next[leftKey];
      setAnnouncement("");
    } else {
      const previousOwner = usedBy.get(rightKey);
      if (previousOwner && previousOwner !== leftKey) {
        delete next[previousOwner];
        setAnnouncement(
          `Description ${number.get(rightKey)} moved from “${leftText.get(previousOwner)}” to “${leftText.get(leftKey)}”.`,
        );
      } else {
        setAnnouncement("");
      }
      next[leftKey] = rightKey;
    }
    onChange(Object.keys(next).length ? next : undefined);
  };

  const matched = question.matching.left.filter((l) => pairs[l.key]).length;

  return (
    <div className="matching" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <div className="match-bank">
        <h3 className="match-bank__title">Descriptions</h3>
        <ol className="match-bank__list">
          {right.map((r, i) => {
            const owner = usedBy.get(r.key);
            return (
              <li key={r.key} className={`match-bank__item${owner ? " is-used" : ""}`}>
                <span className="match-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  {r.text}
                  {owner && <span className="match-bank__owner"> — matched to {leftText.get(owner)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <ul className="match-list">
        {question.matching.left.map((l) => {
          const selectId = `${baseId}-${l.key}`;
          const current = pairs[l.key] ?? "";
          return (
            <li key={l.key} className={`match-row${current ? " is-matched" : ""}`}>
              <label htmlFor={selectId} className="match-row__label">
                {l.text}
              </label>
              <select
                id={selectId}
                className="select"
                value={current}
                onChange={(e) => choose(l.key, e.target.value)}
              >
                <option value="">Choose a description…</option>
                {right.map((r, i) => {
                  const owner = usedBy.get(r.key);
                  const note = owner && owner !== l.key ? ` (used for ${leftText.get(owner)})` : "";
                  return (
                    <option key={r.key} value={r.key}>
                      {i + 1}. {r.text}
                      {note}
                    </option>
                  );
                })}
              </select>
            </li>
          );
        })}
      </ul>
      <p className="muted small">
        {matched} of {question.matching.left.length} matched
      </p>
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
