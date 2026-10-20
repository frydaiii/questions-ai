import { expect, type Page } from "@playwright/test";
import type { Bank, Question } from "../src/types";
import type { SessionState } from "../src/lib/storage";

export async function getBank(page: Page): Promise<Bank> {
  return page.evaluate(async () => (await fetch("bank.json")).json());
}

export async function getSession(page: Page): Promise<SessionState> {
  const s = await page.evaluate(() => localStorage.getItem("atp.session"));
  expect(s, "a session should be saved").not.toBeNull();
  return JSON.parse(s as string) as SessionState;
}

export async function startSet(page: Page, level: "Easy" | "Medium" | "Hard") {
  await page.goto("./");
  await page.getByRole("radio", { name: new RegExp(`^${level}`) }).check();
  await page.getByRole("button", { name: /start 30-question set/i }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 30" })).toBeVisible();
}

export type Intent = "correct" | "wrong";

/** Answer the question currently on screen through the real UI controls. */
export async function answerCurrent(page: Page, q: Question, intent: Intent) {
  const card = page.locator("article.question-card");
  switch (q.type) {
    case "single_choice": {
      const key = intent === "correct" ? q.correct[0] : q.options.find((o) => !q.correct.includes(o.key))!.key;
      await card.locator("label.choice", { has: page.locator(`input[value="${key}"]`) }).click();
      break;
    }
    case "multi_response": {
      const keys =
        intent === "correct"
          ? q.correct
          : // keep one correct key, swap the rest for wrong ones: still select_count picks, still wrong
            [q.correct[0]!, ...q.options.filter((o) => !q.correct.includes(o.key)).map((o) => o.key)].slice(
              0,
              q.select_count,
            );
      for (const key of keys) {
        await card.locator("label.choice", { has: page.locator(`input[value="${key}"]`) }).click();
      }
      await expect(card.getByText(`${q.select_count} of ${q.select_count} selected`)).toBeVisible();
      break;
    }
    case "ordering": {
      if (intent === "wrong") {
        // The generator guarantees the starting layout is not the correct order.
        await card.getByRole("button", { name: /keep this order/i }).click();
        break;
      }
      const textOf = new Map(q.options.map((o) => [o.key, o.text]));
      for (let target = 0; target < q.correct.length; target++) {
        const want = textOf.get(q.correct[target]!)!;
        const texts = await card.locator(".order-item__text").allInnerTexts();
        let at = texts.indexOf(want);
        while (at > target) {
          await card.locator(".order-item").nth(at).getByRole("button", { name: /” up \(/ }).click();
          at--;
        }
      }
      if (await card.getByRole("button", { name: /keep this order/i }).isVisible()) {
        await card.getByRole("button", { name: /keep this order/i }).click();
      }
      break;
    }
    case "matching": {
      const lefts = q.matching.left.map((l) => l.key);
      for (let i = 0; i < lefts.length; i++) {
        const left = q.matching.left[i]!;
        // Wrong: shift every left item onto the next item's correct description (a derangement).
        const right =
          intent === "correct" ? q.correct_pairs[left.key]! : q.correct_pairs[lefts[(i + 1) % lefts.length]!]!;
        await card.getByLabel(left.text, { exact: true }).selectOption(right);
      }
      await expect(card.getByText(`${lefts.length} of ${lefts.length} matched`)).toBeVisible();
      break;
    }
  }
}

/** Collect console errors and uncaught page errors for the whole test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Assert the page has no horizontal scroll (layout fits the viewport). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
