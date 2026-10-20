import axe from "axe-core";
import { expect } from "vitest";

/**
 * Run axe-core against a rendered container and fail with a readable summary.
 * Color-contrast is skipped because jsdom does not compute styles; contrast is
 * covered by tokens.test.ts against the design tokens instead.
 */
export async function expectNoAxeViolations(container: Element = document.body) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(summary).toEqual([]);
}
