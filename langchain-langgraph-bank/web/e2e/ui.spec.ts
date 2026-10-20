import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { answerCurrent, expectNoHorizontalOverflow, getBank, getSession, startSet, trackErrors } from "./helpers";
import type { Question } from "../src/types";

/** Real-browser axe scan, including color contrast (which jsdom unit tests can't check). */
async function expectAccessible(page: Page, label: string) {
  // Let entry animations (dialogs, bars) finish so contrast is measured on final colors.
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = violations.map(
    (v) => `${label} | ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 5).map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`).join("\n    ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

/** Jump to the first question of a type in the current set; returns it. */
async function gotoType(page: Page, type: Question["type"]): Promise<Question> {
  const bank = await getBank(page);
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const s = await getSession(page);
  const idx = s.questionIds.findIndex((id) => byId.get(id)?.type === type);
  expect(idx, `set should contain a ${type} question`).toBeGreaterThanOrEqual(0);
  const isMobile = (page.viewportSize()?.width ?? 1280) < 1025;
  if (isMobile) {
    await page.getByRole("button", { name: /^Questions$/ }).click();
    await page.getByRole("dialog", { name: "Questions" }).getByRole("button", { name: new RegExp(`^Question ${idx + 1},`) }).click();
    await expect(page.getByRole("dialog", { name: "Questions" })).toBeHidden();
  } else {
    await page.getByRole("navigation", { name: "Questions in this set" }).getByRole("button", { name: new RegExp(`^Question ${idx + 1},`) }).click();
  }
  await expect(page.getByRole("heading", { name: `Question ${idx + 1} of 30` })).toBeVisible();
  return byId.get(s.questionIds[idx]!)!;
}

/** Start sets until one contains every format (medium sets almost always do). */
async function startSetWithAllFormats(page: Page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.evaluate(() => localStorage.removeItem("atp.session"));
    await startSet(page, "Medium");
    const bank = await getBank(page);
    const types = new Set((await getSession(page)).questionIds.map((id) => bank.questions.find((q) => q.id === id)?.type));
    if (types.size === 4) return;
  }
  throw new Error("could not get a set with all four formats");
}

test.describe("question formats in a real browser", () => {
  test("every format can be answered and graded correctly", async ({ page }) => {
    const errors = trackErrors(page);
    await startSetWithAllFormats(page);
    for (const type of ["single_choice", "multi_response", "ordering", "matching"] as const) {
      const q = await gotoType(page, type);
      await answerCurrent(page, q, "correct");
      const s = await getSession(page);
      expect(s.answers[q.id], `${type} answer saved`).toBeDefined();
    }
    // Submit and confirm all four were graded correct.
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Submit set" }).click();
    await expect(page.getByText("4 / 30 correct")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("keyboard: shortcuts, radio arrows, and ordering buttons", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcuts are a desktop feature");
    await startSetWithAllFormats(page);

    const single = await gotoType(page, "single_choice");
    await page.locator("body").click({ position: { x: 5, y: 300 } });
    await page.keyboard.press(single.options[1]!.key.toLowerCase());
    await expect(page.locator(`input[value="${single.options[1]!.key}"]`)).toBeChecked();
    await page.keyboard.press("1");
    await expect(page.locator(`input[value="${single.options[0]!.key}"]`)).toBeChecked();
    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: "Flagged", exact: true })).toBeVisible();
    // Arrow keys inside the radio group move the selection, not the question.
    const heading = await page.locator(".question-card__number").innerText();
    await page.locator(`input[value="${single.options[0]!.key}"]`).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(`input[value="${single.options[1]!.key}"]`)).toBeChecked();
    await expect(page.locator(".question-card__number")).toHaveText(heading);

    const ord = await gotoType(page, "ordering");
    const firstText = (await page.locator(".order-item__text").first().innerText()).trim();
    const down = page.getByRole("button", { name: new RegExp(`Move “${escape(firstText)}” down`) });
    await down.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".order-item__text").nth(1)).toHaveText(firstText);
    await expect(page.getByRole("status").filter({ hasText: "Moved" })).toHaveText(
      `Moved “${firstText}” to position 2 of ${ord.options.length}.`,
    );
    await expect(page.getByRole("button", { name: new RegExp(`Move “${escape(firstText)}” down \\(position 2`) })).toBeFocused();
  });

  test("ordering supports mouse drag-and-drop", async ({ page, isMobile }) => {
    test.skip(isMobile, "drag handles are hidden on touch devices");
    await startSetWithAllFormats(page);
    await gotoType(page, "ordering");
    const items = page.locator(".order-item");
    const before = await page.locator(".order-item__text").allInnerTexts();
    await items.last().dragTo(items.first(), { targetPosition: { x: 20, y: 4 } });
    const after = await page.locator(".order-item__text").allInnerTexts();
    expect(after[0]).toBe(before[before.length - 1]);
    expect(new Set(after)).toEqual(new Set(before));
  });

  test("multi-response caps selections at the required count", async ({ page }) => {
    await startSetWithAllFormats(page);
    const q = await gotoType(page, "multi_response");
    const labels = page.locator("label.choice");
    for (let i = 0; i < q.select_count; i++) await labels.nth(i).click();
    await expect(page.getByText(`${q.select_count} of ${q.select_count} selected`)).toBeVisible();
    await expect(page.locator("input[type=checkbox]:disabled")).toHaveCount(q.options.length - q.select_count);
  });
});

