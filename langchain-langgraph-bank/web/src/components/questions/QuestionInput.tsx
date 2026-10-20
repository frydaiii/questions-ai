import type { Answer, Question } from "../../types";
import { ChoiceList } from "./ChoiceList";
import { Matching } from "./Matching";
import { Ordering } from "./Ordering";

interface QuestionInputProps {
  question: Question;
  value: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
  /** Session layout for ordering (initial order) and matching (right column order). */
  layout?: string[];
  labelledBy: string;
  describedBy?: string;
}

/** Renders the right controlled input for a question's format. */
export function QuestionInput({ question, value, onChange, layout, labelledBy, describedBy }: QuestionInputProps) {
  const list = Array.isArray(value) ? value : undefined;
  const pairs = value && !Array.isArray(value) ? value : undefined;

  switch (question.type) {
    case "single_choice":
    case "multi_response":
      return (
        <ChoiceList
          question={question}
          value={list}
          onChange={onChange}
          labelledBy={labelledBy}
          describedBy={describedBy}
        />
      );
    case "ordering":
      return (
        <Ordering
          question={question}
          value={list}
          onChange={onChange}
          initialOrder={layout ?? question.options.map((o) => o.key)}
          labelledBy={labelledBy}
          describedBy={describedBy}
        />
      );
    case "matching":
      return (
        <Matching
          question={question}
          value={pairs}
          onChange={onChange}
          rightOrder={layout ?? question.matching.right.map((r) => r.key)}
          labelledBy={labelledBy}
          describedBy={describedBy}
        />
      );
  }
}
