import type { ChoiceQuestion } from "../../types";

/**
 * Apply a click/keypress on option `key` to the current selection.
 * Single choice replaces; multiple response toggles and respects select_count.
 * Returns the unchanged selection when the cap blocks a new pick.
 */
export function toggleChoice(question: ChoiceQuestion, selected: string[], key: string): string[] | undefined {
  if (question.type !== "multi_response") return [key];
  if (selected.includes(key)) {
    const next = selected.filter((k) => k !== key);
    return next.length ? next : undefined;
  }
  if (selected.length >= question.select_count) return selected;
  // Keep keys in option order so the stored answer is stable.
  return question.options.map((o) => o.key).filter((k) => k === key || selected.includes(k));
}