test.describe("accessibility and layout in a real browser", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`all pages pass axe (incl. color contrast) in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("atp.theme", t), theme);
      await page.goto("./");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectAccessible(page, `${theme} home`);

      await startSetWithAllFormats(page);
      for (const type of ["single_choice", "multi_response", "ordering", "matching"] as const) {
        const q = await gotoType(page, type);
        await answerCurrent(page, q, "wrong");
        await expectAccessible(page, `${theme} exam ${type}`);
        await expectNoHorizontalOverflow(page);
      }
      await page.getByRole("button", { name: "Submit", exact: true }).click();
      await expectAccessible(page, `${theme} submit dialog`);
      await page.getByRole("dialog").getByRole("button", { name: "Submit set" }).click();

      await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
      await expectAccessible(page, `${theme} results`);
      await page.locator("button.theory-btn").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectAccessible(page, `${theme} theory dialog`);
      await page.keyboard.press("Escape");

      await page.getByRole("link", { name: /review all answers/i }).click();
      await expect(page.getByRole("heading", { name: "Review answers" })).toBeVisible();
      await expectAccessible(page, `${theme} review`);
      await expectNoHorizontalOverflow(page);

      await page.getByRole("link", { name: "History" }).click();
      await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
      await expectAccessible(page, `${theme} history`);

      await page.goto("./#/does-not-exist");
      await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
      await expectAccessible(page, `${theme} 404`);
    });
  }

  test("theme toggle persists across reloads", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("atp.theme", "light");
        sessionStorage.setItem("seeded", "1");
      }
    });
    await page.goto("./");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(14, 16, 22)");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });

  test("skip link moves focus to main content", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation");
    await page.goto("./");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("navigator is a drawer on mobile and a sidebar on desktop", async ({ page, isMobile }) => {
    await startSet(page, "Easy");
    const sidebar = page.getByRole("complementary", { name: "Question navigator" });
    if (isMobile) {
      await expect(sidebar).toBeHidden();
      await page.getByRole("button", { name: /^Questions$/ }).click();
      const drawer = page.getByRole("dialog", { name: "Questions" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("button", { name: /^Question \d+,/ })).toHaveCount(30);
    } else {
      await expect(sidebar).toBeVisible();
      await expect(page.getByRole("button", { name: /^Questions$/ })).toBeHidden();
    }
  });
});

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
