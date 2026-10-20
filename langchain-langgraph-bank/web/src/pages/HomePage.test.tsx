import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/render";
import { loadRealBank, makeBank } from "../test/fixtures";
import { createSession, loadSession, saveSession } from "../lib/storage";
import { generateSet } from "../lib/generator";

describe("HomePage", () => {
  it("shows the level picker with real per-level counts", () => {
    renderApp(loadRealBank());
    const group = screen.getByRole("group", { name: /choose a level/i });
    expect(within(group).getByRole("radio", { name: /easy.*100 questions/i })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /medium.*268 questions/i })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: /hard.*112 questions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start 30-question set/i })).toBeInTheDocument();
  });

  it("starts a set at the chosen level", async () => {
    const bank = makeBank(8);
    const { user } = renderApp(bank);
    await user.click(screen.getByRole("radio", { name: /hard/i }));
    await user.click(screen.getByRole("button", { name: /start 30-question set/i }));
    expect(await screen.findByRole("heading", { name: "Question 1 of 30" })).toBeInTheDocument();
    expect(loadSession(bank.meta.hash)?.level).toBe("hard");
  });

  it("offers to resume or discard a set in progress, and confirms before replacing it", async () => {
    const bank = makeBank(8);
    saveSession(createSession(bank, generateSet(bank, "medium", 1)));
    const { user } = renderApp(bank);
    expect(screen.getByRole("heading", { name: /set in progress/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resume set/i })).toHaveAttribute("href", "#/exam");

    await user.click(screen.getByRole("button", { name: /start 30-question set/i }));
    const dialog = screen.getByRole("dialog", { name: /replace your set/i });
    await user.click(within(dialog).getByRole("button", { name: /keep current set/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard/i }));
    expect(screen.queryByRole("heading", { name: /set in progress/i })).not.toBeInTheDocument();
    expect(loadSession(bank.meta.hash)).toBeNull();
  });

  it("toggles and persists the theme", async () => {
    const { user } = renderApp(makeBank(1));
    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("atp.theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /switch to light theme/i })).toBeInTheDocument();
  });
});
