import { describe, expect, it } from "vitest";
import { act, screen, within } from "@testing-library/react";
import { renderApp } from "../test/render";
import { makeBank } from "../test/fixtures";
import { createSession, loadHistory, loadSession, saveSession } from "../lib/storage";
import { generateSet } from "../lib/generator";
import type { Bank } from "../types";
import { expectNoAxeViolations } from "../test/axe";

/** Start the app on /exam with a fresh session. Returns the session's question order. */
function startExam(bank: Bank, seed = 1) {
  const session = createSession(bank, generateSet(bank, "easy", seed));
  saveSession(session);
  const utils = renderApp(bank, "/exam");
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const question = (i: number) => byId.get(session.questionIds[i] as string)!;
  return { ...utils, session, question };
}

const heading = (n: number) => screen.getByRole("heading", { name: `Question ${n} of 30` });

describe("ExamPage", () => {
  it("shows an empty state when there is no set in progress", () => {
    renderApp(makeBank(8), "/exam");
    expect(screen.getByRole("heading", { name: /no set in progress/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose a level/i })).toHaveAttribute("href", "#/");
  });

  it("moves between questions with Previous/Next and the navigator", async () => {
    const bank = makeBank(8);
    const { user } = startExam(bank);
    expect(heading(1)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^next/i }));
    expect(heading(2)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /questions in this set/i });
    await user.click(within(nav).getByRole("button", { name: /^question 30,/i }));
    expect(heading(30)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /review & submit/i }).length).toBeGreaterThan(0);
  });

  it("saves every change and resumes after a reload", async () => {
    const bank = makeBank(8);
    const { user, unmount, session, question } = startExam(bank, 4);
    // Answer the first single-choice question we find.
    let i = 0;
    while (question(i).type !== "single_choice") i++;
    await act(async () => {
      for (let k = 0; k < i; k++) await user.click(screen.getByRole("button", { name: /^next/i }));
    });
    await user.click(screen.getByRole("radio", { name: /bravo/i }));
    await user.click(screen.getByRole("button", { name: /flag for review/i }));

    const saved = loadSession(bank.meta.hash);
    expect(saved?.answers[question(i).id]).toEqual(["B"]);
    expect(saved?.flags).toEqual([question(i).id]);
    expect(saved?.current).toBe(i);

    unmount();
    renderApp(bank, "/exam");
    expect(heading(i + 1)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /bravo/i })).toBeChecked();
    expect(screen.getByRole("button", { name: "Flagged" })).toHaveAttribute("aria-pressed", "true");
    expect(loadSession(bank.meta.hash)?.questionIds).toEqual(session.questionIds);
  });

  it("supports keyboard shortcuts for choosing, moving and flagging", async () => {
    const bank = makeBank(8);
    const { user, question } = startExam(bank, 2);
    let i = 0;
    while (question(i).type !== "single_choice") i++;
    for (let k = 0; k < i; k++) await user.keyboard("{ArrowRight}");
    expect(heading(i + 1)).toBeInTheDocument();

    await user.keyboard("c");
    expect(screen.getByRole("radio", { name: /charlie/i })).toBeChecked();
    await user.keyboard("2");
    expect(screen.getByRole("radio", { name: /bravo/i })).toBeChecked();
    await user.keyboard("f");
    expect(screen.getByRole("button", { name: "Flagged" })).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: new RegExp(`^Question ${i + 1}, answered, flagged$`) }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(heading(Math.max(1, i))).toBeInTheDocument();
  });

  it("does not hijack arrow keys while a radio option has focus", async () => {
    const bank = makeBank(8);
    const { user, question } = startExam(bank, 2);
    let i = 0;
    while (question(i).type !== "single_choice") i++;
    for (let k = 0; k < i; k++) await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("radio", { name: /alpha/i }));
    await user.keyboard("{ArrowRight}");
    expect(heading(i + 1)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /bravo/i })).toBeChecked();
  });

  it("ignores shortcut letters while a select has focus", async () => {
    const bank = makeBank(8);
    const { user, question } = startExam(bank, 2);
    let i = 0;
    while (question(i).type !== "matching") i++;
    for (let k = 0; k < i; k++) await user.keyboard("{ArrowRight}");
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    select.focus();
    await user.keyboard("f");
    expect(screen.getByRole("button", { name: /flag for review/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows unanswered and flagged counts before submitting, then submits to results", async () => {
    const bank = makeBank(8);
    const { user, question } = startExam(bank, 5);
    let i = 0;
    while (question(i).type !== "single_choice") i++;
    for (let k = 0; k < i; k++) await user.keyboard("{ArrowRight}");
    await user.keyboard("b");
    await user.keyboard("f");

    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    const dialog = screen.getByRole("dialog", { name: /submit this set/i });
    expect(within(dialog).getByTestId("count-answered")).toHaveTextContent("1");
    expect(within(dialog).getByTestId("count-unanswered")).toHaveTextContent("29");
    expect(within(dialog).getByTestId("count-flagged")).toHaveTextContent("1");
    expect(within(dialog).getByRole("button", { name: /keep working/i })).toHaveFocus();
    await expectNoAxeViolations(document.body);

    // Jump from the dialog to an unanswered question.
    await user.click(within(dialog).getAllByRole("button", { name: /go to question/i })[0] as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    await user.click(screen.getByRole("button", { name: /submit set/i }));
    expect(await screen.findByRole("heading", { name: /your results/i })).toBeInTheDocument();
    expect(loadSession(bank.meta.hash)).toBeNull();
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.flags).toHaveLength(1);
    expect(history[0]?.total).toBe(30);
  });

  it("has no axe violations while answering", async () => {
    startExam(makeBank(8));
    await expectNoAxeViolations(document.body);
  });
});
