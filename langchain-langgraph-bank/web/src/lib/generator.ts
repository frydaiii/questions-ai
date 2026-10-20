import type { Bank, Level, Question } from "../types";
import { mulberry32, shuffle } from "./random";

export const SET_SIZE = 30;
export const PER_DOMAIN = 5;
/** Minimum share of non-single-choice questions per domain slot (1 of 5 = 20%). */
const MIN_NON_SINGLE_PER_DOMAIN = 1;

export interface GeneratedSet {
  level: Level;
  seed: number;
  questionIds: string[];
  /**
   * Per-question display arrangement, fixed for the whole session:
   * - ordering: the initial (scrambled) order of option keys
   * - matching: the display order of the right-hand column keys
   */
  layout: Record<string, string[]>;
}

export interface GenerateOptions {
  /** Question ids the user has seen recently; unseen questions are preferred. */
  seenIds?: ReadonlySet<string>;
  setSize?: number;
  perDomain?: number;
}

type Rand = () => number;

/**
 * Build a practice set: `perDomain` questions from each domain at the chosen level,
 * preferring unseen questions and nudging towards a mix of formats. Deterministic for a
 * given (bank, level, seed, seenIds).
 */
export function generateSet(bank: Bank, level: Level, seed: number, options: GenerateOptions = {}): GeneratedSet {
  const seen = options.seenIds ?? new Set<string>();
  const perDomain = options.perDomain ?? PER_DOMAIN;
  const setSize = options.setSize ?? SET_SIZE;
  const rand = mulberry32(seed);

  const levelPool = bank.questions.filter((q) => q.difficulty === level);
  const nonSingleShare = levelPool.length
    ? levelPool.filter((q) => q.type !== "single_choice").length / levelPool.length
    : 0;

  const chosen: Question[] = [];
  const chosenIds = new Set<string>();
  const typeCounts = new Map<string, number>();
  const take = (q: Question) => {
    chosen.push(q);
    chosenIds.add(q.id);
    typeCounts.set(q.type, (typeCounts.get(q.type) ?? 0) + 1);
  };

  for (const domain of bank.domains) {
    const pool = shuffle(
      levelPool.filter((q) => q.domain === domain.id),
      rand,
    );
    const nonSingle = pool.filter((q) => q.type !== "single_choice");
    const single = pool.filter((q) => q.type === "single_choice");

    // Probabilistic rounding keeps the overall mix close to the pool's natural share.
    const ideal = perDomain * nonSingleShare;
    let wantNonSingle = Math.floor(ideal) + (rand() < ideal - Math.floor(ideal) ? 1 : 0);
    wantNonSingle = Math.min(perDomain, Math.max(MIN_NON_SINGLE_PER_DOMAIN, wantNonSingle));

    // Format nudge draws only from unseen questions: freshness beats format variety. The
    // fill steps below fall back to seen questions only when the unseen pool runs out.
    const picked: Question[] = [];
    const unseenNonSingle = nonSingle.filter((q) => !seen.has(q.id));
    for (let i = 0; i < wantNonSingle; i++) {
      const q = pickLeastUsedFormat(unseenNonSingle, typeCounts, picked);
      if (!q) break;
      picked.push(q);
      typeCounts.set(q.type, (typeCounts.get(q.type) ?? 0) + 1);
    }
    for (const q of picked) typeCounts.set(q.type, (typeCounts.get(q.type) ?? 0) - 1);

    fillFrom(single, perDomain, picked, seen);
    fillFrom(nonSingle, perDomain, picked, seen);
    // fillFrom puts unseen first within each list; re-check across both lists so a seen
    // single-choice question never displaces an unseen question of another format.
    fillPreferUnseen(pool, perDomain, picked, seen);
    picked.forEach(take);
  }

  // A domain may have had fewer than `perDomain` questions at this level: top up from
  // the rest of the level pool so the set still reaches its target size.
  if (chosen.length < setSize) {
    const rest = shuffle(
      levelPool.filter((q) => !chosenIds.has(q.id)),
      rand,
    );
    const extra: Question[] = [];
    fillFrom(rest, setSize - chosen.length, extra, seen);
    extra.forEach(take);
  }

  const ordered = shuffle(chosen.slice(0, setSize), rand);
  const layout: Record<string, string[]> = {};
  for (const q of ordered) {
    const arrangement = initialLayout(q, rand);
    if (arrangement) layout[q.id] = arrangement;
  }
  return { level, seed, questionIds: ordered.map((q) => q.id), layout };
}

/** Pick the candidate whose format has been used least so far. */
function pickLeastUsedFormat(
  candidates: Question[],
  typeCounts: Map<string, number>,
  exclude: Question[],
): Question | undefined {
  let best: Question | undefined;
  let bestScore = Infinity;
  for (const q of candidates) {
    if (exclude.includes(q)) continue;
    const score = typeCounts.get(q.type) ?? 0;
    if (score < bestScore) {
      best = q;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Swap seen questions in `picked` for unseen ones from `pool` (any format), so that a seen
 * question is only used when the domain has no unseen question left.
 */
function fillPreferUnseen(pool: Question[], size: number, picked: Question[], seen: ReadonlySet<string>) {
  const spare = pool.filter((q) => !seen.has(q.id) && !picked.includes(q));
  for (let i = 0; i < picked.length && spare.length > 0; i++) {
    if (seen.has((picked[i] as Question).id)) picked[i] = spare.shift() as Question;
  }
  while (picked.length < size && spare.length > 0) picked.push(spare.shift() as Question);
}

/** Append candidates to `into` (unseen first, then seen) until it has `size` items. */
function fillFrom(candidates: Question[], size: number, into: Question[], seen: ReadonlySet<string>) {
  const ordered = [...candidates.filter((q) => !seen.has(q.id)), ...candidates.filter((q) => seen.has(q.id))];
  for (const q of ordered) {
    if (into.length >= size) return;
    if (!into.includes(q)) into.push(q);
  }
}

function initialLayout(q: Question, rand: Rand): string[] | undefined {
  if (q.type === "ordering") {
    const correct = q.correct;
    return scrambled(
      q.options.map((o) => o.key),
      rand,
      (order) => order.every((k, i) => k === correct[i]),
    );
  }
  if (q.type === "matching") {
    const left = q.matching.left;
    // Avoid a right column whose rows line up with the answers next to them.
    return scrambled(
      q.matching.right.map((r) => r.key),
      rand,
      (order) => left.every((l, i) => q.correct_pairs[l.key] === order[i]),
    );
  }
  return undefined;
}

/** Shuffle, retrying a few times to avoid arrangements that give the answer away. */
function scrambled(keys: string[], rand: Rand, givesAway: (order: string[]) => boolean): string[] {
  let order = shuffle(keys, rand);
  for (let i = 0; i < 8 && keys.length > 1 && givesAway(order); i++) order = shuffle(keys, rand);
  if (keys.length > 1 && givesAway(order)) order = [...order.slice(1), order[0] as string];
  return order;
}
