import type { Answer, Answers, Bank, Level } from "../types";
import { LEVELS } from "../types";
import type { GeneratedSet } from "./generator";
import { gradeAll, summarizeTallies } from "./analytics";

/** localStorage keys. Bump a key's suffix only if its format changes incompatibly. */
export const KEYS = {
  session: "atp.session",
  history: "atp.history",
  theme: "atp.theme",
} as const;

export const HISTORY_VERSION = 1;
export const SESSION_VERSION = 1;
export const HISTORY_CAP = 50;
/** Questions from this many recent attempts count as "recently seen" for set generation. */
export const RECENT_ATTEMPTS_FOR_SEEN = 5;

// ---------------------------------------------------------------------------
// Safe localStorage access (private mode, quota, or disabled storage must not crash)

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isLevel = (v: unknown): v is Level => typeof v === "string" && (LEVELS as readonly string[]).includes(v);
const isTallyMap = (v: unknown): v is Record<string, [number, number]> =>
  isObject(v) &&
  Object.values(v).every((t) => Array.isArray(t) && t.length === 2 && t.every((n) => typeof n === "number"));
const isAnswer = (v: unknown): v is Answer =>
  isStringArray(v) || (isObject(v) && Object.values(v).every((x) => typeof x === "string"));
const isAnswers = (v: unknown): v is Answers =>
  isObject(v) && Object.values(v).every((a) => a === undefined || isAnswer(a));

// ---------------------------------------------------------------------------
// In-progress session

export interface SessionState {
  version: number;
  bankHash: string;
  level: Level;
  seed: number;
  questionIds: string[];
  layout: Record<string, string[]>;
  answers: Answers;
  flags: string[];
  current: number;
  startedAt: string;
}

export function createSession(bank: Bank, set: GeneratedSet, now = new Date()): SessionState {
  return {
    version: SESSION_VERSION,
    bankHash: bank.meta.hash,
    level: set.level,
    seed: set.seed,
    questionIds: set.questionIds,
    layout: set.layout,
    answers: {},
    flags: [],
    current: 0,
    startedAt: now.toISOString(),
  };
}

function isSession(v: unknown): v is SessionState {
  return (
    isObject(v) &&
    v.version === SESSION_VERSION &&
    typeof v.bankHash === "string" &&
    isLevel(v.level) &&
    typeof v.seed === "number" &&
    isStringArray(v.questionIds) &&
    v.questionIds.length > 0 &&
    isObject(v.layout) &&
    isAnswers(v.answers) &&
    isStringArray(v.flags) &&
    typeof v.current === "number" &&
    typeof v.startedAt === "string"
  );
}

/** The saved session, or null if there is none, it is corrupt, or the bank changed. */
export function loadSession(bankHash: string): SessionState | null {
  const v = read(KEYS.session);
  if (!isSession(v) || v.bankHash !== bankHash) return null;
  const current = Math.min(Math.max(0, Math.floor(v.current)), v.questionIds.length - 1);
  return { ...v, current };
}

export function saveSession(session: SessionState): boolean {
  return write(KEYS.session, session);
}

export function clearSession() {
  remove(KEYS.session);
}

// ---------------------------------------------------------------------------
// Attempt history

export interface Attempt {
  id: string;
  startedAt: string;
  finishedAt: string;
  level: Level;
  seed: number;
  bankHash: string;
  questionIds: string[];
  answers: Answers;
  flags: string[];
  correct: number;
  total: number;
  /** domain id -> [correct, total] */
  domains: Record<string, [number, number]>;
  /** concept name -> [correct, total] */
  concepts: Record<string, [number, number]>;
}

interface HistoryFile {
  version: number;
  attempts: Attempt[];
}

function isAttempt(v: unknown): v is Attempt {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.finishedAt === "string" &&
    isLevel(v.level) &&
    isStringArray(v.questionIds) &&
    isAnswers(v.answers) &&
    typeof v.correct === "number" &&
    typeof v.total === "number" &&
    isTallyMap(v.domains) &&
    isTallyMap(v.concepts)
  );
}

/** Fill in fields that older/partial records may lack, so the rest of the app can rely on them. */
function normalizeAttempt(v: Attempt): Attempt {
  return {
    ...v,
    startedAt: typeof v.startedAt === "string" ? v.startedAt : v.finishedAt,
    seed: typeof v.seed === "number" ? v.seed : 0,
    bankHash: typeof v.bankHash === "string" ? v.bankHash : "",
    flags: isStringArray(v.flags) ? v.flags : [],
  };
}

/**
 * Load history, oldest first. Handles:
 * - nothing stored / unparsable JSON -> []
 * - a bare array (pre-versioned layout) -> migrated to the current format
 * - a newer, unknown version -> [] (and left untouched until the next save)
 * - individual malformed attempts -> dropped
 */
export function loadHistory(): Attempt[] {
  const v = read(KEYS.history);
  let list: unknown[];
  if (Array.isArray(v)) list = v;
  else if (isObject(v) && v.version === HISTORY_VERSION && Array.isArray(v.attempts)) list = v.attempts;
  else return [];
  return list.filter(isAttempt).map(normalizeAttempt);
}

function saveHistory(attempts: Attempt[]): boolean {
  const file: HistoryFile = { version: HISTORY_VERSION, attempts: attempts.slice(-HISTORY_CAP) };
  return write(KEYS.history, file);
}

export function addAttempt(attempt: Attempt): Attempt[] {
  const next = [...loadHistory().filter((a) => a.id !== attempt.id), attempt].slice(-HISTORY_CAP);
  saveHistory(next);
  return next;
}

export function getAttempt(id: string): Attempt | undefined {
  return loadHistory().find((a) => a.id === id);
}

export function clearHistory() {
  remove(KEYS.history);
}

export function recentlySeenIds(attempts: Attempt[], n = RECENT_ATTEMPTS_FOR_SEEN): Set<string> {
  return new Set(attempts.slice(-n).flatMap((a) => a.questionIds));
}

/** Turn a finished session into a history record. */
export function finalizeSession(bank: Bank, session: SessionState, now = new Date()): Attempt {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const questions = session.questionIds.flatMap((id) => byId.get(id) ?? []);
  const results = gradeAll(questions, session.answers);
  const { domains, concepts } = summarizeTallies(results);
  return {
    id: `${now.getTime().toString(36)}-${(session.seed >>> 0).toString(36)}`,
    startedAt: session.startedAt,
    finishedAt: now.toISOString(),
    level: session.level,
    seed: session.seed,
    bankHash: session.bankHash,
    questionIds: session.questionIds,
    answers: session.answers,
    flags: session.flags,
    correct: results.filter((r) => r.correct).length,
    total: results.length,
    domains,
    concepts,
  };
}

// ---------------------------------------------------------------------------
// Theme

export type Theme = "light" | "dark";

export function loadTheme(): Theme | undefined {
  try {
    const v = localStorage.getItem(KEYS.theme);
    return v === "light" || v === "dark" ? v : undefined;
  } catch {
    return undefined;
  }
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}
