import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/render";
import { card, makeBank, matching, multi, ordering, single } from "../test/fixtures";
import { seedAttempt } from "../test/seed";
import { expectNoAxeViolations } from "../test/axe";
import type { Question } from "../types";

function scenario() {
  const qs: Question[] = [
    single({ domain: 1, concepts: ["Agent"], stem: "Q-single right" }),
    multi({ domain: 2, concepts: ["Memory"], stem: "Q-multi wrong", theory_refs: ["TH-D1-002"] }),
    ordering({ domain: 3, concepts: ["Planning"], stem: "Q-ordering wrong" }),
    matching({ domain: 3, concepts: ["Planning", "Memory"], stem: "Q-matching unanswered" }),
  ];
  const bank = makeBank(0, qs);
  bank.theory["TH-D1-002"] = card("TH-D1-002", {
    title: "Memory tiers explained",
    summary: "Working memory versus long-term memory.",
    key_points: ["Context is working memory"],
    common_confusions: ["Thinking a vector store is the only memory"],
    rule_of_thumb: "Keep what you need now in context.",
    related_tech: ["MemGPT"],
    references: ["https://arxiv.org/abs/2310.08560", "https://www.anthropic.com/research/x"],
  });
  const attempt = seedAttempt(
    bank,
    {
      [qs[0]!.id]: ["B"],
      [qs[1]!.id]: ["A", "B"],
      [qs[2]!.id]: ["B", "A", "C"],
    },
    { questionIds: qs.map((q) => q.id), flags: [qs[2]!.id] },
  );
  return { bank, qs, attempt };
}

const items = () => screen.getAllByRole("article").map((a) => within(a).getByText(/^Q-/).textContent);

describe("ReviewPage", () => {
  it("lists every question with a text verdict", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/review/${attempt.id}`);
    expect(items()).toEqual(["Q-single right", "Q-multi wrong", "Q-ordering wrong", "Q-matching unanswered"]);
    const [a, b, , d] = screen.getAllByRole("article");
    expect(a).toHaveTextContent("Correct");
    expect(b).toHaveTextContent("Incorrect");
    expect(d).toHaveTextContent("Not answered");
    expect(screen.getByText(/showing 4 of 4/i)).toBeInTheDocument();
  });

  it("filters by incorrect, flagged, domain and concept (and from the URL)", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/review/${attempt.id}?show=incorrect`);
    expect(screen.getByRole("radio", { name: /incorrect/i })).toBeChecked();
    expect(items()).toEqual(["Q-multi wrong", "Q-ordering wrong", "Q-matching unanswered"]);

    await user.selectOptions(screen.getByRole("combobox", { name: /concept/i }), "Memory");
    expect(items()).toEqual(["Q-multi wrong", "Q-matching unanswered"]);

    await user.selectOptions(screen.getByRole("combobox", { name: /domain/i }), "3");
    expect(items()).toEqual(["Q-matching unanswered"]);

    await user.click(screen.getByRole("radio", { name: /flagged/i }));
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(items()).toHaveLength(4);
  });

  it("compares choice answers: your pick, the correct answer, and why your pick is wrong", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/review/${attempt.id}`);
    const multiItem = screen.getAllByRole("article")[1] as HTMLElement;
    const options = within(multiItem).getAllByRole("listitem").filter((li) => li.classList.contains("review-option"));
    expect(options[0]).toHaveTextContent(/Alpha.*Your answer.*Correct answer/);
    expect(options[1]).toHaveTextContent(/Bravo.*Your answer/);
    expect(options[1]).toHaveTextContent("B is wrong.");
    expect(options[2]).toHaveTextContent(/Charlie.*Correct answer/);
    expect(options[2]).not.toHaveTextContent("Your answer");
    // D was not picked, so its explanation is hidden until requested.
    expect(multiItem).not.toHaveTextContent("D is wrong.");
    await user.click(within(multiItem).getByRole("button", { name: /show why the other options are wrong/i }));
    expect(multiItem).toHaveTextContent("D is wrong.");
    expect(multiItem).toHaveTextContent("Because it is right.");
    expect(multiItem).toHaveTextContent("Remember the rule.");
  });

  it("compares ordering per position and matching per pair, noting all-or-nothing scoring", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/review/${attempt.id}`);
    const orderTable = screen.getByRole("table", { name: /your order compared/i });
    const rows = within(orderTable).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(/1Second stepFirst step.*Wrong/);
    expect(rows[2]).toHaveTextContent(/3Third stepThird step.*Right/);
    expect(screen.getByText(/position-by-position comparison is for learning only/i)).toBeInTheDocument();

    const matchTable = screen.getByRole("table", { name: /your matches compared/i });
    // Unanswered: only the correct column is shown.
    expect(within(matchTable).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Item", "Correct match"]);
    expect(within(matchTable).getAllByRole("row")[1]).toHaveTextContent("ChatbotTurn-by-turn dialogue");
  });

  it("collapses correct answers by default and expands on request", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/review/${attempt.id}`);
    const first = screen.getAllByRole("article")[0] as HTMLElement;
    const toggle = within(first).getByRole("button", { name: /show answer & explanation/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(first).getByText("Because it is right.")).toBeVisible();
  });

  it("shows source links for each question's theory cards", () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/review/${attempt.id}`);
    const multiItem = screen.getAllByRole("article")[1] as HTMLElement;
    const links = within(multiItem).getAllByRole("link", { name: /opens in a new tab/i });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "https://arxiv.org/abs/2310.08560",
      "https://www.anthropic.com/research/x",
    ]);
    for (const l of links) {
      expect(l).toHaveAttribute("target", "_blank");
      expect(l).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("opens a theory card in an accessible dialog with focus trap, Esc to close, and focus restore", async () => {
    const { bank, attempt } = scenario();
    const { user } = renderApp(bank, `/review/${attempt.id}`);
    const multiItem = screen.getAllByRole("article")[1] as HTMLElement;
    const opener = within(multiItem).getByRole("button", { name: "Memory tiers explained" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Memory tiers explained" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("Working memory versus long-term memory.");
    expect(dialog).toHaveTextContent("Context is working memory");
    expect(dialog).toHaveTextContent("Thinking a vector store is the only memory");
    expect(dialog).toHaveTextContent("Keep what you need now in context.");
    expect(dialog).toHaveTextContent("MemGPT");
    expect(within(dialog).getAllByRole("link")).toHaveLength(2);
    await expectNoAxeViolations(document.body);

    // Focus starts inside and Tab cycles within the dialog.
    const close = within(dialog).getByRole("button", { name: /close dialog/i });
    expect(close).toHaveFocus();
    const lastLink = within(dialog).getAllByRole("link").at(-1) as HTMLElement;
    await user.tab();
    await user.tab();
    expect(lastLink).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastLink).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("has no axe violations", async () => {
    const { bank, attempt } = scenario();
    renderApp(bank, `/review/${attempt.id}`);
    await expectNoAxeViolations(document.body);
  });
});
