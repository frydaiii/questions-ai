import type { ChoiceQuestion } from "../../types";
import { CheckIcon } from "../Icons";
import { toggleChoice } from "./choice";

interface ChoiceListProps {
  question: ChoiceQuestion;
  value: string[] | undefined;
  onChange: (keys: string[] | undefined) => void;
  /** id of the element containing the stem, used to label the group. */
  labelledBy: string;
  describedBy?: string;
}

/** Single choice (radio cards) and multiple response (checkbox cards, capped at select_count). */
export function ChoiceList({ question, value, onChange, labelledBy, describedBy }: ChoiceListProps) {
  const multiple = question.type === "multi_response";
  const selected = value ?? [];
  const atCap = multiple && selected.length >= question.select_count;
  const name = `q-${question.id}`;
  const statusId = `${name}-status`;

  const toggle = (key: string) => onChange(toggleChoice(question, selected, key));

  return (
    <fieldset
      className="choices"
      aria-labelledby={labelledBy}
      aria-describedby={[describedBy, multiple ? statusId : undefined].filter(Boolean).join(" ") || undefined}
    >
      {question.options.map((o) => {
        const checked = selected.includes(o.key);
        const disabled = multiple && atCap && !checked;
        return (
          <label
            key={o.key}
            className={`choice${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}${multiple ? " choice--multi" : ""}`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.key}
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(o.key)}
              className="choice__input"
            />
            <span className="choice__key" aria-hidden="true">
              {checked && multiple ? <CheckIcon size={16} /> : o.key}
            </span>
            <span className="choice__text">
              <span className="sr-only">{o.key}. </span>
              {o.text}
            </span>
          </label>
        );
      })}
      {multiple && (
        <p id={statusId} className={`choices__status${atCap ? " is-full" : ""}`} aria-live="polite">
          {selected.length} of {question.select_count} selected
          {atCap ? " — deselect one to change your choice." : "."}
        </p>
      )}
    </fieldset>
  );
}
