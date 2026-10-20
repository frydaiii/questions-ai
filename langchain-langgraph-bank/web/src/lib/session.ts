import type { Answer } from "../types";
import type { SessionState } from "./storage";

export type SessionAction =
  | { type: "answer"; id: string; answer: Answer | undefined }
  | { type: "toggleFlag"; id: string }
  | { type: "goto"; index: number }
  | { type: "next" }
  | { type: "prev" };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const last = state.questionIds.length - 1;
  switch (action.type) {
    case "answer": {
      const answers = { ...state.answers };
      if (action.answer === undefined) delete answers[action.id];
      else answers[action.id] = action.answer;
      return { ...state, answers };
    }
    case "toggleFlag": {
      const flags = state.flags.includes(action.id)
        ? state.flags.filter((f) => f !== action.id)
        : [...state.flags, action.id];
      return { ...state, flags };
    }
    case "goto":
      return { ...state, current: Math.min(last, Math.max(0, action.index)) };
    case "next":
      return { ...state, current: Math.min(last, state.current + 1) };
    case "prev":
      return { ...state, current: Math.max(0, state.current - 1) };
  }
}
