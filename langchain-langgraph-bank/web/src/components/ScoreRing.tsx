import { NEEDS_IMPROVEMENT_BELOW } from "../lib/analytics";

interface ScoreRingProps {
  correct: number;
  total: number;
  size?: number;
}

/** Circular score indicator. The number and label carry the meaning; color is secondary. */
export function ScoreRing({ correct, total, size = 168 }: ScoreRingProps) {
  const pct = total ? correct / total : 0;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = pct >= NEEDS_IMPROVEMENT_BELOW ? "good" : pct >= 0.5 ? "mid" : "low";
  return (
    <div className={`score-ring score-ring--${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle className="score-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="score-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring__label">
        <span className="score-ring__pct">{Math.round(pct * 100)}%</span>
        <span className="score-ring__sub">
          {correct} / {total} correct
        </span>
      </div>
    </div>
  );
}

/** Horizontal bar with a marker at the improvement threshold. */
export function Meter({ value, label }: { value: number; label: string }) {
  const tone = value >= NEEDS_IMPROVEMENT_BELOW ? "good" : value >= 0.5 ? "mid" : "low";
  return (
    <div
      className={`meter meter--${tone}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <span className="meter__bar" style={{ width: `${Math.max(2, value * 100)}%` }} />
      <span className="meter__threshold" style={{ left: `${NEEDS_IMPROVEMENT_BELOW * 100}%` }} aria-hidden="true" />
    </div>
  );
}
