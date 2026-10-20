import { useEffect, useRef, useState } from "react";
import type { ChoiceQuestion } from "../../types";
import { ChevronDownIcon, ChevronUpIcon, GripIcon } from "../Icons";

interface OrderingProps {
  question: ChoiceQuestion;
  value: string[] | undefined;
  onChange: (order: string[]) => void;
  /** Initial scrambled order from the session layout. */
  initialOrder: string[];
  labelledBy: string;
  describedBy?: string;
}

type PendingFocus = { key: string; dir: "up" | "down" } | null;

/**
 * Reorderable list. Keyboard/screen-reader users use the Move up/Move down buttons
 * (moves are announced via a live region); mouse users can also drag items.
 */
export function Ordering({ question, value, onChange, initialOrder, labelledBy, describedBy }: OrderingProps) {
  const order = value ?? initialOrder;
  const textOf = new Map(question.options.map((o) => [o.key, o.text]));
  const [announcement, setAnnouncement] = useState("");
  const [pendingFocus, setPendingFocus] = useState<PendingFocus>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());

  useEffect(() => {
    if (!pendingFocus) return;
    const { key, dir } = pendingFocus;
    const preferred = buttons.current.get(`${key}-${dir}`);
    const fallback = buttons.current.get(`${key}-${dir === "up" ? "down" : "up"}`);
    (preferred && !preferred.disabled ? preferred : fallback)?.focus();
  }, [pendingFocus, order]);

  const move = (from: number, to: number, focus?: PendingFocus) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as string);
    onChange(next);
    const text = textOf.get(item as string) ?? "";
    setAnnouncement(`Moved “${text}” to position ${to + 1} of ${order.length}.`);
    if (focus) setPendingFocus(focus);
  };

  const onDrop = (index: number) => {
    if (dragKey === null) return;
    const from = order.indexOf(dragKey);
    const to = from < index ? index - 1 : index;
    move(from, to);
    setDragKey(null);
    setDropIndex(null);
  };

  return (
    <div className="ordering" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <ol className="order-list">
        {order.map((key, i) => {
          const text = textOf.get(key) ?? key;
          return (
            <li
              key={key}
              className={`order-item${dragKey === key ? " is-dragging" : ""}${dropIndex === i ? " is-drop-target" : ""}`}
              draggable
              onDragStart={(e) => {
                setDragKey(key);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndex(e.clientY > rect.top + rect.height / 2 ? i + 1 : i);
              }}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(dropIndex ?? i);
              }}
              onDragEnd={() => {
                setDragKey(null);
                setDropIndex(null);
              }}
            >
              <span className="order-item__grip" aria-hidden="true">
                <GripIcon size={16} />
              </span>
              <span className="order-item__pos" aria-hidden="true">
                {i + 1}
              </span>
              <span className="order-item__text">{text}</span>
              <span className="order-item__controls">
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  ref={(el) => {
                    buttons.current.set(`${key}-up`, el);
                  }}
                  onClick={() => move(i, i - 1, { key, dir: "up" })}
                  disabled={i === 0}
                  aria-label={`Move “${text}” up (position ${i + 1} of ${order.length})`}
                >
                  <ChevronUpIcon size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  ref={(el) => {
                    buttons.current.set(`${key}-down`, el);
                  }}
                  onClick={() => move(i, i + 1, { key, dir: "down" })}
                  disabled={i === order.length - 1}
                  aria-label={`Move “${text}” down (position ${i + 1} of ${order.length})`}
                >
                  <ChevronDownIcon size={18} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {value === undefined ? (
        <div className="ordering__confirm">
          <p className="muted small">Not answered yet. Reorder the items, or keep this order if you think it’s right.</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange(order.slice())}>
            Keep this order
          </button>
        </div>
      ) : (
        <p className="muted small ordering__saved">Order saved. You can keep adjusting it.</p>
      )}
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
