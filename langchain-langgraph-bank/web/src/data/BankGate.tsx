import type { ReactNode } from "react";
import { useBankState } from "./BankProvider";

/** Renders children once the bank is loaded; shows loading and error states otherwise. */
export function BankGate({ children }: { children: ReactNode }) {
  const { state, retry } = useBankState();

  if (state.status === "loading") {
    return (
      <div className="state-panel" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Loading questions…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="state-panel" role="alert">
        <h1 className="state-panel__title">Couldn’t load the question bank</h1>
        <p className="muted">{state.error}</p>
        <button type="button" className="btn btn--primary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
