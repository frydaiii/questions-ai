import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderApp } from "./render";
import { expectNoAxeViolations } from "./axe";
import { loadRealBank, makeBank } from "./fixtures";
import { BankProvider } from "../data/BankProvider";
import { BankGate } from "../data/BankGate";
import { createSession, saveSession } from "../lib/storage";
import { generateSet } from "../lib/generator";

describe("accessibility: remaining pages and states", () => {
  it("home page (real bank) has no violations, in light and dark themes", async () => {
    renderApp(loadRealBank(), "/");
    await expectNoAxeViolations(document.body);
    document.documentElement.dataset.theme = "dark";
    await expectNoAxeViolations(document.body);
  });

  it("home page with a set in progress and the replace dialog open has no violations", async () => {
    const bank = makeBank(8);
    saveSession(createSession(bank, generateSet(bank, "easy", 1)));
    const { user } = renderApp(bank, "/");
    await user.click(screen.getByRole("button", { name: /start 30-question set/i }));
    await expectNoAxeViolations(document.body);
  });

  it("404 page has no violations and a page title", async () => {
    renderApp(makeBank(1), "/nope/really");
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(document.title).toBe("Page not found · Agent Theory Practice");
    await expectNoAxeViolations(document.body);
  });

  it("empty history and empty exam states have no violations", async () => {
    const { unmount } = renderApp(makeBank(1), "/history");
    await expectNoAxeViolations(document.body);
    unmount();
    renderApp(makeBank(1), "/exam");
    await expectNoAxeViolations(document.body);
  });

  it("loading and error states have no violations", async () => {
    const { unmount } = render(
      <BankProvider loader={() => new Promise(() => {})}>
        <main>
          <BankGate>ok</BankGate>
        </main>
      </BankProvider>,
    );
    await expectNoAxeViolations(document.body);
    unmount();
    render(
      <BankProvider loader={() => Promise.reject(new Error("boom"))}>
        <main>
          <BankGate>ok</BankGate>
        </main>
      </BankProvider>,
    );
    await screen.findByRole("alert");
    await expectNoAxeViolations(document.body);
  });

  it("every page has a skip link targeting main content", async () => {
    const { user } = renderApp(makeBank(1), "/");
    await user.tab();
    const skip = screen.getByRole("link", { name: /skip to content/i });
    expect(skip).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
  });
});
