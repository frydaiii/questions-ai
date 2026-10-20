import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/render";
import { makeBank, single } from "../test/fixtures";
import { seedAttempt } from "../test/seed";
import { expectNoAxeViolations } from "../test/axe";
import { generateSet } from "../lib/generator";
import { loadHistory, loadSession, recentlySeenIds } from "../lib/storage";
import type { Answers, Question } from "../types";

/** Two domains; Memory (D2) questions are always missed, Agent (D1) always right. */
function scenario(attempts = 3) {
  const qs: Question[] = [
    ...Array.from({ length: 2 }, () => single({ domain: 1, concepts: ["Agent"] })),
    ...Array.from({ length: 2 }, () => single({ domain: 2, concepts: ["Memory"], theory_refs: ["TH-D1-002"] })),
  ];
  const bank = makeBank(0, qs);
  const answers: Answers = Object.fromEntries(qs.map((q) => [q.id, q.domain === 1 ? ["B"] : ["A"]]));
  for (let i = 0; i < attempts; i++) {
    seedAttempt(bank, answers, {
      questionIds: qs.map((q) => q.id),
      level: i % 2 ? "medium" : "easy",
      at: new Date(Date.UTC(2026, 9, 10 + i, 9)),
    });
  }
  return { bank, qs };
}

describe("HistoryPage", () => {
  it("shows an empty state with no history", () => {
    renderApp(makeBank(1), "/history");
    expect(screen.getByRole("heading", { name: /no history yet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start your first set/i })).toHaveAttribute("href", "#/");
  });

  it("summarizes attempts and lists them newest first with report links", () => {
    scenario(3);
    renderApp(scenario(0).bank, "/history");
    const kpis = screen.getByRole("list", { name: /summary/i });
    expect(kpis).toHaveTextContent("3sets completed");
    expect(kpis).toHaveTextContent("50%average score");

    const table = screen.getByRole("table", { name: /completed sets/i });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Easy");
    expect(rows[1]).toHaveTextContent("Medium");
    const ids = loadHistory().map((a) => a.id).reverse();
    expect(within(rows[0] as HTMLElement).getByRole("link", { name: /view report/i })).toHaveAttribute(
      "href",
      `#/results/${ids[0]}`,
    );
  });

  it("draws an accessible trend chart", () => {
    const { bank } = scenario(3);
    renderApp(bank, "/history");
    const chart = screen.getByRole("img", { name: /scores over your last 3 sets/i });
    expect(chart.querySelectorAll("circle")).toHaveLength(3);
    expect(chart.querySelector("polyline")).not.toBeNull();
  });

  it("shows recurring weak domains and concepts with theory cards to study", async () => {
    const { bank } = scenario(3);
    const { user } = renderApp(bank, "/history");
    const section = screen.getByRole("region", { name: /recurring weak areas/i });
    expect(section).toHaveTextContent(/Domain 2.*0\/6 · 0%/);
    expect(section).toHaveTextContent(/Memory.*0\/6 · 0%/);
    expect(section).not.toHaveTextContent("Agent");
    await user.click(within(section).getByRole("button", { name: "Card TH-D1-002" }));
    expect(screen.getByRole("dialog", { name: "Card TH-D1-002" })).toBeInTheDocument();
  });

  it("clears history only after confirmation", async () => {
    const { bank } = scenario(2);
    const { user } = renderApp(bank, "/history");
    await user.click(screen.getByRole("button", { name: /clear history/i }));
    const dialog = screen.getByRole("dialog", { name: /clear all history/i });
    expect(dialog).toHaveTextContent(/permanently deletes 2 saved sets/);
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(loadHistory()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /clear history/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /clear history/i }));
    expect(loadHistory()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: /no history yet/i })).toBeInTheDocument();
  });

  it("feeds recently seen questions into new sets", async () => {
    const bank = makeBank(10);
    const first = generateSet(bank, "easy", 1);
    seedAttempt(bank, {}, { questionIds: first.questionIds, level: "easy" });
    const { user } = renderApp(bank, "/");
    await user.click(screen.getByRole("button", { name: /start 30-question set/i }));
    const session = loadSession(bank.meta.hash);
    expect(session).not.toBeNull();
    const seen = recentlySeenIds(loadHistory());
    // 60 easy questions in the pool, 30 seen: the new set should be entirely unseen.
    expect(session!.questionIds.filter((id) => seen.has(id))).toEqual([]);
  });

  it("has no axe violations", async () => {
    const { bank } = scenario(3);
    renderApp(bank, "/history");
    await expectNoAxeViolations(document.body);
  });
});
