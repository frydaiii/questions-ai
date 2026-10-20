import type { TheoryCard } from "../types";
import { ExternalIcon } from "./Icons";

export function referenceLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

export function ReferenceLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="ref-link">
      <span className="ref-link__text">{referenceLabel(url)}</span>
      <ExternalIcon size={14} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Full theory card content (used inside the theory dialog). */
export function TheoryCardView({ card, domainName }: { card: TheoryCard; domainName: string }) {
  return (
    <div className="theory">
      <p className="theory__meta muted small">
        {card.id} · Domain {card.domain}: {domainName}
        {card.task_statements.length > 0 && <> · Task {card.task_statements.join(", ")}</>}
      </p>
      <p className="theory__summary">{card.summary}</p>

      {card.key_points.length > 0 && (
        <section className="theory__section">
          <h3>Key points</h3>
          <ul className="bullets">
            {card.key_points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="callout callout--tip"><p className="callout__label">Rule of thumb</p>
      <p>{card.rule_of_thumb}</p></div>

      {card.common_confusions.length > 0 && (
        <section className="theory__section">
          <h3>Common confusions</h3>
          <ul className="bullets bullets--warn">
            {card.common_confusions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {card.related_tech && card.related_tech.length > 0 && (
        <section className="theory__section">
          <h3>Related ideas</h3>
          <ul className="chip-list">
            {card.related_tech.map((t) => (
              <li key={t} className="chip chip--outline">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="theory__section">
        <h3>References</h3>
        <ul className="ref-list">
          {card.references.map((url) => (
            <li key={url}>
              <ReferenceLink url={url} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
