import type { Level, QuestionType } from "../types";

export const LEVEL_INFO: Record<Level, { label: string; blurb: string }> = {
  easy: { label: "Easy", blurb: "Core definitions and recognizing the right concept. A good first pass." },
  medium: { label: "Medium", blurb: "Apply concepts to realistic agent-design scenarios and trade-offs." },
  hard: { label: "Hard", blurb: "Subtle failure modes, competing constraints, and multi-step reasoning." },
};

export const FORMAT_LABEL: Record<QuestionType, string> = {
  single_choice: "Single choice",
  multi_response: "Multiple response",
  ordering: "Ordering",
  matching: "Matching",
};

export function formatHint(type: QuestionType, selectCount: number): string {
  switch (type) {
    case "single_choice":
      return "Choose one answer";
    case "multi_response":
      return `Choose ${selectCount} answers`;
    case "ordering":
      return "Put the items in the correct order";
    case "matching":
      return "Match each item to its description";
  }
}

export const pctLabel = (p: number) => `${Math.round(p * 100)}%`;

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDuration(startIso: string, endIso: string): string | undefined {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}
