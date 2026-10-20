import { expect, test } from "@playwright/test";
import { answerCurrent, expectNoHorizontalOverflow, getBank, getSession, startSet, trackErrors } from "./helpers";
import type { Question } from "../src/types";

/**
 * Full journey through the production build:
 * pick a level -> answer 30 questions in all formats -> reload/resume -> submit ->
 * report (score, domains, weak concepts) -> review + theory card + references -> history.
 *
 * Answer plan (deterministic score): domains 1-3 correct (15), domains 4-5 wrong (10),
 * domain 6 left unanswered (5)  =>  15/30 = 50%.
 */
test("take a full set and get an accurate report", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);

  await page.goto("./");
  await expect(page).toHaveTitle("Agent Theory Practice");
  await expect(page.getByRole("radio", { name: /^Easy.*100 questions/ })).toBeChecked();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("01-home.png"), fullPage: true });

  await startSet(page, "Medium");
  const bank = await getBank(page);
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const session = await getSession(page);
  const questions = session.questionIds.map((id) => byId.get(id) as Question);

  // Set composition: 30 medium questions, 5 per domain, more than one format.
  expect(questions).toHaveLength(30);
  expect(questions.every((q) => q.difficulty === "medium")).toBe(true);
  for (let d = 1; d <= 6; d++) expect(questions.filter((q) => q.domain === d)).toHaveLength(5);
  const formats = new Set(questions.map((q) => q.type));
  expect(formats.size).toBeGreaterThanOrEqual(3);

  const plan = (q: Question) => (q.domain <= 3 ? "correct" : q.domain <= 5 ? "wrong" : "skip");
  const flagged: string[] = [];
  const shots = new Set<string>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    await expect(page.getByRole("heading", { name: `Question ${i + 1} of 30` })).toBeVisible();
    await expect(page.locator(".question-card__stem")).toHaveText(q.stem);

    const intent = plan(q);
    if (intent !== "skip") await answerCurrent(page, q, intent);
    if (flagged.length < 2 && intent === "wrong") {
      await page.getByRole("button", { name: /flag for review/i }).click();
      await expect(page.getByRole("button", { name: "Flagged", exact: true })).toHaveAttribute("aria-pressed", "true");
      flagged.push(q.id);
    }
    if (!shots.has(q.type)) {
      shots.add(q.type);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`02-exam-${q.type}.png`), fullPage: true });
    }

    // Halfway: reload and make sure the set resumes exactly where we were.
    if (i === 14) {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Question 15 of 30" })).toBeVisible();
      const resumed = await getSession(page);
      expect(resumed.questionIds).toEqual(session.questionIds);
      expect(Object.keys(resumed.answers).length).toBe(questions.slice(0, 15).filter((x) => plan(x) !== "skip").length);
    }

    if (i < questions.length - 1) await page.getByRole("button", { name: /^next/i }).click();
  }

  // Submit dialog reports what is still open.
  await page.getByRole("button", { name: /review & submit/i }).click();
  const dialog = page.getByRole("dialog", { name: /submit this set/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("count-answered")).toHaveText("25");
  await expect(dialog.getByTestId("count-unanswered")).toHaveText("5");
  await expect(dialog.getByTestId("count-flagged")).toHaveText("2");
  await page.screenshot({ path: testInfo.outputPath("03-submit-dialog.png") });
  await dialog.getByRole("button", { name: /submit set/i }).click();

  // Results.
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
  await expect(page).toHaveURL(/#\/results\//);
  await expect(page.locator(".score-ring__pct")).toHaveText("50%");
  await expect(page.getByText("15 / 30 correct")).toBeVisible();
  await expect(page.getByText("Needs more practice")).toBeVisible();
  const breakdown = page.getByRole("list", { name: "Breakdown" });
  await expect(breakdown).toContainText("15 correct");
  await expect(breakdown).toContainText("10 incorrect");
  await expect(breakdown).toContainText("5 not answered");
  await expect(breakdown).toContainText("2 flagged");

  const domainItems = page.getByRole("region", { name: "Scores by domain" }).locator("li.domain-score");
  await expect(domainItems).toHaveCount(6);
  for (let d = 1; d <= 6; d++) {
    const item = domainItems.nth(d - 1);
    if (d <= 3) {
      await expect(item).toContainText("5/5 · 100%");
      await expect(item).toContainText("On track");
    } else {
      await expect(item).toContainText("0/5 · 0%");
      await expect(item).toContainText("Needs improvement");
    }
  }

  // Weak concepts: exactly the concepts that only appear in missed questions score 0%.
  const missed = questions.filter((q) => plan(q) !== "correct");
  const hit = questions.filter((q) => plan(q) === "correct");
  const allConcepts = new Set(questions.flatMap((q) => q.concepts));
  const expectedWeak = [...allConcepts].filter((c) => {
    const right = hit.filter((q) => q.concepts.includes(c)).length;
    const total = questions.filter((q) => q.concepts.includes(c)).length;
    return right / total < 0.7;
  });
  const weakSection = page.getByRole("region", { name: "Concepts to improve" });
  const weakNames = await weakSection.locator(".weak-item__name").allInnerTexts();
  expect(new Set(weakNames)).toEqual(new Set(expectedWeak));
  expect(missed.length).toBe(15);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("04-results.png"), fullPage: true });

  // Open a theory card straight from the weak-concepts list.
  const firstWeak = weakSection.locator("li.weak-item").first();
  const cardButton = firstWeak.locator("button.theory-btn").first();
  const cardTitle = (await cardButton.innerText()).trim();
  await cardButton.click();
  const theory = page.getByRole("dialog", { name: cardTitle });
  await expect(theory).toBeVisible();
  await expect(theory.getByRole("heading", { name: "Key points" })).toBeVisible();
  const refs = theory.getByRole("link", { name: /opens in a new tab/ });
  expect(await refs.count()).toBeGreaterThan(0);
  await expect(refs.first()).toHaveAttribute("target", "_blank");
  await expect(refs.first()).toHaveAttribute("rel", "noopener noreferrer");
  await page.screenshot({ path: testInfo.outputPath("05-theory-card.png") });
  await page.keyboard.press("Escape");
  await expect(theory).toBeHidden();
  await expect(cardButton).toBeFocused();

  // Review mistakes for that concept.
  await firstWeak.getByRole("link", { name: /review \d+ missed/i }).click();
  await expect(page.getByRole("heading", { name: "Review answers" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Incorrect/ })).toBeChecked();
  const conceptName = weakNames[0]!;
  await expect(page.getByRole("combobox", { name: "Concept" })).toHaveValue(conceptName);
  const reviewItems = page.locator("article.review-item");
  const expectedCount = missed.filter((q) => q.concepts.includes(conceptName)).length;
  await expect(reviewItems).toHaveCount(expectedCount);
  await expect(reviewItems.first()).toBeVisible();
  await expect(reviewItems.first().getByText("Why this is the answer")).toBeVisible();
  await expect(reviewItems.first().getByText("Theory behind this question")).toBeVisible();
  await expect(reviewItems.first().getByRole("link", { name: /opens in a new tab/ }).first()).toBeVisible();

  // All answers: verdict counts match the plan.
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(reviewItems).toHaveCount(30);
  await expect(page.locator(".verdict-badge--correct")).toHaveCount(15);
  await expect(page.locator(".verdict-badge--incorrect")).toHaveCount(10);
  await expect(page.locator(".verdict-badge--unanswered")).toHaveCount(5);
  await page.getByRole("radio", { name: /^Flagged/ }).check();
  await expect(reviewItems).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("06-review.png"), fullPage: true });

  // History.
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Summary" })).toContainText("1sets completed");
  await expect(page.getByRole("img", { name: /one set so far, scoring 50%/i })).toBeVisible();
  await expect(page.getByRole("table", { name: /completed sets/i }).getByRole("row")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("07-history.png"), fullPage: true });

  // A second set avoids the questions just seen.
  await page.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByText(/last set: medium, 50%/i)).toBeVisible();
  await page.getByRole("button", { name: /start 30-question set/i }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 30" })).toBeVisible();
  const second = await getSession(page);
  expect(second.questionIds.filter((id) => session.questionIds.includes(id))).toEqual([]);

  expect(errors).toEqual([]);
});
