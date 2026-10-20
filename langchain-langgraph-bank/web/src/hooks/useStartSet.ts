import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBank } from "../data/BankProvider";
import { generateSet } from "../lib/generator";
import { newSeed } from "../lib/random";
import { createSession, loadHistory, loadSession, recentlySeenIds, saveSession } from "../lib/storage";
import type { Level } from "../types";

/**
 * Start a fresh set at `level`, avoiding recently seen questions. If a set is already in
 * progress, go to the home page instead so the user can resume or explicitly discard it.
 */
export function useStartSet() {
  const { bank } = useBank();
  const navigate = useNavigate();
  return useCallback(
    (level: Level) => {
      if (loadSession(bank.meta.hash)) {
        navigate("/");
        return;
      }
      const set = generateSet(bank, level, newSeed(), { seenIds: recentlySeenIds(loadHistory()) });
      saveSession(createSession(bank, set));
      navigate("/exam");
    },
    [bank, navigate],
  );
}
