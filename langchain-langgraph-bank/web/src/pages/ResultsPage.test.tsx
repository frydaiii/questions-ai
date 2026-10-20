import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/render";
import { card, makeBank, matching, multi, ordering, single } from "../test/fixtures";
import { seedAttempt } from "../test/seed";
import { expectNoAxeViolations } from "../test/axe";
import { loadSession } from "../lib/storage";
import type { Question } from "../types";

function scenario() {
  // D1: 2/2 right. D2: 0/2 (Memory). D3: 1/2 (Planning) with a flagged unanswered matching question.
  const qs: Question[] = [
    single({ domain: 1, concepts: ["Agent"], theory_refs: ["TH-D1-001"] }),
    multi({ domain: 1, concepts: ["Agent"], theory_refs: ["TH-D1-001"] }),
    single({ domain: 2, concepts: ["Memory"], theory_refs: ["TH-D1-002"] }),
    ordering({ domain: 2, concepts: ["Memory"], theory_refs: ["TH-D1-002", "TH-D1-001"] }),
    single({ domain: 3, concepts: ["Planning"], theory_refs: ["TH-D1-001"] }),
    matching({ domain: 3, concepts: ["Planning"], theory_refs: ["TH-D1-002"] }),
  ];
  const bank = makeBank(0, qs);
  bank.theory["TH-D1-002"] = card("TH-D1-002", { title: "Memory tiers explained" });
  bank.theory["TH-D1-001"] = card("TH-D1-001", { title: "What makes an agent" });
  const attempt = seedAttempt(
    bank,
    {
      [qs[0]!.id]: ["B"],
      [qs[1]!.id]: ["A", "C"],
      [qs[2]!.id]: ["A"],
      [qs[3]!.id]: ["C", "B", "A"],
      [qs[4]!.id]: ["B"],
    },
    { questionIds: qs.map((q) => q.id), flags: [qs[5]!.id] },
  );
  return { bank, qs, attempt };
}

describe("ResultsPage", () => {
  it("shows the overall score, breakdown, and verdict", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/results/${attempt.id}`);
    expect(screen.getByRole("heading", { name: /your results/i })).toBeInTheDocument();
    expect(screen.getByText("50%", { selector: ".score-ring__pct" })).toBeInTheDocument();
    expect(screen.getByText("3 / 6 correct")).toBeInTheDocument();
    expect(screen.getByText(/needs more practice/i)).toBeInTheDocument();
    const breakdown = screen.getByRole("list", { name: /breakdown/i });
    expect(breakdown).toHaveTextContent("3 correct");
    expect(breakdown).toHaveTextContent("2 incorrect");
    expect(breakdown).toHaveTextContent("1 not answered");
    expect(breakdown).toHaveTextContent("1 flagged");
  });

  it("flags weak domains with text, not just color", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/results/${attempt.id}`);
    const section = screen.getByRole("region", { name: /scores by domain/i });
    const items = within(section).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Domain 1.*2\/2 · 100%.*On track/);
    expect(items[1]).toHaveTextContent(/Domain 2.*0\/2 · 0%.*Needs improvement/);
    expect(items[2]).toHaveTextContent(/Domain 3.*1\/2 · 50%.*Needs improvement/);
    expect(within(items[1] as HTMLElement).getByRole("meter", { name: /domain 2: 0%/i })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(within(items[1] as HTMLElement).getByRole("link", { name: /review 2 missed/i })).toHaveAttribute(
      "href",
      `#/review/${attempt.id}?show=incorrect&domain=2`,
    );
    expect(screen.getByText(/focus first on domain 2, domain 3/i)).toBeInTheDocument();
  });

  it("ranks weak concepts and links each to its theory cards and missed questions", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/results/${attempt.id}`);
    const section = screen.getByRole("region", { name: /concepts to improve/i });
    const weak = within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(weak).toEqual(["Memory", "Planning"]);

    const memory = within(section).getByRole("heading", { name: "Memory" }).closest("li") as HTMLElement;
    expect(memory).toHaveTextContent("0 of 2 correct · 0%");
    expect(within(memory).queryByText(/low sample/i)).not.toBeInTheDocument();
    const cards = within(memory).getAllByRole("button").map((b) => b.textContent);
    expect(cards).toEqual(["Memory tiers explained", "What makes an agent"]);
    expect(within(memory).getByRole("link", { name: /review 2 missed questions/i })).toHaveAttribute(
      "href",
      `#/review/${attempt.id}?show=incorrect&concept=Memory`,
    );

    await user.click(within(memory).getByRole("button", { name: "Memory tiers explained" }));
    const dialog = screen.getByRole("dialog", { name: "Memory tiers explained" });
    expect(within(dialog).getByRole("link", { name: /arxiv\.org\/abs\/2210\.03629/ })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("shows every concept in a details table", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/results/${attempt.id}`);
    const table = screen.getByRole("table", { name: /score per concept/i });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      "Agent2/2100%On track",
      "Memory0/20%Needs improvement",
      "Planning1/250%Needs improvement",
    ]);
  });

  it("offers review and a new set at the same level", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/results/${attempt.id}`);
    expect(screen.getByRole("link", { name: /review 3 mistakes/i })).toHaveAttribute(
      "href",
      `#/review/${attempt.id}?show=incorrect`,
    );
    await user.click(screen.getByRole("button", { name: /new easy set/i }));
    expect(await screen.findByRole("heading", { name: /question 1 of 6/i })).toBeInTheDocument();
    expect(loadSession(bank.meta.hash)?.level).toBe("easy");
  });

  it("celebrates a perfect set", () => {
    const qs = [single(), single()];
    const bank = makeBank(0, qs);
    const attempt = seedAttempt(bank, { [qs[0]!.id]: ["B"], [qs[1]!.id]: ["B"] }, { questionIds: qs.map((q) => q.id) });
    renderApp(bank, `/results/${attempt.id}`);
    expect(screen.getByText(/on track/i, { selector: ".verdict" })).toBeInTheDocument();
    expect(screen.getByText(/no weak concepts/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /mistake/i })).not.toBeInTheDocument();
  });

  it("handles unknown attempts", () => {
    renderApp(makeBank(1), "/results/nope");
    expect(screen.getByRole("heading", { name: /report not found/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/results/${attempt.id}`);
    await expectNoAxeViolations(document.body);
  });
});
