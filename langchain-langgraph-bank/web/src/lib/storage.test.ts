import { describe, expect, it, vi } from "vitest";
import {
  addAttempt,
  clearHistory,
  clearSession,
  createSession,
  finalizeSession,
  getAttempt,
  HISTORY_CAP,
  KEYS,
  loadHistory,
  loadSession,
  recentlySeenIds,
  saveSession,
  type Attempt,
} from "./storage";
import { generateSet } from "./generator";
import { makeBank, matching, multi, ordering, single } from "../test/fixtures";

const bank = makeBank(8);

function attempt(i: number, overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: `a${i}`,
    startedAt: "2026-10-01T10:00:00.000Z",
    finishedAt: `2026-10-01T10:${String(i % 60).padStart(2, "0")}:00.000Z`,
    level: "easy",
    seed: i,
    bankHash: "testhash",
    questionIds: [`Q${i}`],
    answers: {},
    flags: [],
    correct: 1,
    total: 2,
    domains: { "1": [1, 2] },
    concepts: { Memory: [1, 2] },
    ...overrides,
  };
}

describe("session storage", () => {
  it("round-trips a session", () => {
    const s = createSession(bank, generateSet(bank, "medium", 3));
    s.answers[s.questionIds[0] as string] = ["A"];
    s.current = 4;
    saveSession(s);
    expect(loadSession(bank.meta.hash)).toEqual(s);
    clearSession();
    expect(loadSession(bank.meta.hash)).toBeNull();
  });

  it("invalidates a session saved against a different bank", () => {
    saveSession(createSession(bank, generateSet(bank, "easy", 3)));
    expect(loadSession("other-hash")).toBeNull();
  });

  it("ignores corrupt or wrongly shaped sessions and clamps the current index", () => {
    localStorage.setItem(KEYS.session, "{not json");
    expect(loadSession(bank.meta.hash)).toBeNull();
    localStorage.setItem(KEYS.session, JSON.stringify({ version: 1, bankHash: bank.meta.hash }));
    expect(loadSession(bank.meta.hash)).toBeNull();

    const s = createSession(bank, generateSet(bank, "easy", 3));
    saveSession({ ...s, current: 500 });
    expect(loadSession(bank.meta.hash)?.current).toBe(29);
  });

  it("survives storage that throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadSession(bank.meta.hash)).toBeNull();
    expect(loadHistory()).toEqual([]);
    expect(saveSession(createSession(bank, generateSet(bank, "easy", 1)))).toBe(false);
    spy.mockRestore();
    set.mockRestore();
  });
});

describe("history storage", () => {
  it("saves and loads attempts in order", () => {
    addAttempt(attempt(1));
    addAttempt(attempt(2));
    expect(loadHistory().map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(getAttempt("a2")?.seed).toBe(2);
    expect(JSON.parse(localStorage.getItem(KEYS.history) ?? "{}").version).toBe(1);
  });

  it("replaces an attempt with the same id instead of duplicating it", () => {
    addAttempt(attempt(1));
    addAttempt(attempt(1, { correct: 2 }));
    expect(loadHistory()).toHaveLength(1);
    expect(loadHistory()[0]?.correct).toBe(2);
  });

  it(`caps history at ${HISTORY_CAP} attempts, dropping the oldest`, () => {
    for (let i = 0; i < HISTORY_CAP + 7; i++) addAttempt(attempt(i));
    const h = loadHistory();
    expect(h).toHaveLength(HISTORY_CAP);
    expect(h[0]?.id).toBe("a7");
  });

  it("migrates a legacy bare-array history and fills missing fields", () => {
    const legacy = { ...attempt(5) } as Partial<Attempt>;
    delete legacy.flags;
    delete legacy.startedAt;
    delete legacy.bankHash;
    localStorage.setItem(KEYS.history, JSON.stringify([legacy]));
    const [a] = loadHistory();
    expect(a?.flags).toEqual([]);
    expect(a?.startedAt).toBe(a?.finishedAt);
    expect(a?.bankHash).toBe("");
    // Saving rewrites it in the versioned format.
    addAttempt(attempt(6));
    expect(JSON.parse(localStorage.getItem(KEYS.history) ?? "{}").attempts).toHaveLength(2);
  });

  it("recovers from corrupt data and drops malformed records", () => {
    localStorage.setItem(KEYS.history, "]]]");
    expect(loadHistory()).toEqual([]);
    localStorage.setItem(
      KEYS.history,
      JSON.stringify({ version: 1, attempts: [attempt(1), { id: 3 }, null, attempt(2, { level: "insane" as never })] }),
    );
    expect(loadHistory().map((a) => a.id)).toEqual(["a1"]);
  });

  it("ignores history written by a newer, unknown version", () => {
    localStorage.setItem(KEYS.history, JSON.stringify({ version: 99, attempts: [attempt(1)] }));
    expect(loadHistory()).toEqual([]);
  });

  it("clears history", () => {
    addAttempt(attempt(1));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it("collects question ids from recent attempts", () => {
    for (let i = 0; i < 8; i++) addAttempt(attempt(i));
    expect([...recentlySeenIds(loadHistory(), 3)].sort()).toEqual(["Q5", "Q6", "Q7"]);
  });
});

describe("finalizeSession", () => {
  it("grades every format and records per-domain and per-concept tallies", () => {
    const qs = [
      single({ domain: 1, concepts: ["Memory"] }),
      multi({ domain: 2, concepts: ["Memory", "Planning"] }),
      ordering({ domain: 2, concepts: ["Planning"] }),
      matching({ domain: 3, concepts: ["Agent"] }),
    ];
    const b = makeBank(0, qs);
    const s = createSession(b, { level: "easy", seed: 9, questionIds: qs.map((q) => q.id), layout: {} });
    s.answers = {
      [qs[0]!.id]: ["B"], // correct
      [qs[1]!.id]: ["A"], // partial -> wrong
      [qs[2]!.id]: ["A", "B", "C"], // correct
      // matching unanswered -> wrong
    };
    s.flags = [qs[3]!.id];
    const a = finalizeSession(b, s, new Date("2026-10-19T09:00:00Z"));
    expect(a).toMatchObject({ correct: 2, total: 4, level: "easy", flags: [qs[3]!.id] });
    expect(a.domains).toEqual({ "1": [1, 1], "2": [1, 2], "3": [0, 1] });
    expect(a.concepts).toEqual({ Memory: [1, 2], Planning: [1, 2], Agent: [0, 1] });
    expect(a.finishedAt).toBe("2026-10-19T09:00:00.000Z");
  });
});
