import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Bank, Question } from "../types";

export type BankState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; bank: Bank };

interface BankContextValue {
  state: BankState;
  retry: () => void;
}

const BankContext = createContext<BankContextValue | null>(null);

export const BANK_URL = `${import.meta.env.BASE_URL}bank.json`;

function isBank(v: unknown): v is Bank {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Partial<Bank>;
  return (
    typeof b.meta?.hash === "string" &&
    Array.isArray(b.domains) &&
    Array.isArray(b.concepts) &&
    Array.isArray(b.questions) &&
    typeof b.theory === "object" &&
    b.theory !== null
  );
}

export async function fetchBank(url = BANK_URL, fetchImpl: typeof fetch = fetch): Promise<Bank> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Could not load the question bank (HTTP ${res.status}).`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("The question bank file is not valid JSON.");
  }
  if (!isBank(data)) throw new Error("The question bank file has an unexpected format.");
  return data;
}

interface ProviderProps {
  children: ReactNode;
  /** Inject a bank directly (tests, previews) instead of fetching. */
  bank?: Bank;
  loader?: () => Promise<Bank>;
}

export function BankProvider({ children, bank, loader = fetchBank }: ProviderProps) {
  const [state, setState] = useState<BankState>(bank ? { status: "ready", bank } : { status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (bank) return;
    let cancelled = false;
    loader()
      .then((b) => !cancelled && setState({ status: "ready", bank: b }))
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [bank, loader, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ state, retry }), [state, retry]);
  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBankState(): BankContextValue {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBankState must be used inside <BankProvider>");
  return ctx;
}

/** The loaded bank plus fast lookups. Only call below <BankGate>. */
export function useBank() {
  const { state } = useBankState();
  if (state.status !== "ready") throw new Error("useBank called before the bank finished loading");
  const bank = state.bank;
  return useMemo(() => {
    const questionsById = new Map<string, Question>(bank.questions.map((q) => [q.id, q]));
    const domainName = (id: number) => bank.domains.find((d) => d.id === id)?.name ?? `Domain ${id}`;
    return { bank, questionsById, domainName };
  }, [bank]);
}
